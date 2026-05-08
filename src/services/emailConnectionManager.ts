import { supabase } from '@/services/supabase';
import type { EmailConnection, EmailProviderId } from '@/types/domain';
import { emailFetchingService, type EmailFetchConfig, type EmailFetchResult } from './emailFetchingService';

/**
 * Email connection manager
 * Handles connecting email accounts and managing sync operations
 */
export const emailConnectionManager = {
  /**
   * Add a new email connection
   */
  async addEmailConnection(
    userId: string,
    email: string,
    provider: EmailProviderId,
    config?: {
      imapHost?: string;
      imapPort?: number;
      username?: string;
    },
  ): Promise<EmailConnection> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Default IMAP configurations for common providers
    const defaultConfigs: Record<EmailProviderId, { host: string; port: number }> = {
      gmail: { host: 'imap.gmail.com', port: 993 },
      yahoo: { host: 'imap.mail.yahoo.com', port: 993 },
      outlook: { host: 'imap-mail.outlook.com', port: 993 },
      office365: { host: 'outlook.office365.com', port: 993 },
      exchange: { host: 'outlook.office365.com', port: 993 },
      'work-imap': { host: config?.imapHost || 'imap.company.com', port: config?.imapPort || 993 },
    };

    const defaultConfig = defaultConfigs[provider];
    const imapHost = config?.imapHost || defaultConfig.host;
    const imapPort = config?.imapPort || defaultConfig.port;
    const username = config?.username || email;

    const { error } = await supabase.from('email_connections').insert({
      id,
      user_id: userId,
      email,
      provider,
      imap_host: imapHost,
      imap_port: imapPort,
      username,
      is_active: true,
      created_at: now,
    });

    if (error) throw error;

    return {
      id,
      userId,
      email,
      provider,
      imapHost,
      imapPort,
      username,
      isActive: true,
      createdAt: now,
    };
  },

  /**
   * Get all active email connections for user
   */
  async getActiveConnections(userId: string): Promise<EmailConnection[]> {
    const { data, error } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      provider: row.provider,
      imapHost: row.imap_host,
      imapPort: row.imap_port,
      username: row.username,
      isActive: row.is_active,
      createdAt: row.created_at,
      lastSyncAt: row.last_sync_at,
    })) as EmailConnection[];
  },

  /**
   * Get a specific email connection
   */
  async getConnection(connectionId: string): Promise<EmailConnection | null> {
    const { data, error } = await supabase
      .from('email_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      email: data.email,
      provider: data.provider,
      imapHost: data.imap_host,
      imapPort: data.imap_port,
      username: data.username,
      isActive: data.is_active,
      createdAt: data.created_at,
      lastSyncAt: data.last_sync_at,
    };
  },

  /**
   * Deactivate email connection
   */
  async deactivateConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('email_connections')
      .update({ is_active: false })
      .eq('id', connectionId);

    if (error) throw error;
  },

  /**
   * Sync emails from a connection
   * Main entry point for fetching and processing emails
   */
  async syncConnection(
    userId: string,
    connectionId: string,
    password: string, // Required for IMAP connection
  ): Promise<EmailFetchResult> {
    console.log(`[ConnectionManager] Starting sync for connection: ${connectionId}`);

    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        return {
          success: false,
          emailsProcessed: 0,
          receiptsExtracted: 0,
          errors: ['Connection not found'],
          receipts: [],
        };
      }

      const emailConfig: EmailFetchConfig = {
        email: connection.email,
        provider: connection.provider as EmailProviderId,
        imapHost: connection.imapHost || 'imap.gmail.com',
        imapPort: connection.imapPort || 993,
        username: connection.username || connection.email,
        password,
      };

      const result = await emailFetchingService.fetchAndProcessEmails(
        userId,
        connectionId,
        emailConfig,
      );

      if (!result.success) {
        throw new Error(result.errors.join(', ') || 'Failed to sync emails');
      }

      // Update last sync time
      await emailFetchingService.updateConnectionLastSync(connectionId);

      console.log(
        `[ConnectionManager] Sync complete: ${result.receiptsExtracted} receipts extracted`,
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ConnectionManager] Sync error: ${errorMsg}`);
      throw error;
    }
  },

  /**
   * Sync all active connections for a user
   */
  async syncAllConnections(userId: string, passwords: Record<string, string>): Promise<{
    success: boolean;
    totalReceiptsExtracted: number;
    results: Array<{
      connectionId: string;
      email: string;
      result: EmailFetchResult;
    }>;
  }> {
    console.log(`[ConnectionManager] Syncing all connections for user: ${userId}`);

    const connections = await this.getActiveConnections(userId);
    const results = [];
    let totalReceiptsExtracted = 0;

    for (const connection of connections) {
      const password = passwords[connection.id];
      if (!password) {
        console.warn(`[ConnectionManager] No password provided for ${connection.email}`);
        continue;
      }

      try {
        const result = await this.syncConnection(userId, connection.id, password);
        totalReceiptsExtracted += result.receiptsExtracted;
        results.push({
          connectionId: connection.id,
          email: connection.email,
          result,
        });
      } catch (error) {
        console.error(`[ConnectionManager] Error syncing ${connection.email}:`, error);
      }
    }

    return {
      success: true,
      totalReceiptsExtracted,
      results,
    };
  },

  /**
   * Check if connection is new (first sync)
   */
  async isFirstSync(connectionId: string): Promise<boolean> {
    try {
      const messages = await db.query.emailMessages.findFirst({
        where: eq(schema.emailMessages.connectionId, connectionId),
      });
      return !messages;
    } catch (error) {
      // Table may not exist yet - treat as first sync
      console.warn('[ConnectionManager] email_messages table check failed, assuming first sync:', error);
      return true;
    }
  },

  /**
   * Get sync status for a connection
   */
  async getSyncStatus(connectionId: string): Promise<{
    lastSyncAt: string | null;
    messageCount: number;
    receiptCount: number;
  }> {
    try {
      const messages = await db.query.emailMessages.findMany({
        where: eq(schema.emailMessages.connectionId, connectionId),
      });

      const receipts = await db.query.receipts.findMany({
        where: eq(schema.receipts.userId, 'any'), // This would need user_id from emailMessages
      });

      const lastMessage = messages.sort((a, b) => 
        new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
      )[0];

      return {
        lastSyncAt: lastMessage?.processedAt || null,
        messageCount: messages.length,
        receiptCount: messages.filter((m) => m.hasReceipt).length,
      };
    } catch (error) {
      // Table may not exist yet
      console.warn('[ConnectionManager] Could not get sync status (table may not exist):', error);
      return {
        lastSyncAt: null,
        messageCount: 0,
        receiptCount: 0,
      };
    }
  },
};
