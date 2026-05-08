import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useEmailRefresh } from '@/hooks/useEmailRefresh';
import { emailConnectionManager } from '@/services/emailConnectionManager';
import { receiptService } from '@/services/receiptService';
import type { EmailConnection } from '@/types/domain';

interface RefreshDataButtonProps {
  userId: string;
  onRefreshComplete?: (receiptsExtracted: number) => void;
  onRefreshError?: (error: string) => void;
  buttonText?: string;
  showLastSync?: boolean;
}

/**
 * Example component showing how to implement refresh data functionality
 * This ties together email syncing with receipt extraction and categorization
 * 
 * Usage in DashboardScreen:
 * <RefreshDataButton
 *   userId={userId}
 *   onRefreshComplete={(count) => console.log(`${count} receipts extracted`)}
 *   onRefreshError={(err) => console.error(err)}
 *   showLastSync={true}
 * />
 */
export function RefreshDataButton({
  userId,
  onRefreshComplete,
  onRefreshError,
  buttonText = 'Refresh data',
  showLastSync = true,
}: RefreshDataButtonProps): React.ReactElement {
  const { state, actions } = useEmailRefresh(userId);
  const [connections, setConnections] = useState<EmailConnection[]>([]);

  useEffect(() => {
    loadConnections();
  }, [userId]);

  async function loadConnections() {
    try {
      const active = await emailConnectionManager.getActiveConnections(userId);
      setConnections(active);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }

  async function handleRefresh() {
    if (connections.length === 0) {
      Alert.alert(
        'No email connected',
        'Please connect an email account in Settings first.',
      );
      return;
    }

    // For production: retrieve passwords from secure storage
    // This is a placeholder - never hardcode or display passwords
    const passwords: Record<string, string> = {};

    for (const connection of connections) {
      // In production, retrieve from:
      // - Keychain (iOS)
      // - Keystore (Android)
      // - Encrypted AsyncStorage
      // - Firebase Remote Config
      
      try {
        // Example: prompt user for password
        const password = await promptForPassword(connection.email);
        if (password) {
          passwords[connection.id] = password;
        }
      } catch (error) {
        console.error(`Failed to get password for ${connection.email}:`, error);
        if (onRefreshError) {
          onRefreshError(`Failed to connect to ${connection.email}`);
        }
        return;
      }
    }

    try {
      const success = await actions.refreshEmails(passwords);

      if (success) {
        // Get updated categorized receipts
        const byCategory = await receiptService.getReceiptsByCategory(userId);
        const stats = await receiptService.getCategoryStats(userId);
        const topCategories = await receiptService.getTopCategories(userId);

        console.log('[RefreshDataButton] Sync complete:');
        console.log('Receipts by category:', byCategory);
        console.log('Category stats:', stats);
        console.log('Top categories:', topCategories);

        Alert.alert(
          'Success',
          `Extracted ${state.receiptsExtracted} new receipts`,
        );

        if (onRefreshComplete) {
          onRefreshComplete(state.receiptsExtracted);
        }
      } else if (state.error) {
        Alert.alert('Error', state.error);
        if (onRefreshError) {
          onRefreshError(state.error);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', errorMsg);
      if (onRefreshError) {
        onRefreshError(errorMsg);
      }
    }
  }

  // Placeholder: In production, use a modal to prompt for password securely
  async function promptForPassword(email: string): Promise<string | null> {
    // This would typically open a modal with:
    // - Email display
    // - Password input field
    // - Cancel/Submit buttons
    // - Security notice about password usage

    // For now, return null to indicate cancellation
    // In real implementation, use a React Native Modal or AlertPrompt
    return null;
  }

  return (
    <>
      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={state.isLoading || connections.length === 0}
        style={[
          styles.button,
          state.isLoading && styles.buttonDisabled,
        ]}
      >
        {state.isLoading ? `${buttonText}...` : buttonText}
      </button>

      {/* Last Sync Time */}
      {showLastSync && state.lastSyncTime && (
        <div style={styles.lastSyncText}>
          Last sync: {new Date(state.lastSyncTime).toLocaleString()}
          {state.receiptsExtracted > 0 && (
            <div style={styles.receiptsText}>
              Receipts extracted: {state.receiptsExtracted}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div style={[styles.errorContainer, styles.error]}>
          <button
            onClick={actions.clearError}
            style={styles.closeButton}
          >
            ✕
          </button>
          {state.error}
        </div>
      )}

      {/* Connection Status */}
      {connections.length > 0 && (
        <div style={styles.connectionsInfo}>
          Connected emails: {connections.map((c) => c.email).join(', ')}
        </div>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  receiptsText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    color: '#059669',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  connectionsInfo: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default RefreshDataButton;
