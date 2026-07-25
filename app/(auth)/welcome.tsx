import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell, GlassCard, NeonButton, NeonText } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeroSize, cardMaxWidth, screenPadding, responsive } from '@/design/responsive';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setOnboardingStep } = useAuth();

  const goToSignIn = () => {
    setOnboardingStep('sign-in');
    router.push('/(auth)/sign-in' as never);
  };

  const goToSignUp = () => {
    setOnboardingStep('sign-up');
    router.push('/(auth)/sign-up' as never);
  };

  return (
    <ScreenShell variant="aurora" safeArea>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <W3ODLogo size={logoHeroSize} showText glowIntensity="high" animated />
          <NeonText
            variant="display"
            weight="bold"
            tone="cyan"
            style={[styles.title, { fontSize: responsive(Typography.sizes['3xl'], 22, 34) }]}
          >
            W3OD GATEWAY
          </NeonText>
          <NeonText
            variant="heading"
            weight="medium"
            tone="muted"
            style={[styles.tagline, { fontSize: responsive(Typography.sizes.base, 13, 16) }]}
          >
            Your Gateway to Web3 Rewards
          </NeonText>
        </View>

        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
          <NeonText variant="body" tone="muted" style={styles.description}>
            Join the W3OD community rewards platform. Earn XP, build reputation,
            complete campaigns, and unlock exclusive Web3 rewards — all in one
            secure gateway.
          </NeonText>

          <View style={styles.features}>
            <FeatureRow text="Rewards Wallet & Redemption System" />
            <FeatureRow text="Community Campaigns & Events" />
            <FeatureRow text="Learning Tracks with XP" />
            <FeatureRow text="Reputation & Badges" />
          </View>

          <View style={styles.actions}>
            <NeonButton variant="cyan" fullWidth onPress={goToSignIn}>
              Sign In
            </NeonButton>
            <NeonButton variant="outline" fullWidth onPress={goToSignUp} style={styles.signupBtn}>
              Create Account
            </NeonButton>
          </View>
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.bullet} />
      <NeonText variant="body" tone="muted" style={styles.featureText}>
        {text}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: screenPadding,
    gap: Spacing['8'],
  },
  hero: {
    alignItems: 'center',
    gap: Spacing['4'],
  },
  title: {
    letterSpacing: Typography.letterSpacings.display,
    textAlign: 'center',
  },
  tagline: {
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  card: {
    maxWidth: cardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing['5'],
  },
  description: {
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  features: {
    gap: Spacing['3'],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.neonCyan,
  },
  featureText: {
    fontSize: Typography.sizes.sm,
  },
  actions: {
    gap: Spacing['3'],
  },
  signupBtn: {
    marginTop: Spacing['2'],
  },
});
