import { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  subtypeLabel: string;
  subtypeIcon: string;
  ageMonths: number;
  withinSupplierWarranty: boolean;
  hasKnownWarranty: boolean;
  warrantyLabel?: string;
};

type CategoryTab = {
  key: ClaimCategory;
  label: string;
  tone: ClaimCategoryTone;
};

type OpportunitySubtype =
  | "clothing"
  | "water"
  | "wifi"
  | "hotel"
  | "energy"
  | "mobile"
  | "groceries"
  | "electronics"
  | "travel"
  | "membership"
  | "general-goods"
  | "general-services"
  | "general-bills";

const CATEGORY_TABS: CategoryTab[] = [
  { key: "goods", label: "Goods", tone: "goods" },
  { key: "services", label: "Services", tone: "services" },
  { key: "household-bills", label: "Bills", tone: "bills" },
];

const HOUSEHOLD_TIPS = [
  {
    title: "Claim Marriage Allowance",
    detail:
      "If one of you earns under £12,570, you can transfer 10% of personal allowance and backdate 4 years.",
    linkLabel: "Apply on gov.uk",
    linkUrl: "https://www.gov.uk/marriage-allowance",
    highlight: "Up to £1,260 back",
  },
  {
    title: "Council Tax single-person discount",
    detail: "If only one adult lives in your home, your council can usually reduce your Council Tax bill by 25%.",
    linkLabel: "Apply on gov.uk",
    linkUrl: "https://www.gov.uk/council-tax/who-has-to-pay",
    highlight: "Save up to 25%",
  },
  {
    title: "Working-from-home tax relief",
    detail: "If your employer requires home working, you may be able to claim tax relief for eligible years.",
    linkLabel: "Apply on gov.uk",
    linkUrl: "https://www.gov.uk/tax-relief-for-employees/working-at-home",
    highlight: "Tax relief available",
  },
  {
    title: "Warm Home Discount support",
    detail: "Low-income households may be eligible for annual support credited directly to electricity bills.",
    linkLabel: "Check on gov.uk",
    linkUrl: "https://www.gov.uk/the-warm-home-discount-scheme",
    highlight: "£150 winter support",
  },
  {
    title: "Energy back-billing protection",
    detail: "Suppliers often cannot bill for energy used over 12 months ago if they failed to bill correctly.",
    linkLabel: "Read Ofgem guidance",
    linkUrl: "https://www.ofgem.gov.uk/check-energy-back-billing-rules",
    highlight: "Potential bill write-off",
  },
  {
    title: "WaterSure scheme checks",
    detail: "If you have medical needs or a larger family, WaterSure can cap metered water charges.",
    linkLabel: "Read Ofwat guidance",
    linkUrl: "https://www.ofwat.gov.uk/households/supply-and-standards/watersure/",
    highlight: "Cap high water bills",
  },
  {
    title: "Broadband social tariffs",
    detail: "Many providers offer lower-cost broadband plans if you receive qualifying benefits.",
    linkLabel: "Compare on Ofcom",
    linkUrl: "https://www.ofcom.org.uk/phones-and-broadband/saving-money/social-tariffs",
    highlight: "Cut monthly broadband cost",
  },
  {
    title: "Prepayment meter safeguards",
    detail: "If you use prepay, ask about debt support, hardship policies, and standing charge checks.",
    linkLabel: "Read Ofgem guidance",
    linkUrl: "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/prepayment-meters",
    highlight: "Extra consumer protections",
  },
  {
    title: "Council Tax disability reduction",
    detail: "If someone needs extra space at home due to disability, you may qualify for a lower Council Tax band.",
    linkLabel: "Apply on gov.uk",
    linkUrl: "https://www.gov.uk/council-tax/discounts-for-disabled-people",
    highlight: "Lower annual Council Tax",
  },
  {
    title: "Rent deposit protection rights",
    detail: "In England and Wales, missing deposit protection may support a compensation claim.",
    linkLabel: "Check on gov.uk",
    linkUrl: "https://www.gov.uk/tenancy-deposit-protection",
    highlight: "Claim compensation",
  },
  {
    title: "Finance complaints route",
    detail: "For unfair fees and finance products, complain first then escalate free to the Ombudsman.",
    linkLabel: "Complain via Ombudsman",
    linkUrl: "https://www.financial-ombudsman.org.uk/consumers/how-to-complain",
    highlight: "No legal fee needed",
  },
  {
    title: "Current account switch offers",
    detail: "Switching bank accounts can include cash incentives if you meet eligibility requirements.",
    linkLabel: "Check switching service",
    linkUrl: "https://www.currentaccountswitch.co.uk/",
    highlight: "Cash switch bonuses",
  },
] as const;

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

function formatMerchantBubbleLabel(merchant: string): string {
  return merchant
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 2) {
        return word.toUpperCase();
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

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

function getAgeInMonths(purchaseDate: string): number {
  const purchaseMs = Date.parse(purchaseDate);
  if (!Number.isFinite(purchaseMs)) return 0;
  const ageMs = Math.max(0, Date.now() - purchaseMs);
  const monthMs = 1000 * 60 * 60 * 24 * 30.4375;
  return Math.max(0, Math.floor(ageMs / monthMs));
}

function resolveSubtypeFromMerchant(merchant: string, tone: ClaimCategoryTone): OpportunitySubtype {
  const value = merchant.toLowerCase();
  if (value.includes("water")) return "water";
  if (value.includes("broadband") || value.includes("wifi") || value.includes("internet")) return "wifi";
  if (
    value.includes("hotel") ||
    value.includes("booking") ||
    value.includes("airbnb") ||
    value.includes("travelodge")
  ) {
    return "hotel";
  }
  if (value.includes("gas") || value.includes("electric") || value.includes("energy")) return "energy";
  if (value.includes("o2") || value.includes("vodafone") || value.includes("ee") || value.includes("mobile")) {
    return "mobile";
  }
  if (
    value.includes("boohoo") ||
    value.includes("asos") ||
    value.includes("zara") ||
    value.includes("h&m") ||
    value.includes("uniqlo")
  ) {
    return "clothing";
  }
  if (value.includes("tesco") || value.includes("aldi") || value.includes("sainsbury")) return "groceries";
  if (value.includes("currys") || value.includes("apple") || value.includes("sony")) return "electronics";
  if (value.includes("trainline") || value.includes("airways") || value.includes("uber")) return "travel";
  if (value.includes("spotify") || value.includes("netflix") || value.includes("prime")) return "membership";
  if (tone === "bills") return "general-bills";
  if (tone === "services") return "general-services";
  return "general-goods";
}

function formatSubtypeLabel(subtype: OpportunitySubtype): string {
  if (subtype === "wifi") return "WiFi";
  if (subtype === "general-goods") return "Goods";
  if (subtype === "general-services") return "Service";
  if (subtype === "general-bills") return "Bill";
  return subtype.replace("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSubtypeIcon(subtype: OpportunitySubtype): string {
  if (subtype === "clothing") return "👕";
  if (subtype === "water") return "💧";
  if (subtype === "wifi") return "📶";
  if (subtype === "hotel") return "🏨";
  if (subtype === "energy") return "⚡";
  if (subtype === "mobile") return "📱";
  if (subtype === "groceries") return "🛒";
  if (subtype === "electronics") return "💻";
  if (subtype === "travel") return "✈️";
  if (subtype === "membership") return "🎟️";
  if (subtype === "general-services") return "🛠️";
  if (subtype === "general-bills") return "🧾";
  return "🛍️";
}

function getSupplierWarrantyWindowMonths(subtype: OpportunitySubtype, tone: ClaimCategoryTone): number | null {
  if (tone === "services" || tone === "bills") {
    return null;
  }
  if (subtype === "electronics") return 24;
  if (subtype === "clothing") return 12;
  if (subtype === "general-goods") return 12;
  if (subtype === "groceries") return 1;
  return 12;
}

type WarrantySummary = {
  withinSupplierWarranty: boolean;
  hasKnownWarranty: boolean;
  knownWarrantyMonths?: number;
  knownWarrantySource?: "invoice" | "supplier-site";
  fallbackWarrantyMonths?: number;
};

function resolveWarrantySummary(input: {
  tone: ClaimCategoryTone;
  subtype: OpportunitySubtype;
  purchaseDate: string;
  supplierWarrantyMonths?: number;
  supplierWarrantySource?: "invoice" | "supplier-site";
}): WarrantySummary {
  const ageMonths = getAgeInMonths(input.purchaseDate);
  if (input.tone !== "goods") {
    return {
      withinSupplierWarranty: false,
      hasKnownWarranty: false,
    };
  }

  const fallbackWarrantyMonths = getSupplierWarrantyWindowMonths(input.subtype, input.tone) ?? undefined;
  const knownWarrantyMonths =
    typeof input.supplierWarrantyMonths === "number" && input.supplierWarrantyMonths > 0
      ? input.supplierWarrantyMonths
      : undefined;
  const hasKnownWarranty = Boolean(
    knownWarrantyMonths &&
      (input.supplierWarrantySource === "invoice" || input.supplierWarrantySource === "supplier-site"),
  );

  if (hasKnownWarranty && knownWarrantyMonths) {
    return {
      withinSupplierWarranty: ageMonths <= knownWarrantyMonths,
      hasKnownWarranty: true,
      knownWarrantyMonths,
      knownWarrantySource: input.supplierWarrantySource,
      fallbackWarrantyMonths,
    };
  }

  return {
    withinSupplierWarranty: fallbackWarrantyMonths ? ageMonths <= fallbackWarrantyMonths : false,
    hasKnownWarranty: false,
    fallbackWarrantyMonths,
  };
}

function buildKnownWarrantyLabel(months: number, source: "invoice" | "supplier-site"): string {
  const years = months / 12;
  const durationLabel =
    Number.isInteger(years) && years >= 1 ? `${years}yr` : `${months}m`;
  const sourceLabel = source === "invoice" ? "from invoice" : "supplier site";
  return `Under warranty · ${durationLabel} (${sourceLabel})`;
}

function getRecommendationForOpportunity(
  tone: ClaimCategoryTone,
  subtype: OpportunitySubtype,
  purchaseDate: string,
  warrantySummary: WarrantySummary,
): {
  recommendation: string;
  explanation: string;
  ageMonths: number;
  withinSupplierWarranty: boolean;
} {
  const ageMonths = getAgeInMonths(purchaseDate);
  const withinSupplierWarranty = warrantySummary.withinSupplierWarranty;

  if (tone === "goods") {
    const warrantySnippet =
      warrantySummary.hasKnownWarranty &&
      warrantySummary.knownWarrantyMonths &&
      warrantySummary.knownWarrantySource
        ? withinSupplierWarranty
          ? `Confirmed within ${warrantySummary.knownWarrantyMonths}-month supplier warranty (${warrantySummary.knownWarrantySource === "invoice" ? "from invoice" : "supplier site"}).`
          : `Confirmed outside ${warrantySummary.knownWarrantyMonths}-month supplier warranty (${warrantySummary.knownWarrantySource === "invoice" ? "from invoice" : "supplier site"}).`
        : warrantySummary.fallbackWarrantyMonths
          ? withinSupplierWarranty
            ? `Likely within a typical ${warrantySummary.fallbackWarrantyMonths}-month supplier warranty window (confirm online).`
            : `Likely outside a typical ${warrantySummary.fallbackWarrantyMonths}-month supplier warranty window (confirm online).`
          : "Supplier warranty window unavailable.";
    return {
      recommendation: "Refund or repair opportunity",
      explanation: `${ageMonths} month${ageMonths === 1 ? "" : "s"} old - ${warrantySnippet} Consumer Rights Act 2015 covers faulty goods up to 6 years.`,
      ageMonths,
      withinSupplierWarranty,
    };
  }
  if (tone === "services") {
    return {
      recommendation: "Service refund opportunity",
      explanation: `${ageMonths} month${ageMonths === 1 ? "" : "s"} old - check invoice timing and service terms. Consumer Rights Act 2015 requires services to be carried out with reasonable care and skill.`,
      ageMonths,
      withinSupplierWarranty,
    };
  }
  return {
    recommendation: "Bill correction opportunity",
    explanation: `${ageMonths} month${ageMonths === 1 ? "" : "s"} old - check bill period and tariff details. UK billing rules (including back-billing protections) support fair dispute outcomes.`,
    ageMonths,
    withinSupplierWarranty,
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
  const [activeHouseholdTipIndex, setActiveHouseholdTipIndex] = useState(0);
  const [dismissedOpportunityIds, setDismissedOpportunityIds] = useState<string[]>([]);
  const [activeProductClaim, setActiveProductClaim] = useState<ClaimOpportunity | null>(null);
  const [activeBillClaim, setActiveBillClaim] = useState<ClaimOpportunity | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveHouseholdTipIndex((current) => (current + 1) % HOUSEHOLD_TIPS.length);
    }, 20_000);
    return () => clearInterval(timer);
  }, []);

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
      const subtype = resolveSubtypeFromMerchant(receipt.merchant, classification.tone);
      const warrantySummary = resolveWarrantySummary({
        tone: classification.tone,
        subtype,
        purchaseDate: receipt.purchaseDate,
        supplierWarrantyMonths: receipt.supplierWarrantyMonths,
        supplierWarrantySource: receipt.supplierWarrantySource,
      });
      const recommendation = getRecommendationForOpportunity(
        classification.tone,
        subtype,
        receipt.purchaseDate,
        warrantySummary,
      );
      rows.push({
        id: receipt.id,
        merchant: receipt.merchant,
        title: `${formatSubtypeLabel(subtype)} purchase`,
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
        subtypeLabel: formatSubtypeLabel(subtype),
        subtypeIcon: getSubtypeIcon(subtype),
        ageMonths: recommendation.ageMonths,
        withinSupplierWarranty: recommendation.withinSupplierWarranty,
        hasKnownWarranty: warrantySummary.hasKnownWarranty,
        warrantyLabel:
          warrantySummary.hasKnownWarranty &&
          recommendation.withinSupplierWarranty &&
          warrantySummary.knownWarrantyMonths &&
          warrantySummary.knownWarrantySource
            ? buildKnownWarrantyLabel(
                warrantySummary.knownWarrantyMonths,
                warrantySummary.knownWarrantySource,
              )
            : undefined,
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

  const selectedRows = useMemo(
    () =>
      opportunitiesByCategory[selectedCategory].filter(
        (item) => !dismissedOpportunityIds.includes(item.id),
      ),
    [dismissedOpportunityIds, opportunitiesByCategory, selectedCategory],
  );
  const allPotentialValue = useMemo(
    () => opportunities.reduce((sum, item) => sum + item.estimatedClaimCents, 0),
    [opportunities],
  );
  const activeHouseholdTip = HOUSEHOLD_TIPS[activeHouseholdTipIndex];

  const openTipLink = async () => {
    const supported = await Linking.canOpenURL(activeHouseholdTip.linkUrl);
    if (!supported) {
      Alert.alert("Could not open link", "Please try again in your browser.");
      return;
    }
    await Linking.openURL(activeHouseholdTip.linkUrl);
  };

  const handleNextTip = () => {
    setActiveHouseholdTipIndex((current) => (current + 1) % HOUSEHOLD_TIPS.length);
  };

  const handlePreviousTip = () => {
    setActiveHouseholdTipIndex((current) =>
      current === 0 ? HOUSEHOLD_TIPS.length - 1 : current - 1,
    );
  };

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

  const handleDeleteOpportunity = (item: ClaimOpportunity) => {
    Alert.alert("Remove purchase bubble", "Hide this purchase bubble from your dashboard?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          setDismissedOpportunityIds((current) =>
            current.includes(item.id) ? current : [...current, item.id],
          ),
      },
    ]);
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

          <View style={styles.taxReliefCard}>
            <View style={styles.taxReliefMainRow}>
              <View style={styles.taxReliefIcon}>
                <Text style={styles.taxReliefIconText}>i</Text>
              </View>
              <View style={styles.taxReliefBody}>
                <Text style={styles.taxReliefTitle}>{activeHouseholdTip.title}</Text>
                <Text style={styles.taxReliefMeta}>
                  {activeHouseholdTip.detail}
                </Text>
                <View style={styles.tipActionRow}>
                  <Pressable onPress={() => void openTipLink()} style={styles.tipLinkButton}>
                    <Text style={styles.tipLinkText}>{activeHouseholdTip.linkLabel}</Text>
                  </Pressable>
                  <Text style={styles.tipHighlightText}>{activeHouseholdTip.highlight}</Text>
                </View>
              </View>
              <Pressable
                style={styles.tipDismissButton}
                onPress={handleNextTip}
                accessibilityLabel="Dismiss this tip"
              >
                <Text style={styles.tipDismissText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.tipFooterRow}>
              <View style={styles.tipDotsRow}>
                {HOUSEHOLD_TIPS.map((tip, index) => (
                  <Pressable
                    key={tip.title}
                    onPress={() => setActiveHouseholdTipIndex(index)}
                    accessibilityLabel={`Show tip ${index + 1}`}
                  >
                    <View style={[styles.tipDot, index === activeHouseholdTipIndex && styles.tipDotActive]} />
                  </Pressable>
                ))}
              </View>
              <View style={styles.tipPager}>
                <Text style={styles.tipPagerText}>
                  TIP {activeHouseholdTipIndex + 1} / {HOUSEHOLD_TIPS.length}
                </Text>
                <Pressable onPress={handlePreviousTip} accessibilityLabel="Previous tip">
                  <Text style={styles.tipPagerArrow}>‹</Text>
                </Pressable>
                <Pressable onPress={handleNextTip} accessibilityLabel="Next tip">
                  <Text style={styles.tipPagerArrow}>›</Text>
                </Pressable>
              </View>
            </View>
          </View>

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

          <Text style={styles.sectionHeading}>
            Your owned {CATEGORY_TABS.find((tab) => tab.key === selectedCategory)?.label ?? "items"}
          </Text>
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
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.companyLine}>{item.merchant}</Text>
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleDeleteOpportunity(item)}
                        accessibilityLabel="Delete purchase bubble"
                      >
                        <Text style={styles.deleteButtonText}>🗑</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.productLine}>{item.title}</Text>
                    <View style={styles.amountRow}>
                      <Text style={styles.opportunityAmount}>
                        {formatCents(item.amountCents, item.currency)}
                      </Text>
                      <Text style={styles.opportunityDate}>{formatDate(item.purchaseDate)}</Text>
                    </View>
                    <View style={styles.metaBubbleRow}>
                      <View style={styles.companyBubble}>
                        <Text style={styles.companyBubbleText}>
                          {formatMerchantBubbleLabel(item.merchant)}
                        </Text>
                      </View>
                      <View style={[styles.metaBubble, { backgroundColor: tone.bubbleBackground }]}>
                        <Text style={[styles.metaBubbleText, { color: tone.bubbleText }]}>
                          {item.subtypeIcon} {item.subtypeLabel}
                        </Text>
                      </View>
                      {item.tone === "goods" ? (
                        <View
                          style={[
                            styles.metaBubble,
                            item.hasKnownWarranty && item.withinSupplierWarranty
                              ? styles.warrantyBubblePositive
                              : styles.warrantyBubbleNeutral,
                          ]}
                        >
                          <Text
                            style={[
                              styles.metaBubbleText,
                              item.hasKnownWarranty && item.withinSupplierWarranty
                                ? styles.warrantyBubbleTextPositive
                                : styles.warrantyBubbleTextNeutral,
                            ]}
                          >
                            {item.hasKnownWarranty && item.withinSupplierWarranty
                              ? item.warrantyLabel
                              : "Check supplier warranty"}
                          </Text>
                        </View>
                      ) : null}
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
                      <Text style={styles.claimButtonText}>Start claim</Text>
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
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.authSurface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  opportunityCardDesktop: {
    width: "31.5%",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  companyLine: {
    flex: 1,
    color: colors.webLandingText,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteButtonText: {
    fontSize: 13,
  },
  productLine: {
    color: colors.webLandingText,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: -1,
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
  companyBubble: {
    borderRadius: radii.pill,
    backgroundColor: "#0A1224",
    borderWidth: 1,
    borderColor: "#17233A",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#030914",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 1,
  },
  companyBubbleText: {
    color: "#F8FBFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    lineHeight: 14,
    letterSpacing: 0.15,
  },
  metaBubbleText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  warrantyBubblePositive: {
    backgroundColor: "#E8F8EE",
  },
  warrantyBubbleTextPositive: {
    color: "#0F8A4A",
  },
  warrantyBubbleNeutral: {
    backgroundColor: "#EEF1F6",
  },
  warrantyBubbleTextNeutral: {
    color: "#5D6777",
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
    borderColor: "#C8CFDA",
    backgroundColor: "#F4F5F7",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  taxReliefMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  taxReliefIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: "#E4E7ED",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  taxReliefIconText: {
    color: "#667083",
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
  tipActionRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tipLinkButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  tipLinkText: {
    color: "#EC3750",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  tipHighlightText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  tipDismissButton: {
    width: 20,
    alignItems: "flex-end",
    paddingTop: 1,
  },
  tipDismissText: {
    color: "#6A7383",
    fontSize: 18,
    lineHeight: 18,
  },
  tipFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginLeft: 36,
    marginTop: -2,
  },
  tipDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: "#BCC3CF",
  },
  tipDotActive: {
    width: 20,
    backgroundColor: "#0E1A31",
  },
  tipPager: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tipPagerText: {
    color: "#727B8C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  tipPagerArrow: {
    color: "#6A7383",
    fontSize: 16,
    fontWeight: "700",
  },
});
