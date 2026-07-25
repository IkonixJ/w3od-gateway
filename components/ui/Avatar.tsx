import { type ReactNode } from 'react';
import { View, StyleSheet, Image } from 'react-native';

import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { Palette, Radii, Borders, Spacing } from '@/design/tokens';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  displayName?: string | null;
  size?: AvatarSize;
  ring?: boolean;
  fallbackIcon?: ReactNode;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 64,
  xl: 88,
};

export function Avatar({ uri, displayName, size = 'md', ring = true, fallbackIcon }: AvatarProps) {
  const dim = SIZE_MAP[size];

  if (uri) {
    return (
      <View
        style={[
          styles.wrap,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderWidth: ring ? Borders.thin : 0,
            borderColor: ring ? 'rgba(0,240,255,0.4)' : 'transparent',
          },
        ]}
      >
        <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
      </View>
    );
  }

  const initials = (displayName ?? '?')
    .split(/[ _-]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.wrap,
        styles.fallback,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          borderWidth: ring ? Borders.thin : 0,
          borderColor: ring ? 'rgba(0,240,255,0.4)' : 'transparent',
        },
      ]}
    >
      {fallbackIcon ? (
        fallbackIcon
      ) : initials && initials !== '?' ? (
        <AvatarText text={initials} dim={dim} />
      ) : (
        <View style={{ width: dim * 0.7, height: dim * 0.7 }}>
          <W3ODLogo size={dim * 0.7} showText={false} glowIntensity="low" />
        </View>
      )}
    </View>
  );
}

import { Text } from 'react-native';

function AvatarText({ text, dim }: { text: string; dim: number }) {
  return (
    <Text
      style={{
        fontFamily: 'Rajdhani-SemiBold',
        fontSize: dim * 0.38,
        color: Palette.neonCyan,
        letterSpacing: 1,
      }}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Palette.glassDark,
  },
  fallback: {
    backgroundColor: 'rgba(0,240,255,0.06)',
  },
});
