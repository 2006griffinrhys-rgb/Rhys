import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, spacing } from "@/theme/colors";
import type { BillClaimOutcome } from "@/types/domain";
import { formatCents } from "@/utils/format";

type BillDialogOpportunity = {
  id: string;
  title: string;
  supplier: string;
  amountCents: number;
  currency: string;
};

type BillClaimDialogProps = {
  visible: boolean;
  opportunity: BillDialogOpportunity | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    reason: string;
    outcome: BillClaimOutcome;
  }) => Promise<void> | void;
};

const OUTCOMES: { id: BillClaimOutcome; label: string }[] = [
  { id: "waive-charges", label: "Waive charges" },
  { id: "exit-contract", label: "Exit contract" },
  { id: "itemised-breakdown", label: "Itemised breakdown" },
  { id: "not-sure", label: "Not sure — recommend the strongest option" },
];

export function BillClaimDialog({
  visible,
  opportunity,
  submitting = false,
  onClose,
  onSubmit,
}: BillClaimDialogProps) {
  const [reason, setReason] = useState("");
  const [selectedOutcome, setSelectedOutcome] =
    useState<BillClaimOutcome>("not-sure");

  const canSubmit = useMemo(
    () => reason.trim().length >= 8 && !submitting && Boolean(opportunity),
    [opportunity, reason, submitting],
  );

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setSelectedOutcome("not-sure");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      reason: reason.trim(),
      outcome: selectedOutcome,
    });
    setReason("");
    setSelectedOutcome("not-sure");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Make a bill claim</Text>
          <Text style={styles.subtitle}>
            We will generate and send a billing dispute email to the supplier.
          </Text>

          {opportunity ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{opportunity.title}</Text>
              <Text style={styles.summaryMeta}>
                {opportunity.supplier} ·{" "}
                {formatCents(opportunity.amountCents, opportunity.currency)}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>What outcome do you want?</Text>
          <View style={styles.outcomeGrid}>
            {OUTCOMES.map((option) => {
              const selected = selectedOutcome === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelectedOutcome(option.id)}
                  style={[
                    styles.outcomeChip,
                    selected && styles.outcomeChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.outcomeChipText,
                      selected && styles.outcomeChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Why are you disputing this bill?</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Describe overcharge, poor service, contract issue, etc."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={styles.textarea}
            editable={!submitting}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[styles.secondaryButton, submitting && styles.buttonDisabled]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSubmit()}
              style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Sending..." : "Send claim email"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 20, 45, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    borderRadius: radii.xl,
    backgroundColor: colors.authSurface,
    borderWidth: 1,
    borderColor: colors.authBorder,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: radii.md,
    backgroundColor: colors.authSurfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  outcomeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  outcomeChip: {
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: radii.pill,
    backgroundColor: colors.authSurfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  outcomeChipSelected: {
    borderColor: colors.authBrand,
    backgroundColor: "#FFE9EC",
  },
  outcomeChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  outcomeChipTextSelected: {
    color: colors.authBrand,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.authBackground,
    minHeight: 108,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.authBrand,
    borderColor: colors.authBrand,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.authSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
