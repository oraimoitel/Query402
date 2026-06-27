import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyApiTestEnv, resetApiTestStorage } from "../test/api-test-helpers.js";

describe("protected route validation", () => {
  let analyticsDbPath: string;
  let sponsorshipDbPath: string;

  beforeEach(() => {
    ({ analyticsDbPath, sponsorshipDbPath } = applyApiTestEnv());
  });

  afterEach(async () => {
    await resetApiTestStorage(analyticsDbPath, sponsorshipDbPath);
    vi.restoreAllMocks();
  });

  async function createValidationApp() {
    const { protectedRouter } = await import("../routes/protected.js");
    const app = express();
    app.use(protectedRouter);
    return app;
  }

  it("rejects invalid search query input", async () => {
    const app = await createValidationApp();

    const missingQuery = await request(app).get("/x402/search").query({ provider: "search.basic" });
    const shortQuery = await request(app)
      .get("/x402/search")
      .query({ provider: "search.basic", q: "x" });

    expect(missingQuery.status).toBe(400);
    expect(shortQuery.status).toBe(400);
  });

  it("rejects invalid news query input", async () => {
    const app = await createValidationApp();

    const response = await request(app).get("/x402/news").query({ provider: "news.fast" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("rejects invalid scrape query input", async () => {
    const app = await createValidationApp();

    const missingUrl = await request(app).get("/x402/scrape").query({ provider: "scrape.page" });
    const invalidUrl = await request(app)
      .get("/x402/scrape")
      .query({ provider: "scrape.page", url: "not-a-url" });

    expect(missingUrl.status).toBe(400);
    expect(invalidUrl.status).toBe(400);
  });
});
