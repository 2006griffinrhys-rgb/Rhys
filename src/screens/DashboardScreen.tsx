import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useAppData } from "@/providers/AppDataProvider";
import { colors, radii, spacing } from "@/theme/colors";
import { formatCents } from "@/utils/format";

type CategoryKey =
  | "totalValue"
  | "underWarranty"
  | "warrantyExpired"
  | "safetyRecalls"
  | "missingInfo";

type CategoryTone = "neutral" | "success" | "danger" | "warning";

type QuickViewItem = {
  id: string;
  label: string;
  detail: string;
};

function isOlderThanOneYear(dateLike: string | undefined): boolean {
  if (!dateLike) return false;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  return now - date.getTime() > 365 * 24 * 60 * 60 * 1000;
}

export function DashboardScreen() {
  const {
    products,
    recalls,
    claims,
    stats,
    refresh,
    refreshing,
    userPlan,
    claimsUsed,
    claimsRemaining,
    preferredCurrency,
    billingInterval,
    activePlanPriceCents,
  } = useAppData();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("totalValue");
  const [dismissTaxRelief, setDismissTaxRelief] = useState(false);

  const activeRecalls = recalls.filter((recall) => recall.isActive);
  const potentialValueCents = useMemo(
    () => activeRecalls.reduce((sum, recall) => sum + recall.estimatedPayoutCents, 0),
    [activeRecalls],
  );
  const underWarranty = useMemo(
    () => products.filter((product) => !isOlderThanOneYear(product.purchaseDate)),
    [products],
  );
  const warrantyExpired = useMemo(
    () => products.filter((product) => isOlderThanOneYear(product.purchaseDate)),
    [products],
  );
  const itemsMissingInfo = useMemo(
    () => products.filter((product) => !product.purchaseDate || !product.receiptId),
    [products],
  );

  const categorySummary = useMemo(
    () => [
      {
        key: "totalValue" as const,
        icon: "£",
        tone: "neutral" as CategoryTone,
        title: "Total value owed",
        value: formatCents(potentialValueCents, preferredCurrency),
        subtitle: `${claims.length} active claim item(s)`,
      },
      {
        key: "underWarranty" as const,
        icon: "✓",
        tone: "success" as CategoryTone,
        title: "Under warranty",
        value: `${underWarranty.length} item${underWarranty.length === 1 ? "" : "s"}`,
        subtitle: "Within 12 months of purchase",
      },
      {
        key: "warrantyExpired" as const,
        icon: "!",
        tone: "danger" as CategoryTone,
        title: "Warranty expired",
        value: `${warrantyExpired.length} item${warrantyExpired.length === 1 ? "" : "s"}`,
        subtitle: "Older than 12 months",
      },
      {
        key: "safetyRecalls" as const,
        icon: "△",
        tone: "warning" as CategoryTone,
        title: "Safety recalls",
        value: `${activeRecalls.length} item${activeRecalls.length === 1 ? "" : "s"}`,
        subtitle: activeRecalls.length > 0 ? "Potential compensation available" : "No recalls found",
      },
      {
        key: "missingInfo" as const,
        icon: "?",
        tone: "neutral" as CategoryTone,
        title: "Items missing info",
        value: `${itemsMissingInfo.length} item${itemsMissingInfo.length === 1 ? "" : "s"}`,
        subtitle: "Missing receipt or purchase date",
      },
    ],
    [activeRecalls.length, claims.length, itemsMissingInfo.length, potentialValueCents, preferredCurrency, underWarranty.length, warrantyExpired.length],
  );

  const quickView = useMemo(() => {
    const fallback = [{ id: "none", label: "No matching items right now.", detail: "Try refreshing after your next scan." }];
    const viewMap: Record<CategoryKey, { title: string; description: string; items: QuickViewItem[] }> = {
      totalValue: {
        title: "Potential money owed",
        description: "Products and claims currently estimated for compensation.",
        items:
          activeRecalls.slice(0, 5).map((recall) => ({
            id: recall.id,
            label: recall.productName,
            detail: formatCents(recall.estimatedPayoutCents, preferredCurrency),
          })) || fallback,
      },
      underWarranty: {
        title: "Under warranty",
        description: "Products still likely covered by standard warranty windows.",
        items:
          underWarranty.slice(0, 5).map((product) => ({
            id: product.id,
            label: product.name,
            detail: product.brand,
          })) || fallback,
      },
      warrantyExpired: {
        title: "Warranty expired",
        description: "Products where warranty likely expired but recalls may still apply.",
        items:
          warrantyExpired.slice(0, 5).map((product) => ({
            id: product.id,
            label: product.name,
            detail: product.brand,
          })) || fallback,
      },
      safetyRecalls: {
        title: "Safety recall matches",
        description: "Open recall notices detected against tracked products.",
        items:
          activeRecalls.slice(0, 5).map((recall) => ({
            id: recall.id,
            label: recall.productName,
            detail: recall.title,
          })) || fallback,
      },
      missingInfo: {
        title: "Missing information",
        description: "Products that need receipt or purchase date for stronger claims.",
        items:
          itemsMissingInfo.slice(0, 5).map((product) => ({
            id: product.id,
            label: product.name,
            detail: `${product.receiptId ? "Receipt linked" : "Missing receipt"} · ${
              product.purchaseDate ? "Date present" : "Missing date"
            }`,
          })) || fallback,
      },
    };
    const current = viewMap[selectedCategory];
    return {
      ...current,
      items: current.items.length > 0 ? current.items : fallback,
    };
  }, [activeRecalls, itemsMissingInfo, preferredCurrency, selectedCategory, underWarranty, warrantyExpired]);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} backgroundColor={colors.authBackground}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>WE FOUND</Text>
          <View style={styles.heroMainRow}>
            <Text style={styles.heroAmount}>{formatCents(potentialValueCents, preferredCurrency)}</Text>
            <Text style={styles.heroHeadline}>in your inbox</Text>
          </View>
          <Text style={styles.heroMeta}>Across {stats.productsTracked} products tracked</Text>
        </View>

        <View style={styles.planStrip}>
          <View style={styles.planBubble}>
            <Text style={styles.planBubbleText}>{userPlan.toUpperCase()}</Text>
          </View>
          <Text style={styles.planStripMeta}>
            {claimsRemaining === null
              ? `${claimsUsed} claims used this month · unlimited plan`
              : `${claimsUsed} / ${claimsUsed + claimsRemaining} claims used this month`}
          </Text>
          <View style={styles.upgradePill}>
            <Text style={styles.upgradeText}>
              {userPlan === "free"
                ? "Upgrade"
                : `${billingInterval === "yearly" ? "Yearly" : "Monthly"} ${formatCents(
                    activePlanPriceCents,
                    "GBP",
                  )}`}
            </Text>
          </View>
        </View>

        <View style={styles.moneyCard}>
          <View style={styles.moneyIcon}>
            <Text style={styles.moneyIconText}>£</Text>
          </View>
          <View style={styles.moneyCopy}>
            <Text style={styles.moneyTitle}>Potential money owed</Text>
            <Text style={styles.moneyValue}>Up to {formatCents(potentialValueCents, preferredCurrency)}</Text>
            <Text style={styles.moneyMeta}>
              {activeRecalls.length} item(s) may qualify for a refund or compensation under consumer law.
            </Text>
          </View>
        </View>

        <View style={styles.categoryGrid}>
          {categorySummary.map((category) => {
            const selected = selectedCategory === category.key;
            return (
              <Pressable
                key={category.key}
                onPress={() => setSelectedCategory(category.key)}
                style={[styles.categoryCard, selected && styles.categoryCardSelected]}
              >
                <View
                  style={[
                    styles.categoryIconBubble,
                    category.tone === "success" && styles.categoryIconSuccess,
                    category.tone === "danger" && styles.categoryIconDanger,
                    category.tone === "warning" && styles.categoryIconWarning,
                    selected && styles.categoryIconBubbleSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryIconText,
                      category.tone === "success" && styles.categoryIconTextSuccess,
                      category.tone === "danger" && styles.categoryIconTextDanger,
                      category.tone === "warning" && styles.categoryIconTextWarning,
                      selected && styles.categoryIconTextSelected,
                    ]}
                  >
                    {category.icon}
                  </Text>
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryValue}>{category.value}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quickViewCard}>
          <Text style={styles.quickViewTitle}>{quickView.title}</Text>
          <Text style={styles.quickViewDescription}>{quickView.description}</Text>
          <View style={styles.quickItems}>
            {quickView.items.map((item) => (
              <View key={item.id} style={styles.quickItem}>
                <Text style={styles.quickItemLabel}>{item.label}</Text>
                <Text style={styles.quickItemDetail}>{item.detail}</Text>
              </View>
            ))}
          </View>
        </View>

        {!dismissTaxRelief ? (
          <View style={styles.taxReliefCard}>
            <View style={styles.taxReliefIcon}>
              <Text style={styles.taxReliefIconText}>▣</Text>
            </View>
            <View style={styles.taxReliefBody}>
              <Text style={styles.taxReliefTitle}>Working-from-home tax relief</Text>
              <Text style={styles.taxReliefMeta}>
                You may be owed for prior tax years. Typical UK claim values range from £62 to £140.
              </Text>
            </View>
            <Pressable onPress={() => setDismissTaxRelief(true)} style={styles.taxReliefDismiss}>
              <Text style={styles.taxReliefDismissText}>×</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: "#FF6400",
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  heroLabel: {
    color: "#FFE7E3",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroMainRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    columnGap: spacing.sm,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 54,
    fontWeight: "800",
    letterSpacing: -1.4,
  },
  heroHeadline: {
    color: "#FFF4EE",
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroMeta: {
    marginTop: spacing.sm,
    color: "#FFF0E8",
    fontSize: 20,
    fontWeight: "500",
  },
  planStrip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.authBorder,
    backgroundColor: colors.authSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  planBubble: {
    borderRadius: radii.pill,
    backgroundColor: "#FFE7EA",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  planBubbleText: {
    color: "#DB2340",
    fontWeight: "700",
    fontSize: 11,
  },
  planStripMeta: {
    flex: 1,
    color: colors.webLandingSubtext,
    fontSize: 13,
  },
  upgradePill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.authSurfaceSoft,
  },
  upgradeText: {
    color: colors.webLandingText,
    fontSize: 12,
    fontWeight: "700",
  },
  moneyCard: {
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: "#22C67D",
    backgroundColor: "#DEF6EA",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  moneyIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: "#00BD74",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  moneyIconText: {
    color: "#00301B",
    fontWeight: "800",
    fontSize: 16,
  },
  moneyCopy: {
    flex: 1,
  },
  moneyTitle: {
    color: "#108A5A",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  moneyValue: {
    color: colors.webLandingText,
    fontWeight: "800",
    fontSize: 45,
    marginTop: spacing.xs,
    letterSpacing: -0.7,
  },
  moneyMeta: {
    marginTop: spacing.xs,
    color: colors.webLandingSubtext,
    fontSize: 20,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryCard: {
    flexBasis: "18%",
    minWidth: 170,
    flexGrow: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    backgroundColor: colors.authSurface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  categoryCardSelected: {
    borderColor: colors.webLandingBrandRed,
    backgroundColor: "#FFF6F7",
  },
  categoryIconBubble: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.authSurfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconSuccess: {
    backgroundColor: "#DFF7ED",
  },
  categoryIconDanger: {
    backgroundColor: "#FFE7EA",
  },
  categoryIconWarning: {
    backgroundColor: "#FFF1DB",
  },
  categoryIconBubbleSelected: {
    backgroundColor: "#FFE1E5",
  },
  categoryIconText: {
    color: colors.webLandingSubtext,
    fontWeight: "700",
    fontSize: 12,
  },
  categoryIconTextSuccess: {
    color: "#0B9F67",
  },
  categoryIconTextDanger: {
    color: "#DB2340",
  },
  categoryIconTextWarning: {
    color: "#D47B16",
  },
  categoryIconTextSelected: {
    color: colors.webLandingBrandRed,
  },
  categoryTitle: {
    color: colors.webLandingSubtext,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  categoryValue: {
    color: colors.webLandingText,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  categorySubtitle: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    lineHeight: 17,
  },
  quickViewCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    backgroundColor: colors.authSurface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  quickViewTitle: {
    color: colors.webLandingText,
    fontSize: 20,
    fontWeight: "800",
  },
  quickViewDescription: {
    color: colors.webLandingSubtext,
    fontSize: 13,
    lineHeight: 19,
  },
  quickItems: {
    gap: spacing.xs,
  },
  quickItem: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.authBorder,
    backgroundColor: colors.authSurfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickItemLabel: {
    color: colors.webLandingText,
    fontSize: 14,
    fontWeight: "700",
  },
  quickItemDetail: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    marginTop: 2,
  },
  taxReliefCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    backgroundColor: colors.authSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  taxReliefIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: "#E8ECF4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  taxReliefIconText: {
    color: "#475063",
    fontWeight: "700",
    fontSize: 12,
  },
  taxReliefBody: {
    flex: 1,
    gap: 2,
  },
  taxReliefTitle: {
    color: colors.webLandingText,
    fontSize: 14,
    fontWeight: "700",
  },
  taxReliefMeta: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    lineHeight: 17,
  },
  taxReliefDismiss: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  taxReliefDismissText: {
    color: "#8C95A4",
    fontSize: 16,
    fontWeight: "700",
  },
});
