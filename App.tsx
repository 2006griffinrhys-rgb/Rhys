import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/providers/AuthProvider";
import { AppDataProvider } from "./src/providers/AppDataProvider";
import { StripePaymentsProvider } from "./src/providers/StripePaymentsProvider";

export default function App() {
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
