import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { useAppData } from "@/providers/AppDataProvider";
import { colors, spacing } from "@/theme/colors";
import type { Claim, ClaimStatus } from "@/types/domain";
import { formatDate, formatCents } from "@/utils/format";

type ClaimDisplayState = "Ready" | "Pending" | "Failed" | "Successful";

const CLAIM_STATE_ORDER: ClaimDisplayState[] = ["Ready", "Pending", "Failed", "Successful"];

function toClaimDisplayState(status: ClaimStatus): ClaimDisplayState {
  if (status === "paid") return "Successful";
  if (status === "rejected") return "Failed";
  if (status === "submitted" || status === "processing") return "Pending";
  return "Ready";
}

function getStateStyles(state: ClaimDisplayState) {
  if (state === "Successful") {
    return { backgroundColor: colors.successSoft, borderColor: "#CDEEDC", textColor: colors.success };
  }
  if (state === "Failed") {
    return { backgroundColor: colors.dangerSoft, borderColor: "#F2C6D3", textColor: colors.danger };
  }
  if (state === "Pending") {
    return { backgroundColor: colors.warningSoft, borderColor: "#F3D9B4", textColor: colors.warning };
  }
  return { backgroundColor: colors.infoSoft, borderColor: "#CBD8F8", textColor: colors.info };
}

export function ClaimsScreen() {
  const { claims, refreshing, refresh } = useAppData();
  const chosenClaims = useMemo(
    () =>
      claims
        .filter((claim) => Boolean(claim.id) && Boolean(claim.productName))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [claims],
  );

  const groupedClaims = useMemo(() => {
    const groups: Record<ClaimDisplayState, Claim[]> = {
      Ready: [],
      Pending: [],
      Failed: [],
      Successful: [],
    };
    for (const claim of chosenClaims) {
      groups[toClaimDisplayState(claim.status)].push(claim);
    }
    return groups;
  }, [chosenClaims]);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.page}>
        <View style={styles.container}>
          <SectionTitle
            title="Claims"
            subtitle="Only claims you have chosen to create are listed here, grouped by claim status."
          />

          {chosenClaims.length === 0 ? (
            <EmptyState
              title="No claims yet"
              subtitle="Generate a claim from the Recalls tab when one of your products is affected."
            />
          ) : (
            CLAIM_STATE_ORDER.map((state) => {
              const rows = groupedClaims[state];
              if (rows.length === 0) return null;
              return (
                <View key={state} style={styles.group}>
                  <Text style={styles.groupTitle}>
                    {state} ({rows.length})
                  </Text>
                  {rows.map((claim) => {
                    const stateStyles = getStateStyles(state);
                    return (
                      <Card key={claim.id}>
                        <View style={styles.row}>
                          <Text style={styles.name}>{claim.productName}</Text>
                          <View
                            style={[
                              styles.stateBadge,
                              {
                                backgroundColor: stateStyles.backgroundColor,
                                borderColor: stateStyles.borderColor,
                              },
                            ]}
                          >
                            <Text style={[styles.stateBadgeText, { color: stateStyles.textColor }]}>
                              {state}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.reason}>
                          Estimated payout:{" "}
                          {formatCents(claim.estimatedPayoutCents, claim.estimatedPayoutCurrency)}
                        </Text>
                        <Text style={styles.date}>Created {formatDate(claim.createdAt)}</Text>
                      </Card>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </View>
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
  group: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  groupTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: spacing.xs,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  stateBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  reason: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  date: {
    color: colors.textTertiary,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
