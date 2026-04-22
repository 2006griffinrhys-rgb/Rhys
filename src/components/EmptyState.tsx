import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@/theme/colors";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  description?: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, description, body, actionLabel, onAction }: EmptyStateProps) {
  const message = subtitle ?? description ?? body ?? "";
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.subtitle}>{message}</Text>}
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  buttonLabel: {
    color: colors.background,
    fontWeight: "700",
  },
});
