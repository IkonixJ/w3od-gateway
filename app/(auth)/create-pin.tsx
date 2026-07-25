import { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, ArrowLeft, Check } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonButton, NeonText, PinInput } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import { validatePin } from '@/lib/validation';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeaderSize, cardMaxWidth, screenPadding } from '@/design/responsive';

export default function CreatePinScreen() {
  const router = useRouter();
  const { createPin, loading } = useAuth();
  const [stage, setStage] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateComplete = (value: string) => {
    setError(null);
    if (!validatePin(value)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    setPin(value);
    setStage('confirm');
  };

  const handleConfirmComplete = async (value: string) => {
    setError(null);
    if (value !== pin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      setStage('create');
      setPin('');
      return;
    }
    const { error } = await createPin(value);
    if (error) {
      setError(error);
      setConfirmPin('');
    }
    // On success, AuthProvider sets onboardingStep to 'complete' and the
    // root layout will redirect to tabs.
  };

  const handleBack = () => {
    setError(null);
    if (stage === 'confirm') {
      setStage('create');
      setPin('');
      setConfirmPin('');
    } else {
      router.back();
    }
  };

  return (
    <ScreenShell variant="aurora" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <W3ODLogo size={logoHeaderSize} showText={false} glowIntensity="medium" />
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            TRANSACTION PIN
          </NeonText>
        </View>

        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
          <View style={styles.iconWrap}>
            <Lock color={Palette.neonCyan} size={28} />
          </View>

          <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
            {stage === 'create'
              ? 'Create a secure 4-digit PIN for transactions'
              : 'Confirm your PIN'}
          </NeonText>

          <NeonText variant="body" tone="muted" style={styles.description}>
            This PIN will be required for transfers, redemptions, and sensitive
            account actions. Keep it private — do not share it with anyone.
          </NeonText>

          {stage === 'create' && (
            <View style={styles.pinSection}>
              <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.stageLabel}>
                ENTER PIN
              </NeonText>
              <PinInput
                value={pin}
                onChange={setPin}
                onComplete={handleCreateComplete}
                error={!!error}
                style={styles.pinInput}
              />
            </View>
          )}

          {stage === 'confirm' && (
            <View style={styles.pinSection}>
              <View style={styles.stageRow}>
                <Check color={Palette.success} size={16} />
                <NeonText variant="body" weight="semiBold" tone="success" style={styles.stageLabel}>
                  PIN ENTERED
                </NeonText>
              </View>
              <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.stageLabel}>
                CONFIRM PIN
              </NeonText>
              <PinInput
                value={confirmPin}
                onChange={setConfirmPin}
                onComplete={handleConfirmComplete}
                error={!!error}
                style={styles.pinInput}
              />
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <NeonText variant="body" weight="medium" tone="rose">
                {error}
              </NeonText>
            </View>
          )}

          {loading && (
            <NeonText variant="body" tone="muted" style={styles.loadingText}>
              Securing your PIN...
            </NeonText>
          )}

          <NeonButton variant="ghost" onPress={handleBack} leftIcon={<ArrowLeft color={Palette.neonCyan} size={16} />}>
            Back
          </NeonButton>
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
    gap: Spacing['4'],
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
  description: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  pinSection: {
    alignItems: 'center',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  stageLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
  pinInput: {
    marginTop: Spacing['2'],
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: 10,
    padding: Spacing['3'],
  },
  loadingText: {
    fontSize: Typography.sizes.xs,
  },
});
