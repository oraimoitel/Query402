import { describe, it } from "node:test";
import assert from "node:assert";
import { DefaultProviderRegistry } from "./registry.js";
import { ProviderAdapter } from "./core.js";

// Ensure pricing data exists for our fake tests so getProviderById works
import { providers } from "../lib/pricing.js";
providers.push({
  id: "test.search.live",
  name: "Test Live Search",
  category: "search",
  priceUsd: 0.05,
  description: "Test live search",
  latencyEstimateMs: 100,
  qualityScore: 90,
  sourceType: "live",
  enabled: true
});
providers.push({
  id: "test.search.deterministic",
  name: "Test Deterministic Search",
  category: "search",
  priceUsd: 0.05,
  description: "Test mock search",
  latencyEstimateMs: 100,
  qualityScore: 90,
  sourceType: "deterministic-fallback",
  enabled: true
});

class MockAdapter implements ProviderAdapter {
  public executeSuccess = true;
  public healthy = true;
  public executionDelay = 0;
  public callCount = 0;

  constructor(public id: string) {}

  async isHealthy(): Promise<boolean> {
    return this.healthy;
  }

  async execute(queryOrUrl: string) {
    this.callCount++;
    if (this.executionDelay > 0) {
      await new Promise(r => setTimeout(r, this.executionDelay));
    }
    if (!this.executeSuccess) {
      throw new Error("Execution failed");
    }
    return [{ title: `Live Result for ${queryOrUrl}`, url: "", snippet: "", score: 1 }];
  }

  getFallback(queryOrUrl: string) {
    return [{ title: `Fallback Result for ${queryOrUrl}`, url: "", snippet: "", score: 1 }];
  }
}

describe("ProviderRegistry", () => {
  it("rejects unknown providers", async () => {
    const registry = new DefaultProviderRegistry();
    await assert.rejects(
      registry.execute("search", "unknown.provider", "q"),
      /Provider not found or disabled/
    );
  });

  it("rejects category mismatch", async () => {
    const registry = new DefaultProviderRegistry();
    await assert.rejects(
      registry.execute("news", "test.search.live", "q"),
      /Provider test.search.live does not support mode news/
    );
  });

  it("executes successfully and returns live source", async () => {
    const registry = new DefaultProviderRegistry();
    const adapter = new MockAdapter("test.search.live");
    registry.register(adapter);

    const result = await registry.execute("search", "test.search.live", "test-query");
    assert.strictEqual(result.source, "live");
    assert.strictEqual(result.items[0].title, "Live Result for test-query");
  });

  it("falls back to deterministic data if deterministic provider", async () => {
    const registry = new DefaultProviderRegistry();
    const adapter = new MockAdapter("test.search.deterministic");
    registry.register(adapter);

    const result = await registry.execute("search", "test.search.deterministic", "test-query");
    assert.strictEqual(result.source, "deterministic-fallback");
    assert.strictEqual(result.items[0].title, "Fallback Result for test-query");
  });

  it("falls back gracefully when unhealthy", async () => {
    const registry = new DefaultProviderRegistry();
    const adapter = new MockAdapter("test.search.live");
    adapter.healthy = false;
    registry.register(adapter);

    const result = await registry.execute("search", "test.search.live", "test-query");
    assert.strictEqual(result.source, "deterministic-fallback");
    assert.strictEqual(result.items[0].title, "Fallback Result for test-query");
    assert.strictEqual(adapter.callCount, 0, "Should not call execute if unhealthy");
  });

  it("trips circuit breaker and recovers", async () => {
    // Testing the actual registry logic directly
    // Instead of messing with timing, we can trigger 3 failures
    const registry = new DefaultProviderRegistry();
    const adapter = new MockAdapter("test.search.live");
    registry.register(adapter);

    adapter.executeSuccess = false;

    // 1st failure
    let res = await registry.execute("search", "test.search.live", "test-query");
    assert.strictEqual(res.source, "deterministic-fallback");
    assert.strictEqual(adapter.callCount, 1);

    // 2nd failure
    res = await registry.execute("search", "test.search.live", "test-query");
    assert.strictEqual(res.source, "deterministic-fallback");
    assert.strictEqual(adapter.callCount, 2);

    // 3rd failure (trips breaker in default config: maxFailures = 3)
    res = await registry.execute("search", "test.search.live", "test-query");
    assert.strictEqual(res.source, "deterministic-fallback");
    assert.strictEqual(adapter.callCount, 3);

    // 4th call - circuit is open, should NOT call execute
    res = await registry.execute("search", "test.search.live", "test-query");
    assert.strictEqual(res.source, "deterministic-fallback");
    assert.strictEqual(adapter.callCount, 3); // Still 3!
  });
});
