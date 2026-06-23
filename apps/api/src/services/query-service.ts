import { getProviderById, providers } from "../lib/pricing.js";
import { registry } from "../providers/index.js";
import { nanoid } from "nanoid";
import { QueryResult } from "@query402/shared";
import { validateScrapeUrl } from "../lib/scrape-url-safety.js";

export async function executeQuery(params: {
  mode: "search" | "news" | "scrape";
  provider: string;
  q?: string;
  url?: string;
}): Promise<QueryResult> {
  const providerDef = getProviderById(params.provider);
  if (!providerDef) {
    throw new Error(`Provider not found or disabled: ${params.provider}`);
  }

  const queryOrUrl = params.mode === "scrape" ? params.url : params.q;
  if (!queryOrUrl) {
    throw new Error(`Input required for mode ${params.mode}`);
  }

  const safeInput = params.mode === "scrape" ? await validateScrapeUrl(queryOrUrl) : queryOrUrl;

  // Registry handles provider matching, circuit breaking, timeouts, and fallbacks
  const start = Date.now();
  const execution = await registry.execute(params.mode, params.provider, safeInput);
  const latencyMs = Date.now() - start;

  return {
    mode: params.mode,
    providerId: providerDef.id,
    providerName: providerDef.name,
    priceUsd: providerDef.priceUsd,
    latencyMs,
    timestamp: new Date().toISOString(),
    traceId: `trace_${nanoid(12)}`,
    items: execution.items,
    source: execution.source,
    raw: {
      queryOrUrl: safeInput,
      adapterId: params.provider
    }
  };
}

export function getCatalog() {
  const byCategory = {
    search: providers.filter((provider) => provider.category === "search"),
    news: providers.filter((provider) => provider.category === "news"),
    scrape: providers.filter((provider) => provider.category === "scrape")
  };

  return {
    updatedAt: new Date().toISOString(),
    providerCount: providers.length,
    providers,
    byCategory
  };
}
