import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Claim, DashboardStats, Product, Recall, Receipt } from "@/types/domain";
import { computeStats, createClaimForRecall, fetchSnapshotForUser } from "@/services/prooofApi";
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
  refresh: () => Promise<void>;
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

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppDataState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);

    if (!user?.id) {
      setState(EMPTY_STATE);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const snapshot = await fetchSnapshotForUser(user.id);
      setState({
        ...snapshot,
        stats: computeStats(snapshot),
      });
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
    [user?.id],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      ...state,
      loading,
      refreshing,
      error,
      usingDemoData: !env.hasSupabaseConfig,
      refresh,
      createClaimForRecall: createClaimForRecallAction,
    }),
    [state, loading, refreshing, error, refresh, createClaimForRecallAction],
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
