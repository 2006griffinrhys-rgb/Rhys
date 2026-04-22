import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "@/theme/colors";
import { ClaimsScreen } from "@/screens/ClaimsScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { ProductsScreen } from "@/screens/ProductsScreen";
import { ReceiptsScreen } from "@/screens/ReceiptsScreen";
import { RecallsScreen } from "@/screens/RecallsScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

export type MainTabParamList = {
  Dashboard: undefined;
  Receipts: undefined;
  Products: undefined;
  Recalls: undefined;
  Claims: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Receipts" component={ReceiptsScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Recalls" component={RecallsScreen} />
      <Tab.Screen name="Claims" component={ClaimsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
