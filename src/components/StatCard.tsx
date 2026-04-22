import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 110,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  value: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
