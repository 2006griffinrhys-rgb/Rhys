import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import { formatCurrencyFromCents, formatDate } from "@/utils/format";

export function ReceiptsScreen() {
  const { receipts, refresh, loading, refreshing } = useAppData();

  if (loading && receipts.length === 0) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.helper}>Loading receipts…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionTitle title={`All Receipts (${receipts.length})`} subtitle="Saved receipt history from email scans." />
      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={receipts.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No receipts yet"
            subtitle="When email receipts are ingested by Prooof, they will show here."
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.title}>{item.merchant}</Text>
              <Pill status={item.status} />
            </View>
            <Text style={styles.amount}>{formatCurrencyFromCents(item.totalCents, item.currency)}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{formatDate(item.purchaseDate)}</Text>
              <Text style={styles.metaText}>{item.source.toUpperCase()}</Text>
            </View>
            <Text style={styles.metaSub}>Status: {item.status}</Text>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  helper: {
    color: colors.textSecondary,
  },
  list: {
    gap: 12,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  amount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  metaSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
