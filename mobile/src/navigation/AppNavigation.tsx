/**
 * Navigation - matches the web app's bottom nav structure
 * Bottom tabs: Wardrobe, Create, Try On, Stylist, More
 * "More" tab contains: Insights, Wishlist, History, Travel, Profile
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../theme/useTheme';
import { Typography, Spacing } from '../theme';
import { View, Text, ActivityIndicator } from 'react-native';

// Screens
import AuthScreen from '../screens/AuthScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import CreateScreen from '../screens/CreateScreen';
import StylistScreen from '../screens/StylistScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WishlistScreen from '../screens/WishlistScreen';
import HistoryScreen from '../screens/HistoryScreen';
import TryOnScreen from '../screens/TryOnScreen';
import TravelScreen from '../screens/TravelScreen';
import MoreScreen from '../screens/MoreScreen';
import AddItemScreen from '../screens/AddItemScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab icon using emoji
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean; color: string }) {
  return <Text style={{ fontSize: focused ? 22 : 20 }}>{emoji}</Text>;
}

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.navActive,
        tabBarInactiveTintColor: colors.navMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 84,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: Typography.fontWeight.medium,
          marginTop: -2,
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.lg,
          letterSpacing: Typography.letterSpacing.tight,
        },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{
          headerTitle: 'My Wardrobe',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="👗" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreateScreen}
        options={{
          headerTitle: 'Outfit Creator',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🎨" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="TryOn"
        component={TryOnScreen}
        options={{
          headerTitle: 'Fitting Mirror',
          tabBarLabel: 'Try On',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🪞" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stylist"
        component={StylistScreen}
        options={{
          headerTitle: 'Aura Stylist',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="💬" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          headerTitle: 'More',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="⋯" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Full navigation with stack screens layered over tabs
function AppStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.lg,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerTitle: 'Profile' }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ headerTitle: 'Wishlist' }} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ headerTitle: 'Outfit History' }} />
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerTitle: 'Wardrobe Insights' }} />
      <Stack.Screen name="Travel" component={TravelScreen} options={{ headerTitle: 'Travel & Packing' }} />
      <Stack.Screen name="AddItem" component={AddItemScreen} options={{ headerTitle: 'Add to Wardrobe' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigation() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: Spacing.base }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Auth" component={AuthScreen} /></Stack.Navigator>}
    </NavigationContainer>
  );
}
