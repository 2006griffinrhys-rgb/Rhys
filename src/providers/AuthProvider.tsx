import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/services/supabase";
import { env } from "@/services/env";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemoAuth: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  continueWithDemo: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEMO_AUTH_STORAGE_KEY = "prooof.demo-auth.user-email";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoAuth, setIsDemoAuth] = useState(false);

  useEffect(() => {
    if (env.demoAuthEnabled && !env.hasSupabaseConfig) {
      let cancelled = false;
      AsyncStorage.getItem(DEMO_AUTH_STORAGE_KEY)
        .then((storedEmail) => {
          if (cancelled || !storedEmail) {
            return;
          }
          setIsDemoAuth(true);
          setUser({
            id: "demo-user",
            email: storedEmail,
          } as unknown as User);
          setSession(null);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    let mounted = true;
    setLoading(true);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isDemoAuth,
      async signIn(email, password) {
        if (env.demoAuthEnabled && !env.hasSupabaseConfig) {
          setIsDemoAuth(true);
          setUser({
            id: "demo-user",
            email,
          } as unknown as User);
          await AsyncStorage.setItem(DEMO_AUTH_STORAGE_KEY, email);
          return { error: null };
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUp(email, password) {
        if (env.demoAuthEnabled && !env.hasSupabaseConfig) {
          setIsDemoAuth(true);
          setUser({
            id: "demo-user",
            email,
          } as unknown as User);
          await AsyncStorage.setItem(DEMO_AUTH_STORAGE_KEY, email);
          return { error: null };
        }
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      async continueWithDemo() {
        if (!env.demoAuthEnabled) {
          return;
        }
        setIsDemoAuth(true);
        const email = "demo@prooof.app";
        setUser({
          id: "demo-user",
          email,
        } as unknown as User);
        await AsyncStorage.setItem(DEMO_AUTH_STORAGE_KEY, email);
      },
      async signOut() {
        if (env.demoAuthEnabled && !env.hasSupabaseConfig) {
          setIsDemoAuth(false);
          setUser(null);
          setSession(null);
          await AsyncStorage.removeItem(DEMO_AUTH_STORAGE_KEY);
          return;
        }
        await supabase.auth.signOut();
      },
    }),
    [isDemoAuth, loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
