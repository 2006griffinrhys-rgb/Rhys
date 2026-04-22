import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BillClaimDialog } from "@/components/BillClaimDialog";
import { ProductClaimDialog } from "@/components/ProductClaimDialog";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/providers/AuthProvider";
import { useAppData } from "@/providers/AppDataProvider";
import { colors, radii, spacing } from "@/theme/colors";
import type { BillClaimOutcome, ProductClaimOutcome } from "@/types/domain";
import { formatCents, formatDate } from "@/utils/format";

type ClaimCategory = "goods" | "services" | "household-bills";
type ClaimCategoryTone = "goods" | "services" | "bills";

type ClaimOpportunity = {
  id: string;
  merchant: string;
  title: string;
  amountCents: number;
  currency: string;
  purchaseDate: string;
  source: string;
  productCategory: string;
  category: ClaimCategory;
  tone: ClaimCategoryTone;
  recommendation: string;
  explanation: string;
  estimatedClaimCents: number;
};

type CategoryTab = {
  key: ClaimCategory;
  label: string;
  tone: ClaimCategoryTone;
};

const CATEGORY_TABS: CategoryTab[] = [
  { key: "goods", label: "Goods", tone: "goods" },
  { key: "services", label: "Services", tone: "services" },
  { key: "household-bills", label: "Household bills", tone: "bills" },
];

const GOODS_KEYWORDS = [
  "clothing",
  "fashion",
  "shoe",
  "footwear",
  "electronics",
  "gadget",
  "home",
  "appliance",
  "grocery",
  "food",
  "baby",
  "furniture",
  "beauty",
  "health",
  "sport",
  "toy",
];

const SERVICE_KEYWORDS = [
  "service",
  "subscription",
  "repair",
  "maintenance",
  "insurance",
  "membership",
  "booking",
  "ticket",
  "travel",
  "delivery",
  "cleaning",
  "coaching",
];

const BILL_KEYWORDS = [
  "energy",
  "electric",
  "gas",
  "water",
  "council",
  "tax",
  "utility",
  "utilities",
  "broadband",
  "internet",
  "mobile",
  "phone",
  "rent",
  "mortgage",
  "tv licence",
];

function classifyOpportunityCategory(input: { merchant: string; category?: string }): {
  category: ClaimCategory | null;
  tone: ClaimCategoryTone | null;
} {
  const base = `${input.merchant} ${input.category ?? ""}`.toLowerCase();

  if (BILL_KEYWORDS.some((keyword) => base.includes(keyword))) {
    return { category: "household-bills", tone: "bills" };
  }
  if (SERVICE_KEYWORDS.some((keyword) => base.includes(keyword))) {
    return { category: "services", tone: "services" };
  }
  if (GOODS_KEYWORDS.some((keyword) => base.includes(keyword))) {
    return { category: "goods", tone: "goods" };
  }

  return { category: null, tone: null };
}

function getRecommendationForTone(tone: ClaimCategoryTone): {
  recommendation: string;
  explanation: string;
} {
  if (tone === "services") {
    return {
      recommendation: "Refund or service credit opportunity",
      explanation: "Service delivery checks can qualify you for credits, refunds, or compensation.",
    };
  }
  if (tone === "bills") {
    return {
      recommendation: "Bill correction opportunity",
      explanation: "Billing audits may uncover overpayments or tariff mismatch refunds.",
    };
  }
  return {
    recommendation: "Refund or repair opportunity",
    explanation: "Consumer rights can cover faulty or misdescribed goods and support a refund or repair claim.",
  };
}

function getToneStyles(tone: ClaimCategoryTone) {
  if (tone === "services") {
    return {
      bubbleBackground: "#E7EEFF",
      bubbleText: "#1E4EC6",
      cardBorder: "#C9D8FF",
      iconBackground: "#DCE7FF",
      iconText: "#1D4DBD",
    };
  }
  if (tone === "bills") {
    return {
      bubbleBackground: "#FFF3DE",
      bubbleText: "#C77312",
      cardBorder: "#FFDDAA",
      iconBackground: "#FFEBC9",
      iconText: "#B36815",
    };
  }
  return {
    bubbleBackground: "#E9F8EF",
    bubbleText: "#168856",
    cardBorder: "#BEEFD5",
    iconBackground: "#D5F4E4",
    iconText: "#147E50",
  };
}

export function DashboardScreen() {
  const { user } = useAuth();
  const {
    receipts,
    refresh,
    refreshing,
    userPlan,
    claimsUsed,
    claimsRemaining,
    preferredCurrency,
    billingInterval,
    activePlanPriceCents,
    claimLimitReached,
    claimTier,
    submitBillClaimWithEmail,
    submitProductClaimWithEmail,
  } = useAppData();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const [selectedCategory, setSelectedCategory] = useState<ClaimCategory>("goods");
  const [dismissTaxRelief, setDismissTaxRelief] = useState(false);
  const [activeProductClaim, setActiveProductClaim] = useState<ClaimOpportunity | null>(null);
  const [activeBillClaim, setActiveBillClaim] = useState<ClaimOpportunity | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const opportunities = useMemo<ClaimOpportunity[]>(() => {
    const rows: ClaimOpportunity[] = [];
    for (const receipt of receipts) {
      const classification = classifyOpportunityCategory({
        merchant: receipt.merchant,
        category: receipt.source,
      });
      if (!classification.category || !classification.tone) {
        continue;
      }
      const recommendation = getRecommendationForTone(classification.tone);
      rows.push({
        id: receipt.id,
        merchant: receipt.merchant,
        title: `${receipt.merchant} purchase`,
        amountCents: receipt.totalCents,
        currency: receipt.currency,
        purchaseDate: receipt.purchaseDate,
        source: receipt.source,
        productCategory: classification.category,
        category: classification.category,
        tone: classification.tone,
        recommendation: recommendation.recommendation,
        explanation: recommendation.explanation,
        estimatedClaimCents: Math.max(300, Math.round(receipt.totalCents * 0.4)),
      });
    }
    return rows;
  }, [receipts]);

  const opportunitiesByCategory = useMemo(() => {
    return {
      goods: opportunities.filter((item) => item.category === "goods"),
      services: opportunities.filter((item) => item.category === "services"),
      "household-bills": opportunities.filter((item) => item.category === "household-bills"),
    };
  }, [opportunities]);

  const selectedRows = opportunitiesByCategory[selectedCategory];
  const allPotentialValue = useMemo(
    () => opportunities.reduce((sum, item) => sum + item.estimatedClaimCents, 0),
    [opportunities],
  );

  const handleStartClaim = (item: ClaimOpportunity) => {
    if (claimLimitReached && claimTier !== "unlimited") {
      Alert.alert(
        "Claim limit reached",
        "You've reached your monthly claim limit for your current plan. Upgrade in Settings to continue filing claims.",
      );
      return;
    }
    if (item.category === "household-bills") {
      setActiveBillClaim(item);
      return;
    }
    setActiveProductClaim(item);
  };

  const handleSubmitProductClaim = async (payload: {
    reason: string;
    outcome: ProductClaimOutcome;
    signOffName: string;
  }) => {
    if (!activeProductClaim) return;
    try {
      setSubmittingClaim(true);
      const claim = await submitProductClaimWithEmail({
        productName: activeProductClaim.title,
        merchant: activeProductClaim.merchant,
        amountCents: activeProductClaim.amountCents,
        currency: activeProductClaim.currency,
        purchaseDate: activeProductClaim.purchaseDate,
        reason: payload.reason,
        signOffName: payload.signOffName,
        requestedOutcome: payload.outcome,
      });
      if (claim.emailDeliveryStatus === "failed") {
        Alert.alert(
          "Claim saved, email failed",
          "Your claim was created but the supplier email failed to send. Please retry shortly.",
        );
      } else {
        Alert.alert("Claim submitted", `Supplier email sent for ${activeProductClaim.title}.`);
      }
      setActiveProductClaim(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create claim draft.";
      Alert.alert("Claim failed", message);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleSubmitBillClaim = async (payload: {
    reason: string;
    outcome: BillClaimOutcome;
    signOffName: string;
  }) => {
    if (!activeBillClaim) return;
    try {
      setSubmittingClaim(true);
      const claim = await submitBillClaimWithEmail({
        billReference: activeBillClaim.title,
        supplier: activeBillClaim.merchant,
        amountCents: activeBillClaim.amountCents,
        currency: activeBillClaim.currency,
        reason: payload.reason,
        signOffName: payload.signOffName,
        requestedOutcome: payload.outcome,
      });
      if (claim.emailDeliveryStatus === "failed") {
        Alert.alert(
          "Claim saved, email failed",
          "Your claim was created but the supplier email failed to send. Please retry shortly.",
        );
      } else {
        Alert.alert("Bill claim submitted", `Supplier email sent for ${activeBillClaim.title}.`);
      }
      setActiveBillClaim(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not submit bill claim.";
      Alert.alert("Claim failed", message);
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} backgroundColor={colors.authBackground}>
      <View style={styles.page}>
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroGradientStart} />
            <View style={styles.heroGradientBlend} />
            <Text style={styles.heroLabel}>WE FOUND</Text>
            <View style={styles.heroMainRow}>
              <Text style={[styles.heroAmount, isMobile && styles.heroAmountMobile]}>
                {formatCents(allPotentialValue, preferredCurrency)}
              </Text>
              <Text style={[styles.heroHeadline, isMobile && styles.heroHeadlineMobile]}>in your inbox</Text>
            </View>
            <Text style={[styles.heroMeta, isMobile && styles.heroMetaMobile]}>
              Across {opportunities.length} opportunities tracked
            </Text>
          </View>

          <View style={[styles.planStrip, isMobile && styles.planStripMobile]}>
            <View style={styles.planBubble}>
              <Text style={styles.planBubbleText}>{userPlan.toUpperCase()}</Text>
            </View>
            <Text style={styles.planStripMeta}>
              {claimsRemaining === null
                ? `${claimsUsed} claims used this month - unlimited plan`
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
              <Text style={[styles.moneyValue, isMobile && styles.moneyValueMobile]}>
                Up to {formatCents(allPotentialValue, preferredCurrency)}
              </Text>
              <Text style={styles.moneyMeta}>
                {opportunities.length} item(s) match your claim categories and may qualify for
                refund/compensation.
              </Text>
            </View>
          </View>

          {!dismissTaxRelief && selectedCategory === "household-bills" ? (
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

          <View style={styles.tabRow}>
            {CATEGORY_TABS.map((tab) => {
              const count = opportunitiesByCategory[tab.key].length;
              const selected = selectedCategory === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setSelectedCategory(tab.key)}
                  style={[styles.tabButton, selected && styles.tabButtonSelected]}
                >
                  <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                    {tab.label} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionHeading}>Your owned {selectedCategory.replace("-", " ")}</Text>
          {selectedRows.length > 0 ? (
            <View style={styles.opportunityGrid}>
              {selectedRows.map((item) => {
                const tone = getToneStyles(item.tone);
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.opportunityCard,
                      !isMobile && styles.opportunityCardDesktop,
                      { borderColor: tone.cardBorder },
                    ]}
                  >
                    <Text style={styles.opportunityMerchant}>{item.merchant.toUpperCase()}</Text>
                    <Text style={styles.opportunityTitle}>{item.title}</Text>
                    <View style={styles.amountRow}>
                      <Text style={styles.opportunityAmount}>
                        {formatCents(item.amountCents, item.currency)}
                      </Text>
                      <Text style={styles.opportunityDate}>{formatDate(item.purchaseDate)}</Text>
                    </View>
                    <View style={styles.metaBubbleRow}>
                      <View style={[styles.metaBubble, { backgroundColor: tone.bubbleBackground }]}>
                        <Text style={[styles.metaBubbleText, { color: tone.bubbleText }]}>{item.source}</Text>
                      </View>
                      <View style={[styles.metaBubble, { backgroundColor: tone.bubbleBackground }]}>
                        <Text style={[styles.metaBubbleText, { color: tone.bubbleText }]}>
                          {item.productCategory}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.recommendationBox, { borderColor: tone.cardBorder }]}>
                      <View style={[styles.recommendationIcon, { backgroundColor: tone.iconBackground }]}>
                        <Text style={[styles.recommendationIconText, { color: tone.iconText }]}>✣</Text>
                      </View>
                      <View style={styles.recommendationCopy}>
                        <Text style={styles.recommendationTitle}>{item.recommendation}</Text>
                        <Text style={styles.recommendationDetail}>{item.explanation}</Text>
                      </View>
                    </View>

                    <Pressable style={styles.claimButton} onPress={() => handleStartClaim(item)}>
                      <Text style={styles.claimButtonText}>Make a claim</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching transactions</Text>
              <Text style={styles.emptyText}>
                We only include scanned transactions that fit Goods, Services, or Household bills.
              </Text>
            </View>
          )}

        </View>
      </View>
      <ProductClaimDialog
        visible={activeProductClaim !== null}
        opportunity={activeProductClaim}
        defaultSignOffName={user?.email ?? ""}
        submitting={submittingClaim}
        onClose={() => setActiveProductClaim(null)}
        onSubmit={handleSubmitProductClaim}
      />
      <BillClaimDialog
        visible={activeBillClaim !== null}
        opportunity={
          activeBillClaim
            ? {
                id: activeBillClaim.id,
                title: activeBillClaim.title,
                supplier: activeBillClaim.merchant,
                amountCents: activeBillClaim.amountCents,
                currency: activeBillClaim.currency,
              }
            : null
        }
        defaultSignOffName={user?.email ?? ""}
        submitting={submittingClaim}
        onClose={() => setActiveBillClaim(null)}
        onSubmit={handleSubmitBillClaim}
      />
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
  heroCard: {
    overflow: "hidden",
    backgroundColor: "#FF6400",
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  heroGradientStart: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "46%",
    backgroundColor: "#FF1E49",
  },
  heroGradientBlend: {
    position: "absolute",
    left: "42%",
    top: 0,
    bottom: 0,
    width: "18%",
    backgroundColor: "rgba(255,84,0,0.45)",
  },
  heroLabel: {
    zIndex: 1,
    color: "#FFE7E3",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroMainRow: {
    zIndex: 1,
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
    zIndex: 1,
    marginTop: spacing.sm,
    color: "#FFF0E8",
    fontSize: 22,
    fontWeight: "500",
  },
  heroAmountMobile: {
    fontSize: 42,
    lineHeight: 48,
  },
  heroHeadlineMobile: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroMetaMobile: {
    fontSize: 16,
    lineHeight: 22,
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
  planStripMobile: {
    flexWrap: "wrap",
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
  moneyValueMobile: {
    fontSize: 32,
    lineHeight: 38,
  },
  moneyMeta: {
    marginTop: spacing.xs,
    color: colors.webLandingSubtext,
    fontSize: 16,
    lineHeight: 22,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tabButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.authBorder,
    backgroundColor: colors.authSurfaceSoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  tabButtonSelected: {
    borderColor: colors.authBrand,
    backgroundColor: "#FFE8EB",
  },
  tabText: {
    color: colors.webLandingSubtext,
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextSelected: {
    color: colors.authBrand,
  },
  sectionHeading: {
    color: colors.webLandingText,
    fontSize: 18,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  opportunityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  opportunityCard: {
    width: "100%",
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.authSurface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  opportunityCardDesktop: {
    width: "48.8%",
  },
  opportunityMerchant: {
    color: colors.webLandingSubtext,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  opportunityTitle: {
    color: colors.webLandingText,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  opportunityAmount: {
    color: colors.webLandingText,
    fontSize: 22,
    fontWeight: "800",
  },
  opportunityDate: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    fontWeight: "600",
  },
  metaBubbleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaBubble: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  metaBubbleText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  recommendationBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.authSurfaceSoft,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  recommendationIcon: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  recommendationIconText: {
    fontSize: 12,
    fontWeight: "800",
  },
  recommendationCopy: {
    flex: 1,
    gap: 2,
  },
  recommendationTitle: {
    color: colors.webLandingText,
    fontSize: 13,
    fontWeight: "700",
  },
  recommendationDetail: {
    color: colors.webLandingSubtext,
    fontSize: 12,
    lineHeight: 17,
  },
  claimButton: {
    marginTop: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.authBrand,
    paddingVertical: 10,
    alignItems: "center",
  },
  claimButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.authBorder,
    backgroundColor: colors.authSurface,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.webLandingText,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.webLandingSubtext,
    fontSize: 13,
    lineHeight: 19,
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
