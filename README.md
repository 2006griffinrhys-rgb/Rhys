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
