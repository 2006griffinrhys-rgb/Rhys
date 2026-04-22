import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  BillingInterval,
  BillingTier,
  Claim,
  DashboardStats,
  EmailProviderId,
  InboxScanResult,
  PlanFeatures,
  PlanPricing,
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
import { useAuth } from "@/providers/AuthProvider";
import { env } from "@/services/env";

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
  }) => Promise<void>;
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
      if (typeof user.user_metadata?.preferred_currency === "string") {
        setPreferredCurrencyState(normalizeCurrency(user.user_metadata.preferred_currency));
      }
      const snapshot = await fetchSnapshotForUser(user.id);
      const convertedSnapshot: AppDataState = {
        ...snapshot,
        stats: {
          ...computeStats(snapshot),
          totalSpendCents: snapshot.receipts.reduce(
            (sum, receipt) => sum + convertCents(receipt.totalCents, receipt.currency, preferredCurrency),
            0,
          ),
        },
        receipts: snapshot.receipts.map((receipt) => ({
          ...receipt,
          totalCents: convertCents(receipt.totalCents, receipt.currency, preferredCurrency),
          currency: preferredCurrency,
        })),
        recalls: snapshot.recalls.map((recall) => ({
          ...recall,
          estimatedPayoutCents: convertCents(
            recall.estimatedPayoutCents,
            recall.estimatedPayoutCurrency,
            preferredCurrency,
          ),
          estimatedPayoutCurrency: preferredCurrency,
        })),
        claims: snapshot.claims.map((claim) => ({
          ...claim,
          estimatedPayoutCents: convertCents(
            claim.estimatedPayoutCents,
            claim.estimatedPayoutCurrency,
            preferredCurrency,
          ),
          estimatedPayoutCurrency: preferredCurrency,
        })),
      };
      setState(convertedSnapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load dashboard data.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

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
    return `Selected providers: ${inboxScanProviders.join(", ")}`;
  }, [inboxScanProviders]);

  const activePlanPriceCents = useMemo(
    () => getPriceForInterval(userPlan, billingInterval),
    [billingInterval, userPlan],
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
      planPricing: PLAN_PRICING,
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
      openStripeBillingPortal,
      downgradeToFreePlan,
      scheduledDowngradeAt,
      createClaimForRecall: createClaimForRecallAction,
      createManualClaimDraft,
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
      openStripeBillingPortal,
      downgradeToFreePlan,
      scheduledDowngradeAt,
      createClaimForRecallAction,
      createManualClaimDraft,
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
