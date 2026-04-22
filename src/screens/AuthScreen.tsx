import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { Screen } from "@/components/Screen";
import { colors, radii, spacing } from "@/theme/colors";
import { env } from "@/services/env";

type AuthMode = "signin" | "signup";

export function AuthScreen() {
  const { signIn, signUp, continueWithDemo, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().length > 4 && password.length >= 6, [email, password]);

  const handleSubmit = async () => {
    setMessage(null);
    if (!canSubmit) {
      setMessage("Please use a valid email and a 6+ character password.");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const result =
      mode === "signin" ? await signIn(trimmedEmail, password) : await signUp(trimmedEmail, password);

    if (!result.error) {
      if (mode === "signup") setMessage("Account created. Check your inbox to confirm.");
      return;
    }

    setMessage(result.error);
  };

  const handleDemoEntry = async () => {
    setMessage(null);
    await continueWithDemo();
  };

  return (
    <Screen backgroundColor={colors.authBackground}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.fill}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <View style={styles.logoWrap}>
              <View style={styles.logoDot}>
                <Text style={styles.logoPound}>£</Text>
              </View>
              <Text style={styles.logoText}>Prooof</Text>
            </View>
            <View style={styles.topLinks}>
              <Text style={styles.topLink}>Install</Text>
              <Text style={styles.topLink}>Sign in</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.badge}>Chrome extension · Free during beta</Text>
            <Text style={styles.heroHeadlinePrimary}>Every receipt,</Text>
            <Text style={styles.heroHeadlineAccent}>automatically saved.</Text>
            <Text style={styles.subtitle}>
              Install Prooof for Chrome. Open Gmail or Outlook like you normally do and we securely scan your email for
              purchases, detect money you're owed and help you claim it.
            </Text>
            <View style={styles.heroCtas}>
              <View style={styles.heroPrimaryCta}>
                <Text style={styles.heroPrimaryText}>Install for Chrome</Text>
              </View>
              <View style={styles.heroSecondaryCta}>
                <Text style={styles.heroSecondaryText}>Create account</Text>
              </View>
            </View>
            <Text style={styles.heroMeta}>Works with Gmail, Outlook.com & Outlook 365 · No card required</Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.modeContainer}>
              <Pressable
                onPress={() => setMode("signin")}
                style={[styles.modeButton, mode === "signin" && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === "signin" && styles.modeTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("signup")}
                style={[styles.modeButton, mode === "signup" && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === "signup" && styles.modeTextActive]}>Create Account</Text>
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.authMuted}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.authMuted}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              style={[styles.submitButton, (!canSubmit || loading) && styles.submitButtonDisabled]}
            >
              <Text style={styles.submitText}>
                {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
              </Text>
            </Pressable>

            {!env.hasSupabaseConfig ? (
              <Pressable onPress={handleDemoEntry} style={styles.demoButton}>
                <Text style={styles.demoButtonText}>Continue in Demo Mode</Text>
              </Pressable>
            ) : null}

            {!!message && <Text style={styles.message}>{message}</Text>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  container: {
    flex: 1,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoDot: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.authBrand,
    alignItems: "center",
    justifyContent: "center",
  },
  logoPound: {
    color: colors.authSurface,
    fontSize: 16,
    fontWeight: "800",
  },
  logoText: {
    color: colors.authTextPrimary,
    fontSize: 27,
    fontWeight: "700",
  },
  topLinks: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  topLink: {
    color: colors.authTextSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    color: colors.authTextSecondary,
    fontSize: 13,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.authSurface,
  },
  heroHeadlinePrimary: {
    marginTop: spacing.sm,
    color: colors.authTextPrimary,
    fontSize: 58,
    fontWeight: "800",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  heroHeadlineAccent: {
    color: colors.authBrand,
    fontSize: 58,
    fontWeight: "800",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  subtitle: {
    color: colors.authTextSecondary,
    marginTop: spacing.sm,
    fontSize: 24,
    lineHeight: 34,
    textAlign: "center",
    maxWidth: 920,
  },
  heroCtas: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  heroPrimaryCta: {
    backgroundColor: colors.authBrand,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  heroPrimaryText: {
    color: colors.authSurface,
    fontWeight: "700",
    fontSize: 16,
  },
  heroSecondaryCta: {
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.authSurface,
  },
  heroSecondaryText: {
    color: colors.authTextPrimary,
    fontWeight: "600",
    fontSize: 16,
  },
  heroMeta: {
    color: colors.authMuted,
    marginTop: spacing.xs,
    fontSize: 13,
    textAlign: "center",
  },
  authCard: {
    backgroundColor: colors.authSurface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.authBorder,
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  modeContainer: {
    backgroundColor: colors.authSurfaceSoft,
    borderRadius: radii.lg,
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    borderColor: colors.authBorder,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: radii.md,
    paddingVertical: 11,
  },
  modeButtonActive: {
    backgroundColor: colors.authSurface,
  },
  modeText: {
    color: colors.authTextSecondary,
    fontWeight: "600",
  },
  modeTextActive: {
    color: colors.authTextPrimary,
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.authTextSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    borderRadius: radii.lg,
    backgroundColor: colors.authBackground,
    color: colors.authTextPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
  },
  submitButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.authBrand,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.authBrand,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.authSurface,
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: colors.authDanger,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  demoButton: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.authSurfaceSoft,
  },
  demoButtonText: {
    color: colors.authTextPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});
