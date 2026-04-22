import { env } from "@/services/env";
import { supabase } from "@/services/supabase";
import type { BillClaimOutcome, ProductClaimOutcome } from "@/types/domain";

type ProductClaimRequest = {
  userId: string;
  merchant: string;
  productName: string;
  amountCents: number;
  currency: string;
  purchaseDate: string;
  userReason: string;
  signerName: string;
  requestedOutcome: ProductClaimOutcome;
  supplierEmailOverride?: string;
};

type BillClaimRequest = {
  userId: string;
  supplier: string;
  billReference: string;
  amountCents: number;
  currency: string;
  userReason: string;
  signerName: string;
  requestedOutcome: BillClaimOutcome;
  supplierEmailOverride?: string;
};

export type ClaimLetterResult = {
  supplierName: string;
  supplierEmail: string;
  requestedOutcome: ProductClaimOutcome | BillClaimOutcome;
  recommendedOutcome: ProductClaimOutcome | BillClaimOutcome;
  legalBasis: string;
  letterPreview: string;
  emailStatus: "queued" | "sent" | "failed";
};

const PRODUCT_OUTCOME_LABELS: Record<ProductClaimOutcome, string> = {
  refund: "refund",
  "replacement-exchange": "replacement or exchange",
  repair: "repair",
  "not-sure": "the strongest legally-supported remedy",
};

const BILL_OUTCOME_LABELS: Record<BillClaimOutcome, string> = {
  "waive-charges": "waiver of charges",
  "exit-contract": "exit from contract without penalty",
  "itemised-breakdown": "full itemised breakdown",
  "not-sure": "the strongest legally-supported remedy",
};

function inferSupplierEmail(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `support@${base || "supplier"}.com`;
}

function getProductLegalPosition(
  purchaseDate: string,
  requestedOutcome: ProductClaimOutcome,
): {
  legalBasis: string;
  recommendedOutcome: ProductClaimOutcome;
  fallbackNote: string;
} {
  const ageMs = Date.now() - new Date(purchaseDate).getTime();
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6;
  const withinSixMonths = Number.isFinite(ageMs) && ageMs <= sixMonthsMs;

  if (withinSixMonths) {
    return {
      legalBasis:
        "UK Consumer Rights Act 2015: product was not of satisfactory quality / fit for purpose / as described.",
      recommendedOutcome: requestedOutcome === "not-sure" ? "refund" : requestedOutcome,
      fallbackNote: "",
    };
  }

  const recommendedOutcome: ProductClaimOutcome =
    requestedOutcome === "repair" ? "repair" : "replacement-exchange";
  const fallbackNote =
    requestedOutcome === "refund"
      ? "If a full refund is not accepted due to product age, this letter also seeks a no-cost repair or replacement under CRA 2015."
      : "";

  return {
    legalBasis:
      "UK Consumer Rights Act 2015: after the initial period, consumer can still seek repair/replacement where fault existed or product failed reasonable durability standards.",
    recommendedOutcome,
    fallbackNote,
  };
}

function buildProductLetter(input: ProductClaimRequest): ClaimLetterResult {
  const supplierName = input.merchant;
  const supplierEmail = input.supplierEmailOverride ?? inferSupplierEmail(supplierName);
  const legal = getProductLegalPosition(input.purchaseDate, input.requestedOutcome);
  const requestedLabel = PRODUCT_OUTCOME_LABELS[input.requestedOutcome];
  const recommendedLabel = PRODUCT_OUTCOME_LABELS[legal.recommendedOutcome];
  const amountLabel = `${(input.amountCents / 100).toFixed(2)} ${input.currency}`;

  const letterPreview = [
    `Subject: Consumer remedy request - ${input.productName}`,
    "",
    `Dear ${supplierName} Support Team,`,
    "",
    `I am contacting you regarding ${input.productName}, purchased on ${new Date(
      input.purchaseDate,
    ).toLocaleDateString("en-GB")} for ${amountLabel}.`,
    `Issue reported: ${input.userReason}`,
    "",
    `Requested outcome: ${requestedLabel}.`,
    `Legal basis: ${legal.legalBasis}`,
    legal.fallbackNote
      ? `Primary request remains ${requestedLabel}. ${legal.fallbackNote}`
      : `Remedy requested aligns with legal entitlement: ${recommendedLabel}.`,
    "",
    "Please confirm next steps and timeline for resolution.",
    "",
    "Kind regards,",
    input.signerName,
  ].join("\n");

  return {
    supplierName,
    supplierEmail,
    requestedOutcome: input.requestedOutcome,
    recommendedOutcome: legal.recommendedOutcome,
    legalBasis: legal.legalBasis,
    letterPreview,
    emailStatus: "queued",
  };
}

function buildBillLetter(input: BillClaimRequest): ClaimLetterResult {
  const supplierName = input.supplier;
  const supplierEmail = input.supplierEmailOverride ?? inferSupplierEmail(supplierName);
  const requestedLabel = BILL_OUTCOME_LABELS[input.requestedOutcome];
  const recommendedOutcome: BillClaimOutcome =
    input.requestedOutcome === "not-sure" ? "itemised-breakdown" : input.requestedOutcome;
  const recommendedLabel = BILL_OUTCOME_LABELS[recommendedOutcome];
  const amountLabel = `${(input.amountCents / 100).toFixed(2)} ${input.currency}`;
  const legalBasis =
    "UK consumer contract and billing transparency principles: customer is entitled to clear charge breakdowns and fair handling of disputed charges.";

  const letterPreview = [
    `Subject: Billing dispute request - ${input.billReference}`,
    "",
    `Dear ${supplierName} Billing Team,`,
    "",
    `I am disputing charges linked to ${input.billReference} (amount ${amountLabel}).`,
    `Issue reported: ${input.userReason}`,
    "",
    `Requested outcome: ${requestedLabel}.`,
    `Legal basis: ${legalBasis}`,
    `If the requested outcome cannot be fully accepted, please provide at minimum the legally strongest alternative: ${recommendedLabel}.`,
    "",
    "Please confirm next steps and timeline for resolution.",
    "",
    "Kind regards,",
    input.signerName,
  ].join("\n");

  return {
    supplierName,
    supplierEmail,
    requestedOutcome: input.requestedOutcome,
    recommendedOutcome,
    legalBasis,
    letterPreview,
    emailStatus: "queued",
  };
}

async function dispatchEmail(
  payload: ClaimLetterResult & { userId: string; claimKind: "product" | "bill" },
): Promise<ClaimLetterResult["emailStatus"]> {
  if (!env.hasSupabaseConfig) {
    return "queued";
  }

  const { error } = await supabase.functions.invoke("generate-claim", {
    body: {
      userId: payload.userId,
      claimKind: payload.claimKind,
      supplierName: payload.supplierName,
      supplierEmail: payload.supplierEmail,
      requestedOutcome: payload.requestedOutcome,
      recommendedOutcome: payload.recommendedOutcome,
      legalBasis: payload.legalBasis,
      letterPreview: payload.letterPreview,
    },
  });

  if (error) {
    return "failed";
  }
  return "sent";
}

export async function generateAndSendProductClaimEmail(input: ProductClaimRequest): Promise<ClaimLetterResult> {
  const built = buildProductLetter(input);
  const status = await dispatchEmail({
    ...built,
    userId: input.userId,
    claimKind: "product",
  });
  return {
    ...built,
    emailStatus: status,
  };
}

export async function generateAndSendBillClaimEmail(input: BillClaimRequest): Promise<ClaimLetterResult> {
  const built = buildBillLetter(input);
  const status = await dispatchEmail({
    ...built,
    userId: input.userId,
    claimKind: "bill",
  });
  return {
    ...built,
    emailStatus: status,
  };
}

type FollowUpRequest = {
  userId: string;
  claimKind: "product" | "bill";
  claimId: string;
  supplierName: string;
  supplierEmail: string;
  productName: string;
  issueDescription: string;
  requestedOutcome: ProductClaimOutcome | BillClaimOutcome;
  followUpNumber: number;
};

type EscalationRequest = {
  userId: string;
  claimId: string;
  cardProviderName: string;
  cardProviderEmail: string;
  supplierName: string;
  supplierEmail: string;
  productName: string;
  issueDescription: string;
  requestedOutcome: ProductClaimOutcome | BillClaimOutcome;
  followUpsSent: number;
};

function formatOutcomeLabel(outcome: ProductClaimOutcome | BillClaimOutcome): string {
  if (outcome in PRODUCT_OUTCOME_LABELS) {
    return PRODUCT_OUTCOME_LABELS[outcome as ProductClaimOutcome];
  }
  return BILL_OUTCOME_LABELS[outcome as BillClaimOutcome];
}

export async function generateAndSendClaimFollowUpEmail(input: FollowUpRequest): Promise<{
  letterPreview: string;
  emailStatus: "queued" | "sent" | "failed";
}> {
  const requestedLabel = formatOutcomeLabel(input.requestedOutcome);
  const letterPreview = [
    `Subject: Follow-up ${input.followUpNumber} - ${input.productName} (${input.claimId})`,
    "",
    `Dear ${input.supplierName},`,
    "",
    `This is follow-up #${input.followUpNumber} regarding claim ${input.claimId}.`,
    `Issue summary: ${input.issueDescription}`,
    `Requested remedy: ${requestedLabel}.`,
    "Please confirm progress and resolution timeframe.",
    "",
    "Kind regards,",
    "Prooof Claims Team",
  ].join("\n");

  const status = await dispatchEmail({
    supplierName: input.supplierName,
    supplierEmail: input.supplierEmail,
    requestedOutcome: input.requestedOutcome,
    recommendedOutcome: input.requestedOutcome,
    legalBasis: "Follow-up reminder under the original consumer claim request.",
    letterPreview,
    emailStatus: "queued",
    userId: input.userId,
    claimKind: input.claimKind,
  });

  return {
    letterPreview,
    emailStatus: status,
  };
}

export async function generateAndSendCardEscalationEmail(input: EscalationRequest): Promise<{
  letterPreview: string;
  emailStatus: "queued" | "sent" | "failed";
}> {
  const requestedLabel = formatOutcomeLabel(input.requestedOutcome);
  const letterPreview = [
    `Subject: Card dispute escalation - ${input.claimId}`,
    "",
    `Dear ${input.cardProviderName} Disputes Team,`,
    "",
    `Please escalate a card dispute for claim ${input.claimId}.`,
    `Merchant: ${input.supplierName} (${input.supplierEmail})`,
    `Issue: ${input.issueDescription}`,
    `Requested remedy: ${requestedLabel}`,
    `Supplier follow-ups sent: ${input.followUpsSent}`,
    "",
    "Please advise chargeback/dispute next steps.",
    "",
    "Kind regards,",
    "Prooof Claims Team",
  ].join("\n");

  const status = await dispatchEmail({
    supplierName: input.cardProviderName,
    supplierEmail: input.cardProviderEmail,
    requestedOutcome: input.requestedOutcome,
    recommendedOutcome: input.requestedOutcome,
    legalBasis: "Escalation request to card provider dispute process.",
    letterPreview,
    emailStatus: "queued",
    userId: input.userId,
    claimKind: "bill",
  });

  return {
    letterPreview,
    emailStatus: status,
  };
}
