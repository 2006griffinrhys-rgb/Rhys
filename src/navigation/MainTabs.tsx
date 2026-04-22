import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "@/theme/colors";
import { ClaimsScreen } from "@/screens/ClaimsScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { RecallsScreen } from "@/screens/RecallsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

export type MainTabParamList = {
  Dashboard: undefined;
  Recalls: undefined;
  Claims: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.authSurface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: true,
        tabBarStyle: {
          backgroundColor: colors.authSurface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 4,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarActiveTintColor: colors.authBrand,
        tabBarInactiveTintColor: colors.authMuted,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Recalls" component={RecallsScreen} />
      <Tab.Screen name="Claims" component={ClaimsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
