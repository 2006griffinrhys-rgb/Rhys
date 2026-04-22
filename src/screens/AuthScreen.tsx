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
    <Screen>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.fill}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.brand}>Prooof</Text>
            <Text style={styles.subtitle}>Save receipts. Track recalls. Claim smarter.</Text>
          </View>

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
              placeholderTextColor={colors.textSecondary}
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
              placeholderTextColor={colors.textSecondary}
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
    justifyContent: "center",
    gap: spacing.lg,
  },
  hero: {
    marginBottom: spacing.sm,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: 15,
  },
  modeContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: radii.md,
    paddingVertical: 11,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modeTextActive: {
    color: colors.textPrimary,
  },
  formGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
  },
  submitButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: colors.warning,
    lineHeight: 20,
  },
  demoButton: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
  },
  demoButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});
