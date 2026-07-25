import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, Check, AtSign, Hash, Share2, User } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, NeonButton } from '@/components/ui';
import { QRCodeView } from '@/components/wallet/QRCodeView';
import { useAuth } from '@/context/AuthProvider';
import { getMyWallet } from '@/lib/wallet-service';
import { copyToClipboard } from '@/lib/file-utils';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { cardMaxWidth, screenPadding } from '@/design/responsive';
import type { Wallet } from '@/types/wallet';

export default function WalletReceiveScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<'username' | 'account' | null>(null);

  useEffect(() => {
    getMyWallet().then((w) => {
      setWallet(w);
      setLoading(false);
    });
  }, []);

  const handleCopy = useCallback(async (text: string, field: 'username' | 'account') => {
    const copied = await copyToClipboard(text);
    if (copied) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  }, []);

  const shareDetails = useCallback(() => {
    const text = `Send me W3OD on W3OD Gateway!\nUsername: @${profile?.username ?? '—'}\nAccount: ${wallet?.account_number ?? '—'}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({ title: 'My W3OD Details', text }).catch(() => {});
    } else {
      handleCopy(text, 'account');
    }
  }, [profile, wallet, handleCopy]);

  const qrValue = wallet
    ? `w3od:${wallet.account_number}`
    : 'w3od:loading';

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonLime} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="lime" style={styles.title}>
            RECEIVE W3OD
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonLime} />
          </View>
        ) : (
          <>
            {/* QR Code card */}
            <GlassCard tone="lime" gradientBorder padding={Spacing['6']} style={styles.qrCard}>
              <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.sectionTitle}>
                SCAN TO SEND
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.sectionSub}>
                Anyone with a W3OD wallet can scan this to send you rewards instantly.
              </NeonText>

              <View style={styles.qrWrap}>
                <QRCodeView value={qrValue} size={responsive(200, 160, 220)} />
              </View>

              <View style={styles.displayNameRow}>
                <User color={Palette.neonCyan} size={15} />
                <NeonText variant="heading" weight="semiBold" tone="cyan">
                  {profile?.display_name ?? profile?.username ?? 'W3OD Member'}
                </NeonText>
              </View>
            </GlassCard>

            {/* Copyable details */}
            <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.detailsCard}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.sectionTitle}>
                YOUR DETAILS
              </NeonText>

              {/* Username row */}
              <Pressable onPress={() => profile?.username && handleCopy(profile.username, 'username')} style={styles.copyRow}>
                <View style={styles.copyIconWrap}>
                  <AtSign color={Palette.neonCyan} size={18} />
                </View>
                <View style={styles.copyMeta}>
                  <NeonText variant="body" tone="muted" style={styles.copyLabel}>
                    USERNAME
                  </NeonText>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.copyValue}>
                    @{profile?.username ?? 'Not set'}
                  </NeonText>
                </View>
                {copiedField === 'username' ? (
                  <Check color={Palette.neonLime} size={18} strokeWidth={3} />
                ) : (
                  <Copy color={Palette.textTertiary} size={18} />
                )}
              </Pressable>

              <View style={styles.divider} />

              {/* Account number row */}
              <Pressable
                onPress={() => wallet?.account_number && handleCopy(wallet.account_number, 'account')}
                style={styles.copyRow}
              >
                <View style={styles.copyIconWrap}>
                  <Hash color={Palette.neonCyan} size={18} />
                </View>
                <View style={styles.copyMeta}>
                  <NeonText variant="body" tone="muted" style={styles.copyLabel}>
                    W3OD ACCOUNT NUMBER
                  </NeonText>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.copyValue}>
                    {wallet?.account_number ?? '—'}
                  </NeonText>
                </View>
                {copiedField === 'account' ? (
                  <Check color={Palette.neonLime} size={18} strokeWidth={3} />
                ) : (
                  <Copy color={Palette.textTertiary} size={18} />
                )}
              </Pressable>
            </GlassCard>

            <NeonButton
              variant="outline"
              fullWidth
              leftIcon={<Share2 color={Palette.neonCyan} size={16} />}
              onPress={shareDetails}
              style={styles.shareBtn}
            >
              Share My Details
            </NeonButton>

            <View style={styles.hintBox}>
              <NeonText variant="body" tone="muted" style={styles.hintText}>
                Tip: You can receive W3OD from any verified member using either your
                username or your 10-digit account number.
              </NeonText>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

import { responsive } from '@/design/responsive';

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['5'],
    maxWidth: cardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['12'],
  },
  qrCard: {
    alignItems: 'center',
    gap: Spacing['4'],
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  sectionSub: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrWrap: {
    marginVertical: Spacing['2'],
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  detailsCard: {
    gap: Spacing['3'],
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  copyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyMeta: {
    flex: 1,
    gap: 2,
  },
  copyLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  copyValue: {
    fontSize: Typography.sizes.base,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  shareBtn: {
    marginTop: Spacing['1'],
  },
  hintBox: {
    padding: Spacing['3'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
  },
  hintText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
});
