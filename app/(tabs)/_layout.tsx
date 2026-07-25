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
import { isSmallScreen, isTablet } from '@/design/responsive';

export default function TabLayout() {
  const { profile } = useAuth();
  const isAdmin = hasRole(profile?.role ?? 'member', 'admin');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
    tabBarStyle: [
      styles.tabBar,
      // Web-only blur backdrop (CSS, not in RN type system)
      Platform.OS === 'web'
        ? ({ backdropFilter: 'blur(20px)' } as unknown as ViewStyle)
        : false,
      isSmallScreen && { height: 60, paddingBottom: 4, paddingTop: 4 },
    ],
        tabBarActiveTintColor: Palette.neonCyan,
        tabBarInactiveTintColor: Palette.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Wallet color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="messaging"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <MessageSquare color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campaigns',
          tabBarIcon: ({ color, size, focused }) => (
            <Megaphone color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size, focused }) => (
            <GraduationCap color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
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
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size, focused }) => (
            <Bell color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
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
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size, focused }) => (
            <ShieldAlert color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
          ),
          href: isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(5,6,10,0.82)',
    borderTopColor: 'rgba(0,240,255,0.18)',
    borderTopWidth: 1,
    height: 68,
    paddingBottom: Spacing['2'],
    paddingTop: Spacing['2'],
    paddingHorizontal: Spacing['2'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
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
