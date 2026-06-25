import { Router } from "express";
import type { Request } from "express";
import { searchQuerySchema, newsQuerySchema, scrapeQuerySchema } from "@query402/shared";
import type { QueryMode, QueryResult } from "@query402/shared";
import { executeQuery } from "../services/query-service.js";
import { config } from "../lib/config.js";
import {
  getPaymentEvidence,
  paymentEvidenceSummary,
  persistPaymentEvidence,
  setPaidRequestRecord,
  type PaidRequestRecord
} from "../lib/payment-evidence.js";

export const protectedRouter = Router();

function persistDemoEvidenceIfNeeded(input: { req: Request; record: PaidRequestRecord }) {
  const evidence = getPaymentEvidence(input.req);
  if (evidence?.kind === "demo") {
    persistPaymentEvidence(evidence, input.record);
  }
}

function buildPaidResponse(req: Request, result: QueryResult) {
  const evidence = getPaymentEvidence(req);
  return {
    payment: {
      network: evidence?.network ?? config.STELLAR_NETWORK,
      facilitatorUrl: evidence?.facilitatorUrl ?? config.X402_FACILITATOR_URL,
      evidence: evidence ? paymentEvidenceSummary(evidence) : { kind: "verified", status: "settlement-pending" }
    },
    result
  };
}

async function runProtectedQuery(input: {
  req: Request;
  mode: QueryMode;
  endpoint: string;
  provider: string;
  queryOrUrl: string;
  q?: string;
  url?: string;
}) {
  const result = await executeQuery({
    mode: input.mode,
    provider: input.provider,
    q: input.q,
    url: input.url
  });

  const record: PaidRequestRecord = {
    mode: input.mode,
    endpoint: input.endpoint,
    providerId: input.provider,
    queryOrUrl: input.queryOrUrl,
    priceUsd: result.priceUsd,
    latencyMs: result.latencyMs,
    traceId: result.traceId
  };

  setPaidRequestRecord(input.req, record);
  persistDemoEvidenceIfNeeded({ req: input.req, record });
  return buildPaidResponse(input.req, result);
}

protectedRouter.get("/x402/search", async (req, res, next) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const payload = await runProtectedQuery({
      req,
      mode: "search",
      endpoint: "/x402/search",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      q: parsed.data.q
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

protectedRouter.get("/x402/news", async (req, res, next) => {
  try {
    const parsed = newsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const payload = await runProtectedQuery({
      req,
      mode: "news",
      endpoint: "/x402/news",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      q: parsed.data.q
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

protectedRouter.get("/x402/scrape", async (req, res, next) => {
  try {
    const parsed = scrapeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const payload = await runProtectedQuery({
      req,
      mode: "scrape",
      endpoint: "/x402/scrape",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.url,
      url: parsed.data.url
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});
