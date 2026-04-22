import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";

type CardProps = PropsWithChildren<{ padded?: boolean }>;

export function Card({ children, padded = true }: CardProps) {
  return <View style={[styles.card, padded && styles.padded]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: 16,
  },
});
