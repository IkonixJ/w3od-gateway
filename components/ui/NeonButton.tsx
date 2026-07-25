import { type ReactNode, useCallback } from 'react';
import { Pressable, Text, ActivityIndicator, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { Palette, Typography, Radii, Animation, Gradients } from '@/design/tokens';

type ButtonVariant = 'cyan' | 'blue' | 'purple' | 'magenta' | 'amber' | 'success' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface NeonButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const GRADIENT_MAP: Record<Exclude<ButtonVariant, 'ghost' | 'outline'>, readonly [string, string]> = {
  cyan: Gradients.cyan,
  blue: Gradients.blue,
  purple: Gradients.purple,
  magenta: Gradients.magenta,
  amber: Gradients.brandGold,
  success: Gradients.success,
  danger: Gradients.danger,
};

const GLOW_COLOR: Record<ButtonVariant, string> = {
  cyan: '#00F0FF',
  blue: '#1E90FF',
  purple: '#8A2BE2',
  magenta: '#FF00E5',
  amber: '#FFB800',
  success: '#00FF9C',
  danger: '#FF2D6F',
  ghost: '#00F0FF',
  outline: '#00F0FF',
};

const TEXT_COLOR: Record<ButtonVariant, string> = {
  cyan: '#03121A',
  blue: '#FFFFFF',
  purple: '#FFFFFF',
  magenta: '#1A0017',
  amber: '#1A1200',
  success: '#021810',
  danger: '#FFFFFF',
  ghost: Palette.neonCyan,
  outline: Palette.neonCyan,
};

const SIZE_STYLE: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13 },
  md: { paddingVertical: 14, paddingHorizontal: 22, fontSize: 15 },
  lg: { paddingVertical: 18, paddingHorizontal: 28, fontSize: 17 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NeonButton({
  children,
  variant = 'cyan',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  style,
}: NeonButtonProps) {
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  const isSolid = variant !== 'ghost' && variant !== 'outline';
  const sizeStyle = SIZE_STYLE[size];
  const glowColor = GLOW_COLOR[variant];
  const textColor = TEXT_COLOR[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withTiming(disabled ? 0.45 : 1, { duration: Animation.duration.fast }),
  }));

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.96, Animation.spring.snappy);
    press.value = 1;
  }, [scale, press]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, Animation.spring.gentle);
    press.value = 0;
  }, [scale, press]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(press.value, [0, 1], [0.45, 0.75]),
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled || loading}
      style={[animatedStyle, fullWidth && { width: '100%' }, style]}
    >
      {isSolid ? (
        <LinearGradient
          colors={[...GRADIENT_MAP[variant]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              paddingVertical: sizeStyle.paddingVertical,
              paddingHorizontal: sizeStyle.paddingHorizontal,
              borderRadius: Radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 14,
              elevation: 5,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <>
              {leftIcon}
              <Text
                style={{
                  color: textColor,
                  fontFamily: Typography.families.headingSemiBold,
                  fontSize: sizeStyle.fontSize,
                  letterSpacing: Typography.letterSpacings.wide,
                  textTransform: 'uppercase',
                }}
              >
                {children}
              </Text>
              {rightIcon}
            </>
          )}
        </LinearGradient>
      ) : (
        <View
          style={[
            {
              paddingVertical: sizeStyle.paddingVertical,
              paddingHorizontal: sizeStyle.paddingHorizontal,
              borderRadius: Radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              borderWidth: 1,
              borderColor: variant === 'outline' ? 'rgba(0,240,255,0.5)' : 'rgba(0,240,255,0.25)',
              backgroundColor: 'rgba(0,240,255,0.04)',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <>
              {leftIcon}
              <Text
                style={{
                  color: textColor,
                  fontFamily: Typography.families.headingSemiBold,
                  fontSize: sizeStyle.fontSize,
                  letterSpacing: Typography.letterSpacings.wide,
                  textTransform: 'uppercase',
                }}
              >
                {children}
              </Text>
              {rightIcon}
            </>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}
