import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { colors, spacing } from "@/theme/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useAppData } from "@/providers/AppDataProvider";
import { getEnvSummary } from "@/services/env";
import type { BillingTier, SupportedCurrency } from "@/types/domain";

const SUPPORT_URL = "https://www.prooof.app";
const CURRENCIES: SupportedCurrency[] = ["GBP", "USD", "EUR", "CAD", "AUD", "JPY"];

export function SettingsScreen() {
  const { user, signOut, isDemoAuth } = useAuth();
  const {
    refresh,
    refreshing,
    userPlan,
    setUserPlan,
    preferredCurrency,
    setPreferredCurrency,
    runInboxScan,
    scanningInbox,
  } = useAppData();
  const envSummary = getEnvSummary();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const openSupport = async () => {
    const supported = await Linking.canOpenURL(SUPPORT_URL);
    if (supported) {
      await Linking.openURL(SUPPORT_URL);
    }
  };

  const handleScanInbox = async () => {
    try {
      await runInboxScan();
      Alert.alert("Inbox scan started", "Scanning all emails in inbox (no cap).");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start inbox scan.";
      Alert.alert("Scan failed", message);
    }
  };

  const renderPlanButton = (plan: BillingTier, label: string) => {
    const selected = userPlan === plan;
    return (
      <Pressable
        key={plan}
        onPress={() => setUserPlan(plan)}
        style={[styles.planButton, selected && styles.planButtonActive]}
      >
        <Text style={[styles.planButtonText, selected && styles.planButtonTextActive]}>{label}</Text>
      </Pressable>
    );
  };

  const renderCurrencyButton = (currency: SupportedCurrency) => {
    const selected = preferredCurrency === currency;
    return (
      <Pressable
        key={currency}
        onPress={() => setPreferredCurrency(currency)}
        style={[styles.currencyButton, selected && styles.currencyButtonActive]}
      >
        <Text style={[styles.currencyButtonText, selected && styles.currencyButtonTextActive]}>{currency}</Text>
      </Pressable>
    );
  };

  return (
    <Screen>
      <SectionTitle title="Settings" subtitle="Account, sync and environment details." />

      <Card>
        <Text style={styles.emailLabel}>Signed in as</Text>
        <Text style={styles.email}>{user?.email ?? "Unknown user"}</Text>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Data Sync</Text>
        <Pressable style={styles.primaryButton} onPress={refresh} disabled={refreshing}>
          <Text style={styles.primaryButtonText}>
            {refreshing ? "Refreshing..." : "Refresh data"}
          </Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={handleScanInbox} disabled={scanningInbox}>
          <Text style={styles.ghostButtonText}>
            {scanningInbox ? "Scanning inbox..." : "Scan entire inbox (no cap)"}
          </Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Subscription</Text>
        <View style={styles.planGroup}>
          {renderPlanButton("free", "Free · 5 claims/mo · no bill monitoring")}
          {renderPlanButton("premium", "Premium £4.99 · 20 claims/mo + bill alerts + chasing")}
          {renderPlanButton("unlimited", "Unlimited £9.99 · unlimited claims + priority")}
        </View>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Currency</Text>
        <Text style={styles.envLabel}>Choose your preferred local currency</Text>
        <View style={styles.currencyRow}>
          {CURRENCIES.map(renderCurrencyButton)}
        </View>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Environment</Text>
        <View style={styles.envGrid}>
          <View style={styles.envRow}>
            <Text style={styles.envLabel}>Supabase URL</Text>
            <Text style={styles.envValue}>{envSummary.supabaseUrl}</Text>
          </View>
          <View style={styles.envRow}>
            <Text style={styles.envLabel}>Project ID</Text>
            <Text style={styles.envValue}>{envSummary.projectId}</Text>
          </View>
          <View style={styles.envRow}>
            <Text style={styles.envLabel}>Using fallback</Text>
            <Text style={styles.envValue}>{envSummary.usingFallback ? "Yes" : "No"}</Text>
          </View>
          <View style={styles.envRow}>
            <Text style={styles.envLabel}>Auth mode</Text>
            <Text style={styles.envValue}>{isDemoAuth ? "Demo auth" : "Supabase auth"}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Support</Text>
        <Pressable style={styles.ghostButton} onPress={openSupport}>
          <Text style={styles.ghostButtonText}>Open Prooof website</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  email: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  groupTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: "700",
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  planGroup: {
    gap: spacing.sm,
  },
  planButton: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  planButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.infoSoft,
  },
  planButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  planButtonTextActive: {
    color: colors.primaryText,
  },
  currencyRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  currencyButton: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.infoSoft,
  },
  currencyButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  currencyButtonTextActive: {
    color: colors.primaryText,
  },
  ghostButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6f2748",
  },
  signOutButtonText: {
    color: colors.danger,
    fontWeight: "700",
  },
  envGrid: {
    gap: spacing.sm,
  },
  envRow: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  envLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  envValue: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
});
