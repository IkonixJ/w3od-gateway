import { useState } from 'react';
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { Lock, X, ShieldCheck } from 'lucide-react-native';

import { GlassCard, NeonText, NeonButton, PinInput } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { screenPadding } from '@/design/responsive';

interface PinConfirmModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
}

export function PinConfirmModal({
  visible,
  title = 'CONFIRM WITH PIN',
  subtitle = 'Enter your 4-digit transaction PIN to authorize this action.',
  onClose,
  onConfirm,
}: PinConfirmModalProps) {
  const { profile } = useAuth();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (pin.length !== 4) {
      setError('Enter a 4-digit PIN.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(pin);
      setPin('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PIN verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setPin('');
    setError(null);
    onClose();
  };

  if (profile?.pin_locked) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.backdrop} />
          <GlassCard tone="rose" gradientBorder padding={Spacing['6']} style={styles.card}>
            <View style={styles.header}>
              <NeonText variant="heading" weight="semiBold" tone="rose">
                PIN LOCKED
              </NeonText>
              <Pressable onPress={handleClose} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonText variant="body" tone="muted" style={styles.lockedText}>
              Your transaction PIN is locked after 3 failed attempts. Reset it from a trusted
              device or contact support.
            </NeonText>
            <NeonButton variant="ghost" onPress={handleClose} fullWidth>
              Close
            </NeonButton>
          </GlassCard>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.overlay}
      >
        <View style={styles.backdrop} />
        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Lock color={Palette.neonCyan} size={18} />
              </View>
              <NeonText variant="heading" weight="semiBold" tone="cyan">
                {title}
              </NeonText>
            </View>
            <Pressable onPress={handleClose} hitSlop={10} disabled={busy}>
              <X color={Palette.textTertiary} size={20} />
            </Pressable>
          </View>

          <NeonText variant="body" tone="muted" style={styles.subtitle}>
            {subtitle}
          </NeonText>

          <PinInput
            value={pin}
            onChange={setPin}
            error={!!error}
            style={styles.pinInput}
          />

          {error && (
            <View style={styles.errorBox}>
              <NeonText variant="body" weight="medium" tone="rose">
                {error}
              </NeonText>
            </View>
          )}

          <View style={styles.actions}>
            <NeonButton variant="ghost" onPress={handleClose} disabled={busy}>
              Cancel
            </NeonButton>
            <View style={styles.flex1}>
              <NeonButton
                variant="cyan"
                fullWidth
                loading={busy}
                disabled={pin.length !== 4 || busy}
                onPress={handleConfirm}
                leftIcon={<ShieldCheck color="#03121A" size={16} />}
              >
                Confirm
              </NeonButton>
            </View>
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenPadding,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.75)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    gap: Spacing['4'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  pinInput: {
    marginTop: Spacing['2'],
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
  lockedText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
});
