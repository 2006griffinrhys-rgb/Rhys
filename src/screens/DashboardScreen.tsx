import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";
import { useAppData } from "@/providers/AppDataProvider";
import { colors, spacing } from "@/theme/colors";
import { formatCents, formatDate } from "@/utils/format";

export function DashboardScreen() {
  const {
    receipts,
    recalls,
    claims,
    stats,
    refresh,
    refreshing,
    usingDemoData,
    preferredCurrency,
    userPlan,
    billingInterval,
    activePlanPriceCents,
    claimsRemaining,
    scanEntireInbox,
    scanningInbox,
    lastInboxScan,
    providerCoverageLabel,
  } = useAppData();
  const latestReceipt = receipts[0] ?? null;
  const latestRecall = recalls[0] ?? null;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Prooof dashboard</Text>
        <Text style={styles.subtitle}>Track receipts, recalls, and claims in one place.</Text>
      </View>

      {usingDemoData ? (
        <Card>
          <Text style={styles.demoTitle}>Demo mode is active</Text>
          <Text style={styles.demoText}>
            Add Supabase environment variables to connect live data from your Loveable backend.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.planLabel}>Current plan</Text>
        <Text style={styles.planName}>
          {userPlan === "free" ? "Free" : userPlan === "premium" ? "Premium £4.99" : "Unlimited £9.99"}
        </Text>
        {userPlan !== "free" ? (
          <Text style={styles.planMeta}>
            {billingInterval === "yearly" ? "Yearly billing (20% off): " : "Monthly billing: "}
            {formatCents(activePlanPriceCents, "GBP")}
          </Text>
        ) : null}
        <Text style={styles.planMeta}>
          {claimsRemaining === null
            ? "Unlimited claims this month"
            : `${claimsRemaining} claim(s) remaining this month`}
        </Text>
      </Card>

      <Card>
        <Text style={styles.planLabel}>Inbox scanning</Text>
        <Text style={styles.planMeta}>Scans every available email in linked inboxes (no cap).</Text>
        <Text style={styles.scanMeta}>Coverage: {providerCoverageLabel}</Text>
        {lastInboxScan ? (
          <Text style={styles.scanMeta}>
            Last full scan processed {lastInboxScan.scannedEmails.toLocaleString("en-GB")} emails
          </Text>
        ) : null}
        <Text onPress={() => void scanEntireInbox()} style={[styles.scanCta, scanningInbox && styles.scanCtaDisabled]}>
          {scanningInbox ? "Scanning inbox..." : "Run full inbox scan now"}
        </Text>
      </Card>

      <Card>
        <Text style={styles.spendingLabel}>Total tracked spend ({preferredCurrency})</Text>
        <Text style={styles.statHeadline}>{formatCents(stats.totalSpendCents, preferredCurrency)}</Text>
      </Card>

      <View style={styles.statsGrid}>
        <StatCard label="Total receipts" value={stats.receiptCount.toString()} />
        <StatCard label="Products tracked" value={stats.productsTracked.toString()} />
        <StatCard label="Active recalls" value={stats.activeRecalls.toString()} />
        <StatCard label="Claims in progress" value={stats.claimsInProgress.toString()} />
      </View>

      <SectionTitle title="Latest receipt" subtitle="Recently scanned or uploaded bill" />
      {latestReceipt ? (
        <Card>
          <Text style={styles.itemTitle}>{latestReceipt.merchant}</Text>
          <Text style={styles.itemSub}>{formatDate(latestReceipt.purchaseDate)}</Text>
          <Text style={styles.amount}>{formatCents(latestReceipt.totalCents, latestReceipt.currency)}</Text>
        </Card>
      ) : (
        <EmptyState title="No receipts yet" subtitle="Connect your inbox or upload your first receipt." />
      )}

      <SectionTitle title="Latest recall" subtitle="Most recent product safety alert" />
      {latestRecall ? (
        <Card>
          <Text style={styles.itemTitle}>{latestRecall.productName}</Text>
          <Text style={styles.itemSub}>Severity: {latestRecall.severity.toUpperCase()}</Text>
          <Text style={styles.itemMeta}>{formatDate(latestRecall.publishedAt)}</Text>
          <Text style={styles.reason}>{latestRecall.details}</Text>
        </Card>
      ) : (
        <EmptyState title="No recalls found" subtitle="Recall intelligence will appear here once products are tracked." />
      )}

      <SectionTitle title="Claims snapshot" subtitle="Current reimbursement progress" />
      {claims.length > 0 ? (
        claims.slice(0, 2).map((claim) => (
          <Card key={claim.id}>
            <Text style={styles.itemTitle}>{claim.productName}</Text>
            <Text style={styles.itemSub}>{claim.status.toUpperCase()}</Text>
            <Text style={styles.amount}>{formatCents(claim.estimatedPayoutCents, claim.estimatedPayoutCurrency)}</Text>
          </Card>
        ))
      ) : (
        <EmptyState title="No claims started" subtitle="When recalls are found, claim drafts will show up here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  demoTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  demoText: {
    color: colors.warning,
    fontSize: 14,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  planLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  planName: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  planMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  scanCta: {
    marginTop: spacing.md,
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  scanMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 12,
  },
  scanCtaDisabled: {
    opacity: 0.55,
  },
  spendingLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statHeadline: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 34,
    marginTop: spacing.xs,
    letterSpacing: -0.6,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  itemSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  reason: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  amount: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
});
