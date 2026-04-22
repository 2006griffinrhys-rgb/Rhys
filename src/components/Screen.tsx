import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  contentContainerStyle,
}: ScreenProps) {
  if (!scroll) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.container}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
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
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    backgroundColor: colors.background,
    minHeight: "100%",
  },
});
