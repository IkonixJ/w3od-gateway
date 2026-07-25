import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, ShieldAlert, ChevronRight } from 'lucide-react-native';

import { GlassCard, NeonText, NeonButton } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { kycStatusLabel, kycStatusTone } from '@/lib/kyc-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';

// Renders a KYC-required lock card when the user hasn't been verified.
// Returns null when KYC is approved (caller can render the real content).
export function KycGate({ feature }: { feature: string }) {
  const router = useRouter();
  const { profile } = useAuth();

  if (profile?.kyc_status === 'verified') return null;

  const tone = kycStatusTone(profile?.kyc_status ?? 'none');
  const label = kycStatusLabel(profile?.kyc_status ?? 'none');

  return (
    <GlassCard
      tone={tone === 'lime' ? 'cyan' : tone}
      gradientBorder
      padding={Spacing['6']}
      style={styles.card}
    >
      <View style={styles.iconWrap}>
        {profile?.kyc_status === 'pending' ? (
          <ShieldAlert color={Palette.neonAmber} size={32} strokeWidth={2.5} />
        ) : (
          <Lock color={Palette.neonRose} size={32} strokeWidth={2.5} />
        )}
      </View>
      <NeonText variant="display" weight="bold" tone={tone} style={styles.title}>
        KYC REQUIRED
      </NeonText>
      <NeonText variant="body" tone="muted" style={styles.subtitle}>
        {profile?.kyc_status === 'pending'
          ? `Your KYC is under review. ${feature} will unlock once an admin approves your identity.`
          : `Complete identity verification to unlock ${feature}. This protects all members from fraud.`}
      </NeonText>

      <View style={styles.statusRow}>
        <NeonText variant="body" tone="muted" style={styles.statusLabel}>
          STATUS:
        </NeonText>
        <NeonText variant="body" weight="semiBold" tone={tone} style={styles.statusValue}>
          {label.toUpperCase()}
        </NeonText>
      </View>

      <NeonButton
        variant={tone === 'lime' ? 'cyan' : tone === 'amber' ? 'amber' : 'cyan'}
        fullWidth
        leftIcon={<ShieldAlert color={tone === 'amber' ? '#1A0017' : '#03121A'} size={16} />}
        onPress={() => router.push('/(tabs)/kyc')}
        style={styles.actionBtn}
      >
        {profile?.kyc_status === 'pending' ? 'View KYC Status' : 'Start Verification'}
      </NeonButton>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing['3'],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.xl,
    letterSpacing: Typography.letterSpacings.display,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['2'],
  },
  statusLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  statusValue: {
    fontSize: Typography.sizes.xs,
  },
  actionBtn: {
    marginTop: Spacing['1'],
  },
});
