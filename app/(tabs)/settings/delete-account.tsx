import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TriangleAlert as AlertTriangle, Lock, KeyRound, Mail, Check, X, Trash2, Shield, Clock } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, Badge, NeonButton, NeonInput, Divider } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  getDeletionStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
  sendEmailOtp,
  verifyEmailOtp,
  type DeletionStatus,
} from '@/lib/settings-service';
import { Palette, Spacing, Typography, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

type Step = 'warning' | 'password' | 'pin' | 'otp' | 'confirm' | 'done';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { profile, verifyTransactionPin, signOut } = useAuth();
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('warning');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification flags
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const loadStatus = useCallback(async () => {
    const s = await getDeletionStatus();
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleVerifyPassword = async () => {
    setError(null);
    if (!password) { setError('Enter your current password.'); return; }
    setBusy(true);
    const { supabase } = await import('@/lib/supabase');
    const { data: userData } = await supabase.auth.getUser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user?.email ?? '',
      password,
    });
    setBusy(false);
    if (signInError) { setError('Current password is incorrect.'); return; }
    setPasswordVerified(true);
    setStep('pin');
  };

  const handleVerifyPin = async () => {
    setError(null);
    if (pin.length !== 4) { setError('Enter your 4-digit PIN.'); return; }
    setBusy(true);
    const { valid, locked } = await verifyTransactionPin(pin);
    setBusy(false);
    if (locked) { setError('PIN is locked. Please reset it first.'); return; }
    if (!valid) { setError('Incorrect PIN.'); return; }
    setPinVerified(true);
    setStep('otp');
  };

  const handleSendOtp = async () => {
    setError(null);
    setBusy(true);
    const result = await sendEmailOtp(profile!.email);
    setBusy(false);
    if (result.error) { setError(result.error); return; }
    setOtpSent(true);
    if (result.devCode) setDevCode(result.devCode);
  };

  const handleVerifyOtp = async () => {
    setError(null);
    if (!otp) { setError('Enter the OTP code.'); return; }
    setBusy(true);
    const verified = await verifyEmailOtp(profile!.email, otp);
    setBusy(false);
    if (!verified) { setError('Invalid or expired OTP.'); return; }
    setOtpVerified(true);
    setStep('confirm');
  };

  const handleConfirmDeletion = async () => {
    setError(null);
    setBusy(true);
    const result = await requestAccountDeletion(passwordVerified, pinVerified, otpVerified);
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'Failed to schedule deletion.'); return; }
    setStep('done');
    await loadStatus();
  };

  const handleCancelDeletion = async () => {
    Alert.alert(
      'Cancel Deletion',
      'Your account will be restored and your W3OD balance will be unfrozen.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Deletion',
          onPress: async () => {
            setBusy(true);
            const result = await cancelAccountDeletion();
            setBusy(false);
            if (!result.success) { Alert.alert('Error', result.error ?? 'Failed to cancel deletion.'); return; }
            Alert.alert('Restored', 'Your account has been restored.');
            await loadStatus();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={Palette.neonRose} /></View>
      </ScreenShell>
    );
  }

  // If deletion is already scheduled, show the pending state
  if (status?.scheduled) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <ArrowLeft color={Palette.neonRose} size={22} />
            </Pressable>
            <NeonText variant="display" weight="bold" tone="rose" style={styles.title}>DELETION PENDING</NeonText>
            <View style={{ width: 22 }} />
          </View>

          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <View style={styles.pendingIconWrap}>
              <Clock color={Palette.neonAmber} size={36} />
            </View>
            <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.pendingTitle}>
              Account Deletion Scheduled
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.pendingSub}>
              Your account is scheduled for permanent deletion on{' '}
              {status.deletion_date ? new Date(status.deletion_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'soon'}.
            </NeonText>
            <View style={styles.daysBox}>
              <Text style={styles.daysValue}>{status.days_remaining ?? 0}</Text>
              <Text style={styles.daysLabel}>DAYS REMAINING</Text>
            </View>
            <NeonText variant="body" tone="muted" style={styles.pendingInfo}>
              During this period: Your login is disabled, W3OD Balance is frozen, and your username is reserved.
              You can cancel the deletion at any time before the deadline.
            </NeonText>
            <NeonButton variant="cyan" fullWidth loading={busy} onPress={handleCancelDeletion} leftIcon={<Check color="#03121A" size={16} />}>
              Cancel Deletion & Restore Account
            </NeonButton>
          </GlassCard>

          <View style={styles.footerSpace} />
        </ScrollView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonRose} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="rose" style={styles.title}>DELETE ACCOUNT</NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {(['warning', 'password', 'pin', 'otp', 'confirm'] as Step[]).map((s, idx) => {
            const stepOrder: Step[] = ['warning', 'password', 'pin', 'otp', 'confirm'];
            const currentIdx = step === 'done' ? stepOrder.length : stepOrder.indexOf(step);
            const stepIdx = stepOrder.indexOf(s);
            const isDone = stepIdx < currentIdx;
            const isCurrent = stepIdx === currentIdx;
            return (
              <View key={s} style={[styles.stepDot, isCurrent && styles.stepDotActive, isDone && styles.stepDotDone]}>
                {isDone ? <Check color={Palette.bg950} size={12} /> : <Text style={styles.stepNumber}>{idx + 1}</Text>}
              </View>
            );
          })}
        </View>

        {/* Warning Step */}
        {step === 'warning' && (
          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <View style={styles.warningIconWrap}>
              <AlertTriangle color={Palette.neonRose} size={36} />
            </View>
            <NeonText variant="heading" weight="semiBold" tone="rose" style={styles.warningTitle}>
              Permanently Delete Account
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.warningText}>
              This action is irreversible. After deletion:
            </NeonText>
            <View style={styles.warningList}>
              <WarningItem text="Your account status will be set to 'Pending Deletion'" />
              <WarningItem text="Login will be disabled immediately" />
              <WarningItem text="Your W3OD Balance will be frozen" />
              <WarningItem text="Your username will be reserved (not released)" />
              <WarningItem text="Your data will be kept for 30 days" />
              <WarningItem text="After 30 days, all personal data is permanently deleted" />
              <WarningItem text="Non-identifying audit logs may be retained" />
            </View>
            <View style={styles.warningNote}>
              <Shield color={Palette.neonAmber} size={16} />
              <NeonText variant="body" tone="amber" style={styles.warningNoteText}>
                You can cancel within 30 days. Admins can also restore your account if requested.
              </NeonText>
            </View>
            <NeonButton variant="danger" fullWidth onPress={() => setStep('password')} leftIcon={<Trash2 color="#fff" size={16} />}>
              I Understand, Continue
            </NeonButton>
          </GlassCard>
        )}

        {/* Password Step */}
        {step === 'password' && (
          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <StepHeader icon={<Lock color={Palette.neonRose} size={20} />} title="STEP 1: VERIFY PASSWORD" tone="rose" />
            <NeonText variant="body" tone="muted" style={styles.stepSub}>Enter your current account password to continue.</NeonText>
            <NeonInput label="Current Password" value={password} onChangeText={(v) => { setPassword(v); setError(null); }} placeholder="••••••••" leftIcon={<Lock color={Palette.textTertiary} size={18} />} tone="rose" secureTextEntry />
            {error && <ErrorBox message={error} />}
            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => router.back()}>Cancel</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="danger" fullWidth loading={busy} onPress={handleVerifyPassword} leftIcon={<Check color="#fff" size={16} />}>Verify Password</NeonButton>
              </View>
            </View>
          </GlassCard>
        )}

        {/* PIN Step */}
        {step === 'pin' && (
          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <StepHeader icon={<KeyRound color={Palette.neonRose} size={20} />} title="STEP 2: VERIFY PIN" tone="rose" />
            <NeonText variant="body" tone="muted" style={styles.stepSub}>Enter your 4-digit transaction PIN.</NeonText>
            <NeonInput label="Transaction PIN" value={pin} onChangeText={(v) => { setPin(v.replace(/\D/g, '').slice(0, 4)); setError(null); }} placeholder="••••" leftIcon={<KeyRound color={Palette.textTertiary} size={18} />} tone="rose" secureTextEntry keyboardType="numeric" />
            {error && <ErrorBox message={error} />}
            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setStep('password')}>Back</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="danger" fullWidth loading={busy} onPress={handleVerifyPin} leftIcon={<Check color="#fff" size={16} />}>Verify PIN</NeonButton>
              </View>
            </View>
          </GlassCard>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <StepHeader icon={<Mail color={Palette.neonRose} size={20} />} title="STEP 3: EMAIL OTP" tone="rose" />
            <NeonText variant="body" tone="muted" style={styles.stepSub}>
              An OTP has been sent to {profile?.email}. Enter it below to verify.
            </NeonText>
            {devCode && (
              <View style={styles.devCodeBox}>
                <NeonText variant="body" weight="medium" tone="amber">Dev OTP: {devCode}</NeonText>
              </View>
            )}
            {!otpSent ? (
              <NeonButton variant="danger" fullWidth loading={busy} onPress={handleSendOtp} leftIcon={<Mail color="#fff" size={16} />}>Send OTP</NeonButton>
            ) : (
              <>
                <NeonInput label="OTP Code" value={otp} onChangeText={(v) => { setOtp(v); setError(null); }} placeholder="6-digit code" leftIcon={<Mail color={Palette.textTertiary} size={18} />} tone="rose" keyboardType="numeric" />
                {error && <ErrorBox message={error} />}
                <View style={styles.modalActions}>
                  <NeonButton variant="ghost" onPress={() => setStep('pin')}>Back</NeonButton>
                  <View style={styles.flex1}>
                    <NeonButton variant="danger" fullWidth loading={busy} onPress={handleVerifyOtp} leftIcon={<Check color="#fff" size={16} />}>Verify OTP</NeonButton>
                  </View>
                </View>
              </>
            )}
          </GlassCard>
        )}

        {/* Confirm Step */}
        {step === 'confirm' && (
          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <StepHeader icon={<AlertTriangle color={Palette.neonRose} size={20} />} title="FINAL CONFIRMATION" tone="rose" />
            <View style={styles.verifyChecklist}>
              <VerifyCheck label="Password verified" done={passwordVerified} />
              <VerifyCheck label="Transaction PIN verified" done={pinVerified} />
              <VerifyCheck label="Email OTP verified" done={otpVerified} />
            </View>
            <NeonText variant="body" tone="muted" style={styles.confirmText}>
              All verifications passed. Click below to schedule your account deletion.
              You will have 30 days to cancel.
            </NeonText>
            {error && <ErrorBox message={error} />}
            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setStep('otp')}>Back</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="danger" fullWidth loading={busy} onPress={handleConfirmDeletion} leftIcon={<Trash2 color="#fff" size={16} />}>Delete My Account</NeonButton>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Done Step */}
        {step === 'done' && (
          <GlassCard tone="none" gradientBorder padding={Spacing['6']} style={styles.dangerCard}>
            <View style={styles.doneIconWrap}>
              <Check color={Palette.neonAmber} size={36} />
            </View>
            <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.doneTitle}>
              Deletion Scheduled
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.doneSub}>
              Your account is now scheduled for deletion in 30 days. Your login has been disabled and your W3OD Balance has been frozen.
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.doneSub}>
              You can cancel the deletion by signing back in within the 30-day window, or contact an admin to restore your account.
            </NeonText>
            <NeonButton variant="cyan" fullWidth onPress={() => { signOut(); }} leftIcon={<Check color="#03121A" size={16} />}>
              Sign Out Now
            </NeonButton>
          </GlassCard>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function WarningItem({ text }: { text: string }) {
  return (
    <View style={styles.warningItem}>
      <X color={Palette.neonRose} size={14} />
      <NeonText variant="body" tone="muted" style={styles.warningItemText}>{text}</NeonText>
    </View>
  );
}

function StepHeader({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: 'rose' }) {
  return (
    <View style={styles.stepHeader}>
      {icon}
      <NeonText variant="heading" weight="semiBold" tone={tone}>{title}</NeonText>
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <NeonText variant="body" weight="medium" tone="rose">{message}</NeonText>
    </View>
  );
}

function VerifyCheck({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.verifyCheckRow}>
      <View style={[styles.verifyCheckIcon, done ? styles.verifyCheckDone : styles.verifyCheckPending]}>
        {done ? <Check color={Palette.bg950} size={12} /> : <Text style={styles.verifyPending}>?</Text>}
      </View>
      <NeonText variant="body" weight="semiBold" tone={done ? 'success' : 'muted'}>{label}</NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  sectionCard: { gap: Spacing['4'], width: '100%' },
  dangerCard: { gap: Spacing['4'], width: '100%', borderWidth: 1, borderColor: 'rgba(255,45,111,0.2)' },
  // Steps
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing['3'] },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Palette.glass300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { borderColor: Palette.neonRose, backgroundColor: 'rgba(255,45,111,0.15)' },
  stepDotDone: { backgroundColor: Palette.neonLime, borderColor: Palette.neonLime },
  stepNumber: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.textTertiary },
  // Warning
  warningIconWrap: { alignItems: 'center', paddingVertical: Spacing['2'] },
  warningTitle: { fontSize: Typography.sizes.lg, textAlign: 'center' },
  warningText: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  warningList: { gap: Spacing['2'] },
  warningItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  warningItemText: { fontSize: Typography.sizes.sm, flex: 1, lineHeight: 18 },
  warningNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], padding: Spacing['3'], backgroundColor: 'rgba(255,184,0,0.08)', borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  warningNoteText: { fontSize: Typography.sizes.xs, flex: 1, lineHeight: 16 },
  // Step content
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  stepSub: { fontSize: Typography.sizes.sm, lineHeight: 18 },
  // Pending state
  pendingIconWrap: { alignItems: 'center', paddingVertical: Spacing['2'] },
  pendingTitle: { fontSize: Typography.sizes.lg, textAlign: 'center' },
  pendingSub: { fontSize: Typography.sizes.sm, lineHeight: 20, textAlign: 'center' },
  daysBox: { alignItems: 'center', paddingVertical: Spacing['4'] },
  daysValue: { fontFamily: Typography.families.display, fontSize: Typography.sizes['4xl'], color: Palette.neonAmber },
  daysLabel: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.textTertiary, letterSpacing: Typography.letterSpacings.wide },
  pendingInfo: { fontSize: Typography.sizes.xs, lineHeight: 18 },
  // Verify checklist
  verifyChecklist: { gap: Spacing['2'] },
  verifyCheckRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  verifyCheckIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verifyCheckDone: { backgroundColor: Palette.neonLime },
  verifyCheckPending: { backgroundColor: Palette.glass300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  verifyPending: { fontFamily: Typography.families.headingBold, fontSize: 12, color: Palette.textTertiary },
  confirmText: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  // Done
  doneIconWrap: { alignItems: 'center', paddingVertical: Spacing['2'] },
  doneTitle: { fontSize: Typography.sizes.lg, textAlign: 'center' },
  doneSub: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  // Shared
  devCodeBox: { padding: Spacing['3'], backgroundColor: 'rgba(255,184,0,0.1)', borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', alignItems: 'center' },
  errorBox: { backgroundColor: 'rgba(255,45,111,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.3)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
  flex1: { flex: 1 },
  footerSpace: { height: Spacing['8'] },
});
