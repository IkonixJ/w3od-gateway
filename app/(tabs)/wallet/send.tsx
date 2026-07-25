import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Send, ArrowLeft, AtSign, Hash, Check, Search, User, ShieldCheck, Info, CircleCheck as CheckCircle2 } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonButton,
  NeonText,
  NeonInput,
  Avatar,
  Divider,
} from '@/components/ui';
import { PinConfirmModal } from '@/components/wallet/PinConfirmModal';
import { useAuth } from '@/context/AuthProvider';
import { lookupRecipient, transferW3od, formatW3od, getWalletLimits } from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { cardMaxWidth, screenPadding } from '@/design/responsive';
import type { RecipientLookup, TransferResult } from '@/types/wallet';

type Stage = 'recipient' | 'amount' | 'review' | 'success';

export default function WalletSendScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const limits = getWalletLimits();

  const [stage, setStage] = useState<Stage>('recipient');
  const [identifier, setIdentifier] = useState('');
  const [method, setMethod] = useState<'username' | 'account'>('username');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [recipient, setRecipient] = useState<RecipientLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);

  const [pinModal, setPinModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Debounced recipient lookup
  useEffect(() => {
    const clean = identifier.trim();
    if (clean.length < 3) {
      setRecipient(null);
      setLookupError(null);
      return;
    }
    setLookupBusy(true);
    setLookupError(null);
    const t = setTimeout(async () => {
      const found = await lookupRecipient(clean);
      setLookupBusy(false);
      setRecipient(found);
      if (!found.found && !found.is_self) {
        setLookupError('No member found with that ' + method + '.');
      } else if (found.is_self) {
        setLookupError('You cannot send to yourself.');
      } else {
        setLookupError(null);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [identifier, method]);

  const recipientValid =
    recipient?.found === true && !recipient.is_self && recipient.email_verified;

  const handleContinueToAmount = () => {
    if (!recipientValid) return;
    setStage('amount');
  };

  const handleContinueToReview = () => {
    setAmountError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num < limits.minTransfer) {
      setAmountError(`Minimum transfer is ₦${limits.minTransfer}.`);
      return;
    }
    if (num > limits.maxDailyTransfer) {
      setAmountError(`Maximum transfer is ₦${limits.maxDailyTransfer}.`);
      return;
    }
    setStage('review');
  };

  const handleConfirmTransfer = useCallback(
    async (pin: string) => {
      if (!recipient?.id) return;
      setTransferring(true);
      setTransferError(null);
      const res = await transferW3od(
        identifier.trim(),
        parseFloat(amount),
        description.trim(),
        pin
      );
      setTransferring(false);
      setPinModal(false);

      if (!res.success) {
        setTransferError(res.error ?? 'Transfer failed.');
        setResult(null);
        return;
      }
      setResult(res);
      setStage('success');
    },
    [identifier, amount, description, recipient]
  );

  const resetAll = () => {
    setIdentifier('');
    setRecipient(null);
    setAmount('');
    setDescription('');
    setResult(null);
    setTransferError(null);
    setStage('recipient');
  };

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => (stage === 'recipient' ? router.back() : setStage(stage === 'success' ? 'review' : stage === 'review' ? 'amount' : 'recipient'))} hitSlop={10}>
              <ArrowLeft color={Palette.neonCyan} size={22} />
            </Pressable>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
              SEND W3OD
            </NeonText>
            <View style={{ width: 22 }} />
          </View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <StepDot active={stage !== 'recipient'} done={stage !== 'recipient'} label="Recipient" />
            <StepLine done={stage === 'amount' || stage === 'review' || stage === 'success'} />
            <StepDot active={stage === 'amount' || stage === 'review' || stage === 'success'} done={stage === 'review' || stage === 'success'} label="Amount" />
            <StepLine done={stage === 'review' || stage === 'success'} />
            <StepDot active={stage === 'review' || stage === 'success'} done={stage === 'success'} label="Confirm" />
          </View>

          {/* ─── Stage: Recipient ─── */}
          {stage === 'recipient' && (
            <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.stageTitle}>
                WHO ARE YOU SENDING TO?
              </NeonText>

              {/* Method toggle */}
              <View style={styles.methodRow}>
                <Pressable
                  onPress={() => {
                    setMethod('username');
                    setIdentifier('');
                    setRecipient(null);
                  }}
                  style={[
                    styles.methodBtn,
                    {
                      borderColor: method === 'username' ? Palette.neonCyan : 'rgba(255,255,255,0.1)',
                      backgroundColor: method === 'username' ? 'rgba(0,240,255,0.08)' : 'transparent',
                    },
                  ]}
                >
                  <AtSign color={method === 'username' ? Palette.neonCyan : Palette.textTertiary} size={16} />
                  <NeonText variant="body" weight="semiBold" tone={method === 'username' ? 'cyan' : 'muted'} style={styles.methodText}>
                    Username
                  </NeonText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMethod('account');
                    setIdentifier('');
                    setRecipient(null);
                  }}
                  style={[
                    styles.methodBtn,
                    {
                      borderColor: method === 'account' ? Palette.neonCyan : 'rgba(255,255,255,0.1)',
                      backgroundColor: method === 'account' ? 'rgba(0,240,255,0.08)' : 'transparent',
                    },
                  ]}
                >
                  <Hash color={method === 'account' ? Palette.neonCyan : Palette.textTertiary} size={16} />
                  <NeonText variant="body" weight="semiBold" tone={method === 'account' ? 'cyan' : 'muted'} style={styles.methodText}>
                    Account No.
                  </NeonText>
                </Pressable>
              </View>

              <NeonInput
                label={method === 'username' ? 'Recipient Username' : 'W3OD Account Number'}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={method === 'username' ? 'cyber_agent' : '1234567890'}
                leftIcon={
                  method === 'username' ? (
                    <AtSign color={Palette.textTertiary} size={18} />
                  ) : (
                    <Hash color={Palette.textTertiary} size={18} />
                  )
                }
                tone="cyan"
                autoCapitalize="none"
                keyboardType={method === 'account' ? 'number-pad' : 'default'}
              />

              {lookupBusy && (
                <View style={styles.lookupRow}>
                  <ActivityIndicator color={Palette.neonCyan} size="small" />
                  <NeonText variant="body" tone="muted" style={styles.lookupText}>
                    Searching member directory...
                  </NeonText>
                </View>
              )}

              {recipientValid && !lookupBusy && (
                <View style={styles.recipientCard}>
                  <Avatar
                    uri={recipient.avatar_url}
                    displayName={recipient.display_name ?? recipient.username}
                    size="md"
                  />
                  <View style={styles.recipientMeta}>
                    <View style={styles.recipientNameRow}>
                      <NeonText variant="heading" weight="semiBold" tone="cyan">
                        {recipient.display_name ?? recipient.username}
                      </NeonText>
                      {recipient.email_verified && (
                        <ShieldCheck color={Palette.neonLime} size={15} />
                      )}
                    </View>
                    {recipient.username && (
                      <NeonText variant="body" weight="semiBold" tone="magenta">
                        @{recipient.username}
                      </NeonText>
                    )}
                  </View>
                  <View style={styles.recipientCheck}>
                    <Check color={Palette.neonLime} size={18} strokeWidth={3} />
                  </View>
                </View>
              )}

              {lookupError && !lookupBusy && !recipientValid && (
                <View style={styles.errorBox}>
                  <NeonText variant="body" weight="medium" tone="rose">
                    {lookupError}
                  </NeonText>
                </View>
              )}

              <View style={styles.infoRow}>
                <Info color={Palette.textTertiary} size={13} />
                <NeonText variant="body" tone="muted" style={styles.infoText}>
                  Recipients must be verified members of W3OD Gateway.
                </NeonText>
              </View>

              <NeonButton
                variant="cyan"
                fullWidth
                disabled={!recipientValid}
                onPress={handleContinueToAmount}
                rightIcon={<Check color="#03121A" size={16} />}
                style={styles.actionBtn}
              >
                Continue
              </NeonButton>
            </GlassCard>
          )}

          {/* ─── Stage: Amount ─── */}
          {stage === 'amount' && (
            <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.stageTitle}>
                ENTER AMOUNT
              </NeonText>

              {recipientValid && (
                <View style={styles.recipientSummary}>
                  <Avatar
                    uri={recipient.avatar_url}
                    displayName={recipient.display_name ?? recipient.username}
                    size="sm"
                  />
                  <NeonText variant="body" weight="semiBold" tone="cyan">
                    To {recipient.display_name ?? '@' + recipient.username}
                  </NeonText>
                </View>
              )}

              <NeonInput
                label="Amount (₦)"
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
                placeholder="100"
                leftIcon={<Hash color={Palette.textTertiary} size={18} />}
                tone="cyan"
                keyboardType="numeric"
                error={amountError}
              />

              <NeonInput
                label="Description (optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="What's this for?"
                tone="cyan"
                style={styles.field}
              />

              <View style={styles.limitsInfo}>
                <NeonText variant="body" tone="muted" style={styles.limitsInfoText}>
                  Min ₦{limits.minTransfer} · Max ₦{limits.maxDailyTransfer}/day · No fees
                </NeonText>
              </View>

              <NeonButton
                variant="cyan"
                fullWidth
                disabled={!amount || parseFloat(amount) < limits.minTransfer}
                onPress={handleContinueToReview}
                style={styles.actionBtn}
              >
                Review Transfer
              </NeonButton>
            </GlassCard>
          )}

          {/* ─── Stage: Review ─── */}
          {stage === 'review' && (
            <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.stageTitle}>
                REVIEW TRANSFER
              </NeonText>

              <ReviewRow label="Recipient" value={recipient?.display_name ?? recipient?.username ?? ''} />
              <ReviewRow label="Username" value={recipient?.username ? '@' + recipient.username : '—'} />
              <Divider tone="white" />
              <ReviewRow label="Amount" value={formatW3od(parseFloat(amount))} highlight />
              <ReviewRow label="Fee" value="₦0.00" />
              <Divider tone="white" />
              {description.trim() && <ReviewRow label="Description" value={description.trim()} />}
              <ReviewRow label="From" value={profile?.username ? '@' + profile.username : 'Your wallet'} />

              {transferError && (
                <View style={styles.errorBox}>
                  <NeonText variant="body" weight="medium" tone="rose">
                    {transferError}
                  </NeonText>
                </View>
              )}

              <View style={styles.infoRow}>
                <ShieldCheck color={Palette.neonCyan} size={14} />
                <NeonText variant="body" tone="muted" style={styles.infoText}>
                  You'll confirm with your 4-digit transaction PIN.
                </NeonText>
              </View>

              <NeonButton
                variant="cyan"
                fullWidth
                loading={transferring}
                onPress={() => setPinModal(true)}
                leftIcon={<Send color="#03121A" size={16} />}
                style={styles.actionBtn}
              >
                Confirm & Send
              </NeonButton>
            </GlassCard>
          )}

          {/* ─── Stage: Success ─── */}
          {stage === 'success' && result?.success && (
            <GlassCard tone="lime" gradientBorder padding={Spacing['6']} style={styles.card}>
              <View style={styles.successIconWrap}>
                <CheckCircle2 color={Palette.neonLime} size={48} strokeWidth={2.5} />
              </View>
              <NeonText variant="display" weight="bold" tone="lime" style={styles.successTitle}>
                TRANSFER SENT
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.successSub}>
                {formatW3od(result.amount ?? 0)} sent to {result.recipient ?? 'recipient'}
              </NeonText>

              <View style={styles.receiptBox}>
                <ReviewRow label="Reference" value={result.reference ?? ''} />
                <ReviewRow label="Amount" value={formatW3od(result.amount ?? 0)} highlight />
                <ReviewRow label="Status" value="Completed" />
                <ReviewRow label="Date" value={new Date().toLocaleString('en-US')} />
              </View>

              <NeonButton variant="cyan" fullWidth onPress={() => router.replace('/(tabs)/wallet')} style={styles.actionBtn}>
                Done
              </NeonButton>
              <NeonButton variant="ghost" fullWidth onPress={resetAll}>
                Send Another
              </NeonButton>
            </GlassCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PinConfirmModal
        visible={pinModal}
        title="AUTHORIZE TRANSFER"
        subtitle={`Enter your PIN to send ${formatW3od(parseFloat(amount))}.`}
        onClose={() => setPinModal(false)}
        onConfirm={handleConfirmTransfer}
      />
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <View style={styles.stepDotWrap}>
      <View
        style={[
          styles.stepDot,
          {
            backgroundColor: done ? Palette.neonCyan : active ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.05)',
            borderColor: done || active ? Palette.neonCyan : 'rgba(255,255,255,0.15)',
          },
        ]}
      >
        {done && <Check color={Palette.bg950} size={12} strokeWidth={3} />}
      </View>
      <NeonText variant="body" tone={done || active ? 'cyan' : 'muted'} style={styles.stepLabel}>
        {label}
      </NeonText>
    </View>
  );
}

function StepLine({ done }: { done: boolean }) {
  return (
    <View
      style={[styles.stepLine, { backgroundColor: done ? Palette.neonCyan : 'rgba(255,255,255,0.1)' }]}
    />
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <NeonText variant="body" tone="muted" style={styles.reviewLabel}>
        {label}
      </NeonText>
      <NeonText
        variant={highlight ? 'display' : 'body'}
        weight={highlight ? 'bold' : 'semiBold'}
        tone={highlight ? 'cyan' : 'cyan'}
        style={highlight ? styles.reviewValueHighlight : styles.reviewValue}
      >
        {value}
      </NeonText>
    </View>
  );
}

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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotWrap: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10,
  },
  stepLine: {
    width: 32,
    height: 2,
    marginHorizontal: 6,
    marginBottom: 14,
  },
  card: {
    gap: Spacing['4'],
  },
  stageTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['3'],
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  methodText: {
    fontSize: Typography.sizes.sm,
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  lookupText: {
    fontSize: Typography.sizes.xs,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    backgroundColor: 'rgba(0,255,156,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,156,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  recipientMeta: {
    flex: 1,
    gap: 2,
  },
  recipientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  recipientCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,255,156,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  infoText: {
    fontSize: Typography.sizes.xs,
  },
  actionBtn: {
    marginTop: Spacing['2'],
  },
  field: {
    marginTop: Spacing['2'],
  },
  limitsInfo: {
    alignItems: 'center',
  },
  limitsInfoText: {
    fontSize: Typography.sizes.xs,
  },
  recipientSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing['2'],
  },
  reviewLabel: {
    fontSize: Typography.sizes.sm,
  },
  reviewValue: {
    fontSize: Typography.sizes.sm,
  },
  reviewValueHighlight: {
    fontSize: Typography.sizes.lg,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(182,255,0,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(182,255,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  successTitle: {
    fontSize: Typography.sizes.xl,
    letterSpacing: Typography.letterSpacings.display,
    textAlign: 'center',
  },
  successSub: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  receiptBox: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['4'],
    gap: Spacing['1'],
  },
});
