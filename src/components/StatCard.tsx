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
    width: "48.5%",
    backgroundColor: colors.cardAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 112,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  value: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
