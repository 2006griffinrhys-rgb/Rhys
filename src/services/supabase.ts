import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/services/env";

const missingEnvClient = () => ({
  auth: {
    async getSession() {
      return { data: { session: null }, error: new Error("Missing Supabase env values") };
    },
  },
});

export const supabase = env.hasSupabaseConfig
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (missingEnvClient() as unknown as ReturnType<typeof createClient>);
