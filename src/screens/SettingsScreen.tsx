import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { colors, spacing } from "@/theme/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useAppData } from "@/providers/AppDataProvider";
import { getEnvSummary } from "@/services/env";
import type { BillingTier, EmailProviderId, SupportedCurrency } from "@/types/domain";
import { formatCents, formatDate } from "@/utils/format";

const SUPPORT_URL = "https://prooof.live/";
const CURRENCIES: SupportedCurrency[] = ["GBP", "USD", "EUR", "CAD", "AUD", "JPY"];
const BILLING_INTERVALS = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly (20% off)" },
] as const;
const PROVIDERS: { id: EmailProviderId; label: string }[] = [
  { id: "gmail", label: "Gmail" },
  { id: "yahoo", label: "Yahoo Mail" },
  { id: "outlook", label: "Outlook / Hotmail / Live" },
  { id: "office365", label: "Microsoft 365 / Exchange Online" },
  { id: "exchange", label: "Microsoft Exchange (on-prem/work)" },
  { id: "work-imap", label: "Work IMAP / custom domains" },
];

export function SettingsScreen() {
  const { user, signOut, isDemoAuth } = useAuth();
  const {
    refresh,
    refreshing,
    userPlan,
    billingInterval,
    setBillingInterval,
    keepAccessUntilPeriodEnd,
    setKeepAccessUntilPeriodEnd,
    planPricing,
    activePlanPriceCents,
    startSubscriptionCheckout,
    openStripeBillingPortal,
    downgradeToFreePlan,
    scheduledDowngradeAt,
    preferredCurrency,
    setPreferredCurrency,
    inboxScanProviders,
    setInboxScanProviders,
    providerCoverageLabel,
    scanningInbox,
    inboxScanLastCount,
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

  const toggleProvider = (provider: EmailProviderId) => {
    const exists = inboxScanProviders.includes(provider);
    if (exists) {
      const next = inboxScanProviders.filter((item) => item !== provider);
      if (next.length > 0) {
        setInboxScanProviders(next);
      }
      return;
    }
    setInboxScanProviders([...inboxScanProviders, provider]);
  };

  const renderPlanButton = (plan: BillingTier, label: string) => {
    const selected = userPlan === plan;
    const pricing = planPricing[plan];
    const priceLabel =
      plan === "free"
        ? formatCents(0, preferredCurrency)
        : billingInterval === "yearly"
          ? `${formatCents(pricing.yearlyPriceCents, preferredCurrency)} / year`
          : `${formatCents(pricing.monthlyPriceCents, preferredCurrency)} / month`;
    return (
      <Pressable
        key={plan}
        onPress={() => {
          if (plan === "free") {
            void handleDowngradeToFree();
            return;
          }
          void handleUpgrade(plan);
        }}
        style={[styles.planButton, selected && styles.planButtonActive]}
      >
        <Text style={[styles.planButtonText, selected && styles.planButtonTextActive]}>{label}</Text>
        <Text style={[styles.planPriceText, selected && styles.planPriceTextActive]}>{priceLabel}</Text>
      </Pressable>
    );
  };

  const handleUpgrade = async (plan: Exclude<BillingTier, "free">) => {
    try {
      const result = await startSubscriptionCheckout(plan);
      if (result.isMock) {
        Alert.alert("Demo billing mode", "Stripe is not configured, so your plan was updated locally.");
      }
      const supported = await Linking.canOpenURL(result.url);
      if (!supported) {
        Alert.alert("Open billing failed", "Could not open Stripe checkout.");
        return;
      }
      await Linking.openURL(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start checkout.";
      Alert.alert("Checkout error", message);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const result = await openStripeBillingPortal();
      const supported = await Linking.canOpenURL(result.url);
      if (!supported) {
        Alert.alert("Open billing failed", "Could not open Stripe billing portal.");
        return;
      }
      await Linking.openURL(result.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open billing portal.";
      Alert.alert("Billing portal error", message);
    }
  };

  const handleDowngradeToFree = async () => {
    try {
      const result = await downgradeToFreePlan();
      if (result.willDowngradeAtPeriodEnd) {
        const dateLabel = result.currentPeriodEnd ? formatDate(result.currentPeriodEnd) : "period end";
        Alert.alert("Downgrade scheduled", `Access will remain active until ${dateLabel}.`);
      } else {
        Alert.alert("Plan updated", "Your plan is now Free.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not downgrade subscription.";
      Alert.alert("Downgrade error", message);
    }
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
      <View style={styles.page}>
        <View style={styles.container}>
          <SectionTitle title="Settings" subtitle="Account, sync and environment details." />

          <Card>
            <Text style={styles.emailLabel}>Signed in as</Text>
            <Text style={styles.email}>{user?.email ?? "Unknown user"}</Text>
          </Card>

          <Card>
            <Text style={styles.groupTitle}>Data Sync</Text>
            <Text style={styles.envLabel}>Provider coverage</Text>
            <Text style={styles.envValue}>{providerCoverageLabel}</Text>
            <View style={styles.providerGrid}>
              {PROVIDERS.map((provider) => {
                const selected = inboxScanProviders.includes(provider.id);
                return (
                  <Pressable
                    key={provider.id}
                    onPress={() => toggleProvider(provider.id)}
                    style={[styles.providerChip, selected && styles.providerChipActive]}
                  >
                    <Text
                      style={[styles.providerChipText, selected && styles.providerChipTextActive]}
                    >
                      {provider.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={styles.primaryButton} onPress={refresh} disabled={refreshing}>
              <Text style={styles.primaryButtonText}>
                {refreshing ? "Refreshing..." : "Refresh data"}
              </Text>
            </Pressable>
            <Text style={styles.scanMeta}>
              {scanningInbox
                ? "Background scanner is processing now."
                : "Background scanner is active and continuously checks selected providers."}
            </Text>
            {inboxScanLastCount !== null ? (
              <Text style={styles.scanMeta}>
                Last scan: {inboxScanLastCount.toLocaleString("en-GB")} emails processed
              </Text>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.groupTitle}>Subscription</Text>
            <Text style={styles.envLabel}>Billing interval</Text>
            <View style={styles.currencyRow}>
              {BILLING_INTERVALS.map((interval) => {
                const selected = billingInterval === interval.id;
                return (
                  <Pressable
                    key={interval.id}
                    onPress={() => setBillingInterval(interval.id)}
                    style={[styles.currencyButton, selected && styles.currencyButtonActive]}
                  >
                    <Text style={[styles.currencyButtonText, selected && styles.currencyButtonTextActive]}>
                      {interval.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.planGroup}>
              {renderPlanButton("free", "Free · 5 claims/mo · no bill monitoring")}
              {renderPlanButton("premium", "Premium · 20 claims/mo + bill alerts + chasing")}
              {renderPlanButton("unlimited", "Unlimited · unlimited claims + priority")}
            </View>
            <Text style={styles.scanMeta}>
              Active plan price: {formatCents(activePlanPriceCents, preferredCurrency)}{" "}
              {billingInterval === "yearly" ? "per year" : "per month"}
            </Text>
            <Pressable
              style={[styles.toggleRow, keepAccessUntilPeriodEnd && styles.toggleRowActive]}
              onPress={() => setKeepAccessUntilPeriodEnd(!keepAccessUntilPeriodEnd)}
            >
              <Text style={styles.toggleTitle}>Keep access until period end (recommended)</Text>
              <Text style={styles.toggleState}>{keepAccessUntilPeriodEnd ? "On" : "Off"}</Text>
            </Pressable>
            {scheduledDowngradeAt ? (
              <Text style={styles.scanMeta}>Scheduled downgrade date: {formatDate(scheduledDowngradeAt)}</Text>
            ) : null}
            <Pressable style={styles.ghostButton} onPress={handleOpenBillingPortal}>
              <Text style={styles.ghostButtonText}>Open Stripe billing portal</Text>
            </Pressable>
          </Card>

          <Card>
            <Text style={styles.groupTitle}>Currency</Text>
            <Text style={styles.currencySubtitle}>Choose Your Preferred Local Currency</Text>
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
              <View style={styles.envRow}>
                <Text style={styles.envLabel}>Stripe billing</Text>
                <Text style={styles.envValue}>{envSummary.stripeBillingEnabled ? "Enabled" : "Disabled"}</Text>
              </View>
              <View style={styles.envRow}>
                <Text style={styles.envLabel}>Background inbox task</Text>
                <Text style={styles.envValue}>
                  {envSummary.backgroundInboxTaskEnabled
                    ? `Enabled (${envSummary.backgroundInboxTaskIntervalSeconds}s target)`
                    : "Disabled"}
                </Text>
              </View>
              <View style={styles.envRow}>
                <Text style={styles.envLabel}>Server scan fallback</Text>
                <Text style={styles.envValue}>{envSummary.serverScanFallbackEnabled ? "Enabled" : "Disabled"}</Text>
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
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 1120,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
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
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryStrong,
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: "700",
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  planGroup: {
    gap: spacing.sm,
  },
  providerGrid: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  providerChip: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  providerChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  providerChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  providerChipTextActive: {
    color: colors.primary,
  },
  planButton: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  planButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  planButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  planButtonTextActive: {
    color: colors.textPrimary,
  },
  planPriceTextActive: {
    color: colors.textSecondary,
  },
  planPriceText: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: "700",
  },
  currencyRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  currencySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  currencyButton: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  currencyButtonText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  currencyButtonTextActive: {
    color: colors.primary,
  },
  ghostButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  scanMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  toggleRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.infoSoft,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
    paddingRight: spacing.sm,
  },
  toggleState: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  signOutButton: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DFAFC0",
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
    borderColor: colors.borderSubtle,
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
