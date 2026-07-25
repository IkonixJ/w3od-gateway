import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { KeyRound, Copy, Check } from 'lucide-react-native';

import { NeonText } from '@/components/ui';
import { getLastDevOtp, clearLastDevOtp, type OtpPurpose } from '@/lib/auth-service';
import { copyToClipboard } from '@/lib/file-utils';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';

interface DevOtpHintProps {
  purpose: OtpPurpose;
  email?: string | null;
}

// Development-only helper. When no email provider is configured, the send-otp
// edge function returns the code in its response. This component surfaces that
// code so the auth flow is testable in the Bolt preview. In production (with a
// real email provider) the edge function omits dev_code and this renders nothing.
export function DevOtpHint({ purpose, email }: DevOtpHintProps) {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const last = getLastDevOtp();
    if (last && last.purpose === purpose && (!email || last.email === email.toLowerCase())) {
      setCode(last.code);
    }
  }, [purpose, email]);

  if (!code) return null;

  const handleCopy = async () => {
    if (!code) return;
    const copied = await copyToClipboard(code);
    if (copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <KeyRound color={Palette.neonAmber} size={14} />
        <NeonText variant="body" weight="semiBold" tone="amber">
          DEV CODE
        </NeonText>
      </View>
      <NeonText variant="body" tone="muted" style={styles.hint}>
        No email provider configured. Use this code to verify:
      </NeonText>
      <Pressable onPress={handleCopy} style={styles.codeRow}>
        <NeonText variant="display" weight="bold" tone="amber" style={styles.code}>
          {code}
        </NeonText>
        {copied ? (
          <Check color={Palette.success} size={16} />
        ) : (
          <Copy color={Palette.textTertiary} size={16} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    padding: Spacing['3'],
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    backgroundColor: 'rgba(255,184,0,0.08)',
    gap: Spacing['2'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  hint: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['3'],
  },
  code: {
    fontSize: Typography.sizes.xl,
    letterSpacing: 6,
  },
});
