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
  defaultSignOffName?: string;
  onClose: () => void;
  onSubmit: (payload: {
    reason: string;
    outcome: BillClaimOutcome;
    signOffName: string;
  }) => Promise<void> | void;
};

const OUTCOMES: { id: BillClaimOutcome; label: string }[] = [
  { id: "waive-charges", label: "Waive charges" },
  { id: "exit-contract", label: "Exit contract" },
  { id: "itemised-breakdown", label: "Itemised breakdown" },
  { id: "not-sure", label: "Not sure" },
];

export function BillClaimDialog({
  visible,
  opportunity,
  submitting = false,
  defaultSignOffName = "",
  onClose,
  onSubmit,
}: BillClaimDialogProps) {
  const [reason, setReason] = useState("");
  const [signOffValue, setSignOffValue] = useState(defaultSignOffName);
  const [selectedOutcome, setSelectedOutcome] =
    useState<BillClaimOutcome>("not-sure");

  const canSubmit = useMemo(
    () =>
      reason.trim().length >= 8 &&
      signOffValue.trim().length >= 2 &&
      !submitting &&
      Boolean(opportunity),
    [opportunity, reason, signOffValue, submitting],
  );

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setSignOffValue(defaultSignOffName);
    setSelectedOutcome("not-sure");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      reason: reason.trim(),
      outcome: selectedOutcome,
      signOffName: signOffValue.trim(),
    });
    setReason("");
    setSignOffValue(defaultSignOffName);
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
          <View style={styles.headerRow}>
            <Text style={styles.title}>Start a claim</Text>
            <Pressable onPress={handleClose} style={styles.closeIconButton}>
              <Text style={styles.closeIconText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            {opportunity
              ? `${opportunity.title} from ${opportunity.supplier}. We'll draft the right claim email for this charge.`
              : "We'll draft the right bill-claim email for this charge."}
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
          <Text style={styles.helperText}>
            We'll ask for the strongest remedy UK law allows for this billing dispute.
          </Text>

          <Text style={styles.label}>What's the issue?</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Early termination charges were added incorrectly despite written cancellation."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={styles.textarea}
            editable={!submitting}
          />

          <Text style={styles.label}>Your name (for the sign-off)</Text>
          <TextInput
            value={signOffValue}
            onChangeText={setSignOffValue}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
            editable={!submitting}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={() => void handleSubmit()}
              style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Generating..." : "Generate claim email"}
              </Text>
            </Pressable>
          </View>
          <View style={styles.closeRow}>
            <Pressable onPress={handleClose} style={styles.closeLinkButton}>
              <Text style={styles.closeLinkText}>Close</Text>
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
    maxWidth: 700,
    borderRadius: radii.xl,
    backgroundColor: colors.authSurface,
    borderWidth: 1,
    borderColor: colors.authBorder,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: spacing.sm,
  },
  closeIconButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  closeIconText: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "500",
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
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  outcomeGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: spacing.xs,
  },
  outcomeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.authBorder,
    borderRadius: 14,
    backgroundColor: colors.authSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  outcomeChipSelected: {
    borderColor: colors.authBrand,
    backgroundColor: "#FFEFF1",
  },
  outcomeChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  outcomeChipTextSelected: {
    color: colors.authBrand,
  },
  textarea: {
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.authSurface,
    minHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.authBorderStrong,
    borderRadius: radii.md,
    backgroundColor: colors.authSurface,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.authBrand,
    borderColor: colors.authBrand,
    borderWidth: 1,
    borderRadius: radii.md,
    minHeight: 44,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  closeRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeLinkButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  closeLinkText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
