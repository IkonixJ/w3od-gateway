import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, ArrowLeft, RotateCw, Check } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonButton,
  NeonText,
  OtpInput,
  NeonInput,
  DevOtpHint,
} from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import { sendOtp, resetPassword } from '@/lib/auth-service';
import { validatePassword, passwordsMatch } from '@/lib/validation';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeaderSize, cardMaxWidth, screenPadding } from '@/design/responsive';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { pendingEmail } = useAuth();
  const [stage, setStage] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyCode = () => {
    setError(null);
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setStage('password');
  };

  const handleResetPassword = async () => {
    if (!pendingEmail) {
      setError('No email on file. Please restart the reset flow.');
      return;
    }
    setError(null);
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      setError(pwCheck.errors.join('. ') + '.');
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(pendingEmail, code, newPassword);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess(true);
      setTimeout(() => router.replace('/(auth)/sign-in' as never), 2000);
    }
  };

  const handleResend = useCallback(async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    setError(null);
    const { error } = await sendOtp(pendingEmail, 'reset');
    if (error) setError(error);
    else setResendCooldown(60);
  }, [pendingEmail, resendCooldown]);

  if (!pendingEmail) {
    return (
      <ScreenShell variant="aurora" safeArea>
        <View style={styles.errorState}>
          <NeonText variant="body" tone="muted">
            No reset request pending.
          </NeonText>
          <NeonButton variant="ghost" onPress={() => router.replace('/(auth)/forgot-password' as never)}>
            Start Reset
          </NeonButton>
        </View>
      </ScreenShell>
    );
  }

  if (success) {
    return (
      <ScreenShell variant="aurora" safeArea>
        <View style={styles.successState}>
          <View style={styles.successIcon}>
            <Check color={Palette.success} size={40} strokeWidth={3} />
          </View>
          <NeonText variant="display" weight="bold" tone="success" style={styles.successTitle}>
            PASSWORD RESET
          </NeonText>
          <NeonText variant="body" tone="muted">
            Your password has been updated. Redirecting to sign in...
          </NeonText>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="aurora" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <W3ODLogo size={logoHeaderSize} showText={false} glowIntensity="medium" />
          <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>
            {stage === 'code' ? 'VERIFY CODE' : 'NEW PASSWORD'}
          </NeonText>
        </View>

        <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.card}>
          {stage === 'code' && (
            <>
              <View style={styles.iconWrap}>
                <Mail color={Palette.neonMagenta} size={28} />
              </View>
              <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
                Enter the 6-digit code sent to
              </NeonText>
              <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.email}>
                {pendingEmail}
              </NeonText>

              <DevOtpHint purpose="reset" email={pendingEmail} />

              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={handleVerifyCode}
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

              <NeonButton variant="magenta" fullWidth onPress={handleVerifyCode} style={styles.btn}>
                Continue
              </NeonButton>

              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <NeonText variant="body" weight="semiBold" tone="muted">
                    Resend in {resendCooldown}s
                  </NeonText>
                ) : (
                  <Pressable onPress={handleResend} hitSlop={8}>
                    <View style={styles.resendBtn}>
                      <RotateCw color={Palette.neonMagenta} size={14} />
                      <NeonText variant="body" weight="semiBold" tone="magenta">
                        Resend Code
                      </NeonText>
                    </View>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {stage === 'password' && (
            <>
              <View style={styles.iconWrap}>
                <Lock color={Palette.neonMagenta} size={28} />
              </View>
              <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
                Create your new password
              </NeonText>

              <NeonInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                secureTextEntry
                leftIcon={<Lock color={Palette.textTertiary} size={18} />}
                rightIcon={<Eye color={Palette.textTertiary} size={18} />}
                tone="magenta"
                style={styles.field}
              />

              <NeonInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry
                leftIcon={<Lock color={Palette.textTertiary} size={18} />}
                rightIcon={<Eye color={Palette.textTertiary} size={18} />}
                tone="magenta"
                error={
                  confirmPassword.length > 0 && !passwordsMatch(newPassword, confirmPassword)
                    ? 'Passwords do not match'
                    : error
                }
                style={styles.field}
              />

              {error && (
                <View style={styles.errorBox}>
                  <NeonText variant="body" weight="medium" tone="rose">
                    {error}
                  </NeonText>
                </View>
              )}

              <NeonButton
                variant="magenta"
                fullWidth
                loading={loading}
                onPress={handleResetPassword}
                style={styles.btn}
              >
                Reset Password
              </NeonButton>
            </>
          )}

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
    borderColor: 'rgba(255,0,229,0.3)',
    backgroundColor: 'rgba(255,0,229,0.06)',
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
  field: {
    width: '100%',
    marginTop: Spacing['2'],
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
  btn: {
    width: '100%',
    marginTop: Spacing['2'],
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3'],
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
  successState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['4'],
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,156,0.4)',
    backgroundColor: 'rgba(0,255,156,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: Typography.sizes.xl,
    letterSpacing: Typography.letterSpacings.display,
  },
});
