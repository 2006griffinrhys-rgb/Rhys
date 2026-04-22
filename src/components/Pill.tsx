import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import type { ClaimStatus, ReceiptStatus } from "@/types/domain";

type Status = ReceiptStatus | ClaimStatus;

type PillProps = {
  status: Status;
};

const STATUS_MAP: Record<Status, { bg: string; fg: string; label: string }> = {
  pending: { bg: colors.warningSoft, fg: colors.warning, label: "Pending" },
  processed: { bg: colors.infoSoft, fg: colors.info, label: "Processed" },
  failed: { bg: colors.dangerSoft, fg: colors.danger, label: "Failed" },
  draft: { bg: colors.cardMuted, fg: colors.textSecondary, label: "Draft" },
  submitted: { bg: colors.infoSoft, fg: colors.info, label: "Submitted" },
  processing: { bg: colors.warningSoft, fg: colors.warning, label: "Processing" },
  paid: { bg: colors.successSoft, fg: colors.success, label: "Paid" },
  rejected: { bg: colors.dangerSoft, fg: colors.danger, label: "Rejected" },
};

export function Pill({ status }: PillProps) {
  const visual = STATUS_MAP[status];
  return (
    <View style={[styles.container, { backgroundColor: visual.bg }]}>
      <Text style={[styles.text, { color: visual.fg }]}>{visual.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
