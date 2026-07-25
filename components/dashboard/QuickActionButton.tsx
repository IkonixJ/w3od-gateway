import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Send,
  Download,
  Gift,
  History,
  Sparkles,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { Palette, Typography, Radii, Spacing, Animation } from '@/design/tokens';

type Tone = 'cyan' | 'magenta' | 'lime' | 'amber' | 'blue' | 'purple';

const ICON_MAP: Record<string, LucideIcon> = {
  send: Send,
  receive: Download,
  redeem: Gift,
  history: History,
  earn: Sparkles,
  more: MoreHorizontal,
};

const TONE_STYLE: Record<Tone, { color: string; bg: string; border: string }> = {
  cyan: { color: Palette.neonCyan, bg: 'rgba(0,240,255,0.08)', border: 'rgba(0,240,255,0.3)' },
  magenta: { color: Palette.neonMagenta, bg: 'rgba(255,0,229,0.08)', border: 'rgba(255,0,229,0.3)' },
  lime: { color: Palette.neonLime, bg: 'rgba(182,255,0,0.08)', border: 'rgba(182,255,0,0.3)' },
  amber: { color: Palette.neonAmber, bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.3)' },
  blue: { color: Palette.electricBlue, bg: 'rgba(30,144,255,0.08)', border: 'rgba(30,144,255,0.3)' },
  purple: { color: Palette.purpleGlow, bg: 'rgba(138,43,226,0.08)', border: 'rgba(138,43,226,0.3)' },
};

interface QuickActionButtonProps {
  label: string;
  icon: string;
  tone: Tone;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuickActionButton({ label, icon, tone, onPress }: QuickActionButtonProps) {
  const s = TONE_STYLE[tone];
  const Icon = ICON_MAP[icon] ?? MoreHorizontal;
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.88, Animation.spring.snappy);
    press.value = 1;
  }, [scale, press]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, Animation.spring.bouncy);
    press.value = 0;
  }, [scale, press]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: interpolate(press.value, [0, 1], [0.25, 0.6]),
    shadowRadius: interpolate(press.value, [0, 1], [6, 16]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(press.value === 1 ? 0.85 : 1, { duration: Animation.duration.fast }),
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.iconWrap,
          { backgroundColor: s.bg, borderColor: s.border },
          iconWrapStyle,
          { shadowColor: s.color },
        ]}
      >
        <Icon color={s.color} size={22} strokeWidth={2} />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing['2'],
    flex: 1,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontFamily: Typography.families.headingMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
});
