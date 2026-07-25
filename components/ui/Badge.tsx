import { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

import { Palette, Typography, Radii, Spacing, Animation } from '@/design/tokens';

type BadgeTone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'lime' | 'amber' | 'rose' | 'muted';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  onPress?: () => void;
  dot?: boolean;
  style?: ViewStyle;
}

const TONE_STYLE: Record<BadgeTone, { bg: string; border: string; text: string }> = {
  cyan: { bg: 'rgba(0,240,255,0.12)', border: 'rgba(0,240,255,0.4)', text: Palette.neonCyan },
  blue: { bg: 'rgba(30,144,255,0.12)', border: 'rgba(30,144,255,0.4)', text: Palette.electricBlue },
  purple: { bg: 'rgba(138,43,226,0.12)', border: 'rgba(138,43,226,0.4)', text: Palette.purpleGlow },
  magenta: { bg: 'rgba(255,0,229,0.12)', border: 'rgba(255,0,229,0.4)', text: Palette.neonMagenta },
  lime: { bg: 'rgba(182,255,0,0.12)', border: 'rgba(182,255,0,0.4)', text: Palette.neonLime },
  amber: { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.4)', text: Palette.neonAmber },
  rose: { bg: 'rgba(255,45,111,0.12)', border: 'rgba(255,45,111,0.4)', text: Palette.neonRose },
  muted: { bg: 'rgba(138,147,166,0.12)', border: 'rgba(138,147,166,0.3)', text: Palette.textSecondary },
};

const DOT_COLOR: Record<BadgeTone, string> = {
  cyan: Palette.neonCyan,
  blue: Palette.electricBlue,
  purple: Palette.purpleGlow,
  magenta: Palette.neonMagenta,
  lime: Palette.neonLime,
  amber: Palette.neonAmber,
  rose: Palette.neonRose,
  muted: Palette.textTertiary,
};

export function Badge({ children, tone = 'cyan', icon, onPress, dot = false, style }: BadgeProps) {
  const s = TONE_STYLE[tone];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.94, Animation.spring.snappy);
  };
  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, Animation.spring.gentle);
  };

  const Inner = (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }, style]}>
      {dot && <View style={[styles.dot, { backgroundColor: DOT_COLOR[tone] }]} />}
      {icon}
      <Text style={[styles.text, { color: s.text }]}>{children}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View style={[animatedStyle, style]}>
        <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
          {Inner}
        </Pressable>
      </Animated.View>
    );
  }
  return Inner;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingVertical: 4,
    paddingHorizontal: Spacing['3'],
    borderRadius: Radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
});
