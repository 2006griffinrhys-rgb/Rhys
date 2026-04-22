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

export function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="SignIn" component={AuthScreen} />
        ) : (
          <Stack.Screen name="App" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
