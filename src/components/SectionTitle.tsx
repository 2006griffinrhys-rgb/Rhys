import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export const SectionTitle = ({ title, subtitle }: SectionTitleProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
});
