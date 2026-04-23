import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  BillingInterval,
  BillingTier,
  BillClaimOutcome,
  Claim,
  ClaimKind,
  ClaimOutcome,
  DashboardStats,
  EmailProviderId,
  InboxScanResult,
  PlanFeatures,
  PlanPricing,
  ProductClaimOutcome,
  Product,
  Recall,
  Receipt,
  SupportedCurrency,
} from "@/types/domain";
import {
  clearBackgroundScanContext,
  registerInboxBackgroundTask,
  setBackgroundScanContext,
  unregisterInboxBackgroundTask,
} from "@/services/inboxBackgroundTask";
import {
  computeStats,
  createClaimForRecall,
  fetchSnapshotForUser,
  requestServerScanFallback,
  runMultiProviderInboxScan,
} from "@/services/prooofApi";
import {
  createStripeCheckoutSession,
  createStripePortalSession,
  getPriceForInterval,
  PLAN_PRICING,
  requestSubscriptionDowngrade,
} from "@/services/billing";
import {
  isNativeApplePayAvailable,
  startNativeApplePaySubscription,
} from "@/services/nativePayments";
import { useAuth } from "@/providers/AuthProvider";
import { env } from "@/services/env";
import {
  generateAndSendBillClaimEmail,
  generateAndSendCardEscalationEmail,
  generateAndSendClaimFollowUpEmail,
  generateAndSendProductClaimEmail,
} from "@/services/claimLettering";
import {
  CLAIM_AUTOMATION_INTERVAL_MS,
  MAX_FOLLOW_UP_ATTEMPTS,
  computeNextFollowUpDueAt,
  shouldEscalateToCardProvider,
  shouldSendFollowUp,
} from "@/services/claimAutomation";

type AppDataState = {
  receipts: Receipt[];
  products: Product[];
  recalls: Recall[];
  claims: Claim[];
  stats: DashboardStats;
};

type AppDataContextValue = AppDataState & {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  usingDemoData: boolean;
  userPlan: BillingTier;
  billingInterval: BillingInterval;
  keepAccessUntilPeriodEnd: boolean;
  planFlags: PlanFeatures;
  planPricing: Record<BillingTier, PlanPricing>;
  claimsUsed: number;
  claimsRemaining: number | null;
  claimLimitReached: boolean;
  claimTier: BillingTier;
  activePlanPriceCents: number;
  preferredCurrency: SupportedCurrency;
  scanningInbox: boolean;
  inboxScanProviders: EmailProviderId[];
  providerCoverageLabel: string;
  inboxScanLastCount: number | null;
  lastInboxScan: InboxScanResult | null;
  billMonitoringEnabled: boolean;
  refresh: () => Promise<void>;
  runInboxScan: (providers?: EmailProviderId[]) => Promise<void>;
  scanEntireInbox: () => Promise<void>;
  setPreferredCurrency: (currency: SupportedCurrency) => void;
  setUserPlan: (plan: BillingTier) => void;
  setBillingInterval: (interval: BillingInterval) => void;
  setKeepAccessUntilPeriodEnd: (value: boolean) => void;
  setInboxScanProviders: (providers: EmailProviderId[]) => void;
  startSubscriptionCheckout: (plan: Exclude<BillingTier, "free">) => Promise<{ url: string; isMock: boolean }>;
  startApplePayCheckout: (plan: Exclude<BillingTier, "free">) => Promise<{
    completed: boolean;
    reason?: "unsupported" | "not-configured" | "cancelled" | "failed";
    isMock?: boolean;
    usedCheckoutFallback?: boolean;
    checkoutUrl?: string;
  }>;
  isApplePayAvailable: () => Promise<boolean>;
  openStripeBillingPortal: () => Promise<{ url: string; isMock: boolean }>;
  downgradeToFreePlan: () => Promise<{
    willDowngradeAtPeriodEnd: boolean;
    currentPeriodEnd?: string;
    isMock: boolean;
  }>;
  scheduledDowngradeAt: string | null;
  createClaimForRecall: (recall: Recall) => Promise<void>;
  createManualClaimDraft: (input: {
    productName: string;
    estimatedPayoutCents: number;
    estimatedPayoutCurrency: string;
    issueDescription?: string;
    claimKind?: ClaimKind;
    requestedOutcome?: ClaimOutcome;
    recommendedOutcome?: ClaimOutcome;
    supplierName?: string;
    supplierEmail?: string;
    generatedLetterPreview?: string;
    emailDeliveryStatus?: "queued" | "sent" | "failed";
  }) => Promise<void>;
  submitProductClaimWithEmail: (input: {
    productName: string;
    merchant: string;
    amountCents: number;
    currency: string;
    purchaseDate: string;
    reason: string;
    signOffName: string;
    requestedOutcome: ProductClaimOutcome;
    recallId?: string;
  }) => Promise<Claim>;
  submitBillClaimWithEmail: (input: {
    billReference: string;
    supplier: string;
    amountCents: number;
    currency: string;
    reason: string;
    signOffName: string;
    requestedOutcome: BillClaimOutcome;
  }) => Promise<Claim>;
  deleteClaimById: (claimId: string) => void;
};

const EMPTY_STATS: DashboardStats = {
  receiptCount: 0,
  productsTracked: 0,
  activeRecalls: 0,
  claimsInProgress: 0,
  totalSpendCents: 0,
};

const EMPTY_STATE: AppDataState = {
  receipts: [],
  products: [],
  recalls: [],
  claims: [],
  stats: EMPTY_STATS,
};

const PLAN_CONFIG: Record<
  BillingTier,
  {
    claimLimitPerMonth: number | null;
    features: PlanFeatures;
  }
> = {
  free: {
    claimLimitPerMonth: 5,
    features: {
      billMonitoring: false,
      billAlerts: false,
      chasing: false,
      prioritySupport: false,
    },
  },
  premium: {
    claimLimitPerMonth: 20,
    features: {
      billMonitoring: true,
      billAlerts: true,
      chasing: true,
      prioritySupport: false,
    },
  },
  unlimited: {
    claimLimitPerMonth: null,
    features: {
      billMonitoring: true,
      billAlerts: true,
      chasing: true,
      prioritySupport: true,
    },
  },
};

const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["GBP", "USD", "EUR", "CAD", "AUD", "JPY"];
const DEFAULT_INBOX_PROVIDERS: EmailProviderId[] = [
  "gmail",
  "yahoo",
  "outlook",
  "office365",
  "exchange",
  "work-imap",
];
const PROVIDER_LABELS: Record<EmailProviderId, string> = {
  gmail: "Gmail",
  yahoo: "Yahoo Mail",
  outlook: "Outlook / Hotmail / Live",
  office365: "Microsoft 365 / Exchange Online",
  exchange: "Microsoft Exchange (on-prem/work)",
  "work-imap": "Work IMAP / Custom Domains",
};

const MOCK_FX_RATES_TO_GBP: Record<SupportedCurrency, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.86,
  CAD: 0.58,
  AUD: 0.52,
  JPY: 0.0052,
};

function toBillingCycleMonth(dateLike: string | Date): string {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function getPlanFromUserMetadata(user: { user_metadata?: Record<string, unknown> } | null): BillingTier {
  const raw = user?.user_metadata?.plan;
  if (raw === "free" || raw === "premium" || raw === "unlimited") {
    return raw;
  }
  return "free";
}

function normalizeCurrency(input: string | undefined): SupportedCurrency {
  if (!input) return "GBP";
  const upper = input.toUpperCase();
  return SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency) ? (upper as SupportedCurrency) : "GBP";
}

function detectClaimResponseStatus(claim: Claim): Claim["responseStatus"] {
  const body = [
    claim.generatedLetterPreview ?? "",
    claim.escalationLetterPreview ?? "",
    claim.issueDescription ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (!body.trim()) {
    return claim.responseStatus ?? "waiting";
  }
  if (
    body.includes("resolved") ||
    body.includes("accepted") ||
    body.includes("refund issued") ||
    body.includes("replacement approved") ||
    body.includes("settled")
  ) {
    return "resolved";
  }
  if (
    body.includes("declined") ||
    body.includes("rejected") ||
    body.includes("final response")
  ) {
    return "declined";
  }
  if (
    body.includes("need more information") ||
    body.includes("please provide") ||
    body.includes("awaiting your response")
  ) {
    return "awaiting-customer";
  }
  if (claim.escalationTriggeredAt) {
    return "escalated";
  }
  return claim.responseStatus ?? "waiting";
}

function inferCardProviderName(
  supplierName?: string,
  issueDescription?: string,
): string {
  const text = `${supplierName ?? ""} ${issueDescription ?? ""}`.toLowerCase();
  if (text.includes("amex") || text.includes("american express")) {
    return "American Express";
  }
  if (text.includes("mastercard") || text.includes("master card")) {
    return "Mastercard";
  }
  if (text.includes("visa")) {
    return "Visa";
  }
  if (text.includes("monzo")) {
    return "Monzo";
  }
  if (text.includes("barclay")) {
    return "Barclays";
  }
  if (text.includes("lloyds")) {
    return "Lloyds";
  }
  return "Card issuer";
}

function inferCardProviderEmail(cardProviderName?: string): string {
  const provider = (cardProviderName ?? "").toLowerCase();
  if (provider.includes("american express") || provider.includes("amex")) {
    return "disputes@americanexpress.com";
  }
  if (provider.includes("visa")) {
    return "chargebacks@visa.com";
  }
  if (provider.includes("mastercard")) {
    return "chargebacks@mastercard.com";
  }
  if (provider.includes("barclays")) {
    return "disputes@barclays.co.uk";
  }
  if (provider.includes("lloyds")) {
    return "disputes@lloydsbanking.com";
  }
  return "disputes@cardissuer.example";
}

function convertCents(valueInCents: number, fromCurrency: string, toCurrency: SupportedCurrency): number {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const valueInGbp = valueInCents * MOCK_FX_RATES_TO_GBP[from];
  return Math.round(valueInGbp / MOCK_FX_RATES_TO_GBP[to]);
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppDataState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferredCurrency, setPreferredCurrencyState] = useState<SupportedCurrency>("GBP");
  const [userPlan, setUserPlanState] = useState<BillingTier>("free");
  const [billingInterval, setBillingIntervalState] = useState<BillingInterval>("monthly");
  const [keepAccessUntilPeriodEnd, setKeepAccessUntilPeriodEndState] = useState(true);
  const [scheduledDowngradeAt, setScheduledDowngradeAt] = useState<string | null>(null);
  const [scanningInbox, setScanningInbox] = useState(false);
  const [inboxScanProviders, setInboxScanProvidersState] = useState<EmailProviderId[]>(DEFAULT_INBOX_PROVIDERS);
  const [inboxScanLastCount, setInboxScanLastCount] = useState<number | null>(null);
  const [lastInboxScan, setLastInboxScan] = useState<InboxScanResult | null>(null);
  const autoScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScanInFlightRef = useRef(false);
  const claimAutomationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const claimAutomationInFlightRef = useRef(false);
  const preferredCurrencyHydratedRef = useRef(false);

  const loadData = useCallback(async () => {
    setError(null);

    if (!user?.id) {
      setState(EMPTY_STATE);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const nextPlan = getPlanFromUserMetadata(user);
      setUserPlanState(nextPlan);
      if (user.user_metadata?.billing_interval === "monthly" || user.user_metadata?.billing_interval === "yearly") {
        setBillingIntervalState(user.user_metadata.billing_interval);
      }
      if (typeof user.user_metadata?.keep_access_until_period_end === "boolean") {
        setKeepAccessUntilPeriodEndState(user.user_metadata.keep_access_until_period_end);
      }
      const metadataPreferredCurrency =
        typeof user.user_metadata?.preferred_currency === "string"
          ? normalizeCurrency(user.user_metadata.preferred_currency)
          : null;
      const effectiveCurrency =
        metadataPreferredCurrency && !preferredCurrencyHydratedRef.current
          ? metadataPreferredCurrency
          : preferredCurrency;
      if (metadataPreferredCurrency && !preferredCurrencyHydratedRef.current) {
        preferredCurrencyHydratedRef.current = true;
        if (metadataPreferredCurrency !== preferredCurrency) {
          setPreferredCurrencyState(metadataPreferredCurrency);
        }
      }
      const snapshot = await fetchSnapshotForUser(user.id);
      const nowIso = new Date().toISOString();
      const convertedSnapshot: AppDataState = {
        ...snapshot,
        stats: {
          ...computeStats(snapshot),
          totalSpendCents: snapshot.receipts.reduce(
            (sum, receipt) => sum + convertCents(receipt.totalCents, receipt.currency, effectiveCurrency),
            0,
          ),
        },
        receipts: snapshot.receipts.map((receipt) => ({
          ...receipt,
          totalCents: convertCents(receipt.totalCents, receipt.currency, effectiveCurrency),
          currency: effectiveCurrency,
          supplierWarrantySource: receipt.supplierWarrantySource,
          supplierWarrantyMonths: receipt.supplierWarrantyMonths,
        })),
        recalls: snapshot.recalls.map((recall) => ({
          ...recall,
          estimatedPayoutCents: convertCents(
            recall.estimatedPayoutCents,
            recall.estimatedPayoutCurrency,
            effectiveCurrency,
          ),
          estimatedPayoutCurrency: effectiveCurrency,
        })),
        claims: snapshot.claims.map((claim) => {
          const responseStatus = detectClaimResponseStatus(claim);
          const responseReceived =
            responseStatus === "received" ||
            responseStatus === "resolved" ||
            responseStatus === "declined";
          const cardProviderName =
            claim.cardProviderName ??
            claim.cardProvider ??
            inferCardProviderName(claim.supplierName, claim.issueDescription);
          const followUpIntervalDays = claim.followUpIntervalDays ?? 5;
          const followUpCount = claim.followUpCount ?? claim.followUpsSent ?? 0;
          return {
            ...claim,
            estimatedPayoutCents: convertCents(
              claim.estimatedPayoutCents,
              claim.estimatedPayoutCurrency,
              effectiveCurrency,
            ),
            estimatedPayoutCurrency: effectiveCurrency,
            followUpEnabled: claim.followUpEnabled ?? true,
            followUpIntervalDays,
            followUpCount,
            followUpsSent: followUpCount,
            nextFollowUpAt:
              claim.nextFollowUpAt ??
              computeNextFollowUpDueAt(claim.createdAt, followUpIntervalDays),
            escalationEnabled: claim.escalationEnabled ?? true,
            escalateAfterFollowUps:
              claim.escalateAfterFollowUps ?? MAX_FOLLOW_UP_ATTEMPTS,
            cardProviderName,
            cardProvider: cardProviderName,
            cardProviderEmail:
              claim.cardProviderEmail ?? inferCardProviderEmail(cardProviderName),
            responseStatus,
            heardBackAt: claim.heardBackAt ?? (responseReceived ? nowIso : undefined),
          };
        }),
      };
      setState(convertedSnapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load dashboard data.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preferredCurrency, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadData().catch(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const createClaimForRecallAction = useCallback(
    async (recall: Recall) => {
      if (!user?.id) {
        return;
      }
      const planConfig = PLAN_CONFIG[userPlan];
      const currentMonth = toBillingCycleMonth(new Date());
      const claimsUsedThisMonth = state.claims.filter(
        (claim) => toBillingCycleMonth(claim.createdAt) === currentMonth,
      ).length;
      if (
        planConfig.claimLimitPerMonth !== null &&
        claimsUsedThisMonth >= planConfig.claimLimitPerMonth
      ) {
        throw new Error(
          `Monthly claim limit reached for ${userPlan} plan. Upgrade your plan to file more claims.`,
        );
      }
      const claim = await createClaimForRecall(user.id, recall);
      setState((current) => ({
        ...current,
        claims: [claim, ...current.claims],
        stats: {
          ...current.stats,
          claimsInProgress:
            claim.status === "paid" || claim.status === "rejected"
              ? current.stats.claimsInProgress
              : current.stats.claimsInProgress + 1,
        },
      }));
    },
    [state.claims, user?.id, userPlan],
  );

  const createManualClaimDraft = useCallback(
    async (input: {
      productName: string;
      estimatedPayoutCents: number;
      estimatedPayoutCurrency: string;
      issueDescription?: string;
      claimKind?: ClaimKind;
      requestedOutcome?: ClaimOutcome;
      recommendedOutcome?: ClaimOutcome;
      supplierName?: string;
      supplierEmail?: string;
      generatedLetterPreview?: string;
      emailDeliveryStatus?: "queued" | "sent" | "failed";
    }) => {
      const planConfig = PLAN_CONFIG[userPlan];
      const currentMonth = toBillingCycleMonth(new Date());
      const claimsUsedThisMonth = state.claims.filter(
        (claim) => toBillingCycleMonth(claim.createdAt) === currentMonth,
      ).length;
      if (
        planConfig.claimLimitPerMonth !== null &&
        claimsUsedThisMonth >= planConfig.claimLimitPerMonth
      ) {
        throw new Error(
          `Monthly claim limit reached for ${userPlan} plan. Upgrade your plan to file more claims.`,
        );
      }
      const draftClaim: Claim = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recallId: `manual-${Date.now()}`,
        productName: input.productName,
        status: "draft",
        createdAt: new Date().toISOString(),
        estimatedPayoutCents: Math.max(0, Math.round(input.estimatedPayoutCents)),
        estimatedPayoutCurrency: input.estimatedPayoutCurrency,
        kind: input.claimKind ?? "product",
        requestedOutcome: input.requestedOutcome,
        recommendedOutcome: input.recommendedOutcome,
        issueDescription: input.issueDescription,
        supplierName: input.supplierName,
        supplierEmail: input.supplierEmail,
        generatedLetterPreview: input.generatedLetterPreview,
        emailDeliveryStatus: input.emailDeliveryStatus,
      };
      setState((current) => ({
        ...current,
        claims: [draftClaim, ...current.claims],
        stats: {
          ...current.stats,
          claimsInProgress: current.stats.claimsInProgress + 1,
        },
      }));
    },
    [state.claims, userPlan],
  );

  const submitProductClaimWithEmail = useCallback(
    async (input: {
      productName: string;
      merchant: string;
      amountCents: number;
      currency: string;
      purchaseDate: string;
      reason: string;
      signOffName: string;
      requestedOutcome: ProductClaimOutcome;
      recallId?: string;
    }) => {
      if (!user?.id) {
        throw new Error("Sign in before creating claims.");
      }
      const letter = await generateAndSendProductClaimEmail({
        userId: user.id,
        merchant: input.merchant,
        productName: input.productName,
        amountCents: input.amountCents,
        currency: input.currency,
        purchaseDate: input.purchaseDate,
        userReason: input.reason,
        signerName: input.signOffName,
        requestedOutcome: input.requestedOutcome,
      });
      const claim: Claim = {
        id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recallId: input.recallId ?? `product-${Date.now()}`,
        productName: input.productName,
        status: letter.emailStatus === "failed" ? "rejected" : "submitted",
        createdAt: new Date().toISOString(),
        estimatedPayoutCents: Math.max(0, Math.round(input.amountCents * 0.4)),
        estimatedPayoutCurrency: input.currency,
        kind: "product",
        requestedOutcome: letter.requestedOutcome,
        recommendedOutcome: letter.recommendedOutcome,
        issueDescription: input.reason,
        supplierName: letter.supplierName,
        supplierEmail: letter.supplierEmail,
        generatedLetterPreview: letter.letterPreview,
        emailDeliveryStatus: letter.emailStatus,
        followUpEnabled: true,
        followUpIntervalDays: 5,
        followUpCount: 0,
        nextFollowUpAt: computeNextFollowUpDueAt(undefined, 5),
        escalationEnabled: true,
        escalateAfterFollowUps: MAX_FOLLOW_UP_ATTEMPTS,
        cardProvider: inferCardProviderName(input.merchant, input.reason),
        cardProviderName: inferCardProviderName(input.merchant, input.reason),
        cardProviderEmail: inferCardProviderEmail(
          inferCardProviderName(input.merchant, input.reason),
        ),
        cardLastFour: "1001",
        responseStatus: "waiting",
      };
      setState((current) => ({
        ...current,
        claims: [claim, ...current.claims],
        stats: {
          ...current.stats,
          claimsInProgress: claim.status === "rejected" ? current.stats.claimsInProgress : current.stats.claimsInProgress + 1,
        },
      }));
      return claim;
    },
    [state.claims, user?.id, userPlan],
  );

  const submitBillClaimWithEmail = useCallback(
    async (input: {
      billReference: string;
      supplier: string;
      amountCents: number;
      currency: string;
      reason: string;
      signOffName: string;
      requestedOutcome: BillClaimOutcome;
    }) => {
      if (!user?.id) {
        throw new Error("Sign in before creating claims.");
      }
      const letter = await generateAndSendBillClaimEmail({
        userId: user.id,
        supplier: input.supplier,
        billReference: input.billReference,
        amountCents: input.amountCents,
        currency: input.currency,
        userReason: input.reason,
        signerName: input.signOffName,
        requestedOutcome: input.requestedOutcome,
      });
      const claim: Claim = {
        id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        recallId: `bill-${Date.now()}`,
        productName: input.billReference,
        status: letter.emailStatus === "failed" ? "rejected" : "submitted",
        createdAt: new Date().toISOString(),
        estimatedPayoutCents: Math.max(0, Math.round(input.amountCents)),
        estimatedPayoutCurrency: input.currency,
        kind: "bill",
        requestedOutcome: letter.requestedOutcome,
        recommendedOutcome: letter.recommendedOutcome,
        issueDescription: input.reason,
        supplierName: letter.supplierName,
        supplierEmail: letter.supplierEmail,
        generatedLetterPreview: letter.letterPreview,
        emailDeliveryStatus: letter.emailStatus,
        followUpEnabled: true,
        followUpIntervalDays: 5,
        followUpCount: 0,
        nextFollowUpAt: computeNextFollowUpDueAt(undefined, 5),
        escalationEnabled: true,
        escalateAfterFollowUps: MAX_FOLLOW_UP_ATTEMPTS,
        cardProvider: inferCardProviderName(input.supplier, input.reason),
        cardProviderName: inferCardProviderName(input.supplier, input.reason),
        cardProviderEmail: inferCardProviderEmail(
          inferCardProviderName(input.supplier, input.reason),
        ),
        cardLastFour: "1001",
        responseStatus: "waiting",
      };
      setState((current) => ({
        ...current,
        claims: [claim, ...current.claims],
        stats: {
          ...current.stats,
          claimsInProgress: claim.status === "rejected" ? current.stats.claimsInProgress : current.stats.claimsInProgress + 1,
        },
      }));
      return claim;
    },
    [state.claims, user?.id, userPlan],
  );

  const deleteClaimById = useCallback((claimId: string) => {
    setState((current) => {
      const nextClaims = current.claims.filter((claim) => claim.id !== claimId);
      if (nextClaims.length === current.claims.length) {
        return current;
      }
      return {
        ...current,
        claims: nextClaims,
        stats: {
          ...current.stats,
          claimsInProgress: nextClaims.filter(
            (claim) =>
              claim.status === "draft" ||
              claim.status === "submitted" ||
              claim.status === "processing",
          ).length,
        },
      };
    });
  }, []);

  const runInboxScan = useCallback(async (providers?: EmailProviderId[]) => {
    if (!user?.id) return;

    try {
      setScanningInbox(true);
      setError(null);
      const result = await runMultiProviderInboxScan(user.id, providers ?? inboxScanProviders);
      setInboxScanLastCount(result.scannedEmails);
      setLastInboxScan(result);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inbox scan failed.";
      setError(message);
    } finally {
      setScanningInbox(false);
    }
  }, [inboxScanProviders, loadData, user?.id]);

  const runInboxScanSilently = useCallback(async () => {
    if (!user?.id || autoScanInFlightRef.current) return;
    autoScanInFlightRef.current = true;
    try {
      const result = await runMultiProviderInboxScan(user.id, inboxScanProviders);
      setInboxScanLastCount(result.scannedEmails);
      setLastInboxScan(result);
      if (env.serverScanFallbackEnabled) {
        await requestServerScanFallback(user.id, inboxScanProviders);
      }
      await loadData();
    } catch {
      // Keep background scanning resilient and avoid surfacing noisy errors to users.
    } finally {
      autoScanInFlightRef.current = false;
    }
  }, [inboxScanProviders, loadData, user?.id]);

  useEffect(() => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }

    if (!user?.id || !env.autoInboxScanEnabled) {
      autoScanInFlightRef.current = false;
      return;
    }

    void runInboxScanSilently();
    autoScanTimerRef.current = setInterval(() => {
      void runInboxScanSilently();
    }, env.autoInboxScanIntervalMs);

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
      autoScanInFlightRef.current = false;
    };
  }, [inboxScanProviders, runInboxScanSilently, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const syncBackgroundTask = async () => {
      if (!user?.id || !env.backgroundInboxTaskEnabled) {
        await clearBackgroundScanContext();
        await unregisterInboxBackgroundTask();
        return;
      }
      await setBackgroundScanContext(user.id, inboxScanProviders);
      if (cancelled) return;
      await registerInboxBackgroundTask();
    };

    void syncBackgroundTask();

    return () => {
      cancelled = true;
    };
  }, [inboxScanProviders, user?.id]);

  const runClaimAutomation = useCallback(async () => {
    if (!user?.id || !planFlags.chasing || claimAutomationInFlightRef.current) {
      return;
    }
    claimAutomationInFlightRef.current = true;
    try {
      const nowIso = new Date().toISOString();
      const nextClaims: Claim[] = [];
      let changed = false;

      for (const claim of state.claims) {
        let nextClaim: Claim = { ...claim };
        const inferredCardProvider =
          nextClaim.cardProviderName ??
          nextClaim.cardProvider ??
          inferCardProviderName(nextClaim.supplierName, nextClaim.issueDescription);
        const inferredCardEmail =
          nextClaim.cardProviderEmail ?? inferCardProviderEmail(inferredCardProvider);

        if (
          nextClaim.cardProviderName !== inferredCardProvider ||
          nextClaim.cardProvider !== inferredCardProvider ||
          nextClaim.cardProviderEmail !== inferredCardEmail
        ) {
          nextClaim = {
            ...nextClaim,
            cardProviderName: inferredCardProvider,
            cardProvider: inferredCardProvider,
            cardProviderEmail: inferredCardEmail,
          };
          changed = true;
        }

        nextClaim.followUpEnabled = nextClaim.followUpEnabled ?? true;
        nextClaim.followUpIntervalDays = nextClaim.followUpIntervalDays ?? 5;
        nextClaim.followUpCount = nextClaim.followUpCount ?? nextClaim.followUpsSent ?? 0;
        nextClaim.followUpsSent = nextClaim.followUpCount;
        nextClaim.escalationEnabled = nextClaim.escalationEnabled ?? true;
        nextClaim.escalateAfterFollowUps =
          nextClaim.escalateAfterFollowUps ?? MAX_FOLLOW_UP_ATTEMPTS;
        if (!nextClaim.nextFollowUpAt) {
          nextClaim.nextFollowUpAt = computeNextFollowUpDueAt(
            nextClaim.createdAt,
            nextClaim.followUpIntervalDays,
          );
          changed = true;
        }

        const detectedResponseStatus = detectClaimResponseStatus(nextClaim);
        if (detectedResponseStatus !== nextClaim.responseStatus) {
          nextClaim.responseStatus = detectedResponseStatus;
          changed = true;
        }
        const heardBack =
          detectedResponseStatus === "received" ||
          detectedResponseStatus === "resolved" ||
          detectedResponseStatus === "declined";
        if (heardBack && !nextClaim.heardBackAt) {
          nextClaim.heardBackAt = nowIso;
          changed = true;
        }
        if (detectedResponseStatus === "resolved" && nextClaim.status !== "paid") {
          nextClaim.status = "paid";
          changed = true;
        }
        if (detectedResponseStatus === "declined" && nextClaim.status !== "rejected") {
          nextClaim.status = "rejected";
          changed = true;
        }

        if (shouldEscalateToCardProvider(nextClaim)) {
          const escalation = await generateAndSendCardEscalationEmail({
            userId: user.id,
            claimId: nextClaim.id,
            cardProviderName: inferredCardProvider,
            cardProviderEmail: inferredCardEmail,
            supplierName: nextClaim.supplierName ?? "Supplier",
            supplierEmail: nextClaim.supplierEmail ?? "support@supplier.example",
            productName: nextClaim.productName,
            issueDescription:
              nextClaim.issueDescription ?? "Claim issue detail unavailable.",
            requestedOutcome: nextClaim.requestedOutcome ?? "not-sure",
            followUpsSent: nextClaim.followUpCount ?? 0,
          });
          nextClaim = {
            ...nextClaim,
            escalatedToCardProvider: escalation.emailStatus !== "failed",
            escalationTriggeredAt:
              escalation.emailStatus !== "failed"
                ? nowIso
                : nextClaim.escalationTriggeredAt,
            escalationProvider: inferredCardProvider,
            escalationEmail: inferredCardEmail,
            escalationLetterPreview: escalation.letterPreview,
            escalationEmailStatus: escalation.emailStatus,
            responseStatus:
              escalation.emailStatus !== "failed"
                ? "escalated"
                : nextClaim.responseStatus,
            nextFollowUpAt:
              escalation.emailStatus !== "failed"
                ? undefined
                : computeNextFollowUpDueAt(nowIso, nextClaim.followUpIntervalDays),
          };
          changed = true;
        } else if (shouldSendFollowUp(nextClaim, nowIso)) {
          const followUpNumber = (nextClaim.followUpCount ?? 0) + 1;
          const followUp = await generateAndSendClaimFollowUpEmail({
            userId: user.id,
            claimKind: nextClaim.kind ?? "product",
            claimId: nextClaim.id,
            supplierName: nextClaim.supplierName ?? "Supplier",
            supplierEmail: nextClaim.supplierEmail ?? "support@supplier.example",
            productName: nextClaim.productName,
            issueDescription:
              nextClaim.issueDescription ?? "Claim issue detail unavailable.",
            requestedOutcome: nextClaim.requestedOutcome ?? "not-sure",
            followUpNumber,
          });
          nextClaim = {
            ...nextClaim,
            followUpCount:
              followUp.emailStatus !== "failed"
                ? followUpNumber
                : nextClaim.followUpCount,
            followUpsSent:
              followUp.emailStatus !== "failed"
                ? followUpNumber
                : nextClaim.followUpsSent,
            lastFollowUpAt:
              followUp.emailStatus !== "failed" ? nowIso : nextClaim.lastFollowUpAt,
            nextFollowUpAt: computeNextFollowUpDueAt(
              nowIso,
              nextClaim.followUpIntervalDays,
            ),
            generatedLetterPreview:
              followUp.emailStatus !== "failed"
                ? followUp.letterPreview
                : nextClaim.generatedLetterPreview,
            emailDeliveryStatus: followUp.emailStatus,
          };
          changed = true;
        }

        nextClaims.push(nextClaim);
      }

      if (changed) {
        setState((current) => ({
          ...current,
          claims: nextClaims,
          stats: {
            ...current.stats,
            claimsInProgress: nextClaims.filter(
              (claim) =>
                claim.status === "draft" ||
                claim.status === "submitted" ||
                claim.status === "processing",
            ).length,
          },
        }));
      }
    } finally {
      claimAutomationInFlightRef.current = false;
    }
  }, [state.claims, user?.id]);

  const claimsUsed = useMemo(() => {
    const currentMonth = toBillingCycleMonth(new Date());
    return state.claims.filter((claim) => toBillingCycleMonth(claim.createdAt) === currentMonth).length;
  }, [state.claims]);

  const claimsRemaining = useMemo(() => {
    const tierConfig = PLAN_CONFIG[userPlan];
    if (tierConfig.claimLimitPerMonth === null) return null;
    return Math.max(0, tierConfig.claimLimitPerMonth - claimsUsed);
  }, [claimsUsed, userPlan]);

  const claimLimitReached = claimsRemaining !== null && claimsRemaining <= 0;
  const planFlags = PLAN_CONFIG[userPlan].features;

  useEffect(() => {
    if (claimAutomationTimerRef.current) {
      clearInterval(claimAutomationTimerRef.current);
      claimAutomationTimerRef.current = null;
    }
    if (!user?.id || !planFlags.chasing) {
      claimAutomationInFlightRef.current = false;
      return;
    }
    void runClaimAutomation();
    claimAutomationTimerRef.current = setInterval(() => {
      void runClaimAutomation();
    }, CLAIM_AUTOMATION_INTERVAL_MS);
    return () => {
      if (claimAutomationTimerRef.current) {
        clearInterval(claimAutomationTimerRef.current);
        claimAutomationTimerRef.current = null;
      }
      claimAutomationInFlightRef.current = false;
    };
  }, [planFlags.chasing, runClaimAutomation, user?.id]);

  const setPreferredCurrency = useCallback((currency: SupportedCurrency) => {
    setPreferredCurrencyState(normalizeCurrency(currency));
  }, []);

  const setUserPlan = useCallback((plan: BillingTier) => {
    setUserPlanState(plan);
  }, []);

  const setBillingInterval = useCallback((interval: BillingInterval) => {
    setBillingIntervalState(interval);
  }, []);

  const setKeepAccessUntilPeriodEnd = useCallback((value: boolean) => {
    setKeepAccessUntilPeriodEndState(value);
  }, []);

  const setInboxScanProviders = useCallback((providers: EmailProviderId[]) => {
    setInboxScanProvidersState(
      providers.length > 0 ? providers : DEFAULT_INBOX_PROVIDERS,
    );
  }, []);

  const startSubscriptionCheckout = useCallback(
    async (plan: Exclude<BillingTier, "free">) => {
      if (!user?.id) {
        throw new Error("Sign in before managing subscriptions.");
      }
      const result = await createStripeCheckoutSession({
        userId: user.id,
        email: user.email,
        plan,
        interval: billingInterval,
        successUrl: `${env.supportUrl}/billing/success`,
        cancelUrl: `${env.supportUrl}/billing/cancelled`,
      });
      if (result.isMock) {
        setUserPlanState(plan);
      }
      return result;
    },
    [billingInterval, user?.email, user?.id],
  );

  const startApplePayCheckout = useCallback(
    async (plan: Exclude<BillingTier, "free">) => {
      if (!user?.id) {
        throw new Error("Sign in before managing subscriptions.");
      }

      const result = await startNativeApplePaySubscription({
        userId: user.id,
        email: user.email,
        plan,
        interval: billingInterval,
        successUrl: `${env.supportUrl}/billing/success`,
        cancelUrl: `${env.supportUrl}/billing/cancelled`,
      });

      if (!result.completed && (result.reason === "not-configured" || result.reason === "unsupported")) {
        const checkout = await createStripeCheckoutSession({
          userId: user.id,
          email: user.email,
          plan,
          interval: billingInterval,
          successUrl: `${env.supportUrl}/billing/success`,
          cancelUrl: `${env.supportUrl}/billing/cancelled`,
        });
        if (checkout.isMock) {
          setUserPlanState(plan);
        }
        return {
          completed: false,
          reason: result.reason,
          isMock: checkout.isMock,
          usedCheckoutFallback: true,
          checkoutUrl: checkout.url,
        };
      }

      if (result.completed) {
        setUserPlanState(plan);
      }
      return {
        completed: result.completed,
        reason: result.completed ? undefined : result.reason,
        usedCheckoutFallback: false,
      };
    },
    [billingInterval, user?.email, user?.id],
  );

  const isApplePayAvailable = useCallback(async () => {
    return isNativeApplePayAvailable();
  }, []);

  const openStripeBillingPortal = useCallback(async () => {
    if (!user?.id) {
      throw new Error("Sign in before opening billing portal.");
    }
    return createStripePortalSession({
      userId: user.id,
      returnUrl: `${env.supportUrl}/settings`,
    });
  }, [user?.id]);

  const downgradeToFreePlan = useCallback(async () => {
    if (!user?.id) {
      throw new Error("Sign in before changing subscription.");
    }
    const result = await requestSubscriptionDowngrade({
      userId: user.id,
      keepAccessUntilPeriodEnd,
    });
    if (result.willDowngradeAtPeriodEnd) {
      setScheduledDowngradeAt(result.currentPeriodEnd ?? null);
    } else {
      setScheduledDowngradeAt(null);
      setUserPlanState("free");
    }
    if (result.isMock && !keepAccessUntilPeriodEnd) {
      setUserPlanState("free");
    }
    return result;
  }, [keepAccessUntilPeriodEnd, user?.id]);

  const providerCoverageLabel = useMemo(() => {
    if (inboxScanProviders.length === 0) return "No providers selected";
    if (inboxScanProviders.length === DEFAULT_INBOX_PROVIDERS.length) {
      return "All linked providers: Gmail, Yahoo, Outlook, Office 365, Exchange/IMAP work inboxes";
    }
    return `Selected providers: ${inboxScanProviders
      .map((provider) => PROVIDER_LABELS[provider] ?? provider)
      .join(", ")}`;
  }, [inboxScanProviders]);

  const activePlanPriceCents = useMemo(
    () => convertCents(getPriceForInterval(userPlan, billingInterval), "GBP", preferredCurrency),
    [billingInterval, preferredCurrency, userPlan],
  );
  const convertedPlanPricing = useMemo<Record<BillingTier, PlanPricing>>(
    () => ({
      free: PLAN_PRICING.free,
      premium: {
        ...PLAN_PRICING.premium,
        monthlyPriceCents: convertCents(PLAN_PRICING.premium.monthlyPriceCents, "GBP", preferredCurrency),
        yearlyPriceCents: convertCents(PLAN_PRICING.premium.yearlyPriceCents, "GBP", preferredCurrency),
      },
      unlimited: {
        ...PLAN_PRICING.unlimited,
        monthlyPriceCents: convertCents(PLAN_PRICING.unlimited.monthlyPriceCents, "GBP", preferredCurrency),
        yearlyPriceCents: convertCents(PLAN_PRICING.unlimited.yearlyPriceCents, "GBP", preferredCurrency),
      },
    }),
    [preferredCurrency],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...state,
      loading,
      refreshing,
      error,
      usingDemoData: !env.hasSupabaseConfig,
      userPlan,
      billingInterval,
      keepAccessUntilPeriodEnd,
      planFlags,
      planPricing: convertedPlanPricing,
      claimsUsed,
      claimsRemaining,
      claimLimitReached,
      claimTier: userPlan,
      activePlanPriceCents,
      preferredCurrency,
      scanningInbox,
      inboxScanProviders,
      providerCoverageLabel,
      inboxScanLastCount,
      lastInboxScan,
      billMonitoringEnabled: planFlags.billMonitoring,
      refresh,
      runInboxScan,
      scanEntireInbox: () => runInboxScan(DEFAULT_INBOX_PROVIDERS),
      setPreferredCurrency,
      setUserPlan,
      setBillingInterval,
      setKeepAccessUntilPeriodEnd,
      setInboxScanProviders,
      startSubscriptionCheckout,
      startApplePayCheckout,
      isApplePayAvailable,
      openStripeBillingPortal,
      downgradeToFreePlan,
      scheduledDowngradeAt,
      createClaimForRecall: createClaimForRecallAction,
      createManualClaimDraft,
      submitProductClaimWithEmail,
      submitBillClaimWithEmail,
      deleteClaimById,
    }),
    [
      state,
      loading,
      refreshing,
      error,
      userPlan,
      billingInterval,
      keepAccessUntilPeriodEnd,
      planFlags,
      convertedPlanPricing,
      claimsUsed,
      claimsRemaining,
      claimLimitReached,
      activePlanPriceCents,
      preferredCurrency,
      scanningInbox,
      inboxScanProviders,
      providerCoverageLabel,
      inboxScanLastCount,
      lastInboxScan,
      refresh,
      runInboxScan,
      setPreferredCurrency,
      setUserPlan,
      setBillingInterval,
      setKeepAccessUntilPeriodEnd,
      setInboxScanProviders,
      startSubscriptionCheckout,
      startApplePayCheckout,
      isApplePayAvailable,
      openStripeBillingPortal,
      downgradeToFreePlan,
      scheduledDowngradeAt,
      createClaimForRecallAction,
      createManualClaimDraft,
      submitProductClaimWithEmail,
      submitBillClaimWithEmail,
      deleteClaimById,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}
