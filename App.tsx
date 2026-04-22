import "react-native-gesture-handler";
import "react-native-url-polyfill/auto";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/providers/AuthProvider";
import { AppDataProvider } from "./src/providers/AppDataProvider";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppDataProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AppDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
