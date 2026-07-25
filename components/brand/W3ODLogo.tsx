import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Path, Stop, Circle } from 'react-native-svg';
import { NeonText } from '@/components/ui/NeonText';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  cancelAnimation,
} from 'react-native-reanimated';

const AnimatedView = Animated.View;

interface W3ODLogoProps {
  size?: number;
  showText?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high' | 'none';
  style?: ViewStyle;
  animated?: boolean;
}

const GLOW_OPACITY: Record<NonNullable<W3ODLogoProps['glowIntensity']>, number> = {
  none: 0,
  low: 0.25,
  medium: 0.45,
  high: 0.70,
};

const GLOW_RADIUS: Record<NonNullable<W3ODLogoProps['glowIntensity']>, number> = {
  none: 0,
  low: 14,
  medium: 24,
  high: 40,
};

// Hexagon "gate" mark points (pointy-top), centered at 50,50, radius 44.
const HEX_POINTS = [
  [50, 6],
  [88.04, 28],
  [88.04, 72],
  [50, 94],
  [11.96, 72],
  [11.96, 28],
];
const hexPath = HEX_POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';

export function W3ODLogo({
  size = 120,
  showText = true,
  glowIntensity = 'medium',
  style,
  animated: pulse = false,
}: W3ODLogoProps) {
  const glowOpacity = useSharedValue(GLOW_OPACITY[glowIntensity ?? 'medium']);

  useEffect(() => {
    if (!pulse || glowIntensity === 'none') return;
    const base = GLOW_OPACITY[glowIntensity];
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(base * 0.5, { duration: 1400 }),
        withTiming(base, { duration: 1400 })
      ),
      -1,
      true
    );
    return () => cancelAnimation(glowOpacity);
  }, [pulse, glowIntensity, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const glowRadius = GLOW_RADIUS[glowIntensity ?? 'medium'];

  return (
    <View style={[styles.container, { width: size }, style]}>
      {glowIntensity !== 'none' && (
        <AnimatedView
          pointerEvents="none"
          style={[
            styles.glow,
            {
              width: size * 0.85,
              height: size * 0.85,
              borderRadius: (size * 0.85) / 2,
              shadowRadius: glowRadius,
              shadowColor: '#00C8FF',
              shadowOpacity: 1,
              elevation: 8,
            },
            glowStyle,
          ]}
        />
      )}
      <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="W3OD Gateway logo">
        <Defs>
          <RadialGradient id="w3odFill" cx="50%" cy="42%" r="62%">
            <Stop offset="0%" stopColor="#0E2A3A" />
            <Stop offset="100%" stopColor="#04101A" />
          </RadialGradient>
        </Defs>
        <Path d={hexPath} fill="url(#w3odFill)" stroke="#00C8FF" strokeWidth={3} strokeLinejoin="round" />
        <Circle cx="50" cy="50" r="13" fill="none" stroke="#00C8FF" strokeWidth={3} />
        <Path d="M50 31 L50 37 M50 63 L50 69 M31 50 L37 50 M63 50 L69 50" stroke="#00C8FF" strokeWidth={3} strokeLinecap="round" />
      </Svg>
      {showText && (
        <NeonText
          variant="display"
          weight="bold"
          tone="cyan"
          style={styles.text}
        >
          W3OD
        </NeonText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
  },
  text: {
    marginTop: 6,
    fontSize: 18,
    letterSpacing: 4,
  },
});
