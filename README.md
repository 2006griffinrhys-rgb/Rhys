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

## Running natively

- iOS simulator:

  ```bash
  npm run ios
  ```

- Android emulator:

  ```bash
  npm run android
  ```

## Notes

- This app mirrors the core Prooof entities from the Loveable project (`products`, `bills`, claims/recall flows).
- If your Supabase schema differs, update mapping logic in `src/services/prooofApi.ts`.
- The app includes demo fallback data to remain usable when backend env vars are missing.
