import { type ReactNode } from 'react';
import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Gradients } from '@/design/tokens';

interface ScreenShellProps {
  children: ReactNode;
  variant?: 'deep' | 'aurora' | 'midnight';
  showGrid?: boolean;
  safeArea?: boolean;
  scrollable?: boolean;
}

export function ScreenShell({
  children,
  variant = 'deep',
  showGrid = true,
  safeArea = true,
  scrollable = false,
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const gradient =
    variant === 'aurora'
      ? Gradients.bgAurora
      : variant === 'midnight'
      ? Gradients.bgMidnight
      : Gradients.bgDeep;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradient]} style={StyleSheet.absoluteFillObject} />

      {showGrid && Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.14,
              backgroundImage:
                'linear-gradient(rgba(0,240,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.06) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            } as unknown as ViewStyle
          }
        />
      )}

      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />

      <View
        style={[
          styles.content,
          safeArea && { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 88 },
        ]}
      >
        {scrollable ? <View style={styles.scrollInner}>{children}</View> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.bg950,
    overflow: 'hidden',
  },
  glowA: {
    position: 'absolute',
    top: -140,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(0,240,255,0.08)',
  },
  glowB: {
    position: 'absolute',
    bottom: -160,
    left: -120,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(138,43,226,0.07)',
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  scrollInner: {
    flex: 1,
  },
});
