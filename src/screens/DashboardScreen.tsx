import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import { formatCents, formatDate } from "@/utils/format";

export function DashboardScreen() {
  const { receipts, recalls, claims, stats, refresh, refreshing, usingDemoData } = useAppData();
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

      <View style={styles.statsGrid}>
        <StatCard label="Total receipts" value={stats.receiptCount.toString()} />
        <StatCard label="Products tracked" value={stats.productsTracked.toString()} />
        <StatCard label="Active recalls" value={stats.activeRecalls.toString()} />
        <StatCard label="Claims in progress" value={stats.claimsInProgress.toString()} />
      </View>

      <Card>
        <Text style={styles.statHeadline}>{formatCents(stats.totalSpendCents)}</Text>
        <Text style={styles.statHint}>Total receipt spend</Text>
      </Card>

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
            <Text style={styles.amount}>{formatCents(claim.estimatedPayoutCents)}</Text>
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
    gap: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  demoTitle: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "700",
  },
  demoText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statHeadline: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 26,
  },
  statHint: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  itemSub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  reason: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  amount: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 10,
  },
});
