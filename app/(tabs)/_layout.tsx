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
  Users,
  Gift,
  Download,
  KeyRound,
  LifeBuoy,
  BarChart3,
  ScrollText,
} from 'lucide-react-native';

import { useAuth } from '@/context/AuthProvider';
import { hasRole } from '@/lib/rbac';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { isSmallScreen } from '@/design/responsive';
import { NeonTabBar } from '@/components/dashboard/NeonTabBar';

export default function TabLayout() {
  const { profile } = useAuth();
  const isAdmin = hasRole(profile?.role ?? 'member', 'admin');
  const isSuperAdmin = profile?.role === 'super_admin';

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
      <Tabs.Screen
        name="admin-members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size, focused }) => (
            <Users color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-rewards"
        options={{
          title: 'Credit Rewards',
          tabBarIcon: ({ color, size, focused }) => (
            <Gift color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-redemptions"
        options={{
          title: 'Redemptions',
          tabBarIcon: ({ color, size, focused }) => (
            <Download color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-invites"
        options={{
          title: 'Invite Codes',
          tabBarIcon: ({ color, size, focused }) => (
            <KeyRound color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-announcements"
        options={{
          title: 'Announcements',
          tabBarIcon: ({ color, size, focused }) => (
            <Megaphone color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-support"
        options={{
          title: 'Support',
          tabBarIcon: ({ color, size, focused }) => (
            <LifeBuoy color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size, focused }) => (
            <BarChart3 color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="admin-audit"
        options={{
          title: 'Audit Logs',
          tabBarIcon: ({ color, size, focused }) => (
            <ScrollText color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isSuperAdmin ? null : undefined,
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
