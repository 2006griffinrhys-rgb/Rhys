import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import { formatDate, formatCents } from "@/utils/format";

export function ClaimsScreen() {
  const { claims, refreshing, refresh } = useAppData();

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionTitle title="Claims" subtitle="Track your refund and recall claim status." />

      {claims.length === 0 ? (
        <EmptyState
          title="No claims yet"
          subtitle="Generate a claim from the Recalls tab when one of your products is affected."
        />
      ) : (
        claims.map((claim) => (
          <Card key={claim.id}>
            <View style={styles.row}>
              <Text style={styles.name}>{claim.productName}</Text>
              <Pill status={claim.status} />
            </View>
            <Text style={styles.reason}>Estimated payout: {formatCents(claim.estimatedPayoutCents)}</Text>
            <Text style={styles.date}>Created {formatDate(claim.createdAt)}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  reason: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
