/**
 * UNIVERSAL EMAIL RECEIPT FETCHING SYSTEM
 * Integration Guide
 * 
 * This system provides end-to-end email fetching, receipt parsing,
 * and categorization for the Prooof app.
 */

// ============================================================================
// 1. CONNECT EMAIL ACCOUNT (in SettingsScreen or ConnectEmailScreen)
// ============================================================================

/*
import { emailConnectionManager } from '@/services/emailConnectionManager';
import type { EmailProviderId } from '@/types/domain';

async function connectEmail(
  userId: string,
  email: string,
  provider: EmailProviderId,
  password: string,
) {
  try {
    // Step 1: Add connection to database
    const connection = await emailConnectionManager.addEmailConnection(
      userId,
      email,
      provider,
      {
        imapHost: provider === 'gmail' ? 'imap.gmail.com' : 'imap.mail.yahoo.com',
        imapPort: 993,
        username: email,
      },
    );

    console.log('Connection created:', connection.id);

    // Step 2: Perform initial sync
    const result = await emailConnectionManager.syncConnection(
      userId,
      connection.id,
      password,
    );

    if (result.success) {
      console.log(`Extracted ${result.receiptsExtracted} receipts`);
      // Update UI with results
    } else {
      console.error('Sync failed:', result.errors);
    }

    return connection;
  } catch (error) {
    console.error('Failed to connect email:', error);
    throw error;
  }
}
*/

// ============================================================================
// 2. REFRESH EMAILS (in DashboardScreen - Refresh Data button)
// ============================================================================

/*
import { useEmailRefresh } from '@/hooks/useEmailRefresh';
import { emailConnectionManager } from '@/services/emailConnectionManager';
import { receiptService } from '@/services/receiptService';

function DashboardScreen() {
  const { state, actions } = useEmailRefresh(userId);

  async function handleRefreshData() {
    // Get all active connections
    const connections = await emailConnectionManager.getActiveConnections(userId);

    // Prompt user for passwords or use secure storage
    const passwords: Record<string, string> = {};
    for (const conn of connections) {
      // In production: retrieve from secure storage (e.g., AsyncStorage with encryption)
      passwords[conn.id] = await getUserPassword(conn.id);
    }

    // Refresh all emails
    const success = await actions.refreshEmails(passwords);
    
    if (success) {
      // Reload receipts from database
      const receiptsByCategory = await receiptService.getReceiptsByCategory(userId);
      // Update state with categorized receipts
    }
  }

  return (
    <>
      <Button 
        title="Refresh data" 
        onPress={handleRefreshData}
        loading={state.isLoading}
      />
      {state.lastSyncTime && <Text>Last sync: {state.lastSyncTime}</Text>}
    </>
  );
}
*/

// ============================================================================
// 3. DISPLAY RECEIPTS BY CATEGORY (in DashboardScreen)
// ============================================================================

/*
import { receiptService } from '@/services/receiptService';
import { receiptCategoryService } from '@/services/receiptCategoryService';

async function loadCategorizedReceipts(userId: string) {
  // Option 1: Get all receipts grouped by category
  const byCategory = await receiptService.getReceiptsByCategory(userId);
  
  // Result format:
  // {
  //   "Groceries & Food": [receipt1, receipt2, ...],
  //   "Electronics": [receipt3, ...],
  //   "Clothing & Fashion": [...],
  //   ...
  // }

  // Option 2: Get statistics by category
  const stats = await receiptService.getCategoryStats(userId);
  
  // Result format:
  // {
  //   "Groceries & Food": { count: 15, total: 23450 },
  //   "Electronics": { count: 3, total: 89999 },
  //   ...
  // }

  // Option 3: Get top spending categories
  const topCategories = await receiptService.getTopCategories(userId, 5);
  
  // Result format:
  // [
  //   { category: "Groceries & Food", total: 23450, count: 15, average: 1563 },
  //   { category: "Electronics", total: 89999, count: 3, average: 29999 },
  //   ...
  // ]

  // Option 4: Get receipts from specific category
  const groceries = await receiptService.getReceiptsBySpecificCategory(userId, 'Groceries & Food');
}
*/

// ============================================================================
// 4. SKIP ALREADY PROCESSED EMAILS ON REFRESH
// ============================================================================

/*
The system automatically skips already processed emails because:

1. EmailMessages table tracks processed email message IDs
2. On each sync, the system:
   - Fetches list of already-processed messageIds
   - Queries only NEW emails from email server
   - Compares messageId to excludeMessageIds set
   - Skips any emails already in database

The flow in emailFetchingService.fetchAndProcessEmails():
  1. Get processedMessages from DB for this connection
  2. Extract messageIds into Set
  3. Fetch emails from provider with excludeMessageIds filter
  4. Only process emails not in the set
  5. On successful processing, add to emailMessages table

This ensures:
- No duplicate receipt extraction
- Efficient incremental syncs
- Automatic deduplication
*/

// ============================================================================
// 5. EMAIL PROVIDERS CONFIGURATION
// ============================================================================

/*
Supported providers and their IMAP settings:

Gmail:
  Host: imap.gmail.com
  Port: 993
  Username: your-email@gmail.com
  Password: Use App Password (not main password)
  Note: Requires "Less secure apps" enabled or App Password

Yahoo Mail:
  Host: imap.mail.yahoo.com
  Port: 993
  Username: your-email@yahoo.com
  Password: Use App Password
  Note: Generate App Password from Yahoo Account Security

Outlook.com:
  Host: imap-mail.outlook.com
  Port: 993
  Username: your-email@outlook.com
  Password: Your account password
  Note: May need to enable IMAP in settings

Office365 / Exchange:
  Host: outlook.office365.com
  Port: 993
  Username: your-email@company.com
  Password: Your account password
  Note: Check with IT for IMAP access

Custom IMAP:
  Provide custom host, port, username, and password
  Common enterprise servers: mail.company.com, exchange.company.com
*/

// ============================================================================
// 6. RECEIPT CATEGORIZATION SYSTEM
// ============================================================================

/*
The system automatically categorizes receipts based on:

1. Merchant Name Recognition
   - Looks for keywords like "Tesco", "Nike", "Amazon", etc.
   - Maps to predefined categories

2. Amount-Based Heuristics (fallback)
   - < £5: Likely groceries/food
   - £5-50: Various shopping
   - £50-200: Home/furniture
   - > £200: Major purchases

3. Content Analysis
   - Searches email body and extracted text
   - Identifies common keywords (receipt, invoice, etc.)
   - Combines signals for better accuracy

Categories include:
  - Groceries & Food
  - Electronics
  - Clothing & Fashion
  - Home & Garden
  - Health & Beauty
  - Entertainment
  - Travel & Transport
  - Utilities & Services
  - Sports & Fitness
  - Books & Media
  - Shopping (generic)
  - Uncategorized (unknown)
*/

// ============================================================================
// 7. SCHEMA UPDATES
// ============================================================================

/*
New tables added to SQLite schema:

emailMessages table:
  - id: unique ID combining connectionId + messageId
  - connectionId: reference to email connection
  - userId: owner of connection
  - messageId: provider-specific message ID
  - subject: email subject
  - from: sender email
  - receiptId: linked receipt if found
  - hasReceipt: boolean flag
  - processedAt: when processed
  - fetchedAt: email date
  - category: inferred receipt category

This allows:
- Tracking which emails have been processed
- Linking emails to extracted receipts
- Preventing duplicate processing
- Searching by category
*/

// ============================================================================
// 8. ERROR HANDLING
// ============================================================================

/*
The system handles various error scenarios:

Connection Errors:
  - Network timeout: Retries or shows offline message
  - Invalid credentials: Returns auth error
  - IMAP not enabled: Suggests enabling in account settings

Parsing Errors:
  - Invalid PDF: Skips to body text extraction
  - No receipt data found: Logs but continues
  - Malformed attachments: Handles gracefully

Database Errors:
  - Duplicate inserts: Skipped by emailMessages check
  - Constraint violations: Logged and ignored

The result object from sync includes:
  - success: overall status
  - emailsProcessed: count of emails checked
  - receiptsExtracted: count of receipts found
  - errors: array of error messages
  - receipts: array of extracted receipt objects
*/

// ============================================================================
// 9. FUTURE ENHANCEMENTS
// ============================================================================

/*
Current framework supports:

To add in future:
1. Actual PDF parsing (currently simulated)
   - Add 'pdf-parse' or similar library
   - Implement OCR with tesseract.js
   - Use AWS Textract or Google Vision

2. Real IMAP connection (currently mocked)
   - Use 'imap' npm package
   - Implement actual IMAP protocol
   - Handle pagination and limits

3. OAuth integration
   - Gmail OAuth 2.0
   - Outlook OAuth
   - Secure token storage

4. Background sync task
   - Connect to existing background task system
   - Periodic automatic syncing
   - Notification on new receipts

5. Advanced receipt parsing
   - Line-by-line item extraction
   - Tax calculation
   - Warranty detection
   - Price comparison
*/

export {};
