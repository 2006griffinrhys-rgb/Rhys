import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import type { ClaimStatus, ReceiptStatus } from "@/types/domain";

type Status = ReceiptStatus | ClaimStatus;

type PillProps = {
  status: Status;
};

const STATUS_MAP: Record<Status, { bg: string; fg: string; label: string }> = {
  pending: { bg: "#3A2D00", fg: "#FACC15", label: "Pending" },
  processed: { bg: "#0E253F", fg: "#60A5FA", label: "Processed" },
  failed: { bg: "#3B1010", fg: "#FCA5A5", label: "Failed" },
  draft: { bg: "#1F2937", fg: "#D1D5DB", label: "Draft" },
  submitted: { bg: "#0E253F", fg: "#93C5FD", label: "Submitted" },
  processing: { bg: "#3A2D00", fg: "#FACC15", label: "Processing" },
  paid: { bg: "#0A2C16", fg: "#86EFAC", label: "Paid" },
  rejected: { bg: "#3B1010", fg: "#FCA5A5", label: "Rejected" },
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
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
