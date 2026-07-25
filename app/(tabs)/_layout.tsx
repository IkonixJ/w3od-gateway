import { Tabs } from 'expo-router';
import { StyleSheet, Platform, type ViewStyle } from 'react-native';
import {
  Wallet,
  MessageSquare,
  Megaphone,
  GraduationCap,
  CalendarDays,
  Bell,
  User,
  ShieldAlert,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthProvider';
import { hasRole } from '@/lib/rbac';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { isSmallScreen } from '@/design/responsive';
import { NeonTabBar } from '@/components/dashboard/NeonTabBar';

export default function TabLayout() {
  const { profile } = useAuth();
  const isAdmin = hasRole(profile?.role ?? 'member', 'admin');

  return (
    <Tabs
      tabBar={(props) => <NeonTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: Palette.neonCyan,
        tabBarInactiveTintColor: Palette.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* Primary 5 tabs — rendered in NeonTabBar */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size, focused }) => (
            <CalendarDays color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />

      {/* Secondary routes — hidden from tab bar but still navigable */}
      <Tabs.Screen
        name="messaging"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <MessageSquare color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campaigns',
          tabBarIcon: ({ color, size, focused }) => (
            <Megaphone color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size, focused }) => (
            <GraduationCap color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size, focused }) => (
            <Bell color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size, focused }) => (
            <ShieldAlert color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: Spacing['1'],
  },
});
