import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { colors } from "@/theme/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useAppData } from "@/providers/AppDataProvider";
import { getEnvSummary } from "@/services/env";

const SUPPORT_URL = "https://www.prooof.app";

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { refresh, refreshing } = useAppData();
  const envSummary = getEnvSummary();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const openSupport = async () => {
    const supported = await Linking.canOpenURL(SUPPORT_URL);
    if (supported) {
      await Linking.openURL(SUPPORT_URL);
    }
  };

  return (
    <Screen>
      <SectionTitle
        title="Settings"
        subtitle="Account, sync and environment details."
      />

      <Card>
        <Text style={styles.emailLabel}>Signed in as</Text>
        <Text style={styles.email}>{user?.email ?? "Unknown user"}</Text>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Data Sync</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={refresh}
          disabled={refreshing}
        >
          <Text style={styles.primaryButtonText}>
            {refreshing ? "Refreshing..." : "Refresh data"}
          </Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Environment</Text>
        <View style={styles.envRow}>
          <Text style={styles.envLabel}>Supabase URL:</Text>
          <Text style={styles.envValue}>{envSummary.supabaseUrl}</Text>
        </View>
        <View style={styles.envRow}>
          <Text style={styles.envLabel}>Project ID:</Text>
          <Text style={styles.envValue}>{envSummary.projectId}</Text>
        </View>
        <View style={styles.envRow}>
          <Text style={styles.envLabel}>Using fallback:</Text>
          <Text style={styles.envValue}>{envSummary.usingFallback ? "Yes" : "No"}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.groupTitle}>Support</Text>
        <Pressable style={styles.ghostButton} onPress={openSupport}>
          <Text style={styles.ghostButtonText}>Open Prooof website</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  email: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  groupTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#00122d",
    fontWeight: "700",
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  ghostButtonText: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: "#2d1b26",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutButtonText: {
    color: colors.danger,
    fontWeight: "700",
  },
  envRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 10,
  },
  envLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  envValue: {
    color: colors.textPrimary,
    fontSize: 13,
    flexShrink: 1,
    textAlign: "right",
  },
});
