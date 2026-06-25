import { getSponsorshipDb } from "./store.js";

const DEFAULT_TTL_SECONDS = 86_400;
const PENDING_STATUS_CODE = 0;

export interface CachedIdempotencyResponse {
  hit: true;
  statusCode: number;
  body: unknown;
}

export interface IdempotencyMiss {
  hit: false;
  conflict?: boolean;
}

export type IdempotencyAcquireResult =
  | { state: "acquired" }
  | { state: "cached"; statusCode: number; body: unknown }
  | { state: "in_progress" };

export function acquireIdempotencyLock(
  key: string,
  requestHash: string,
  ttlSeconds = DEFAULT_TTL_SECONDS
): IdempotencyAcquireResult {
  const database = getSponsorshipDb();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const existing = database
    .prepare(
      `SELECT request_hash, response_json, status_code, expires_at
       FROM idempotency_keys
       WHERE key = ?`
    )
    .get(key) as
    | {
        request_hash: string;
        response_json: string;
        status_code: number;
        expires_at: string;
      }
    | undefined;

  if (existing) {
    if (new Date(existing.expires_at).getTime() <= Date.now()) {
      database.prepare(`DELETE FROM idempotency_keys WHERE key = ?`).run(key);
    } else if (existing.request_hash !== requestHash) {
      return { state: "in_progress" };
    } else if (existing.status_code > PENDING_STATUS_CODE) {
      return {
        state: "cached",
        statusCode: existing.status_code,
        body: JSON.parse(existing.response_json) as unknown
      };
    } else {
      return { state: "in_progress" };
    }
  }

  const inserted = database
    .prepare(
      `INSERT OR IGNORE INTO idempotency_keys (key, request_hash, response_json, status_code, expires_at)
       VALUES (?, ?, '{}', ?, ?)`
    )
    .run(key, requestHash, PENDING_STATUS_CODE, expiresAt);

  if (inserted.changes === 1) {
    return { state: "acquired" };
  }

  return { state: "in_progress" };
}

export function releaseIdempotencyLock(key: string): void {
  const database = getSponsorshipDb();
  database
    .prepare(`DELETE FROM idempotency_keys WHERE key = ? AND status_code = ?`)
    .run(key, PENDING_STATUS_CODE);
}

export function getCachedIdempotencyResponse(
  key: string,
  requestHash: string
): CachedIdempotencyResponse | IdempotencyMiss {
  const database = getSponsorshipDb();
  const row = database
    .prepare(
      `SELECT request_hash, response_json, status_code, expires_at
       FROM idempotency_keys
       WHERE key = ?`
    )
    .get(key) as
    | {
        request_hash: string;
        response_json: string;
        status_code: number;
        expires_at: string;
      }
    | undefined;

  if (!row) {
    return { hit: false };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    database.prepare(`DELETE FROM idempotency_keys WHERE key = ?`).run(key);
    return { hit: false };
  }

  if (row.request_hash !== requestHash) {
    return { hit: false, conflict: true };
  }

  if (row.status_code <= PENDING_STATUS_CODE) {
    return { hit: false };
  }

  return {
    hit: true,
    statusCode: row.status_code,
    body: JSON.parse(row.response_json) as unknown
  };
}

export function cacheIdempotencyResponse(
  key: string,
  requestHash: string,
  statusCode: number,
  body: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
): void {
  const database = getSponsorshipDb();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  database
    .prepare(
      `INSERT INTO idempotency_keys (key, request_hash, response_json, status_code, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         request_hash = excluded.request_hash,
         response_json = excluded.response_json,
         status_code = excluded.status_code,
         expires_at = excluded.expires_at`
    )
    .run(key, requestHash, JSON.stringify(body), statusCode, expiresAt);
}
