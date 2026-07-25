import { useEffect } from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  cancelAnimation,
} from 'react-native-reanimated';

const LOGO_SOURCE = require('@/assets/images/file_000000000e34720a97c50ff6c15230ed.png');

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
    <View style={[styles.container, { width: size, height: size }, style]}>
      {glowIntensity !== 'none' && (
        <Animated.View
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
      <Image
        source={LOGO_SOURCE}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="W3OD Gateway logo"
      />
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
});
