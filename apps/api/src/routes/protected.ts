import { Router } from "express";
import { searchQuerySchema, newsQuerySchema, scrapeQuerySchema } from "@query402/shared";
import { executeQuery } from "../services/query-service.js";
import { config } from "../lib/config.js";
import { persistPaidRequest } from "../lib/persistence.js";

export const protectedRouter = Router();

protectedRouter.get("/x402/search", async (req, res, next) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const result = await executeQuery({
      mode: "search",
      provider: parsed.data.provider,
      q: parsed.data.q
    });

    const paymentHeader = req.header("payment-response") ?? null;
    await persistPaidRequest({
      mode: "search",
      endpoint: "/x402/search",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined
    });

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: paymentHeader
      },
      result
    });
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

    const result = await executeQuery({
      mode: "news",
      provider: parsed.data.provider,
      q: parsed.data.q
    });

    const paymentHeader = req.header("payment-response") ?? null;
    await persistPaidRequest({
      mode: "news",
      endpoint: "/x402/news",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined
    });

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: paymentHeader
      },
      result
    });
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

    const result = await executeQuery({
      mode: "scrape",
      provider: parsed.data.provider,
      url: parsed.data.url
    });

    const paymentHeader = req.header("payment-response") ?? null;
    await persistPaidRequest({
      mode: "scrape",
      endpoint: "/x402/scrape",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.url,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined
    });

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: paymentHeader
      },
      result
    });
  } catch (error) {
    return next(error);
  }
});
