import type { EmailProviderId, Receipt } from '@/types/domain';
import { receiptParsingService } from './receiptParsingService';
import { receiptCategoryService } from './receiptCategoryService';
import { supabase } from '@/services/supabase';

export type EmailFetchConfig = {
  email: string;
  provider: EmailProviderId;
  imapHost: string;
  imapPort: number;
  username: string;
  password: string;
};

export type FetchedEmail = {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  attachments: EmailAttachment[];
};

export type EmailAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer | string; // base64
};

export type EmailFetchResult = {
  success: boolean;
  emailsProcessed: number;
  receiptsExtracted: number;
  errors: string[];
  receipts: Receipt[];
};

/**
 * Universal email fetching service - handles multiple email providers
 * Currently supports Yahoo, Gmail, Outlook, Office365, Exchange, Custom IMAP
 */
export const emailFetchingService = {
  /**
   * Test connection credentials
   */
  async testConnection(config: Partial<EmailFetchConfig>): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('fetch-emails', {
      body: {
        ...config,
        already_processed: [],
      },
    });

    if (error) throw error;
    return !!data;
  },

  /**
   * Fetch and process emails from connected email account
   * Skips already processed emails automatically
   */
  async fetchAndProcessEmails(
    userId: string,
    connectionId: string,
    emailConfig: EmailFetchConfig,
  ): Promise<EmailFetchResult> {
    const result: EmailFetchResult = {
      success: false,
      emailsProcessed: 0,
      receiptsExtracted: 0,
      errors: [],
      receipts: [],
    };

    try {
      // Get list of already processed message IDs from Supabase
      let processedMessageIds = new Set<string>();
      try {
        const { data: existingMessages } = await supabase
          .from('email_messages')
          .select('message_id')
          .eq('connection_id', connectionId);
          
        processedMessageIds = new Set((existingMessages || []).map((m: any) => m.message_id));
      } catch (error) {
        console.warn(`[Email] Could not fetch processed messages from Supabase:`, error);
      }

      // Fetch emails from provider
      console.log(`[Email] Fetching emails from ${emailConfig.email} (${emailConfig.provider})`);
      
      // For now, we'll set up the framework for IMAP connection
      // In production, you'd use imap library or native module
      // Fetch new emails using Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-emails', {
        body: {
          ...emailConfig,
          already_processed: Array.from(processedMessageIds),
        },
      });

      if (error) throw error;
      const emails = (data?.emails || []) as any[];

      console.log(`[Email] Fetched ${emails.length} new emails`);
      result.emailsProcessed = emails.length;

      // Process each email
      for (const email of emails) {
        try {
          // Check if email has receipt-like attachments
          const pdfAttachments = (email.attachments || []).filter(
            (att: any) => att.filename?.toLowerCase().includes('receipt') ||
                     att.filename?.toLowerCase().includes('invoice') ||
                     att.mimeType === 'application/pdf',
          );

          let hasReceipt = false;
          let receipt: Receipt | null = null;

          // Process PDF attachments
          if (pdfAttachments.length > 0) {
            console.log(`[Email] Processing ${pdfAttachments.length} receipt attachments from: ${email.from}`);
            receipt = await receiptParsingService.parseReceiptFromPdf(
              pdfAttachments[0],
              emailConfig.provider,
              email,
            );
            hasReceipt = !!receipt;
          }

          const lowerSubject = email.subject.toLowerCase();
          const isReceiptSubject = 
            lowerSubject.includes('receipt') || 
            lowerSubject.includes('invoice') || 
            lowerSubject.includes('order') || 
            lowerSubject.includes('confirmation') ||
            lowerSubject.includes('payment') ||
            lowerSubject.includes('e-receipt') ||
            lowerSubject.includes('ereceipt');

          if (!receipt && isReceiptSubject) {
            receipt = await this.extractReceiptFromEmailBody(
              email.body,
              emailConfig.provider,
              email,
            );
            hasReceipt = !!receipt;
          }

          // Save receipt if found to Supabase
          if (receipt) {
            receipt.category = receiptCategoryService.categorizeReceipt(receipt);
            const { error: receiptError } = await supabase.from('receipts').insert({
              id: receipt.id,
              user_id: userId,
              merchant: receipt.merchant,
              total_cents: receipt.totalCents,
              currency: receipt.currency,
              purchase_date: receipt.purchaseDate,
              source: receipt.source,
              status: 'processed',
              category: receipt.category,
              supplier_warranty_months: receipt.supplierWarrantyMonths,
              supplier_warranty_source: receipt.supplierWarrantySource,
              supplier_warranty_checked_at: receipt.supplierWarrantyCheckedAt,
            });
            
            if (receiptError) console.error('[Email] Error saving receipt to Supabase:', receiptError);
            
            result.receiptsExtracted++;
            result.receipts.push(receipt);
          }

          // Log processed email to Supabase
          const { error: messageError } = await supabase.from('email_messages').insert({
            id: `${connectionId}_${email.messageId}`,
            connection_id: connectionId,
            user_id: userId,
            message_id: email.messageId,
            subject: email.subject,
            from: email.from,
            receipt_id: receipt?.id,
            has_receipt: hasReceipt,
            processed_at: new Date().toISOString(),
            fetched_at: email.date,
            category: receipt?.category,
          });

          if (messageError) {
            console.warn(`[Email] Could not log email message to Supabase:`, messageError);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Email] Error processing email: ${errorMsg}`);
          result.errors.push(`Failed to process email from ${email.from}: ${errorMsg}`);
        }
      }

      await this.updateConnectionLastSync(connectionId);
      result.success = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Email] Fatal error: ${errorMsg}`);
      result.errors.push(`Fatal error: ${errorMsg}`);
    }

    return result;
  },

  /**
   * Fallback sample emails when fetching fails
   */
  getFallbackSampleEmails(provider: EmailProviderId): FetchedEmail[] {
    const sampleEmails: Record<EmailProviderId, FetchedEmail[]> = {
      gmail: [
        {
          messageId: "gmail-1",
          subject: "Your Gmail receipt from Amazon",
          from: "order-update@amazon.co.uk",
          date: new Date().toISOString(),
          body: "Thank you for your purchase. Total: £24.97. Order date: 12/05/2026.",
          attachments: [],
        },
      ],
      yahoo: [
        {
          messageId: "yahoo-1",
          subject: "Your Yahoo receipt from Uber",
          from: "receipt@uber.com",
          date: new Date().toISOString(),
          body: "Your receipt is ready. Total: £13.60. Date: 12/05/2026.",
          attachments: [],
        },
      ],
      outlook: [
        {
          messageId: "outlook-1",
          subject: "Your Outlook receipt from Tesco",
          from: "noreply@tesco.com",
          date: new Date().toISOString(),
          body: "Thanks for shopping. Total: £45.20. Date: 12/05/2026.",
          attachments: [],
        },
      ],
      office365: [
        {
          messageId: "office365-1",
          subject: "Your Office 365 receipt from Netflix",
          from: "billing@netflix.com",
          date: new Date().toISOString(),
          body: "Payment received. Total: £7.99. Date: 12/05/2026.",
          attachments: [],
        },
      ],
      exchange: [
        {
          messageId: "exchange-1",
          subject: "Your Exchange receipt from Airbnb",
          from: "reservations@airbnb.com",
          date: new Date().toISOString(),
          body: "Your booking is confirmed. Total: £82.50. Date: 12/05/2026.",
          attachments: [],
        },
      ],
      'work-imap': [
        {
          messageId: "work-imap-1",
          subject: "Your IMAP receipt from Pret A Manger",
          from: "receipts@pret.com",
          date: new Date().toISOString(),
          body: "Receipt total: £8.45. Purchase date: 12/05/2026.",
          attachments: [],
        },
      ],
    };

    return sampleEmails[provider] ?? [];
  },

  /**
   * Extract receipt data from email body text
   * Looks for common receipt patterns (amounts, dates, merchant names)
   */
  async extractReceiptFromEmailBody(
    body: string,
    provider: EmailProviderId,
    email: FetchedEmail,
  ): Promise<Receipt | null> {
    // Extract amount (common patterns: £10.99, $20.00, etc.)
    const amountMatch = body.match(/[£$€][\s]?(\d+(?:\.\d{2})?)/);
    if (!amountMatch) return null;

    const totalCents = Math.round(parseFloat(amountMatch[1]) * 100);

    // Extract date if possible
    const dateMatch = body.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
    const purchaseDate = dateMatch ? dateMatch[0] : email.date;

    // Try to extract merchant from subject or sender
    const merchant = this.extractMerchantName(email.subject, email.from);

    return {
      id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      merchant,
      totalCents,
      currency: this.detectCurrency(body),
      purchaseDate,
      source: provider,
      status: 'processed',
    };
  },

  /**
   * Detect currency from email content
   */
  detectCurrency(content: string): string {
    if (content.includes('£')) return 'GBP';
    if (content.includes('$')) return 'USD';
    if (content.includes('€')) return 'EUR';
    if (content.includes('¥') || content.includes('￥')) return 'JPY';
    return 'GBP'; // default
  },

  /**
   * Extract merchant name from email subject and sender
   */
  extractMerchantName(subject: string, from: string): string {
    // Extract from subject
    // Remove common prefixes, provider names, and filler words
    const cleanSubject = subject
      .replace(/your|gmail|yahoo|outlook|receipt|invoice|order|confirmation|from|for|payment|e-receipt|ereceipt/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const subjectTokens = cleanSubject.split(/[\s-]/).filter(t => t.length > 2);
    
    if (subjectTokens.length > 0) {
      // Return the first significant word, e.g. "Uber" from "Your receipt from Uber"
      return subjectTokens[0].charAt(0).toUpperCase() + subjectTokens[0].slice(1).toLowerCase();
    }

    // Extract from sender email domain if subject didn't help
    const emailMatch = from.match(/@([a-zA-Z0-9.-]+)\./);
    if (emailMatch && emailMatch[1]) {
      const part = emailMatch[1].split('.')[0];
      // Ignore common generic domains
      if (!['gmail', 'yahoo', 'outlook', 'hotmail', 'mail', 'email'].includes(part.toLowerCase())) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }
    }

    return 'Unknown Merchant';
  },

  /**
   * Simple category extraction
   */
  extractCategory(body: string, subject: string): string {
    const text = (body + ' ' + subject).toLowerCase();
    if (text.includes('grocery') || text.includes('supermarket') || text.includes('food')) return 'Groceries & Food';
    if (text.includes('electronic') || text.includes('laptop') || text.includes('phone')) return 'Electronics';
    if (text.includes('fashion') || text.includes('cloth') || text.includes('shoe')) return 'Fashion & Clothing';
    if (text.includes('travel') || text.includes('hotel') || text.includes('flight') || text.includes('uber')) return 'Travel';
    if (text.includes('bill') || text.includes('utility') || text.includes('energy') || text.includes('water')) return 'Bills & Utilities';
    
    return 'Shopping'; // Default to Shopping (categorized as Goods)
  },

  /**
   * Get summary of receipts by category from processed emails from Supabase
   */
  async getReceiptsSummaryByCategory(userId: string): Promise<Record<string, Receipt[]>> {
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[Email] Error fetching receipts for summary:', error);
      return {};
    }

    const grouped: Record<string, Receipt[]> = {};
    for (const row of (receipts || [])) {
      const category = row.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      // Map Supabase row back to Receipt domain type
      grouped[category].push({
        id: row.id,
        userId: row.user_id,
        merchant: row.merchant,
        totalCents: row.total_cents,
        currency: row.currency,
        purchaseDate: row.purchase_date,
        source: row.source,
        status: row.status,
        category: row.category,
        supplierWarrantyMonths: row.supplier_warranty_months,
        supplierWarrantySource: row.supplier_warranty_source,
        supplierWarrantyCheckedAt: row.supplier_warranty_checked_at,
      });
    }

    return grouped;
  },

  /**
   * Mark email connection as synced in Supabase
   */
  async updateConnectionLastSync(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('email_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connectionId);
      
    if (error) {
      console.error(`[Email] Error updating last sync time in Supabase:`, error);
    } else {
      console.log(`[Email] Updated last sync for connection: ${connectionId}`);
    }
  },
};
