import { Text, TouchableOpacity, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors } from "@/theme/colors";
import { formatCents, formatDate } from "@/utils/format";

export function RecallsScreen() {
  const { recalls, refresh, refreshing, createClaimForRecall } = useAppData();

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <SectionTitle title="Active Recalls" subtitle={`${recalls.length} item(s)`} />

      {recalls.length === 0 ? (
        <EmptyState
          title="No recalls found"
          subtitle="When Prooof identifies a recall, you'll see it here."
        />
      ) : (
        recalls.map((recall) => (
          <Card key={recall.id}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>
                {recall.productName}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {recall.source} - {formatDate(recall.publishedAt)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                {recall.details}
              </Text>

              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Pill status={recall.severity === "high" ? "failed" : "pending"} />

                <TouchableOpacity
                  onPress={() => createClaimForRecall(recall)}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ color: colors.background, fontWeight: "600" }}>
                    Create Claim ({formatCents(recall.estimatedPayoutCents)})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
