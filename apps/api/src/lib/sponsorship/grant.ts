import { createHmac, timingSafeEqual } from "node:crypto";
import type { SignedGrant, SponsorshipGrant } from "@query402/shared";
import { config } from "../config.js";

function serializeGrant(grant: SponsorshipGrant): string {
  return [
    grant.grantId,
    grant.wallet,
    grant.network,
    grant.mode ?? "",
    grant.providerId ?? "",
    grant.maxAmountUsd.toString(),
    grant.expiresAt,
    grant.nonce,
    grant.issuedAt
  ].join("|");
}

function signPayload(payload: string): string {
  const secret = config.SPONSORSHIP_SIGNING_SECRET;
  if (!secret) {
    throw new Error("SPONSORSHIP_SIGNING_SECRET is not configured");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signGrant(grant: SponsorshipGrant): SignedGrant {
  return {
    grant,
    signature: signPayload(serializeGrant(grant))
  };
}

export function verifyGrant(signed: SignedGrant): boolean {
  const secret = config.SPONSORSHIP_SIGNING_SECRET;
  if (!secret) {
    return false;
  }

  const expected = signPayload(serializeGrant(signed.grant));

  try {
    return timingSafeEqual(Buffer.from(signed.signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
