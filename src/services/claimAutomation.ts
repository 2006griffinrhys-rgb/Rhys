import type { Claim } from "@/types/domain";

export const FOLLOW_UP_INTERVAL_MS = 5 * 24 * 60 * 60 * 1000;
export const MAX_FOLLOW_UP_ATTEMPTS = 3;
export const CLAIM_AUTOMATION_INTERVAL_MS = 60 * 1000;

type CardEscalationTarget = {
  providerName: string;
  providerEmail: string;
};

function isClaimResolved(claim: Claim) {
  return (
    claim.status === "paid" ||
    claim.status === "rejected" ||
    claim.responseStatus === "resolved"
  );
}

export function computeNextFollowUpDueAt(fromIso?: string, intervalDays = 5) {
  const baseMs = fromIso ? Date.parse(fromIso) : Date.now();
  const base = Number.isFinite(baseMs) ? baseMs : Date.now();
  const interval = Math.max(1, Math.round(intervalDays));
  return new Date(base + interval * 24 * 60 * 60 * 1000).toISOString();
}

export function shouldSendFollowUp(claim: Claim, nowIso = new Date().toISOString()) {
  if (!claim.followUpEnabled || isClaimResolved(claim)) {
    return false;
  }
  if (claim.responseStatus === "awaiting-customer") {
    return false;
  }
  const dueIso = claim.nextFollowUpAt ?? computeNextFollowUpDueAt(claim.createdAt, claim.followUpIntervalDays ?? 5);
  const dueMs = Date.parse(dueIso);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(dueMs) || !Number.isFinite(nowMs)) {
    return false;
  }
  return dueMs <= nowMs;
}

export function shouldEscalateToCardProvider(claim: Claim) {
  if (!claim.escalationEnabled || isClaimResolved(claim)) {
    return false;
  }
  if (claim.escalationTriggeredAt) {
    return false;
  }
  const followUps = claim.followUpCount ?? 0;
  const threshold = claim.escalateAfterFollowUps ?? MAX_FOLLOW_UP_ATTEMPTS;
  return followUps >= threshold;
}

export function resolveCardEscalationTarget(claim: Claim): CardEscalationTarget {
  const raw = (claim.cardProvider ?? claim.cardProviderName ?? "").toLowerCase();
  if (raw.includes("amex") || raw.includes("american express")) {
    return {
      providerName: "American Express",
      providerEmail: "disputes@americanexpress.com",
    };
  }
  if (raw.includes("visa")) {
    return {
      providerName: "Visa",
      providerEmail: "disputes@visa.com",
    };
  }
  if (raw.includes("mastercard")) {
    return {
      providerName: "Mastercard",
      providerEmail: "disputes@mastercard.com",
    };
  }
  return {
    providerName: claim.cardProviderName ?? "American Express",
    providerEmail: claim.cardProviderEmail ?? "disputes@americanexpress.com",
  };
}
