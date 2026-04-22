import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import { formatDate } from "@/utils/format";

export function ProductsScreen() {
  const { products, refresh, refreshing } = useAppData();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const value = query.toLowerCase().trim();
    if (!value) return products;
    return products.filter((product) =>
      [product.name, product.brand, product.category]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [products, query]);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionTitle
        title="Products"
        subtitle="Track your purchases and recall status."
      />

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, brand, category..."
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No products found"
          subtitle="Try a different search, or refresh from Supabase."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item: product }) => (
            <View style={styles.item}>
              <Card>
              <View style={styles.row}>
                <Text style={styles.name}>{product.name}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: product.isRecalled ? "#3B1010" : "#0A2C16" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: product.isRecalled ? "#FCA5A5" : "#86EFAC" },
                    ]}
                  >
                    {product.isRecalled ? "Recalled" : "Safe"}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>{product.brand}</Text>
              <Text style={styles.meta}>{product.category}</Text>
              <Text style={styles.meta}>
                Purchased {formatDate(product.purchaseDate ?? product.lastCheckedAt ?? new Date().toISOString())}
              </Text>
              </Card>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  item: {
    marginBottom: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
