import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, RotateCw } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonButton, NeonText, OtpInput } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import { sendOtp } from '@/lib/auth-service';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeaderSize, cardMaxWidth, screenPadding } from '@/design/responsive';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { pendingEmail, verifyEmail, loading } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    const { error } = await verifyEmail(code);
    if (error) setError(error);
  };

  const handleResend = useCallback(async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    setError(null);
    const { error } = await sendOtp(pendingEmail, 'signup');
    if (error) {
      setError(error);
    } else {
      setResendCooldown(60);
    }
  }, [pendingEmail, resendCooldown]);

  if (!pendingEmail) {
    return (
      <ScreenShell variant="aurora" safeArea>
        <View style={styles.errorState}>
          <NeonText variant="body" tone="muted">
            No email pending verification.
          </NeonText>
          <NeonButton variant="ghost" onPress={() => router.replace('/(auth)/sign-in' as never)}>
            Back to Sign In
          </NeonButton>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="aurora" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <W3ODLogo size={logoHeaderSize} showText={false} glowIntensity="medium" />
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            VERIFY EMAIL
          </NeonText>
        </View>

        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
          <View style={styles.iconWrap}>
            <Mail color={Palette.neonCyan} size={28} />
          </View>
          <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
            Enter the 6-digit code sent to
          </NeonText>
          <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.email}>
            {pendingEmail}
          </NeonText>

          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            error={!!error}
            style={styles.otpInput}
          />

          {error && (
            <View style={styles.errorBox}>
              <NeonText variant="body" weight="medium" tone="rose">
                {error}
              </NeonText>
            </View>
          )}

          <NeonButton
            variant="cyan"
            fullWidth
            loading={loading}
            onPress={handleVerify}
            style={styles.verifyBtn}
          >
            Verify Email
          </NeonButton>

          <View style={styles.resendRow}>
            <NeonText variant="body" tone="muted">
              Didn't receive a code?{' '}
            </NeonText>
            {resendCooldown > 0 ? (
              <NeonText variant="body" weight="semiBold" tone="muted">
                Resend in {resendCooldown}s
              </NeonText>
            ) : (
              <Pressable onPress={handleResend} hitSlop={8}>
                <View style={styles.resendBtn}>
                  <RotateCw color={Palette.neonCyan} size={14} />
                  <NeonText variant="body" weight="semiBold" tone="cyan">
                    Resend
                  </NeonText>
                </View>
              </Pressable>
            )}
          </View>

          <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={Palette.textTertiary} size={14} />
            <NeonText variant="body" tone="muted">
              Back
            </NeonText>
          </Pressable>
        </GlassCard>
      </ScrollView>
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
    borderColor: 'rgba(0,240,255,0.3)',
    backgroundColor: 'rgba(0,240,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  email: {
    fontSize: Typography.sizes.base,
  },
  otpInput: {
    marginTop: Spacing['4'],
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: 10,
    padding: Spacing['3'],
    width: '100%',
    alignItems: 'center',
  },
  verifyBtn: {
    marginTop: Spacing['2'],
    width: '100%',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['4'],
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['4'],
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['4'],
  },
});
