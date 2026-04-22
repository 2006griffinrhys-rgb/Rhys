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
        <View style={styles.page}>
          <View style={styles.topBar}>
            <View style={styles.logoWrap}>
              <View style={styles.logoDot}>
                <Text style={styles.logoPound}>£</Text>
              </View>
              <Text style={styles.logoText}>Prooof</Text>
            </View>
            <View style={styles.topMeta}>
              <View style={styles.topPill}>
                <Text style={styles.topPillText}>Secure</Text>
              </View>
              <Text style={styles.topMetaText}>Sign in required</Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.heroCard}>
              <View style={styles.heroGradientStart} />
              <View style={styles.heroGradientBlend} />
              <Text style={styles.heroLabel}>PREVIEW</Text>
              <View style={styles.heroMainRow}>
                <Text style={styles.heroAmount}>£793.05</Text>
                <Text style={styles.heroHeadline}>in your inbox</Text>
              </View>
              <Text style={styles.heroMeta}>Sign in to unlock your live tracked value</Text>
            </View>

            <View style={styles.planStrip}>
              <View style={styles.planBubble}>
                <Text style={styles.planBubbleText}>Free</Text>
              </View>
              <Text style={styles.planStripMeta}>0 / 5 claims used this month</Text>
            </View>

            <View style={styles.moneyCard}>
              <View style={styles.moneyIcon}>
                <Text style={styles.moneyIconText}>£</Text>
              </View>
              <View style={styles.moneyCopy}>
                <Text style={styles.moneyTitle}>Potential money owed</Text>
                <Text style={styles.moneyValue}>Up to £793.05</Text>
                <Text style={styles.moneyMeta}>
                  Sign in to load your personalized products, claim opportunities, and safety recalls.
                </Text>
              </View>
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
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  page: {
    flex: 1,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.authSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.authBorder,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  content: {
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 1120,
    width: "100%",
    alignSelf: "center",
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
    fontSize: 30,
    fontWeight: "700",
  },
  topMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  topPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    backgroundColor: colors.authSurfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  topPillText: {
    color: colors.webLandingText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topMetaText: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    fontWeight: "600",
  },
  heroCard: {
    overflow: "hidden",
    backgroundColor: "#FF6400",
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  heroGradientStart: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "46%",
    backgroundColor: "#FF1E49",
  },
  heroGradientBlend: {
    position: "absolute",
    left: "42%",
    top: 0,
    bottom: 0,
    width: "18%",
    backgroundColor: "rgba(255,84,0,0.45)",
  },
  heroLabel: {
    zIndex: 1,
    color: "#FFE7E3",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroMainRow: {
    zIndex: 1,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    columnGap: spacing.sm,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 54,
    fontWeight: "800",
    letterSpacing: -1.4,
  },
  heroHeadline: {
    color: "#FFF4EE",
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroMeta: {
    zIndex: 1,
    marginTop: spacing.sm,
    color: "#FFF0E8",
    fontSize: 20,
    fontWeight: "500",
  },
  planStrip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.authBorder,
    backgroundColor: colors.authSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  planBubble: {
    borderRadius: radii.pill,
    backgroundColor: "#FFE7EA",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  planBubbleText: {
    color: "#DB2340",
    fontWeight: "700",
    fontSize: 11,
  },
  planStripMeta: {
    flex: 1,
    color: colors.webLandingSubtext,
    fontSize: 13,
  },
  moneyCard: {
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: "#22C67D",
    backgroundColor: "#DEF6EA",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  moneyIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: "#00BD74",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  moneyIconText: {
    color: "#00301B",
    fontWeight: "800",
    fontSize: 16,
  },
  moneyCopy: {
    flex: 1,
  },
  moneyTitle: {
    color: "#108A5A",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  moneyValue: {
    color: colors.webLandingText,
    fontWeight: "800",
    fontSize: 45,
    marginTop: spacing.xs,
    letterSpacing: -0.7,
  },
  moneyMeta: {
    marginTop: spacing.xs,
    color: colors.webLandingSubtext,
    fontSize: 18,
    lineHeight: 25,
  },
  authCard: {
    backgroundColor: colors.authSurface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.authBorder,
    padding: spacing.xl,
    gap: spacing.md,
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
