import type { AnalyticsSummary, PaymentAttempt, QueryMode, UsageEvent } from "@query402/shared";
import { DEFAULT_RECENT_LIMIT } from "./constants.js";
import type { AnalyticsQueryOptions } from "./types.js";

export function buildAnalyticsSummary(
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

export function usageEventToRow(event: UsageEvent) {
  return {
    id: event.id,
    mode: event.mode,
    endpoint: event.endpoint,
    provider_id: event.providerId,
    query_or_url: event.queryOrUrl,
    price_usd: event.priceUsd,
    network: event.network,
    payment_status: event.paymentStatus,
    payment_tx_hash: event.paymentTxHash ?? null,
    facilitator_url: event.facilitatorUrl ?? null,
    payer_public_key: event.payerPublicKey ?? null,
    trace_id: event.traceId,
    created_at: event.createdAt,
    latency_ms: event.latencyMs,
    sponsorship_grant_id: event.sponsorshipGrantId ?? null,
    policy_decision: event.policyDecision ?? null,
    payment_source: event.paymentSource ?? null,
    sponsor_public_key: event.sponsorPublicKey ?? null
  };
}

export function rowToUsageEvent(row: Record<string, unknown>): UsageEvent {
  return {
    id: String(row.id),
    mode: row.mode as QueryMode,
    endpoint: String(row.endpoint),
    providerId: String(row.provider_id),
    queryOrUrl: String(row.query_or_url),
    priceUsd: Number(row.price_usd),
    network: String(row.network),
    paymentStatus: row.payment_status as UsageEvent["paymentStatus"],
    paymentTxHash: row.payment_tx_hash ? String(row.payment_tx_hash) : undefined,
    facilitatorUrl: row.facilitator_url ? String(row.facilitator_url) : undefined,
    payerPublicKey: row.payer_public_key ? String(row.payer_public_key) : undefined,
    traceId: String(row.trace_id),
    createdAt: String(row.created_at),
    latencyMs: Number(row.latency_ms),
    sponsorshipGrantId: row.sponsorship_grant_id ? String(row.sponsorship_grant_id) : undefined,
    policyDecision: row.policy_decision ? String(row.policy_decision) : undefined,
    paymentSource: row.payment_source ? (row.payment_source as UsageEvent["paymentSource"]) : undefined,
    sponsorPublicKey: row.sponsor_public_key ? String(row.sponsor_public_key) : undefined
  };
}

export function paymentAttemptToRow(payment: PaymentAttempt) {
  return {
    id: payment.id,
    endpoint: payment.endpoint,
    provider_id: payment.providerId,
    amount_usd: payment.amountUsd,
    network: payment.network,
    payer_public_key: payment.payerPublicKey ?? null,
    pay_to_address: payment.payToAddress,
    facilitator_url: payment.facilitatorUrl,
    status: payment.status,
    transaction_hash: payment.transactionHash ?? null,
    error: payment.error ?? null,
    created_at: payment.createdAt,
    sponsorship_grant_id: payment.sponsorshipGrantId ?? null,
    policy_decision: payment.policyDecision ?? null,
    payment_source: payment.paymentSource ?? null,
    sponsor_public_key: payment.sponsorPublicKey ?? null
  };
}

export function rowToPaymentAttempt(row: Record<string, unknown>): PaymentAttempt {
  return {
    id: String(row.id),
    endpoint: String(row.endpoint),
    providerId: String(row.provider_id),
    amountUsd: Number(row.amount_usd),
    network: String(row.network),
    payerPublicKey: row.payer_public_key ? String(row.payer_public_key) : undefined,
    payToAddress: String(row.pay_to_address),
    facilitatorUrl: String(row.facilitator_url),
    status: row.status as PaymentAttempt["status"],
    transactionHash: row.transaction_hash ? String(row.transaction_hash) : undefined,
    error: row.error ? String(row.error) : undefined,
    createdAt: String(row.created_at),
    sponsorshipGrantId: row.sponsorship_grant_id ? String(row.sponsorship_grant_id) : undefined,
    policyDecision: row.policy_decision ? String(row.policy_decision) : undefined,
    paymentSource: row.payment_source ? (row.payment_source as PaymentAttempt["paymentSource"]) : undefined,
    sponsorPublicKey: row.sponsor_public_key ? String(row.sponsor_public_key) : undefined
  };
}
