import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { ScreenShell, NeonText, NeonButton } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { Typography, Spacing } from '@/design/tokens';
import { responsive, screenPadding } from '@/design/responsive';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <ScreenShell variant="midnight">
        <View style={styles.container}>
          <W3ODLogo size={responsive(72, 56, 96)} showText={false} glowIntensity="medium" />
          <NeonText variant="display" weight="bold" tone="rose" style={styles.title}>
            404
          </NeonText>
          <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
            This sector of the grid does not exist.
          </NeonText>
          <Link href="/(tabs)" asChild>
            <View style={styles.action}>
              <NeonButton variant="cyan">Return to Gateway</NeonButton>
            </View>
          </Link>
        </View>
      </ScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenPadding,
    gap: Spacing['4'],
  },
  title: {
    fontSize: Typography.sizes['5xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    letterSpacing: Typography.letterSpacings.wide,
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing['4'],
  },
});
