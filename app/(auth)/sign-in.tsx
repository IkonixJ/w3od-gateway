import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, ArrowLeft } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonButton, NeonText, NeonInput } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeaderSize, cardMaxWidth, screenPadding } from '@/design/responsive';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setOnboardingStep, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    const { error } = await signIn(email, password);
    if (error) setError(error);
    // On success, the AuthProvider will set onboardingStep and the root
    // layout will redirect to the appropriate screen (device-verify or tabs).
  };

  return (
    <ScreenShell variant="aurora" safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <W3ODLogo size={logoHeaderSize} showText={false} glowIntensity="medium" />
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
              ACCESS TERMINAL
            </NeonText>
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
              Sign in to W3OD Gateway
            </NeonText>
          </View>

          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
            <NeonInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="agent@w3od.io"
              keyboardType="email-address"
              leftIcon={<Mail color={Palette.textTertiary} size={18} />}
              tone="cyan"
            />

            <NeonInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              leftIcon={<Lock color={Palette.textTertiary} size={18} />}
              rightIcon={<Eye color={Palette.textTertiary} size={18} />}
              tone="cyan"
              error={error}
              onSubmitEditing={handleSignIn}
              style={styles.field}
            />

            <NeonButton
              variant="cyan"
              loading={loading}
              fullWidth
              onPress={handleSignIn}
              style={styles.submitBtn}
            >
              Enter Gateway
            </NeonButton>

            <View style={styles.footer}>
              <Pressable
                onPress={() => router.push('/(auth)/forgot-password' as never)}
                hitSlop={8}
              >
                <NeonText variant="body" weight="semiBold" tone="magenta">
                  Forgot Password?
                </NeonText>
              </Pressable>
            </View>

            <View style={styles.signupRow}>
              <NeonText variant="body" tone="muted">
                No identity?{' '}
              </NeonText>
              <Pressable
                onPress={() => {
                  setOnboardingStep('sign-up');
                  router.push('/(auth)/sign-up' as never);
                }}
                hitSlop={8}
              >
                <NeonText variant="body" weight="semiBold" tone="cyan">
                  Create account
                </NeonText>
              </Pressable>
            </View>
          </GlassCard>

          <Pressable style={styles.backRow} onPress={() => router.push('/(auth)/welcome' as never)} hitSlop={8}>
            <ArrowLeft color={Palette.textTertiary} size={14} />
            <NeonText variant="body" tone="muted">
              Back to Welcome
            </NeonText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: screenPadding,
    gap: Spacing['4'],
  },
  header: {
    alignItems: 'center',
    gap: Spacing['2'],
    marginBottom: Spacing['4'],
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
  card: {
    maxWidth: cardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing['4'],
  },
  field: {
    marginTop: Spacing['2'],
  },
  submitBtn: {
    marginTop: Spacing['2'],
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing['3'],
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing['3'],
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['4'],
  },
});
