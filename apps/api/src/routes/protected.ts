import { Router } from "express";
import { searchQuerySchema, newsQuerySchema, scrapeQuerySchema } from "@query402/shared";
import { executeQuery } from "../services/query-service.js";
import { handlePaidX402Route } from "../lib/idempotency/x402.js";

export const protectedRouter = Router();

protectedRouter.get("/x402/search", async (req, res, next) => {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  return handlePaidX402Route(req, res, next, {
    mode: "search",
    route: "/x402/search",
    provider: parsed.data.provider,
    queryOrUrl: parsed.data.q,
    query: parsed.data.q,
    execute: () =>
      executeQuery({
        mode: "search",
        provider: parsed.data.provider,
        q: parsed.data.q
      })
  });
});

protectedRouter.get("/x402/news", async (req, res, next) => {
  const parsed = newsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  return handlePaidX402Route(req, res, next, {
    mode: "news",
    route: "/x402/news",
    provider: parsed.data.provider,
    queryOrUrl: parsed.data.q,
    query: parsed.data.q,
    execute: () =>
      executeQuery({
        mode: "news",
        provider: parsed.data.provider,
        q: parsed.data.q
      })
  });
});

protectedRouter.get("/x402/scrape", async (req, res, next) => {
  const parsed = scrapeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  return handlePaidX402Route(req, res, next, {
    mode: "scrape",
    route: "/x402/scrape",
    provider: parsed.data.provider,
    queryOrUrl: parsed.data.url,
    url: parsed.data.url,
    execute: () =>
      executeQuery({
        mode: "scrape",
        provider: parsed.data.provider,
        url: parsed.data.url
      })
  });
});
