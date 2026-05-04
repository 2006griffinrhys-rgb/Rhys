import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/providers/AuthProvider";
import { MainTabs } from "./MainTabs";
import { AuthScreen } from "@/screens/AuthScreen";
import { LoadingScreen } from "@/screens/LoadingScreen";
import { colors } from "@/theme/colors";

type RootStackParamList = {
  SignIn: undefined;
  App: undefined;
  ConnectEmail: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    primary: colors.primary,
    border: colors.border,
    notification: colors.warning,
  },
};

import { ConnectEmailScreen } from "@/screens/ConnectEmailScreen";

export function AppNavigator() {
  const { session, user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session && !user ? (
          <Stack.Screen name="SignIn" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="App" component={MainTabs} />
            <Stack.Screen 
              name="ConnectEmail" 
              component={ConnectEmailScreen} 
              options={{ presentation: "modal", headerShown: true, title: "Connect Email" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
