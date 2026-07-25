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
  ShieldCheck,
  Trophy,
  FileText,
  Award,
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
      <Tabs.Screen
        name="kyc"
        options={{
          title: 'KYC',
          tabBarIcon: ({ color, size, focused }) => (
            <ShieldCheck color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-kyc"
        options={{
          title: 'KYC Review',
          tabBarIcon: ({ color, size, focused }) => (
            <ShieldAlert color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="campaign-detail"
        options={{
          title: 'Campaign Detail',
          tabBarIcon: ({ color, size, focused }) => (
            <Megaphone color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Trophy color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin-campaigns"
        options={{
          title: 'Manage Campaigns',
          tabBarIcon: ({ color, size, focused }) => (
            <Megaphone color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-campaign-review"
        options={{
          title: 'Review Submissions',
          tabBarIcon: ({ color, size, focused }) => (
            <FileText color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-badges"
        options={{
          title: 'Manage Badges',
          tabBarIcon: ({ color, size, focused }) => (
            <Award color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
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
