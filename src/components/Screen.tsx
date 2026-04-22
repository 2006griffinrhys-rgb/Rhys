import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme/colors";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}>;

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentContainerStyle,
  backgroundColor = colors.background,
}: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor }]}>
        <View style={[styles.container, { backgroundColor }]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor }, contentContainerStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    backgroundColor: colors.background,
    minHeight: "100%",
  },
});
