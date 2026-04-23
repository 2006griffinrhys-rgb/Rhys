import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ProductClaimDialog } from "@/components/ProductClaimDialog";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors, spacing } from "@/theme/colors";
import { useAuth } from "@/providers/AuthProvider";
import type { Claim, ProductClaimOutcome, Recall } from "@/types/domain";
import { formatCents, formatDate } from "@/utils/format";

type RecallClaimState = "Ready" | "Pending" | "Failed" | "Successful";

const MANUFACTURER_SOURCE_KEYWORDS = ["manufacturer", "maker", "oem", "brand", "factory"];
const NON_MANUFACTURER_SOURCE_KEYWORDS = ["fsa", "regulator", "government", "authority"];

function isManufacturerIdentifiedRecall(source: string) {
  const normalized = source.toLowerCase();
  const hasManufacturerKeyword = MANUFACTURER_SOURCE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
  const hasNonManufacturerKeyword = NON_MANUFACTURER_SOURCE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
  return hasManufacturerKeyword && !hasNonManufacturerKeyword;
}

function resolveRecallClaimState(recallId: string, claims: Claim[]): RecallClaimState {
  const relatedClaims = claims
    .filter((claim) => claim.recallId === recallId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestClaim = relatedClaims[0];
  if (!latestClaim) return "Ready";
  if (latestClaim.status === "paid") return "Successful";
  if (latestClaim.status === "rejected") return "Failed";
  return "Pending";
}

function getClaimStateBadgeStyle(state: RecallClaimState) {
  if (state === "Successful") {
    return { backgroundColor: colors.successSoft, color: colors.success, borderColor: "#CDEEDC" };
  }
  if (state === "Failed") {
    return { backgroundColor: colors.dangerSoft, color: colors.danger, borderColor: "#F2C6D3" };
  }
  if (state === "Pending") {
    return { backgroundColor: colors.warningSoft, color: colors.warning, borderColor: "#F3D9B4" };
  }
  return { backgroundColor: colors.infoSoft, color: colors.info, borderColor: "#CBD8F8" };
}

export function RecallsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const { user } = useAuth();
  const {
    recalls,
    claims,
    refresh,
    refreshing,
    submitProductClaimWithEmail,
    claimLimitReached,
    claimTier,
  } = useAppData();
  const [activeRecall, setActiveRecall] = useState<Recall | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [dismissedRecallIds, setDismissedRecallIds] = useState<string[]>([]);

  const manufacturerRecalls = useMemo(
    () =>
      recalls.filter(
        (recall) =>
          recall.isActive &&
          isManufacturerIdentifiedRecall(recall.source) &&
          !dismissedRecallIds.includes(recall.id),
      ),
    [dismissedRecallIds, recalls],
  );

  const handleCreateClaim = async (recallId: string) => {
    const claimState = resolveRecallClaimState(recallId, claims);
    if (claimState === "Pending") {
      Alert.alert("Claim pending", "A claim is already in progress for this recall.");
      return;
    }
    if (claimState === "Successful") {
      Alert.alert("Claim successful", "This recall already has a successful claim.");
      return;
    }
    if (claimLimitReached && claimTier !== "unlimited") {
      Alert.alert(
        "Claim limit reached",
        "You've reached your monthly claim limit for your current plan. Upgrade in Settings to continue filing claims.",
      );
      return;
    }
    const recall = manufacturerRecalls.find((item) => item.id === recallId);
    if (!recall) return;
    setActiveRecall(recall);
  };

  const handleSubmitRecallClaim = async (payload: {
    reason: string;
    outcome: ProductClaimOutcome;
    signOffName: string;
  }) => {
    if (!activeRecall) return;
    try {
      setSubmittingClaim(true);
      const claim = await submitProductClaimWithEmail({
        recallId: activeRecall.id,
        productName: activeRecall.productName,
        merchant: activeRecall.source,
        amountCents: activeRecall.estimatedPayoutCents,
        currency: activeRecall.estimatedPayoutCurrency,
        purchaseDate: activeRecall.publishedAt,
        reason: payload.reason,
        signOffName: payload.signOffName,
        requestedOutcome: payload.outcome,
      });
      if (claim.emailDeliveryStatus === "failed") {
        Alert.alert(
          "Claim saved, email failed",
          "Your recall claim was created but the supplier email failed to send. Please retry shortly.",
        );
      } else {
        Alert.alert("Claim submitted", `Recall claim email sent for ${activeRecall.productName}.`);
      }
      setActiveRecall(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create recall claim.";
      Alert.alert("Claim failed", message);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleDeleteRecallBubble = (recall: Recall) => {
    const removeRecall = () => {
      setDismissedRecallIds((current) =>
        current.includes(recall.id) ? current : [...current, recall.id],
      );
      if (activeRecall?.id === recall.id) {
        setActiveRecall(null);
      }
    };

    if (Platform.OS === "web") {
      removeRecall();
      return;
    }

    Alert.alert("Delete recall bubble", "Remove this recall bubble from this page?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: removeRecall,
      },
    ]);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.page}>
        <View style={styles.container}>
          <SectionTitle
            title="Manufacturer recalls"
            subtitle={`${manufacturerRecalls.length} automatically identified manufacturer recall item(s).`}
          />

          {manufacturerRecalls.length === 0 ? (
            <EmptyState
              title="No manufacturer recalls found"
              subtitle="This tab only shows products automatically identified as recalled by the manufacturer."
            />
          ) : (
            <View style={styles.grid}>
              {manufacturerRecalls.map((recall) => {
                const claimState = resolveRecallClaimState(recall.id, claims);
                const badge = getClaimStateBadgeStyle(claimState);
                return (
                  <View
                    key={recall.id}
                    style={[styles.recallCard, !isMobile && styles.recallCardDesktop]}
                  >
                    <Card>
                      <View style={styles.itemHeader}>
                      <View style={styles.itemHeadContent}>
                        <Text style={styles.itemTitle}>{recall.productName}</Text>
                        <Text style={styles.itemMeta}>
                          {recall.source} • {formatDate(recall.publishedAt)}
                        </Text>
                      </View>
                      <View style={styles.itemHeaderActions}>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleDeleteRecallBubble(recall)}
                          accessibilityLabel="Delete recall bubble"
                        >
                          <Text style={styles.deleteButtonText}>🗑</Text>
                        </Pressable>
                        <View
                          style={[
                            styles.claimStateBadge,
                            {
                              backgroundColor: badge.backgroundColor,
                              borderColor: badge.borderColor,
                            },
                          ]}
                        >
                          <Text style={[styles.claimStateText, { color: badge.color }]}>{claimState}</Text>
                        </View>
                      </View>
                    </View>
                      <Text style={styles.itemBody}>{recall.details}</Text>
                      <Pressable
                        onPress={() => void handleCreateClaim(recall.id)}
                        style={[
                          styles.claimButton,
                          (claimState === "Pending" || claimState === "Successful") &&
                            styles.claimButtonDisabled,
                          claimLimitReached &&
                            claimTier !== "unlimited" &&
                            styles.claimButtonDisabled,
                        ]}
                      >
                        <Text style={styles.claimButtonText}>
                          {claimState === "Pending"
                            ? "Claim pending"
                            : claimState === "Successful"
                              ? "Claim successful"
                              : claimLimitReached && claimTier !== "unlimited"
                                ? "Upgrade to file claim"
                                : claimState === "Failed"
                                  ? `Retry claim (${formatCents(
                                      recall.estimatedPayoutCents,
                                      recall.estimatedPayoutCurrency,
                                    )})`
                                  : `Create claim (${formatCents(
                                      recall.estimatedPayoutCents,
                                      recall.estimatedPayoutCurrency,
                                    )})`}
                        </Text>
                      </Pressable>
                    </Card>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
      <ProductClaimDialog
        visible={activeRecall !== null}
        opportunity={
          activeRecall
            ? {
                id: activeRecall.id,
                title: activeRecall.productName,
                merchant: activeRecall.source,
                amountCents: activeRecall.estimatedPayoutCents,
                currency: activeRecall.estimatedPayoutCurrency,
                purchaseDate: activeRecall.publishedAt,
              }
            : null
        }
        defaultSignOffName={user?.email ?? ""}
        submitting={submittingClaim}
        onClose={() => setActiveRecall(null)}
        onSubmit={handleSubmitRecallClaim}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  recallCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
  },
  recallCardDesktop: {
    width: "31.5%",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  itemHeadContent: {
    flex: 1,
  },
  itemHeaderActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  deleteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteButtonText: {
    fontSize: 13,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  itemMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  itemBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  claimStateBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  claimStateText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  claimButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  claimButtonText: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: "700",
  },
  claimButtonDisabled: {
    opacity: 0.65,
  },
});
