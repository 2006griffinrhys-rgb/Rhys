import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

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
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
});
