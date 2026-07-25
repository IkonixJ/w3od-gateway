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
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  IdCard,
  Calendar,
  User,
  Lock,
  Info,
  RotateCw,
  ChevronRight,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Badge,
  Divider,
  Avatar,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  submitKyc,
  getMyKyc,
  getKycHistory,
  validateNin,
  validateFullName,
  validateDateOfBirth,
  kycStatusLabel,
  kycStatusTone,
  formatDate,
  formatDateTime,
} from '@/lib/kyc-service';
import { getMyWallet } from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { cardMaxWidth, screenPadding } from '@/design/responsive';
import type {
  KycSubmission,
  KycStatusHistoryEntry,
} from '@/types/kyc';
import type { Wallet } from '@/types/wallet';

export default function KycScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [kyc, setKyc] = useState<KycSubmission | null>(null);
  const [history, setHistory] = useState<KycStatusHistoryEntry[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const [nin, setNin] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const [k, w] = await Promise.all([getMyKyc(), getMyWallet()]);
    setKyc(k);
    setWallet(w);
    if (k) {
      const h = await getKycHistory(k.id);
      setHistory(h);
      if (k.status === 'rejected') {
        setNin(k.nin);
        setFullName(k.full_name);
        setDob(k.date_of_birth);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    const ninCheck = validateNin(nin);
    if (!ninCheck.valid) {
      setError(ninCheck.error!);
      return;
    }
    const nameCheck = validateFullName(fullName);
    if (!nameCheck.valid) {
      setError(nameCheck.error!);
      return;
    }
    const dobCheck = validateDateOfBirth(dob);
    if (!dobCheck.valid) {
      setError(dobCheck.error!);
      return;
    }

    setSubmitting(true);
    const result = await submitKyc(nin, fullName, dob);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'Submission failed.');
      return;
    }

    setSuccess(true);
    await loadData();
    await refreshProfile();
    setTimeout(() => setSuccess(false), 3000);
  }, [nin, fullName, dob, loadData, refreshProfile]);

  const status = kyc?.status ?? 'none';
  const profileKycStatus = profile?.kyc_status ?? 'none';
  const isApproved = profileKycStatus === 'verified';
  const isPending = status === 'pending' || profileKycStatus === 'pending';
  const isRejected = status === 'rejected' || profileKycStatus === 'rejected';
  const showForm = status === 'none' || status === 'rejected';

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
        </View>
      </ScreenShell>
    );
  }

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
              KYC VERIFY
            </NeonText>
            <View style={{ width: 22 }} />
          </View>

          {/* Status banner */}
          <GlassCard
            tone={kycStatusTone(profileKycStatus)}
            gradientBorder
            padding={Spacing['5']}
            style={styles.statusBanner}
          >
            <View style={styles.statusIconWrap}>
              {isApproved ? (
                <CheckCircle2 color={Palette.neonLime} size={28} strokeWidth={2.5} />
              ) : isPending ? (
                <Clock color={Palette.neonAmber} size={28} strokeWidth={2.5} />
              ) : isRejected ? (
                <XCircle color={Palette.neonRose} size={28} strokeWidth={2.5} />
              ) : (
                <ShieldAlert color={Palette.neonCyan} size={28} strokeWidth={2.5} />
              )}
            </View>
            <View style={styles.statusMeta}>
              <NeonText variant="heading" weight="semiBold" tone={kycStatusTone(profileKycStatus)}>
                {kycStatusLabel(profileKycStatus).toUpperCase()}
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.statusSub}>
                {isApproved
                  ? 'Your identity is verified. All features are unlocked.'
                  : isPending
                  ? 'Your submission is under review. This usually takes 24–48 hours.'
                  : isRejected
                  ? 'Your submission was rejected. Please correct and resubmit.'
                  : 'Complete identity verification to unlock wallet transactions.'}
              </NeonText>
            </View>
          </GlassCard>

          {/* Rejection reason */}
          {isRejected && kyc?.rejection_reason && (
            <View style={styles.rejectionBox}>
              <ShieldAlert color={Palette.neonRose} size={16} />
              <View style={styles.rejectionTextWrap}>
                <NeonText variant="body" weight="semiBold" tone="rose" style={styles.rejectionTitle}>
                  REJECTION REASON
                </NeonText>
                <NeonText variant="body" tone="muted" style={styles.rejectionText}>
                  {kyc.rejection_reason}
                </NeonText>
              </View>
            </View>
          )}

          {/* Wallet lock notice */}
          {!isApproved && wallet && (
            <View style={styles.lockNotice}>
              <Lock color={Palette.neonAmber} size={14} />
              <NeonText variant="body" tone="muted" style={styles.lockText}>
                Wallet transfers and redemptions are locked until KYC is approved.
              </NeonText>
            </View>
          )}

          {/* Success toast */}
          {success && (
            <View style={styles.successToast}>
              <CheckCircle2 color={Palette.neonLime} size={18} strokeWidth={2.5} />
              <NeonText variant="body" weight="semiBold" tone="lime">
                KYC submitted successfully!
              </NeonText>
            </View>
          )}

          {/* Submission form */}
          {showForm ? (
            <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.formCard}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.formTitle}>
                {isRejected ? 'RESUBMIT KYC' : 'IDENTITY VERIFICATION'}
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.formSub}>
                Enter your National Identification Number and legal details. This
                information is encrypted and only visible to admin reviewers.
              </NeonText>

              <NeonInput
                label="NIN (11 digits)"
                value={nin}
                onChangeText={(v) => setNin(v.replace(/\D/g, '').slice(0, 11))}
                placeholder="12345678901"
                leftIcon={<IdCard color={Palette.textTertiary} size={18} />}
                tone="cyan"
                keyboardType="numeric"
                style={styles.field}
              />

              <NeonInput
                label="Full Legal Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jane Doe"
                leftIcon={<User color={Palette.textTertiary} size={18} />}
                tone="cyan"
                autoCapitalize="words"
                style={styles.field}
              />

              <NeonInput
                label="Date of Birth (YYYY-MM-DD)"
                value={dob}
                onChangeText={setDob}
                placeholder="1995-06-15"
                leftIcon={<Calendar color={Palette.textTertiary} size={18} />}
                tone="cyan"
                style={styles.field}
              />

              <View style={styles.rulesBox}>
                <Info color={Palette.textTertiary} size={13} />
                <NeonText variant="body" tone="muted" style={styles.rulesText}>
                  You must be 18+. Your NIN must match your legal name. Submitting
                  false information may result in account suspension.
                </NeonText>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <NeonText variant="body" weight="medium" tone="rose">
                    {error}
                  </NeonText>
                </View>
              )}

              <NeonButton
                variant="cyan"
                fullWidth
                loading={submitting}
                disabled={nin.length !== 11 || !fullName.trim() || !dob.trim()}
                onPress={handleSubmit}
                leftIcon={<ShieldCheck color="#03121A" size={16} />}
                style={styles.submitBtn}
              >
                {isRejected ? 'Resubmit for Review' : 'Submit for Verification'}
              </NeonButton>
            </GlassCard>
          ) : isApproved ? (
            <GlassCard tone="lime" gradientBorder padding={Spacing['6']} style={styles.approvedCard}>
              <View style={styles.approvedIconWrap}>
                <CheckCircle2 color={Palette.neonLime} size={40} strokeWidth={2.5} />
              </View>
              <NeonText variant="display" weight="bold" tone="lime" style={styles.approvedTitle}>
                VERIFIED MEMBER
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.approvedSub}>
                Your identity has been verified. You can now send W3OD, submit
                redemptions, and access all platform features.
              </NeonText>

              {kyc && (
                <View style={styles.approvedDetails}>
                  <DetailRow label="Legal Name" value={kyc.full_name} />
                  <Divider tone="white" />
                  <DetailRow label="Reviewed On" value={formatDateTime(kyc.reviewed_at)} />
                </View>
              )}
            </GlassCard>
          ) : isPending ? (
            <GlassCard tone="amber" gradientBorder padding={Spacing['6']} style={styles.pendingCard}>
              <View style={styles.pendingIconWrap}>
                <Clock color={Palette.neonAmber} size={40} strokeWidth={2.5} />
              </View>
              <NeonText variant="display" weight="bold" tone="amber" style={styles.pendingTitle}>
                UNDER REVIEW
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.pendingSub}>
                Your KYC submission is being reviewed by our admin team. You'll
                receive a notification once a decision is made.
              </NeonText>

              {kyc && (
                <View style={styles.pendingDetails}>
                  <DetailRow label="Submitted" value={formatDate(kyc.submitted_at)} />
                  <Divider tone="white" />
                  <DetailRow label="Reference" value={kyc.id.slice(0, 8).toUpperCase()} />
                </View>
              )}
            </GlassCard>
          ) : null}

          {/* Status history */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.historyTitle}>
                STATUS HISTORY
              </NeonText>
              <GlassCard tone="cyan" padding={Spacing['4']} style={styles.historyCard}>
                {history.map((h, idx) => (
                  <View key={h.id}>
                    {idx > 0 && <Divider tone="white" />}
                    <View style={styles.historyRow}>
                      <View
                        style={[
                          styles.historyDot,
                          {
                            backgroundColor:
                              h.to_status === 'approved'
                                ? 'rgba(0,255,156,0.15)'
                                : h.to_status === 'rejected'
                                ? 'rgba(255,45,111,0.15)'
                                : 'rgba(255,184,0,0.15)',
                            borderColor:
                              h.to_status === 'approved'
                                ? Palette.neonLime
                                : h.to_status === 'rejected'
                                ? Palette.neonRose
                                : Palette.neonAmber,
                          },
                        ]}
                      >
                        {h.to_status === 'approved' ? (
                          <CheckCircle2 color={Palette.neonLime} size={12} strokeWidth={3} />
                        ) : h.to_status === 'rejected' ? (
                          <XCircle color={Palette.neonRose} size={12} strokeWidth={3} />
                        ) : (
                          <Clock color={Palette.neonAmber} size={12} strokeWidth={3} />
                        )}
                      </View>
                      <View style={styles.historyMeta}>
                        <NeonText variant="body" weight="semiBold" tone="cyan">
                          {kycStatusLabel(h.from_status)} → {kycStatusLabel(h.to_status)}
                        </NeonText>
                        <NeonText variant="body" tone="muted" style={styles.historyDate}>
                          {formatDateTime(h.changed_at)}
                        </NeonText>
                        {h.reason && (
                          <NeonText variant="body" tone="muted" style={styles.historyReason}>
                            {h.reason}
                          </NeonText>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </GlassCard>
            </View>
          )}

          <View style={styles.footerSpace} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <NeonText variant="body" tone="muted" style={styles.detailLabel}>
        {label}
      </NeonText>
      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.detailValue}>
        {value}
      </NeonText>
    </View>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  statusIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMeta: {
    flex: 1,
    gap: 4,
  },
  statusSub: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3'],
    backgroundColor: 'rgba(255,45,111,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['4'],
  },
  rejectionTextWrap: {
    flex: 1,
    gap: 2,
  },
  rejectionTitle: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  rejectionText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  lockText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,255,156,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,156,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  formCard: {
    gap: Spacing['3'],
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
    marginTop: Spacing['1'],
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
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
  submitBtn: {
    marginTop: Spacing['1'],
  },
  approvedCard: {
    alignItems: 'center',
    gap: Spacing['3'],
  },
  approvedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,255,156,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,156,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedTitle: {
    fontSize: Typography.sizes.xl,
    letterSpacing: Typography.letterSpacings.display,
  },
  approvedSub: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  approvedDetails: {
    width: '100%',
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['4'],
    gap: Spacing['1'],
  },
  pendingCard: {
    alignItems: 'center',
    gap: Spacing['3'],
  },
  pendingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,184,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: Typography.sizes.xl,
    letterSpacing: Typography.letterSpacings.display,
  },
  pendingSub: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingDetails: {
    width: '100%',
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['4'],
    gap: Spacing['1'],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing['2'],
  },
  detailLabel: {
    fontSize: Typography.sizes.sm,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
  },
  historySection: {
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  historyTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  historyCard: {
    gap: 0,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  historyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  historyMeta: {
    flex: 1,
    gap: 2,
  },
  historyDate: {
    fontSize: Typography.sizes.xs,
  },
  historyReason: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  footerSpace: {
    height: Spacing['4'],
  },
});
