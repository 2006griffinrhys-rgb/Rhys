import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import type { Claim } from "@/types/domain";
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
  const { recalls, claims, refresh, refreshing, createClaimForRecall, claimLimitReached, claimTier } =
    useAppData();

  const manufacturerRecalls = useMemo(
    () => recalls.filter((recall) => recall.isActive && isManufacturerIdentifiedRecall(recall.source)),
    [recalls],
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
    await createClaimForRecall(recall);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
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
        manufacturerRecalls.map((recall) => {
          const claimState = resolveRecallClaimState(recall.id, claims);
          const badge = getClaimStateBadgeStyle(claimState);
          return (
            <Card key={recall.id}>
              <View style={styles.itemHeader}>
                <View style={styles.itemHeadContent}>
                  <Text style={styles.itemTitle}>{recall.productName}</Text>
                  <Text style={styles.itemMeta}>
                    {recall.source} • {formatDate(recall.publishedAt)}
                  </Text>
                </View>
                <View style={[styles.claimStateBadge, { backgroundColor: badge.backgroundColor, borderColor: badge.borderColor }]}>
                  <Text style={[styles.claimStateText, { color: badge.color }]}>{claimState}</Text>
                </View>
              </View>
              <Text style={styles.itemBody}>{recall.details}</Text>
              <Pressable
                onPress={() => void handleCreateClaim(recall.id)}
                style={[
                  styles.claimButton,
                  (claimState === "Pending" || claimState === "Successful") && styles.claimButtonDisabled,
                  claimLimitReached && claimTier !== "unlimited" && styles.claimButtonDisabled,
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
                          ? `Retry claim (${formatCents(recall.estimatedPayoutCents, recall.estimatedPayoutCurrency)})`
                          : `Create claim (${formatCents(recall.estimatedPayoutCents, recall.estimatedPayoutCurrency)})`}
                </Text>
              </Pressable>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  itemHeadContent: {
    flex: 1,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
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
