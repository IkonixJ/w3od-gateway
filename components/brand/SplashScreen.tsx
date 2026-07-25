import { useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing as REasing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { Palette, Gradients, Typography } from '@/design/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

// Logo size scales with screen width — bigger for more presence
const LOGO_SIZE = Math.max(140, Math.min(240, SCREEN_W * 0.5));

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onAnimationComplete, duration = 2800 }: SplashScreenProps) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(40);
  const glowScale = useSharedValue(0.4);
  const glowOpacity = useSharedValue(0);
  const gateLeftX = useSharedValue(-SCREEN_W * 0.5);
  const gateRightX = useSharedValue(SCREEN_W * 0.5);
  const gateOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(24);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const gateOffset = SCREEN_W * 0.12;

    gateOpacity.value = withTiming(1, { duration: 300 });
    gateLeftX.value = withTiming(-gateOffset, { duration: 600, easing: REasing.out(REasing.cubic) });
    gateRightX.value = withTiming(gateOffset, { duration: 600, easing: REasing.out(REasing.cubic) });

    ringOpacity.value = withDelay(450, withTiming(1, { duration: 300 }));
    ringScale.value = withDelay(450, withSpring(1, { damping: 14, stiffness: 200 }));

    glowOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    glowScale.value = withDelay(700, withSpring(1.6, { damping: 12, stiffness: 140 }));

    gateLeftX.value = withDelay(900, withTiming(-SCREEN_W * 0.6, { duration: 700, easing: REasing.inOut(REasing.cubic) }));
    gateRightX.value = withDelay(900, withTiming(SCREEN_W * 0.6, { duration: 700, easing: REasing.inOut(REasing.cubic) }));
    gateOpacity.value = withDelay(1500, withTiming(0, { duration: 400 }));

    logoOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    logoScale.value = withDelay(1000, withSpring(1, { damping: 12, stiffness: 180 }));
    logoY.value = withDelay(1000, withSpring(0, { damping: 14, stiffness: 160 }));

    taglineOpacity.value = withDelay(1700, withTiming(1, { duration: 500 }));
    taglineY.value = withDelay(1700, withSpring(0, { damping: 16, stiffness: 140 }));

    pulse.value = withDelay(
      2000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: REasing.inOut(REasing.ease) }),
          withTiming(0.6, { duration: 1400, easing: REasing.inOut(REasing.ease) })
        ),
        -1,
        true
      )
    );

    if (onAnimationComplete) {
      const timeout = setTimeout(onAnimationComplete, duration);
      return () => {
        clearTimeout(timeout);
        cancelAnimation(pulse);
      };
    }
  }, [duration]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoY.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value * interpolate(pulse.value, [0, 1], [0.9, 1.1]) }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const gateLeftStyle = useAnimatedStyle(() => ({
    opacity: gateOpacity.value,
    transform: [{ translateX: gateLeftX.value }],
  }));

  const gateRightStyle = useAnimatedStyle(() => ({
    opacity: gateOpacity.value,
    transform: [{ translateX: gateRightX.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.3]) }],
  }));

  const ringSize = LOGO_SIZE * 0.85;
  const glowSize = LOGO_SIZE * 1.4;
  const gateWidth = Math.max(48, SCREEN_W * 0.12);
  const gateHeight = LOGO_SIZE + 40;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...Gradients.bgDeep]} style={StyleSheet.absoluteFillObject} />

      {Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={
            {
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              opacity: 0.18,
              backgroundImage:
                'linear-gradient(rgba(0,240,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.08) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            } as unknown as ViewStyle
          }
        />
      )}

      <View style={styles.center}>
        {/* Glow halo */}
        <Animated.View style={[styles.glowWrap, { width: glowSize, height: glowSize }, glowAnimatedStyle]} pointerEvents="none">
          <View style={[styles.glowOrb, { width: glowSize * 0.8, height: glowSize * 0.8, borderRadius: glowSize * 0.4 }]} />
        </Animated.View>

        {/* Expanding ring */}
        <Animated.View style={[styles.ringWrap, { width: ringSize, height: ringSize }, ringAnimatedStyle]} pointerEvents="none">
          <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]} />
        </Animated.View>

        {/* Pulse ring */}
        <Animated.View style={[styles.ringWrap, { width: ringSize, height: ringSize }, pulseRingStyle]} pointerEvents="none">
          <View style={[styles.ringPulse, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]} />
        </Animated.View>

        {/* Gateway doors */}
        <Animated.View
          style={[styles.gateBase, { width: gateWidth, height: gateHeight, top: -gateHeight / 2 + 10 }, gateLeftStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.gateBase, { width: gateWidth, height: gateHeight, top: -gateHeight / 2 + 10 }, gateRightStyle]}
          pointerEvents="none"
        />

        {/* Logo (real PNG — includes W3OD wordmark) */}
        <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
          <W3ODLogo size={LOGO_SIZE} showText glowIntensity="high" animated />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Animated.Text style={styles.tagline}>
            Your Gateway to Web3 Rewards
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Loading bar */}
      <View style={styles.loaderWrap}>
        <View style={styles.loaderTrack}>
          <Animated.View
            style={[
              styles.loaderFill,
              {
                width: withTiming(100, {
                  duration: duration - 200,
                  easing: REasing.inOut(REasing.ease),
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.bg950,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOrb: {
    backgroundColor: 'rgba(0,240,255,0.18)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 8,
  },
  ringWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,240,255,0.5)',
    backgroundColor: 'transparent',
  },
  ringPulse: {
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    backgroundColor: 'transparent',
  },
  gateBase: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: 'rgba(10,12,22,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.35)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineWrap: {
    marginTop: 20,
  },
  tagline: {
    fontFamily: Typography.families.headingMedium,
    fontSize: Math.max(13, Math.min(16, SCREEN_W * 0.038)),
    letterSpacing: 2,
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  loaderWrap: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loaderTrack: {
    width: Math.max(140, Math.min(200, SCREEN_W * 0.45)),
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(0,240,255,0.12)',
    overflow: 'hidden',
  },
  loaderFill: {
    height: '100%',
    width: 0,
    backgroundColor: Palette.neonCyan,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
