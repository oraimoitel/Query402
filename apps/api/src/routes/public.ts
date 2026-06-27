import { Router } from "express";
import { providers } from "../lib/pricing.js";
import { getAnalyticsSummary, getUsageEvents } from "../lib/persistence.js";
import { config } from "../lib/config.js";
import { getCatalog } from "../services/query-service.js";

export const publicRouter = Router();

publicRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "query402-api",
    network: config.STELLAR_NETWORK,
    sponsorshipEnabled: config.sponsorshipEnabled,
    timestamp: new Date().toISOString()
  });
});

publicRouter.get("/api/providers", (_req, res) => {
  res.json({ providers });
});

publicRouter.get("/api/catalog", (_req, res) => {
  res.json(getCatalog());
});

publicRouter.get("/api/usage", async (_req, res, next) => {
  try {
    const usage = await getUsageEvents();
    res.json({ usage });
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/api/analytics", async (_req, res, next) => {
  try {
    const analytics = await getAnalyticsSummary();
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});
