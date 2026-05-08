import { useState, useCallback } from 'react';
import type { EmailFetchResult } from '@/services/emailFetchingService';
import { emailConnectionManager } from '@/services/emailConnectionManager';

export type UseEmailRefreshState = {
  isLoading: boolean;
  error: string | null;
  lastSyncTime: string | null;
  receiptsExtracted: number;
};

export type UseEmailRefreshActions = {
  refreshEmails: (passwords: Record<string, string>) => Promise<boolean>;
  clearError: () => void;
};

/**
 * Hook for refreshing emails from connected accounts
 * Usage in DashboardScreen:
 * 
 * const { state, actions } = useEmailRefresh(userId);
 * 
 * // In refresh button handler:
 * await actions.refreshEmails({ connection_id: 'password' });
 */
export function useEmailRefresh(userId: string): {
  state: UseEmailRefreshState;
  actions: UseEmailRefreshActions;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [receiptsExtracted, setReceiptsExtracted] = useState(0);

  const refreshEmails = useCallback(
    async (passwords: Record<string, string>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[RefreshHook] Starting email refresh for user:', userId);

        const result = await emailConnectionManager.syncAllConnections(userId, passwords);

        if (result.success) {
          setLastSyncTime(new Date().toISOString());
          setReceiptsExtracted(result.totalReceiptsExtracted);
          console.log(`[RefreshHook] Successfully extracted ${result.totalReceiptsExtracted} receipts`);
          return true;
        } else {
          throw new Error('Sync failed');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        console.error('[RefreshHook] Error:', errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    state: {
      isLoading,
      error,
      lastSyncTime,
      receiptsExtracted,
    },
    actions: {
      refreshEmails,
      clearError,
    },
  };
}
