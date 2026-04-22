import Constants from "expo-constants";

type ExtraConfig = {
  expoConfig?: {
    extra?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      supabaseProjectId?: string;
      supportUrl?: string;
      stripePortalUrl?: string;
      stripeBillingEnabled?: boolean;
      autoInboxScanEnabled?: boolean;
      autoInboxScanIntervalSeconds?: number;
      backgroundInboxTaskEnabled?: boolean;
      backgroundInboxTaskIntervalSeconds?: number;
      serverScanFallbackEnabled?: boolean;
    };
  };
};

const extraConfig = Constants as unknown as ExtraConfig;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  extraConfig.expoConfig?.extra?.supabaseUrl ??
  "";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  extraConfig.expoConfig?.extra?.supabaseAnonKey ??
  "";

const supabaseProjectId =
  process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID ??
  extraConfig.expoConfig?.extra?.supabaseProjectId ??
  "";

const supportUrl =
  process.env.EXPO_PUBLIC_SUPPORT_URL ??
  extraConfig.expoConfig?.extra?.supportUrl ??
  "https://www.prooof.app";

const stripePortalUrl =
  process.env.EXPO_PUBLIC_STRIPE_PORTAL_URL ??
  extraConfig.expoConfig?.extra?.stripePortalUrl ??
  "";

const stripeBillingEnabled =
  process.env.EXPO_PUBLIC_STRIPE_BILLING_ENABLED === "true" ||
  extraConfig.expoConfig?.extra?.stripeBillingEnabled === true;

const autoInboxScanEnabled =
  process.env.EXPO_PUBLIC_AUTO_INBOX_SCAN_ENABLED !== "false" &&
  extraConfig.expoConfig?.extra?.autoInboxScanEnabled !== false;

const autoInboxScanIntervalSecondsRaw = Number(
  process.env.EXPO_PUBLIC_AUTO_INBOX_SCAN_INTERVAL_SECONDS ??
    extraConfig.expoConfig?.extra?.autoInboxScanIntervalSeconds ??
    120,
);

const autoInboxScanIntervalSeconds =
  Number.isFinite(autoInboxScanIntervalSecondsRaw) && autoInboxScanIntervalSecondsRaw > 0
    ? Math.max(30, Math.round(autoInboxScanIntervalSecondsRaw))
    : 120;

const autoInboxScanIntervalMs = autoInboxScanIntervalSeconds * 1000;

const backgroundInboxTaskEnabled =
  process.env.EXPO_PUBLIC_BACKGROUND_INBOX_TASK_ENABLED !== "false" &&
  extraConfig.expoConfig?.extra?.backgroundInboxTaskEnabled !== false;

const backgroundInboxTaskIntervalSecondsRaw = Number(
  process.env.EXPO_PUBLIC_BACKGROUND_INBOX_TASK_INTERVAL_SECONDS ??
    extraConfig.expoConfig?.extra?.backgroundInboxTaskIntervalSeconds ??
    900,
);

const backgroundInboxTaskIntervalSeconds =
  Number.isFinite(backgroundInboxTaskIntervalSecondsRaw) && backgroundInboxTaskIntervalSecondsRaw > 0
    ? Math.max(900, Math.round(backgroundInboxTaskIntervalSecondsRaw))
    : 900;

const serverScanFallbackEnabled =
  process.env.EXPO_PUBLIC_SERVER_SCAN_FALLBACK_ENABLED !== "false" &&
  extraConfig.expoConfig?.extra?.serverScanFallbackEnabled !== false;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseProjectId,
  supportUrl,
  stripePortalUrl,
  stripeBillingEnabled,
  autoInboxScanEnabled,
  autoInboxScanIntervalMs,
  autoInboxScanIntervalSeconds,
  backgroundInboxTaskEnabled,
  backgroundInboxTaskIntervalSeconds,
  serverScanFallbackEnabled,
  hasSupabaseConfig: Boolean(supabaseUrl && supabaseAnonKey),
  demoAuthEnabled: process.env.EXPO_PUBLIC_ENABLE_DEMO_AUTH === "true" || !(supabaseUrl && supabaseAnonKey),
};

export function isSupabaseConfigured(): boolean {
  return env.hasSupabaseConfig;
}

export function getEnvSummary() {
  return {
    supabaseUrl: env.supabaseUrl || "Not configured",
    projectId: env.supabaseProjectId || "Not configured",
    stripeBillingEnabled: env.stripeBillingEnabled,
    stripePortalUrl: env.stripePortalUrl || "Not configured",
    autoInboxScanEnabled: env.autoInboxScanEnabled,
    autoInboxScanIntervalSeconds: env.autoInboxScanIntervalSeconds,
    backgroundInboxTaskEnabled: env.backgroundInboxTaskEnabled,
    backgroundInboxTaskIntervalSeconds: env.backgroundInboxTaskIntervalSeconds,
    serverScanFallbackEnabled: env.serverScanFallbackEnabled,
    usingFallback: !env.hasSupabaseConfig,
    demoAuthEnabled: env.demoAuthEnabled,
  };
}
