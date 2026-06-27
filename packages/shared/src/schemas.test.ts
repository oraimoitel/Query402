import { describe, expect, it } from "vitest";
import {
  newsQuerySchema,
  providerCategorySchema,
  providerSchema,
  queryModeSchema,
  scrapeQuerySchema,
  searchQuerySchema,
  signedGrantSchema,
  sponsorshipChallengeSchema,
  sponsorshipGrantSchema
} from "./schemas.js";

const validProvider = {
  id: "search.basic",
  name: "Basic Search",
  category: "search" as const,
  priceUsd: 0.01,
  description: "Fast search",
  latencyEstimateMs: 700,
  qualityScore: 75,
  sourceType: "deterministic-fallback" as const,
  enabled: true
};

const validGrant = {
  grantId: "550e8400-e29b-41d4-a716-446655440000",
  wallet: `G${"A".repeat(55)}`,
  network: "stellar:testnet",
  maxAmountUsd: 1,
  expiresAt: "2026-12-31T12:00:00.000Z",
  nonce: "650e8400-e29b-41d4-a716-446655440001",
  issuedAt: "2026-06-01T12:00:00.000Z"
};

describe("queryModeSchema", () => {
  it("accepts supported query modes", () => {
    expect(queryModeSchema.parse("search")).toBe("search");
    expect(queryModeSchema.parse("news")).toBe("news");
    expect(queryModeSchema.parse("scrape")).toBe("scrape");
  });

  it("rejects unsupported modes", () => {
    expect(queryModeSchema.safeParse("chat").success).toBe(false);
  });
});

describe("providerCategorySchema", () => {
  it("matches query mode categories", () => {
    expect(providerCategorySchema.parse("search")).toBe("search");
    expect(providerCategorySchema.parse("news")).toBe("news");
    expect(providerCategorySchema.parse("scrape")).toBe("scrape");
  });
});

describe("providerSchema", () => {
  it("accepts a valid provider definition", () => {
    expect(providerSchema.parse(validProvider)).toEqual(validProvider);
  });

  it("rejects invalid category and non-positive pricing", () => {
    expect(providerSchema.safeParse({ ...validProvider, category: "chat" }).success).toBe(false);
    expect(providerSchema.safeParse({ ...validProvider, priceUsd: 0 }).success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("requires provider and a query of at least two characters", () => {
    expect(searchQuerySchema.parse({ provider: "search.basic", q: "stellar" })).toEqual({
      provider: "search.basic",
      q: "stellar"
    });
    expect(searchQuerySchema.safeParse({ provider: "search.basic", q: "x" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "stellar" }).success).toBe(false);
  });
});

describe("newsQuerySchema", () => {
  it("requires provider and a query of at least two characters", () => {
    expect(newsQuerySchema.parse({ provider: "news.fast", q: "payments" })).toEqual({
      provider: "news.fast",
      q: "payments"
    });
  });
});

describe("scrapeQuerySchema", () => {
  it("requires provider and a valid URL", () => {
    expect(
      scrapeQuerySchema.parse({ provider: "scrape.page", url: "https://example.com/page" })
    ).toEqual({ provider: "scrape.page", url: "https://example.com/page" });
    expect(scrapeQuerySchema.safeParse({ provider: "scrape.page", url: "not-a-url" }).success).toBe(
      false
    );
  });
});

describe("sponsorshipGrantSchema", () => {
  it("accepts a valid grant payload", () => {
    expect(sponsorshipGrantSchema.parse(validGrant)).toEqual(validGrant);
  });

  it("rejects invalid Stellar public keys", () => {
    expect(
      sponsorshipGrantSchema.safeParse({ ...validGrant, wallet: "invalid-wallet" }).success
    ).toBe(false);
  });
});

describe("signedGrantSchema", () => {
  it("accepts a signed grant envelope", () => {
    expect(signedGrantSchema.parse({ grant: validGrant, signature: "test-signature" })).toEqual({
      grant: validGrant,
      signature: "test-signature"
    });
  });
});

describe("sponsorshipChallengeSchema", () => {
  it("accepts a sponsorship challenge payload", () => {
    expect(
      sponsorshipChallengeSchema.parse({
        challengeId: "750e8400-e29b-41d4-a716-446655440002",
        wallet: validGrant.wallet,
        message: "Sign to request sponsorship",
        expiresAt: "2026-12-31T12:00:00.000Z"
      })
    ).toMatchObject({ message: "Sign to request sponsorship" });
  });
});
