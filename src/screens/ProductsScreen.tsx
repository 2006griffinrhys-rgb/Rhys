import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
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
        subtitle="Track purchases, categories, and recall safety status."
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
                  <Pill status={product.isRecalled ? "failed" : "processed"} />
                </View>
                <Text style={styles.meta}>Brand: {product.brand}</Text>
                <Text style={styles.meta}>Category: {product.category}</Text>
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
    backgroundColor: colors.cardSoft,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
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
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    marginTop: 7,
    color: colors.textSecondary,
    fontSize: 13.5,
  },
});
