import { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonButton, NeonText, NeonInput } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import { validateEmail } from '@/lib/validation';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeaderSize, cardMaxWidth, screenPadding } from '@/design/responsive';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const { error } = await requestPasswordReset(email);
    if (error) {
      setError(error);
    } else {
      setSent(true);
      router.push('/(auth)/reset-password' as never);
    }
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
            <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>
              RESET PASSWORD
            </NeonText>
          </View>

          <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.card}>
            <View style={styles.iconWrap}>
              <Mail color={Palette.neonMagenta} size={28} />
            </View>
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
              Enter your email and we'll send you a verification code to reset your password.
            </NeonText>

            <NeonInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="agent@w3od.io"
              keyboardType="email-address"
              leftIcon={<Mail color={Palette.textTertiary} size={18} />}
              tone="magenta"
              error={error}
              style={styles.field}
            />

            {sent && (
              <View style={styles.successBox}>
                <NeonText variant="body" weight="medium" tone="success">
                  Code sent! Check your email.
                </NeonText>
              </View>
            )}

            <NeonButton
              variant="magenta"
              fullWidth
              loading={loading}
              onPress={handleSend}
              style={styles.submitBtn}
            >
              Send Reset Code
            </NeonButton>

            <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
              <ArrowLeft color={Palette.textTertiary} size={14} />
              <NeonText variant="body" tone="muted">
                Back to Sign In
              </NeonText>
            </Pressable>
          </GlassCard>
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
  },
  header: {
    alignItems: 'center',
    gap: Spacing['3'],
    marginBottom: Spacing['6'],
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  card: {
    maxWidth: cardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,0,229,0.3)',
    backgroundColor: 'rgba(255,0,229,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  field: {
    width: '100%',
  },
  successBox: {
    backgroundColor: 'rgba(0,255,156,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,156,0.3)',
    borderRadius: 10,
    padding: Spacing['3'],
  },
  submitBtn: {
    width: '100%',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['4'],
  },
});
