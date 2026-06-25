import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applySponsorshipTestEnv, resetSponsorshipStore } from "../test/sponsorship-test-helpers.js";

const executeQueryMock = vi.fn();
const persistPaidRequestMock = vi.fn();

vi.mock("../services/query-service.js", () => ({
  executeQuery: (...args: unknown[]) => executeQueryMock(...args)
}));

vi.mock("../lib/persistence.js", () => ({
  persistPaidRequest: (...args: unknown[]) => persistPaidRequestMock(...args)
}));

function mockQueryResult(traceId = "trace_x402") {
  executeQueryMock.mockResolvedValue({
    mode: "search",
    providerId: "search.basic",
    providerName: "Basic Search",
    priceUsd: 0.01,
    latencyMs: 8,
    timestamp: new Date().toISOString(),
    traceId,
    items: []
  });
}

async function createTestApp() {
  const { protectedRouter } = await import("../routes/protected.js");
  const app = express();
  app.use(express.json());
  app.use(protectedRouter);
  return app;
}

describe("x402 idempotency", () => {
  let dbPath: string | undefined;

  beforeEach(() => {
    executeQueryMock.mockReset();
    persistPaidRequestMock.mockReset();
    mockQueryResult();
  });

  afterEach(async () => {
    await resetSponsorshipStore(dbPath);
    dbPath = undefined;
  });

  it("returns cached response for idempotent retries", async () => {
    dbPath = applySponsorshipTestEnv();
    const app = await createTestApp();
    const idempotencyKey = randomUUID();
    const paymentProof = `demo_tx_${randomUUID()}`;

    const first = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "test query" })
      .set("Idempotency-Key", idempotencyKey)
      .set("payment-response", paymentProof);

    expect(first.status).toBe(200);

    const second = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "test query" })
      .set("Idempotency-Key", idempotencyKey)
      .set("payment-response", paymentProof);

    expect(second.status).toBe(200);
    expect(second.body.result.traceId).toBe(first.body.result.traceId);
    expect(executeQueryMock).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when idempotency key is reused with different inputs", async () => {
    dbPath = applySponsorshipTestEnv();
    const app = await createTestApp();
    const idempotencyKey = randomUUID();

    const first = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "first query" })
      .set("Idempotency-Key", idempotencyKey)
      .set("payment-response", `demo_tx_${randomUUID()}`);

    expect(first.status).toBe(200);

    const conflict = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "second query" })
      .set("Idempotency-Key", idempotencyKey)
      .set("payment-response", `demo_tx_${randomUUID()}`);

    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toBe("idempotency_key_conflict");
    expect(executeQueryMock).toHaveBeenCalledTimes(1);
  });

  it("returns cached response for payment proof replay without re-executing", async () => {
    dbPath = applySponsorshipTestEnv();
    const app = await createTestApp();
    const paymentProof = `demo_tx_${randomUUID()}`;

    const first = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "test query" })
      .set("payment-response", paymentProof);

    expect(first.status).toBe(200);

    const replay = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "different query" })
      .set("payment-response", paymentProof);

    expect(replay.status).toBe(200);
    expect(replay.body.result.traceId).toBe(first.body.result.traceId);
    expect(executeQueryMock).toHaveBeenCalledTimes(1);
  });
});
