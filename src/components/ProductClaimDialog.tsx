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
import type { ProductClaimOutcome } from "@/types/domain";

type ClaimDialogOpportunity = {
  id: string;
  title: string;
  merchant: string;
  amountCents: number;
  currency: string;
  purchaseDate: string;
};

type ProductClaimDialogProps = {
  visible: boolean;
  opportunity: ClaimDialogOpportunity | null;
  defaultSignOffName?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    reason: string;
    outcome: ProductClaimOutcome;
    signOffName: string;
  }) => Promise<void> | void;
};

const OUTCOMES: { id: ProductClaimOutcome; label: string }[] = [
  { id: "refund", label: "Refund" },
  { id: "replacement-exchange", label: "Replacement / exchange" },
  { id: "repair", label: "Repair" },
  { id: "not-sure", label: "Not sure — recommend the strongest option" },
];

export function ProductClaimDialog({
  visible,
  opportunity,
  defaultSignOffName = "",
  submitting = false,
  onClose,
  onSubmit,
}: ProductClaimDialogProps) {
  const [reason, setReason] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<ProductClaimOutcome>("refund");
  const [localSignOffName, setLocalSignOffName] = useState(defaultSignOffName);

  const canSubmit = useMemo(
    () =>
      reason.trim().length >= 8 &&
      localSignOffName.trim().length >= 2 &&
      !submitting &&
      Boolean(opportunity),
    [localSignOffName, opportunity, reason, submitting],
  );

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setSelectedOutcome("refund");
    setLocalSignOffName(defaultSignOffName);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      reason: reason.trim(),
      outcome: selectedOutcome,
      signOffName: localSignOffName.trim(),
    });
    setReason("");
    setSelectedOutcome("refund");
    setLocalSignOffName(defaultSignOffName);
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
            <Pressable onPress={handleClose} style={styles.topCloseButton}>
              <Text style={styles.topCloseText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            {opportunity
              ? `${opportunity.title} from ${opportunity.merchant}. We'll draft the right claim email for this purchase.`
              : "We'll draft the right claim email for this purchase."}
          </Text>

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
            We'll ask for the strongest remedy UK law allows for this purchase.
          </Text>

          <Text style={styles.label}>What's the issue?</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Stopped charging after 8 months. Battery now drains within an hour."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={styles.textarea}
            editable={!submitting}
          />

          <Text style={styles.label}>Your name (for the sign-off)</Text>
          <TextInput
            value={localSignOffName}
            onChangeText={setLocalSignOffName}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
            editable={!submitting}
          />

          <Pressable
            onPress={() => void handleSubmit()}
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Generating claim email..." : "Generate claim email"}
            </Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={styles.closeTextButton}
            >
              <Text style={styles.closeTextButtonLabel}>Close</Text>
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
  topCloseButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  topCloseText: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 24,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
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
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
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
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actions: {
    marginTop: spacing.xs,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  primaryButton: {
    marginTop: spacing.md,
    width: "100%",
    backgroundColor: colors.authBrand,
    borderColor: colors.authBrand,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  closeTextButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  closeTextButtonLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
