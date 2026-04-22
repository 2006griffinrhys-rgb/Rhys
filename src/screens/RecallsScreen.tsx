import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import { formatCents, formatDate } from "@/utils/format";

export function RecallsScreen() {
  const { recalls, refresh, refreshing, createClaimForRecall, claimLimitReached, claimTier } = useAppData();

  const handleCreateClaim = async (recallId: string) => {
    if (claimLimitReached && claimTier !== "unlimited") {
      Alert.alert(
        "Claim limit reached",
        "You've reached your monthly claim limit for your current plan. Upgrade in Settings to continue filing claims.",
      );
      return;
    }
    const recall = recalls.find((item) => item.id === recallId);
    if (!recall) return;
    await createClaimForRecall(recall);
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionTitle
        title="Active recalls"
        subtitle={`${recalls.length} product safety notices matched to your data.`}
      />

      {recalls.length === 0 ? (
        <EmptyState
          title="No recalls found"
          subtitle="When Prooof identifies a recall, you'll see it here."
        />
      ) : (
        recalls.map((recall) => (
          <Card key={recall.id}>
            <View style={styles.itemHeader}>
              <View style={styles.itemHeadContent}>
                <Text style={styles.itemTitle}>{recall.productName}</Text>
                <Text style={styles.itemMeta}>
                  {recall.source} • {formatDate(recall.publishedAt)}
                </Text>
              </View>
              <Pill status={recall.severity === "high" ? "failed" : "pending"} />
            </View>
            <Text style={styles.itemBody}>{recall.details}</Text>
            <TouchableOpacity
              onPress={() => handleCreateClaim(recall.id)}
              style={[styles.claimButton, claimLimitReached && claimTier !== "unlimited" && styles.claimButtonDisabled]}
            >
              <Text style={styles.claimButtonText}>
                {claimLimitReached && claimTier !== "unlimited"
                  ? "Upgrade to file claim"
                  : `Create claim (${formatCents(recall.estimatedPayoutCents, recall.estimatedPayoutCurrency)})`}
              </Text>
            </TouchableOpacity>
          </Card>
        ))
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
