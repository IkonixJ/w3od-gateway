import { Pressable, View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import {
  Home,
  Wallet,
  Users,
  CalendarDays,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
// Minimal permissive shape of expo-router's tab-bar render-prop. The full
// TabBarProps type is not exported from the main entry in this SDK version,
// so we accept the structural fields we use and cast internally where the
// navigation event API is more specific than we need.
type TabBarPropsLike = Record<string, any> & {
  state: { index: number; routes: { name: string; key: string }[] };
};

import { Palette, Typography, Spacing, Animation } from '@/design/tokens';

interface TabDef {
  name: string;
  label: string;
  icon: LucideIcon;
  color: string;
  glow: string;
}

const TABS: TabDef[] = [
  { name: 'index', label: 'Home', icon: Home, color: Palette.neonCyan, glow: 'rgba(0,240,255,0.5)' },
  { name: 'wallet', label: 'Wallet', icon: Wallet, color: Palette.neonLime, glow: 'rgba(182,255,0,0.5)' },
  { name: 'community', label: 'Community', icon: Users, color: Palette.purpleGlow, glow: 'rgba(138,43,226,0.5)' },
  { name: 'events', label: 'Events', icon: CalendarDays, color: Palette.neonAmber, glow: 'rgba(255,184,0,0.5)' },
  { name: 'profile', label: 'Profile', icon: User, color: Palette.neonMagenta, glow: 'rgba(255,0,229,0.5)' },
];

function NeonTabButton({
  tab,
  isFocused,
  onPress,
}: {
  tab: TabDef;
  isFocused: boolean;
  onPress: () => void;
}) {
  const Icon = tab.icon;
  const focused = useSharedValue(isFocused ? 1 : 0);
  focused.value = withTiming(isFocused ? 1 : 0, { duration: Animation.duration.normal });

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(focused.value, [0, 1], [1, 1.15]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focused.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(focused.value, [0, 1], [0.6, 1.2]) }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focused.value, [0, 1], [0.4, 1]),
  }));

  return (
    <Pressable onPress={onPress} style={styles.tabBtnWrap} hitSlop={4}>
      <Animated.View
        style={[styles.tabGlow, glowStyle, { backgroundColor: tab.glow }]}
        pointerEvents="none"
      />
      <Animated.View style={[styles.iconBox, iconStyle]}>
        <Icon color={isFocused ? tab.color : Palette.textTertiary} size={22} strokeWidth={isFocused ? 2.4 : 2} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          labelStyle,
          { color: isFocused ? tab.color : Palette.textTertiary },
        ]}
      >
        {tab.label.toUpperCase()}
      </Animated.Text>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: tab.color,
            opacity: interpolate(focused.value, [0, 1], [0, 1]),
          },
        ]}
      />
    </Pressable>
  );
}

export function NeonTabBar({ state, navigation }: TabBarPropsLike) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(5,6,10,0.6)', 'rgba(5,6,10,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={
            {
              ...StyleSheet.absoluteFillObject,
              backdropFilter: 'blur(20px)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(0,240,255,0.18)',
            } as unknown as ViewStyle
          }
        />
      )}
      <View style={styles.topBorder} />
      <View style={styles.row}>
        {TABS.map((tab, i) => {
          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;

          const isFocused = state.index === i;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <NeonTabButton
              key={tab.name}
              tab={tab}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  topBorder: {
    height: 1,
    backgroundColor: 'rgba(0,240,255,0.18)',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    gap: Spacing['1'],
  },
  tabBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2'],
    position: 'relative',
  },
  tabGlow: {
    position: 'absolute',
    bottom: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  label: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
