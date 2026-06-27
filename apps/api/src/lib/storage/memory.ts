import type { AnalyticsSummary, PaymentAttempt, QueryMode, UsageEvent } from "@query402/shared";
import {
  DEFAULT_RECENT_LIMIT,
  MAX_PAYMENT_ATTEMPTS,
  MAX_USAGE_EVENTS
} from "./constants.js";
import type {
  AnalyticsQueryOptions,
  IdempotencyAcquireResult,
  PaginationOptions,
  PaymentUsagePair,
  StorageRepository
} from "./types.js";

const PENDING_STATUS_CODE = 0;

function trimNewest<T>(items: T[], max: number): T[] {
  return items.slice(0, max);
}

function buildAnalyticsSummary(
  usage: UsageEvent[],
  payments: PaymentAttempt[],
  options?: AnalyticsQueryOptions
): AnalyticsSummary {
  const spendByCategory = usage.reduce<Record<QueryMode, number>>(
    (acc, event) => {
      acc[event.mode] += event.priceUsd;
      return acc;
    },
    { search: 0, news: 0, scrape: 0 }
  );

  const totalSpendUsd = Number(
    (spendByCategory.search + spendByCategory.news + spendByCategory.scrape).toFixed(6)
  );

  const recentUsageLimit = options?.recentUsageLimit ?? DEFAULT_RECENT_LIMIT;
  const recentPaymentLimit = options?.recentPaymentLimit ?? DEFAULT_RECENT_LIMIT;

  return {
    totalQueries: usage.length,
    totalSpendUsd,
    spendByCategory,
    recentTransactions: payments.slice(0, recentPaymentLimit),
    recentUsage: usage.slice(0, recentUsageLimit)
  };
}

export class InMemoryStorageRepository implements StorageRepository {
  private usage: UsageEvent[] = [];
  private payments: PaymentAttempt[] = [];
  private idempotency = new Map<
    string,
    { requestHash: string; responseJson: string; statusCode: number; expiresAt: string }
  >();
  private writeChain: Promise<void> = Promise.resolve();

  isAvailable(): boolean {
    return true;
  }

  close(): void {
    this.usage = [];
    this.payments = [];
    this.idempotency.clear();
  }

  private enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.writeChain.then(operation);
    this.writeChain = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async saveUsageEvent(event: UsageEvent): Promise<void> {
    await this.enqueue(async () => {
      this.usage.unshift(event);
      this.usage = trimNewest(this.usage, MAX_USAGE_EVENTS);
    });
  }

  async savePaymentAttempt(payment: PaymentAttempt): Promise<void> {
    await this.enqueue(async () => {
      this.payments.unshift(payment);
      this.payments = trimNewest(this.payments, MAX_PAYMENT_ATTEMPTS);
    });
  }

  async persistPaymentAndUsage(pair: PaymentUsagePair): Promise<void> {
    await this.enqueue(async () => {
      this.payments.unshift(pair.payment);
      this.payments = trimNewest(this.payments, MAX_PAYMENT_ATTEMPTS);
      this.usage.unshift(pair.usage);
      this.usage = trimNewest(this.usage, MAX_USAGE_EVENTS);
    });
  }

  async getUsageEvents(options?: PaginationOptions): Promise<UsageEvent[]> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? this.usage.length;
    return this.usage.slice(offset, offset + limit);
  }

  async getPaymentAttempts(options?: PaginationOptions): Promise<PaymentAttempt[]> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? this.payments.length;
    return this.payments.slice(offset, offset + limit);
  }

  async getAnalyticsSummary(options?: AnalyticsQueryOptions): Promise<AnalyticsSummary> {
    return buildAnalyticsSummary(this.usage, this.payments, options);
  }

  private purgeExpiredIdempotency(key: string): void {
    const record = this.idempotency.get(key);
    if (!record) {
      return;
    }

    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      this.idempotency.delete(key);
    }
  }

  async acquireIdempotencyLock(
    key: string,
    requestHash: string,
    ttlSeconds: number
  ): Promise<IdempotencyAcquireResult> {
    return this.enqueue(() => {
      this.purgeExpiredIdempotency(key);
      const existing = this.idempotency.get(key);

      if (existing) {
        if (existing.requestHash !== requestHash) {
          return { state: "in_progress" as const };
        }

        if (existing.statusCode > PENDING_STATUS_CODE) {
          return {
            state: "cached" as const,
            statusCode: existing.statusCode,
            body: JSON.parse(existing.responseJson) as unknown
          };
        }

        return { state: "in_progress" as const };
      }

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      this.idempotency.set(key, {
        requestHash,
        responseJson: "{}",
        statusCode: PENDING_STATUS_CODE,
        expiresAt
      });

      return { state: "acquired" as const };
    });
  }

  async releaseIdempotencyLock(key: string): Promise<void> {
    await this.enqueue(async () => {
      const existing = this.idempotency.get(key);
      if (existing?.statusCode === PENDING_STATUS_CODE) {
        this.idempotency.delete(key);
      }
    });
  }

  async cacheIdempotencyResponse(
    key: string,
    requestHash: string,
    statusCode: number,
    body: unknown,
    ttlSeconds: number
  ): Promise<void> {
    await this.enqueue(async () => {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      this.idempotency.set(key, {
        requestHash,
        responseJson: JSON.stringify(body),
        statusCode,
        expiresAt
      });
    });
  }

  async getCachedIdempotencyResponse(
    key: string,
    requestHash: string
  ): Promise<{ hit: true; statusCode: number; body: unknown } | { hit: false; conflict?: boolean }> {
    return this.enqueue(() => {
      this.purgeExpiredIdempotency(key);
      const record = this.idempotency.get(key);

      if (!record) {
        return { hit: false as const };
      }

      if (record.requestHash !== requestHash) {
        return { hit: false as const, conflict: true };
      }

      if (record.statusCode <= PENDING_STATUS_CODE) {
        return { hit: false as const };
      }

      return {
        hit: true as const,
        statusCode: record.statusCode,
        body: JSON.parse(record.responseJson) as unknown
      };
    });
  }
}

export function createInMemoryStorageRepository(): InMemoryStorageRepository {
  return new InMemoryStorageRepository();
}
