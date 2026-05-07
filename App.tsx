import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/providers/AuthProvider";
import { AppDataProvider } from "./src/providers/AppDataProvider";
import { StripePaymentsProvider } from "./src/providers/StripePaymentsProvider";

import { useAppMigrations } from "./src/db/useMigrations";
import { View, ActivityIndicator } from "react-native";

export default function App() {
  const { success, error } = useAppMigrations();

  if (!success && !error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error) {
    console.error("Migration failed:", error);
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StripePaymentsProvider>
          <AppDataProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </AppDataProvider>
        </StripePaymentsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
