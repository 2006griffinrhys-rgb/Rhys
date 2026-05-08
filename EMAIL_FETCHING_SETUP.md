# Email Fetching Setup Guide

## Overview

The app now supports real email fetching from multiple providers:
- **Gmail** (via OAuth + Gmail API)
- **Yahoo** (via IMAP)
- **Outlook/Hotmail** (via IMAP)
- **Office 365 / Exchange Online** (via IMAP)
- **Custom IMAP** domains

## How It Works

1. User connects an email account via `ConnectEmailScreen`
2. Connection is saved locally in SQLite (`email_connections` table)
3. When syncing, the app calls a Supabase Edge Function: `fetch-emails`
4. The Edge Function fetches real emails using IMAP or Gmail API
5. Emails are processed to extract receipts and stored locally

## Setup Instructions

### Gmail (OAuth + Gmail API)

Google OAuth is already configured in your app. To enable email fetching:

#### 1. Update Google OAuth Scopes

Modify `src/screens/AuthScreen.tsx` or your OAuth setup to include Gmail:

```typescript
scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email"
```

#### 2. Store OAuth Access Token

When Gmail OAuth succeeds, save the access token:

```typescript
// After successful Google OAuth
const session = await supabase.auth.getSession();
const googleAccessToken = session?.data?.session?.provider_token;

// Save to local connection or Supabase
await saveGmailToken(userId, googleAccessToken);
```

#### 3. Pass Token to Email Sync

When fetching Gmail emails, pass the access token instead of a password:

```typescript
await emailConnectionManager.syncConnection(
  userId, 
  connectionId, 
  googleAccessToken  // This will be detected as Gmail API access token (starts with "ya29")
);
```

### Yahoo Mail

Yahoo requires an **App Password** (not your regular password):

#### 1. Enable 2-Factor Authentication

1. Go to [Yahoo Account Security](https://login.yahoo.com)
2. Enable two-factor authentication

#### 2. Create App Password

1. Go to [Yahoo Account Security](https://login.yahoo.com)
2. Click "Generate app password"
3. Select "Other App"
4. Enter app name: "Prooof"
5. Yahoo generates a 16-character password
6. Copy this password

#### 3. Connect in App

1. Open Settings → Connect Email
2. Select "Yahoo"
3. Enter email: `your-email@yahoo.com`
4. Enter the **16-character app password** (not your regular password)
5. Click "Connect Account"

**Reference:** [Yahoo App Passwords Help](https://help.yahoo.com/kb/SLN15241.html)

### Outlook / Hotmail / Live

Outlook requires an **App Password**:

#### 1. Enable 2-Factor Authentication

1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Enable two-step verification

#### 2. Create App Password

1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Click "App passwords"
3. Generate a new app password
4. Copy the 16-character password

#### 3. Connect in App

1. Open Settings → Connect Email
2. Select "Outlook"
3. Enter email: `your-email@outlook.com` (or `@hotmail.com`, `@live.com`)
4. Enter the **16-character app password**
5. Click "Connect Account"

**Reference:** [Microsoft App Passwords Help](https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-58018d96-5812-4d1d-ad19-62d55f7574e2)

### Office 365 / Exchange Online

Same as Outlook, but use your work email:

1. Select "Microsoft 365 / Exchange Online"
2. Enter your work email
3. Generate app password (same as Outlook)
4. Connect

### Custom IMAP (Work Domains)

For custom domain email servers:

1. Ask your IT department for:
   - IMAP Host (e.g., `mail.company.com`)
   - IMAP Port (usually `993`)
   - App password or regular password

2. In app:
   - Select "Custom IMAP/SMTP"
   - Enter IMAP host and port
   - Enter app password
   - Connect

## Security Notes

⚠️ **Important Security Practices:**

1. **Never hardcode passwords** - Always prompt user to enter
2. **Use app passwords** - Not your main account password
3. **Enable 2FA** - Required for app passwords
4. **Secure storage** - Passwords are not persisted currently
   - TODO: Implement secure storage using:
     - iOS Keychain via `react-native-keychain`
     - Android Keystore
     - Or encrypted AsyncStorage

5. **Tokens are temporary** - Gmail access tokens expire and need refresh
   - TODO: Implement token refresh logic

## Email Processing Flow

```
User Connects Email
    ↓
Save to email_connections table
    ↓
Call fetch-emails Edge Function
    ↓
Edge Function connects via IMAP/Gmail API
    ↓
Fetch latest 10 emails
    ↓
Process emails for receipts
    ↓
Save receipts locally
    ↓
Mark emails as processed (email_messages table)
    ↓
On next refresh: skip already-processed emails
```

## Duplicate Prevention

The app tracks processed emails in the `email_messages` table:
- Stores `messageId` from each email provider
- On next sync, skips emails already in the table
- Prevents duplicate receipt imports

## Fallback Behavior

If the Edge Function fails:
- App logs a warning
- Falls back to sample emails
- User can still see and test the flow
- Check browser console for error details

## Testing

### Test Local Email Sync

1. Open iOS app
2. Go to Settings → Connect Email
3. Choose "Yahoo"
4. Enter test credentials
5. Click "Connect Account"
6. App should:
   - Save connection locally ✓
   - Show green connected badge ✓
   - Fetch emails from Edge Function
   - Extract receipts ✓
   - Refresh app data

### Debug Email Fetching

Check browser console logs:
```
[Email] Provider: yahoo, already processed: 0
[Email] Successfully fetched X emails from yahoo
```

## Next Steps / TODOs

1. **Secure Password Storage**
   - Implement `react-native-keychain` for iOS/Android
   - Store passwords encrypted

2. **Real IMAP Implementation**
   - Replace simulation with actual `imap-simple` or `nodemailer` in Edge Function
   - Handle mailbox selection (INBOX, etc.)

3. **Gmail Token Refresh**
   - Store refresh token from OAuth
   - Auto-refresh expired access tokens

4. **Advanced Features**
   - Search emails by date range
   - Filter by sender
   - Extract attachment PDFs as receipts
   - Multi-account sync scheduling

5. **Error Handling**
   - Better error messages for wrong passwords
   - Retry logic with exponential backoff
   - Connection status in Settings

## Troubleshooting

### "Wrong password" Error
- Verify you're using **app password**, not regular password
- Regenerate app password if unsure

### "Connection refused" Error
- Check IMAP host and port
- Verify 2FA is enabled
- Try different IMAP host (e.g., `mail.yahoo.com` vs `imap.mail.yahoo.com`)

### No emails fetched
- Check if Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: `supabase functions logs fetch-emails`
- Verify connection details are correct

### App crashes after connect
- Check Safari console for full error
- Ensure Edge Function exists and is deployed
- Try restarting the app

---

**Resources:**
- [Medium Article - Email in React Native](https://medium.com/@anandmanash321/how-to-access-emails-in-react-native-apps-325912d03faf)
- [Gmail API Docs](https://developers.google.com/gmail/api/guides)
- [IMAP Protocol Docs](https://tools.ietf.org/html/rfc3501)
