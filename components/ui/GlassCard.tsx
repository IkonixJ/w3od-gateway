import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { Palette, Radii, Shadows, Borders } from '@/design/tokens';

type NeonTone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'lime' | 'amber' | 'none';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  tone?: NeonTone;
  blurIntensity?: number;
  padding?: number;
  radius?: keyof typeof Radii;
  glow?: boolean;
  gradientBorder?: boolean;
  elevated?: boolean;
}

const BORDER_COLOR: Record<NeonTone, string> = {
  cyan: 'rgba(0,240,255,0.30)',
  blue: 'rgba(30,144,255,0.30)',
  purple: 'rgba(138,43,226,0.30)',
  magenta: 'rgba(255,0,229,0.30)',
  lime: 'rgba(182,255,0,0.30)',
  amber: 'rgba(255,184,0,0.30)',
  none: 'rgba(255,255,255,0.08)',
};

const GLOW_COLOR: Record<NeonTone, string> = {
  cyan: '#00F0FF',
  blue: '#1E90FF',
  purple: '#8A2BE2',
  magenta: '#FF00E5',
  lime: '#B6FF00',
  amber: '#FFB800',
  none: 'transparent',
};

const BORDER_GRADIENTS: Record<Exclude<NeonTone, 'none'>, [string, string]> = {
  cyan: ['rgba(0,240,255,0.6)', 'rgba(30,144,255,0.2)'],
  blue: ['rgba(30,144,255,0.6)', 'rgba(138,43,226,0.2)'],
  purple: ['rgba(138,43,226,0.6)', 'rgba(255,0,229,0.2)'],
  magenta: ['rgba(255,0,229,0.6)', 'rgba(138,43,226,0.2)'],
  lime: ['rgba(182,255,0,0.6)', 'rgba(0,240,255,0.2)'],
  amber: ['rgba(255,184,0,0.6)', 'rgba(255,45,111,0.2)'],
};

export function GlassCard({
  children,
  style,
  tone = 'cyan',
  blurIntensity = 32,
  padding = 16,
  radius = 'lg',
  glow = true,
  gradientBorder = false,
  elevated = false,
}: GlassCardProps) {
  const radiusVal = Radii[radius];
  const borderColor = BORDER_COLOR[tone];
  const glowColor = GLOW_COLOR[tone];

  return (
    <View
      style={[
        {
          borderRadius: radiusVal,
          overflow: 'hidden',
          borderWidth: gradientBorder ? 0 : Borders.thin,
          borderColor,
          ...(glow && tone !== 'none'
            ? {
                shadowColor: glowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 6,
              }
            : Shadows.lg),
          ...(elevated ? Shadows.xl : {}),
        },
        style,
      ]}
    >
      {gradientBorder && tone !== 'none' && (
        <LinearGradient
          colors={BORDER_GRADIENTS[tone]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: Borders.thin,
            borderRadius: radiusVal,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: radiusVal - Borders.thin,
              backgroundColor: Palette.glassDarker,
            }}
          />
        </LinearGradient>
      )}
      <BlurView intensity={blurIntensity} tint="dark" style={{ flex: 1 }}>
        <View style={{ padding, flex: 1 }}>{children}</View>
      </BlurView>
    </View>
  );
}
