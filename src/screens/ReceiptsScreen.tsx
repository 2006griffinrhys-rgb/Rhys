import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors, spacing } from "@/theme/colors";
import { formatCurrencyFromCents, formatDate } from "@/utils/format";

const ALL_CATEGORIES = [
  "All",
  "Groceries",
  "Shopping",
  "Electronics",
  "Utilities",
  "Subscriptions",
  "Travel",
  "Services",
  "Home Improvement",
  "Uncategorized",
];

export function ReceiptsScreen() {
  const { receipts, refresh, loading, refreshing } = useAppData();
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredReceipts = useMemo(() => {
    if (selectedCategory === "All") return receipts;
    return receipts.filter((r) => r.category === selectedCategory);
  }, [receipts, selectedCategory]);

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
      <SectionTitle
        title={`All Receipts (${receipts.length})`}
        subtitle="Saved receipt history from email scans."
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {ALL_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredReceipts}
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
              <View>
                <Text style={styles.title}>{item.merchant}</Text>
                {item.category && <Text style={styles.categoryText}>{item.category}</Text>}
              </View>
              <Pill status={item.status} />
            </View>
            <Text style={styles.amount}>{formatCurrencyFromCents(item.totalCents, item.currency)}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Purchased {formatDate(item.purchaseDate)}</Text>
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
  filterContainer: {
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryStrong,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: colors.background,
  },
  helper: {
    color: colors.textSecondary,
  },
  list: {
    gap: 12,
    paddingBottom: 28,
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
    fontSize: 18,
    fontWeight: "800",
  },
  categoryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  amount: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  metaSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
