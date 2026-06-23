import type { QueryMode, SignedGrant } from "@query402/shared";
import { signedGrantSchema } from "@query402/shared";
import { config } from "../config.js";
import { getProviderById } from "../pricing.js";
import { verifyGrant } from "./grant.js";

export type PolicyDecision =
  | "allowed"
  | "denied_sponsorship_disabled"
  | "denied_storage_unavailable"
  | "denied_invalid_grant"
  | "denied_wrong_wallet"
  | "denied_wrong_network"
  | "denied_wrong_provider"
  | "denied_price_exceeded"
  | "denied_expired"
  | "denied_nonce_replay"
  | "denied_budget_exceeded"
  | "idempotency_hit";

export interface PolicyResult {
  allowed: boolean;
  statusCode: number;
  decision: PolicyDecision;
  error?: string;
  grantId?: string;
  quotedPriceUsd?: number;
  cachedResponse?: {
    statusCode: number;
    body: unknown;
  };
}

export interface AuthorizeSponsoredRunInput {
  signedGrant: SignedGrant;
  wallet: string;
  mode: QueryMode;
  provider: string;
  idempotencyKey?: string;
}

function deny(
  decision: PolicyDecision,
  statusCode: number,
  error: string,
  extra: Partial<PolicyResult> = {}
): PolicyResult {
  return {
    allowed: false,
    statusCode,
    decision,
    error,
    ...extra
  };
}

/** Stub until SQLite store lands in phase 5. */
export function isSponsorshipStorageAvailable(): boolean {
  return true;
}

/** Stub until nonce table is wired in phase 5. */
function checkNonceNotConsumed(_nonce: string, _grantId: string): PolicyResult | null {
  return null;
}

/** Stub until budget store is wired in phase 5. */
function checkBudget(_wallet: string, _amountUsd: number): PolicyResult | null {
  return null;
}

/** Stub until idempotency store is wired in phase 5. */
function checkIdempotency(
  _idempotencyKey: string | undefined,
  _requestHash: string
): PolicyResult | null {
  return null;
}

function buildRequestHash(input: AuthorizeSponsoredRunInput): string {
  return JSON.stringify({
    wallet: input.wallet,
    mode: input.mode,
    provider: input.provider,
    grantId: input.signedGrant.grant.grantId,
    nonce: input.signedGrant.grant.nonce
  });
}

export function authorizeSponsoredRun(input: AuthorizeSponsoredRunInput): PolicyResult {
  if (!config.sponsorshipEnabled) {
    return deny("denied_sponsorship_disabled", 503, "sponsorship_disabled");
  }

  if (!isSponsorshipStorageAvailable()) {
    return deny("denied_storage_unavailable", 503, "sponsorship_storage_unavailable");
  }

  const parsedGrant = signedGrantSchema.safeParse(input.signedGrant);
  if (!parsedGrant.success || !verifyGrant(parsedGrant.data)) {
    return deny("denied_invalid_grant", 403, "invalid_grant");
  }

  const { grant } = parsedGrant.data;

  if (input.wallet !== grant.wallet) {
    return deny("denied_wrong_wallet", 403, "wrong_wallet", { grantId: grant.grantId });
  }

  if (grant.network !== config.STELLAR_NETWORK) {
    return deny("denied_wrong_network", 403, "wrong_network", { grantId: grant.grantId });
  }

  if (grant.mode && grant.mode !== input.mode) {
    return deny("denied_wrong_provider", 403, "wrong_mode", { grantId: grant.grantId });
  }

  if (grant.providerId && grant.providerId !== input.provider) {
    return deny("denied_wrong_provider", 403, "wrong_provider", { grantId: grant.grantId });
  }

  const provider = getProviderById(input.provider);
  if (!provider || provider.category !== input.mode) {
    return deny("denied_wrong_provider", 403, "unknown_provider", { grantId: grant.grantId });
  }

  if (provider.priceUsd > grant.maxAmountUsd) {
    return deny("denied_price_exceeded", 403, "price_exceeds_grant", {
      grantId: grant.grantId,
      quotedPriceUsd: provider.priceUsd
    });
  }

  if (new Date(grant.expiresAt).getTime() <= Date.now()) {
    return deny("denied_expired", 403, "grant_expired", { grantId: grant.grantId });
  }

  const nonceResult = checkNonceNotConsumed(grant.nonce, grant.grantId);
  if (nonceResult) {
    return nonceResult;
  }

  const budgetResult = checkBudget(grant.wallet, provider.priceUsd);
  if (budgetResult) {
    return budgetResult;
  }

  const idempotencyResult = checkIdempotency(input.idempotencyKey, buildRequestHash(input));
  if (idempotencyResult) {
    return idempotencyResult;
  }

  return {
    allowed: true,
    statusCode: 200,
    decision: "allowed",
    grantId: grant.grantId,
    quotedPriceUsd: provider.priceUsd
  };
}
