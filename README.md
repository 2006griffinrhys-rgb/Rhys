# Prooof Native App (iOS + Android)

Native mobile companion for the Prooof platform, built with Expo + React Native and modeled from the Loveable web project architecture.

## Features

- Email/password auth with Supabase
- Dashboard with key receipt and recall stats
- Receipts list with status badges
- Products list with recall checking
- Recalls feed and quick claim generation
- Claims queue with status tracking
- Settings screen with profile and environment details

## Stack

- Expo (React Native + TypeScript)
- React Navigation (native stack + bottom tabs)
- Supabase (`@supabase/supabase-js`)
- AsyncStorage-backed auth session persistence

## Prerequisites

- Node.js 20+
- npm 10+ (or compatible package manager)
- Expo Go app on iOS/Android device, or Xcode/Android Studio emulator

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Fill in Supabase values in `.env`:

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_SUPABASE_PROJECT_ID`

4. Start development server:

   ```bash
   npm run start
   ```

## Test ASAP (fastest path)

If you just want to test the app immediately:

1. Install and run preflight checks:

   ```bash
   npm install
   npm run preflight
   ```

2. Start Expo:

   ```bash
   npm run start
   ```

3. Open on device:
   - scan QR with Expo Go (Android)
   - scan QR from Camera app (iOS) if Expo Go is installed

4. On the auth screen, tap **Continue in Demo Mode**.
   - This bypasses backend auth and loads built-in demo receipts/products/recalls/claims for immediate QA.
   - You can switch to live Supabase auth anytime by adding real `.env` values.

## Running natively

- iOS simulator:

  ```bash
  npm run ios
  ```

- Android emulator:

  ```bash
  npm run android
  ```

## Local quality checks

```bash
npm run preflight
npm run verify
```

`verify` runs:
- TypeScript typecheck
- ESLint
- Expo dependency sanity check

## Build store-ready binaries (EAS)

1. Install and authenticate Expo CLI:

   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Configure project in your Expo account:

   ```bash
   eas build:configure
   ```

3. Build Android AAB (Play Console):

   ```bash
   npm run eas:build:android
   ```

4. Build iOS IPA (TestFlight/App Store Connect):

   ```bash
   npm run eas:build:ios
   ```

5. Build preview binaries for internal QA (APK + IPA):

   ```bash
   npm run eas:build:preview
   ```

6. Optional: publish OTA updates (no full binary rebuild):

   ```bash
   npm run eas:update:preview
   npm run eas:update:production
   ```

7. Optional: submit directly after build:

   ```bash
   npm run eas:submit:android
   npm run eas:submit:ios
   ```

Profiles are defined in `eas.json`:
- `development` -> `development` channel
- `preview` -> `preview` channel
- `production` -> `production` channel

`runtimeVersion` is set to `appVersion` in `app.json`, so OTA updates apply safely within the same app runtime version.

## Notes

- This app mirrors the core Prooof entities from the Loveable project (`products`, `bills`, claims/recall flows).
- If your Supabase schema differs, update mapping logic in `src/services/prooofApi.ts`.
- The app includes demo fallback data to remain usable when backend env vars are missing.
- Inbox scan flow is provider-aware and targets Gmail, Yahoo, Outlook/Hotmail/Live/MSN, Office 365, and custom work domains via IMAP/Exchange integration metadata.

## Stripe billing integration

Stripe billing is wired through Supabase Edge Functions and app-side billing helpers in `src/services/billing.ts`.

Set these env vars in `.env`:

- `EXPO_PUBLIC_STRIPE_BILLING_ENABLED=true`
- `EXPO_PUBLIC_SUPPORT_URL=https://www.prooof.app`
- `EXPO_PUBLIC_STRIPE_PORTAL_URL=` (optional fallback)
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=` (required for native Apple Pay / Google Pay)
- `EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER=` (required for iOS Apple Pay, e.g. `merchant.com.prooof.app`)

Expected Supabase Edge Functions:

- `billing-create-checkout-session`
- `billing-create-portal-session`
- `billing-cancel-subscription`

Implemented billing behavior:

- Monthly and yearly intervals (yearly includes 20% discount for paid plans).
- “Keep access until period end (recommended)” toggle for downgrade/cancel flows (`cancel_at_period_end` behavior).
- Free plan: 5 claims/month, no bill monitoring.
- Premium: 20 claims/month + bill alerts + chasing.
- Unlimited: unlimited claims + priority support.
- iOS-native Apple Pay attempt for paid-plan upgrade flow with Stripe Checkout fallback when unavailable/not configured.

## Background scanning (app closed / OS-managed)

The app includes native background task support so inbox scanning can continue when the app is not foregrounded:

- Expo TaskManager + BackgroundFetch task: `prooof-inbox-background-scan`
- Plugin configuration in `app.json`: `expo-background-fetch`, `expo-task-manager`
- Task context (user + providers) persisted locally and synced from `AppDataProvider`

Environment controls:

- `EXPO_PUBLIC_BACKGROUND_INBOX_TASK_ENABLED=true`
- `EXPO_PUBLIC_BACKGROUND_INBOX_TASK_INTERVAL_SECONDS=900` (minimum 900 on mobile OS scheduling)
- `EXPO_PUBLIC_SERVER_SCAN_FALLBACK_ENABLED=true`

Important platform note:

- iOS/Android background task scheduling is OS-controlled and not truly real-time; execution cadence may vary by device, battery policy, and app usage.
- For higher reliability while app is terminated, the app also invokes a server fallback scheduler function:
  - `schedule-inbox-background-scan` (Supabase function template included under `supabase/functions/`)
  - this function should be deployed with `SUPABASE_SERVICE_ROLE_KEY` available in Supabase project secrets

## Automated claim emails (live delivery)

Claim generation, chasers, and card escalations all invoke the Supabase Edge Function:

- `generate-claim`

This function is now wired for live email delivery via Resend.

Set these Supabase function secrets before deployment:

- `RESEND_API_KEY` (required)
- `CLAIM_EMAIL_FROM` (required, verified sender in Resend)
- `CLAIM_EMAIL_REPLY_TO` (optional)

Example secret setup:

```bash
supabase secrets set RESEND_API_KEY=...
supabase secrets set CLAIM_EMAIL_FROM="claims@yourdomain.com"
supabase secrets set CLAIM_EMAIL_REPLY_TO="support@yourdomain.com"
```

Deploy/update the function:

```bash
supabase functions deploy generate-claim
```
