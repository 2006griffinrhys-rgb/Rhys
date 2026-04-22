import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme/colors";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export const SectionTitle = ({ eyebrow, title, subtitle }: SectionTitleProps) => {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
});
