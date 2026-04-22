import Constants from "expo-constants";

type ExtraConfig = {
  expoConfig?: {
    extra?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      supabaseProjectId?: string;
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

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseProjectId,
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
    usingFallback: !env.hasSupabaseConfig,
    demoAuthEnabled: env.demoAuthEnabled,
  };
}
