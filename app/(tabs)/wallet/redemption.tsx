import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gift, Clock, Banknote, Plus, CircleCheck as CheckCircle2, Calendar, Info, CircleAlert as AlertCircle } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, NeonButton, NeonInput, Divider, Badge } from '@/components/ui';
import { PinConfirmModal } from '@/components/wallet/PinConfirmModal';
import { KycGate } from '@/components/wallet/KycGate';
import { useAuth } from '@/context/AuthProvider';
import {
  getMyWallet,
  getRedemptions,
  submitRedemption,
  getNextProcessingDate,
  formatW3od,
  getWalletLimits,
} from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, cardMaxWidth, screenPadding } from '@/design/responsive';
import type { Wallet, RedemptionRow, RedemptionResult } from '@/types/wallet';

const STATUS_TONE: Record<RedemptionRow['status'], 'cyan' | 'lime' | 'amber' | 'rose'> = {
  pending: 'amber',
  approved: 'cyan',
  rejected: 'rose',
  paid: 'lime',
};

export default function WalletRedemptionScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const limits = getWalletLimits();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [nextProcessing, setNextProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<RedemptionResult | null>(null);

  const loadData = useCallback(async () => {
    const [w, r, np] = await Promise.all([
      getMyWallet(),
      getRedemptions(),
      getNextProcessingDate(),
    ]);
    setWallet(w);
    setRedemptions(r);
    setNextProcessing(np);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSubmit = useCallback(
    async (pin: string) => {
      const num = parseFloat(amount);
      if (isNaN(num) || num < limits.minRedemption) {
        setAmountError(`Minimum redemption is ₦${limits.minRedemption}.`);
        setPinModal(false);
        return;
      }
      if (wallet && num > wallet.balance) {
        setAmountError('Insufficient available balance.');
        setPinModal(false);
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      const res = await submitRedemption(num, pin);
      setSubmitting(false);
      setPinModal(false);

      if (!res.success) {
        setSubmitError(res.error ?? 'Redemption failed.');
        return;
      }

      setSuccess(res);
      setAmount('');
      setAmountError(null);
      loadData();
    },
    [amount, wallet, limits.minRedemption, loadData]
  );

  const availableBalance = wallet?.balance ?? 0;
  const pendingBalance = wallet?.pending_balance ?? 0;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonAmber} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonAmber} colors={[Palette.neonAmber]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonAmber} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
            REDEEM
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Balance summary */}
        <GlassCard tone="amber" gradientBorder padding={Spacing['5']} style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceBlock}>
              <NeonText variant="body" weight="semiBold" tone="muted" style={styles.balanceLabel}>
                AVAILABLE
              </NeonText>
              <NeonText variant="display" weight="bold" tone="lime" style={styles.balanceValue}>
                {formatW3od(availableBalance)}
              </NeonText>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceBlock}>
              <NeonText variant="body" weight="semiBold" tone="muted" style={styles.balanceLabel}>
                PENDING
              </NeonText>
              <NeonText variant="display" weight="bold" tone="amber" style={styles.balanceValue}>
                {formatW3od(pendingBalance)}
              </NeonText>
            </View>
          </View>
        </GlassCard>

        {/* Processing date info */}
        {nextProcessing && (
          <View style={styles.processingInfo}>
            <Calendar color={Palette.neonAmber} size={16} />
            <NeonText variant="body" tone="muted" style={styles.processingText}>
              Next processing date:{' '}
              <NeonText variant="body" weight="semiBold" tone="amber">
                {fmtDate(nextProcessing)}
              </NeonText>
            </NeonText>
          </View>
        )}

        {/* Success banner */}
        {success?.success && (
          <GlassCard tone="lime" gradientBorder padding={Spacing['5']} style={styles.successCard}>
            <View style={styles.successHeader}>
              <CheckCircle2 color={Palette.neonLime} size={24} strokeWidth={2.5} />
              <NeonText variant="heading" weight="semiBold" tone="lime">
                REDEMPTION SUBMITTED
              </NeonText>
            </View>
            <NeonText variant="body" tone="muted" style={styles.successText}>
              {formatW3od(success.amount ?? 0)} will be processed on{' '}
              {success.processing_date ? fmtDate(success.processing_date) : 'the next processing date'}.
            </NeonText>
            <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.successRef}>
              Ref: {success.reference}
            </NeonText>
            <NeonButton variant="ghost" onPress={() => setSuccess(null)} fullWidth>
              Dismiss
            </NeonButton>
          </GlassCard>
        )}

        {/* KYC gate — redemptions locked until verified */}
        {profile?.kyc_status !== 'verified' && (
          <KycGate feature="redeeming W3OD for payouts" />
        )}

        {/* Submit redemption form */}
        {profile?.kyc_status === 'verified' && (
        <GlassCard tone="amber" gradientBorder padding={Spacing['6']} style={styles.formCard}>
          <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.sectionTitle}>
            NEW REDEMPTION REQUEST
          </NeonText>

          {/* Bank account status */}
          <View style={styles.bankStatusRow}>
            <Banknote color={Palette.neonCyan} size={16} />
            <NeonText variant="body" tone="muted" style={styles.bankStatusText}>
              Payout account required
            </NeonText>
            <Pressable onPress={() => router.push('/(tabs)/wallet/bank-account')} hitSlop={8}>
              <View style={styles.bankManageBtn}>
                {profile ? <Plus color={Palette.neonCyan} size={14} /> : null}
                <NeonText variant="body" weight="semiBold" tone="cyan">
                  Manage
                </NeonText>
              </View>
            </Pressable>
          </View>

          <NeonInput
            label="Amount to Redeem (₦)"
            value={amount}
            onChangeText={(v) => {
              setAmount(v.replace(/[^\d.]/g, ''));
              setAmountError(null);
            }}
            placeholder={`${limits.minRedemption}`}
            keyboardType="numeric"
            tone="amber"
            error={amountError ?? submitError}
          />

          <View style={styles.rulesBox}>
            <Info color={Palette.textTertiary} size={13} />
            <NeonText variant="body" tone="muted" style={styles.rulesText}>
              Minimum ₦{limits.minRedemption}. Funds move to Pending Balance until processed.
              Processing occurs on the 14th and 30th of each month.
            </NeonText>
          </View>

          <NeonButton
            variant="amber"
            fullWidth
            disabled={!amount || parseFloat(amount) < limits.minRedemption || availableBalance < parseFloat(amount || '0')}
            onPress={() => {
              setSubmitError(null);
              setPinModal(true);
            }}
            leftIcon={<Gift color="#1A0017" size={16} />}
            style={styles.submitBtn}
          >
            Submit Redemption
          </NeonButton>
        </GlassCard>
        )}

        {/* Redemption history */}
        {profile?.kyc_status === 'verified' && (
        <View style={styles.historySection}>
          <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.historyTitle}>
            REDEMPTION HISTORY
          </NeonText>

          {redemptions.length === 0 ? (
            <GlassCard tone="amber" padding={Spacing['5']} style={styles.emptyCard}>
              <Clock color={Palette.textTertiary} size={32} />
              <NeonText variant="body" tone="muted" style={styles.emptyText}>
                No redemption requests yet. Submit your first request above.
              </NeonText>
            </GlassCard>
          ) : (
            <GlassCard tone="amber" padding={Spacing['4']} style={styles.listCard}>
              {redemptions.map((r, idx) => (
                <View key={r.id}>
                  {idx > 0 && <Divider tone="white" />}
                  <View style={styles.redemptionRow}>
                    <View style={styles.redemptionLeft}>
                      <View style={styles.redemptionIconWrap}>
                        <Gift color={Palette.neonAmber} size={16} />
                      </View>
                      <View style={styles.redemptionMeta}>
                        <NeonText variant="body" weight="semiBold" tone="amber" style={styles.redemptionAmount}>
                          {formatW3od(r.amount)}
                        </NeonText>
                        <NeonText variant="body" tone="muted" style={styles.redemptionDate}>
                          {fmtDate(r.requested_at)} · Processes {fmtDate(r.processing_date)}
                        </NeonText>
                        <NeonText variant="body" tone="muted" style={styles.redemptionRef}>
                          {r.reference}
                        </NeonText>
                      </View>
                    </View>
                    <Badge tone={STATUS_TONE[r.status]}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </View>
                </View>
              ))}
            </GlassCard>
          )}
        </View>
        )}

        {profile?.kyc_status === 'verified' && (
        <View style={styles.noticeBox}>
          <AlertCircle color={Palette.textTertiary} size={14} />
          <NeonText variant="body" tone="muted" style={styles.noticeText}>
            Pending redemption funds cannot be spent or transferred until processed.
          </NeonText>
        </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      <PinConfirmModal
        visible={pinModal}
        title="AUTHORIZE REDEMPTION"
        subtitle={`Enter your PIN to redeem ${formatW3od(parseFloat(amount || '0'))}.`}
        onClose={() => setPinModal(false)}
        onConfirm={handleSubmit}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['4'],
    maxWidth: wideCardMaxWidth,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    gap: 0,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceBlock: {
    flex: 1,
    gap: 4,
  },
  balanceDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  balanceValue: {
    fontSize: Typography.sizes.xl,
  },
  processingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  processingText: {
    fontSize: Typography.sizes.xs,
  },
  successCard: {
    gap: Spacing['3'],
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  successText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  successRef: {
    fontSize: Typography.sizes.xs,
  },
  formCard: {
    gap: Spacing['3'],
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  bankStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  bankStatusText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
  },
  bankManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rulesBox: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  rulesText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: Spacing['2'],
  },
  historySection: {
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  historyTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['6'],
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listCard: {
    gap: 0,
  },
  redemptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  redemptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    flex: 1,
  },
  redemptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redemptionMeta: {
    flex: 1,
    gap: 2,
  },
  redemptionAmount: {
    fontSize: Typography.sizes.sm,
  },
  redemptionDate: {
    fontSize: Typography.sizes.xs,
  },
  redemptionRef: {
    fontSize: 10,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  footerSpace: {
    height: Spacing['4'],
  },
});
