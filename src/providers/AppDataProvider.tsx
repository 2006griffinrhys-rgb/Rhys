import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  Claim,
  DashboardStats,
  PlanFeatures,
  Product,
  Recall,
  Receipt,
  SupportedCurrency,
  BillingTier,
} from "@/types/domain";
import {
  computeStats,
  createClaimForRecall,
  fetchSnapshotForUser,
  runUnlimitedInboxScan,
} from "@/services/prooofApi";
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
  planFlags: PlanFeatures;
  claimsUsed: number;
  claimsRemaining: number | null;
  claimLimitReached: boolean;
  claimTier: BillingTier;
  preferredCurrency: SupportedCurrency;
  scanningInbox: boolean;
  billMonitoringEnabled: boolean;
  refresh: () => Promise<void>;
  runInboxScan: () => Promise<void>;
  scanEntireInbox: () => Promise<void>;
  setPreferredCurrency: (currency: SupportedCurrency) => void;
  setUserPlan: (plan: BillingTier) => void;
  createClaimForRecall: (recall: Recall) => Promise<void>;
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
  const [scanningInbox, setScanningInbox] = useState(false);

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

  const runInboxScan = useCallback(async () => {
    if (!user?.id) return;

    try {
      setScanningInbox(true);
      setError(null);
      await runUnlimitedInboxScan(user.id);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Inbox scan failed.";
      setError(message);
    } finally {
      setScanningInbox(false);
    }
  }, [loadData, user?.id]);

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

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...state,
      loading,
      refreshing,
      error,
      usingDemoData: !env.hasSupabaseConfig,
      userPlan,
      planFlags,
      claimsUsed,
      claimsRemaining,
      claimLimitReached,
      claimTier: userPlan,
      preferredCurrency,
      scanningInbox,
      billMonitoringEnabled: planFlags.billMonitoring,
      refresh,
      runInboxScan,
      scanEntireInbox: runInboxScan,
      setPreferredCurrency,
      setUserPlan,
      createClaimForRecall: createClaimForRecallAction,
    }),
    [
      state,
      loading,
      refreshing,
      error,
      userPlan,
      planFlags,
      claimsUsed,
      claimsRemaining,
      claimLimitReached,
      preferredCurrency,
      scanningInbox,
      refresh,
      runInboxScan,
      setPreferredCurrency,
      setUserPlan,
      createClaimForRecallAction,
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
