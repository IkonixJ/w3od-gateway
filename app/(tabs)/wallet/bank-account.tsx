import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Banknote, User, Hash, Check, Trash2, ShieldCheck, Building2, CreditCard as Edit3 } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Divider,
} from '@/components/ui';
import {
  getBankAccount,
  saveBankAccount,
  deleteBankAccount,
  validateAccountNumber,
} from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { cardMaxWidth, screenPadding } from '@/design/responsive';
import type { BankAccount } from '@/types/wallet';

export default function BankAccountScreen() {
  const router = useRouter();

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadAccount = useCallback(async () => {
    const acc = await getBankAccount();
    setAccount(acc);
    setLoading(false);
    if (acc) {
      setAccountName(acc.account_name);
      setAccountNumber(acc.account_number);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleSave = async () => {
    setError(null);
    const cleanName = accountName.trim();
    const cleanNum = accountNumber.trim();

    if (!cleanName) {
      setError('Account name is required.');
      return;
    }
    if (!validateAccountNumber(cleanNum)) {
      setError('Account number must be exactly 10 digits.');
      return;
    }

    setSaving(true);
    const { error: saveError } = await saveBankAccount(cleanName, cleanNum);
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
    loadAccount();
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Payout Account',
      'Are you sure you want to remove your saved Moniepoint account? You will need to add it again before submitting redemptions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteBankAccount();
            setAccount(null);
            setAccountName('');
            setAccountNumber('');
            setEditing(true);
          },
        },
      ]
    );
  };

  const startEditing = () => {
    setEditing(true);
    if (account) {
      setAccountName(account.account_name);
      setAccountNumber(account.account_number);
    }
  };

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
        </View>
      </ScreenShell>
    );
  }

  const showForm = editing || !account;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <ArrowLeft color={Palette.neonCyan} size={22} />
            </Pressable>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
              PAYOUT ACCOUNT
            </NeonText>
            <View style={{ width: 22 }} />
          </View>

          {/* Saved success banner */}
          {saved && (
            <View style={styles.successBanner}>
              <Check color={Palette.neonLime} size={18} strokeWidth={3} />
              <NeonText variant="body" weight="semiBold" tone="lime">
                Account saved successfully
              </NeonText>
            </View>
          )}

          {/* Bank info card */}
          <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.bankInfoCard}>
            <View style={styles.bankInfoHeader}>
              <View style={styles.bankLogoWrap}>
                <Building2 color={Palette.neonCyan} size={24} />
              </View>
              <View style={styles.bankInfoMeta}>
                <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.bankName}>
                  Moniepoint
                </NeonText>
                <NeonText variant="body" tone="muted" style={styles.bankSub}>
                  Supported payout bank
                </NeonText>
              </View>
              <ShieldCheck color={Palette.neonLime} size={18} />
            </View>
            <View style={styles.infoBox}>
              <NeonText variant="body" tone="muted" style={styles.infoText}>
                W3OD Gateway supports Moniepoint for redemption payouts. You can save one
                payout account. Funds are sent to this account on processing days (14th & 30th).
              </NeonText>
            </View>
          </GlassCard>

          {/* Saved account display OR edit form */}
          {account && !editing ? (
            <GlassCard tone="lime" gradientBorder padding={Spacing['6']} style={styles.savedCard}>
              <View style={styles.savedHeader}>
                <Banknote color={Palette.neonLime} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.savedTitle}>
                  SAVED ACCOUNT
                </NeonText>
              </View>

              <View style={styles.savedDetail}>
                <View style={styles.savedIconWrap}>
                  <User color={Palette.neonCyan} size={16} />
                </View>
                <View style={styles.savedMeta}>
                  <NeonText variant="body" tone="muted" style={styles.savedLabel}>
                    ACCOUNT NAME
                  </NeonText>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.savedValue}>
                    {account.account_name}
                  </NeonText>
                </View>
              </View>

              <Divider tone="white" />

              <View style={styles.savedDetail}>
                <View style={styles.savedIconWrap}>
                  <Hash color={Palette.neonCyan} size={16} />
                </View>
                <View style={styles.savedMeta}>
                  <NeonText variant="body" tone="muted" style={styles.savedLabel}>
                    ACCOUNT NUMBER
                  </NeonText>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.savedValue}>
                    {account.account_number}
                  </NeonText>
                </View>
              </View>

              <Divider tone="white" />

              <View style={styles.savedDetail}>
                <View style={styles.savedIconWrap}>
                  <Building2 color={Palette.neonCyan} size={16} />
                </View>
                <View style={styles.savedMeta}>
                  <NeonText variant="body" tone="muted" style={styles.savedLabel}>
                    BANK
                  </NeonText>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.savedValue}>
                    {account.bank_name}
                  </NeonText>
                </View>
              </View>

              <View style={styles.savedActions}>
                <NeonButton
                  variant="outline"
                  leftIcon={<Edit3 color={Palette.neonCyan} size={16} />}
                  onPress={startEditing}
                  style={styles.flex1}
                >
                  Edit
                </NeonButton>
                <NeonButton
                  variant="ghost"
                  leftIcon={<Trash2 color={Palette.neonRose} size={16} />}
                  onPress={handleDelete}
                  style={styles.flex1}
                >
                  Remove
                </NeonButton>
              </View>
            </GlassCard>
          ) : (
            <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.formCard}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.formTitle}>
                {account ? 'EDIT PAYOUT ACCOUNT' : 'ADD PAYOUT ACCOUNT'}
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.formSub}>
                Enter your Moniepoint account details. This is where your W3OD redemptions will be paid.
              </NeonText>

              <NeonInput
                label="Account Name"
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Jane Doe"
                leftIcon={<User color={Palette.textTertiary} size={18} />}
                tone="cyan"
                autoCapitalize="words"
              />

              <NeonInput
                label="Account Number (10 digits)"
                value={accountNumber}
                onChangeText={(v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="1234567890"
                leftIcon={<Hash color={Palette.textTertiary} size={18} />}
                tone="cyan"
                keyboardType="numeric"
                error={error}
                style={styles.field}
              />

              <View style={styles.validationBox}>
                <View style={styles.validationRow}>
                  <View
                    style={[
                      styles.validationDot,
                      { backgroundColor: accountName.trim().length > 0 ? Palette.neonLime : 'rgba(255,255,255,0.1)' },
                    ]}
                  >
                    {accountName.trim().length > 0 && <Check color={Palette.bg950} size={10} strokeWidth={3} />}
                  </View>
                  <NeonText variant="body" tone={accountName.trim().length > 0 ? 'lime' : 'muted'} style={styles.validationText}>
                    Account name entered
                  </NeonText>
                </View>
                <View style={styles.validationRow}>
                  <View
                    style={[
                      styles.validationDot,
                      { backgroundColor: validateAccountNumber(accountNumber) ? Palette.neonLime : 'rgba(255,255,255,0.1)' },
                    ]}
                  >
                    {validateAccountNumber(accountNumber) && <Check color={Palette.bg950} size={10} strokeWidth={3} />}
                  </View>
                  <NeonText variant="body" tone={validateAccountNumber(accountNumber) ? 'lime' : 'muted'} style={styles.validationText}>
                    10-digit account number
                  </NeonText>
                </View>
              </View>

              <View style={styles.formActions}>
                {account && (
                  <NeonButton variant="ghost" onPress={() => setEditing(false)}>
                    Cancel
                  </NeonButton>
                )}
                <View style={styles.flex1}>
                  <NeonButton
                    variant="cyan"
                    fullWidth
                    loading={saving}
                    disabled={!accountName.trim() || !validateAccountNumber(accountNumber)}
                    onPress={handleSave}
                    leftIcon={<Check color="#03121A" size={16} />}
                  >
                    {account ? 'Update Account' : 'Save Account'}
                  </NeonButton>
                </View>
              </View>
            </GlassCard>
          )}

          <View style={styles.securityNote}>
            <ShieldCheck color={Palette.textTertiary} size={14} />
            <NeonText variant="body" tone="muted" style={styles.securityText}>
              Your account details are encrypted and only used for redemption payouts.
              Only you can view or modify your payout account.
            </NeonText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['4'],
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,255,156,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,156,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  bankInfoCard: {
    gap: Spacing['4'],
  },
  bankInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  bankLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankInfoMeta: {
    flex: 1,
    gap: 2,
  },
  bankName: {
    fontSize: Typography.sizes.base,
  },
  bankSub: {
    fontSize: Typography.sizes.xs,
  },
  infoBox: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  infoText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  savedCard: {
    gap: Spacing['3'],
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  savedTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  savedDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['2'],
  },
  savedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0,240,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedMeta: {
    flex: 1,
    gap: 2,
  },
  savedLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  savedValue: {
    fontSize: Typography.sizes.base,
  },
  savedActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
  formCard: {
    gap: Spacing['4'],
  },
  formTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  formSub: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  field: {
    marginTop: Spacing['2'],
  },
  validationBox: {
    gap: Spacing['2'],
    marginTop: Spacing['1'],
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  validationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationText: {
    fontSize: Typography.sizes.xs,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2'],
  },
  securityText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
});
