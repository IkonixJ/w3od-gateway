import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  IdCard,
  Calendar,
  User,
  Mail,
  Check,
  X,
  ChevronRight,
  FileText,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Badge,
  Avatar,
  Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  getPendingKycSubmissions,
  reviewKyc,
  kycStatusLabel,
  kycStatusTone,
  formatDate,
  formatDateTime,
} from '@/lib/kyc-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, cardMaxWidth, screenPadding } from '@/design/responsive';
import type { PendingKycSubmission } from '@/types/kyc';

export default function AdminKycScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminKycContent />
    </RequireRole>
  );
}

function AdminKycContent() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<PendingKycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PendingKycSubmission | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getPendingKycSubmissions();
    setSubmissions(data);
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

  const openReview = (sub: PendingKycSubmission, dec: 'approved' | 'rejected') => {
    setSelected(sub);
    setDecision(dec);
    setReason(sub.rejection_reason ?? '');
    setReviewError(null);
    setReviewModal(true);
  };

  const handleReview = async () => {
    if (!selected) return;
    setReviewing(true);
    setReviewError(null);
    const result = await reviewKyc(selected.id, decision, reason);
    setReviewing(false);
    if (!result.success) {
      setReviewError(result.error ?? 'Review failed.');
      return;
    }
    setReviewSuccess(true);
    setReviewModal(false);
    setTimeout(() => setReviewSuccess(false), 2500);
    loadData();
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const reviewedCount = submissions.filter((s) => s.status !== 'pending').length;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.neonAmber}
            colors={[Palette.neonAmber]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonAmber} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
            KYC REVIEW
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="amber" style={styles.statValue}>
              {pendingCount}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              PENDING
            </NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.statValue}>
              {reviewedCount}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              REVIEWED
            </NeonText>
          </View>
        </View>

        {/* Success toast */}
        {reviewSuccess && (
          <View style={styles.successToast}>
            <CheckCircle2 color={Palette.neonLime} size={18} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone="lime">
              KYC review submitted
            </NeonText>
          </View>
        )}

        {/* Submissions list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonAmber} />
          </View>
        ) : submissions.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['6']} style={styles.emptyCard}>
            <ShieldCheck color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No KYC submissions
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Member KYC submissions will appear here for review.
            </NeonText>
          </GlassCard>
        ) : (
          submissions.map((sub) => (
            <GlassCard
              key={sub.id}
              tone={kycStatusTone(sub.status)}
              gradientBorder
              padding={Spacing['5']}
              style={styles.subCard}
            >
              {/* Header row */}
              <View style={styles.subHeader}>
                <Avatar
                  uri={sub.avatar_url}
                  displayName={sub.display_name ?? sub.username}
                  size="md"
                />
                <View style={styles.subMeta}>
                  <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.subName}>
                    {sub.display_name ?? sub.username ?? 'Member'}
                  </NeonText>
                  {sub.username && (
                    <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.subUsername}>
                      @{sub.username}
                    </NeonText>
                  )}
                  <NeonText variant="body" tone="muted" style={styles.subEmail}>
                    {sub.email}
                  </NeonText>
                </View>
                <Badge tone={kycStatusTone(sub.status)}>
                  {kycStatusLabel(sub.status).toUpperCase()}
                </Badge>
              </View>

              <Divider tone="white" />

              {/* KYC details */}
              <View style={styles.subDetails}>
                <DetailRow
                  icon={<IdCard color={Palette.neonCyan} size={14} />}
                  label="NIN"
                  value={sub.nin}
                />
                <DetailRow
                  icon={<User color={Palette.neonCyan} size={14} />}
                  label="Legal Name"
                  value={sub.full_name}
                />
                <DetailRow
                  icon={<Calendar color={Palette.neonCyan} size={14} />}
                  label="Date of Birth"
                  value={formatDate(sub.date_of_birth)}
                />
                <DetailRow
                  icon={<Clock color={Palette.neonCyan} size={14} />}
                  label="Submitted"
                  value={formatDateTime(sub.submitted_at)}
                />
                {sub.reviewed_at && (
                  <DetailRow
                    icon={<ShieldCheck color={Palette.neonCyan} size={14} />}
                    label="Reviewed"
                    value={formatDateTime(sub.reviewed_at)}
                  />
                )}
              </View>

              {/* Rejection reason (if rejected) */}
              {sub.rejection_reason && (
                <View style={styles.reasonBox}>
                  <ShieldAlert color={Palette.neonRose} size={14} />
                  <NeonText variant="body" tone="muted" style={styles.reasonText}>
                    {sub.rejection_reason}
                  </NeonText>
                </View>
              )}

              {/* Actions */}
              {sub.status === 'pending' && (
                <View style={styles.subActions}>
                  <NeonButton
                    variant="danger"
                    leftIcon={<X color="#FFFFFF" size={16} />}
                    onPress={() => openReview(sub, 'rejected')}
                    style={styles.flex1}
                  >
                    Reject
                  </NeonButton>
                  <View style={styles.flex1}>
                    <NeonButton
                      variant="success"
                      leftIcon={<Check color="#021810" size={16} />}
                      onPress={() => openReview(sub, 'approved')}
                      fullWidth
                    >
                      Approve
                    </NeonButton>
                  </View>
                </View>
              )}
            </GlassCard>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Review modal */}
      <Modal visible={reviewModal} transparent animationType="fade" onRequestClose={() => setReviewModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />
          <GlassCard
            tone={decision === 'approved' ? 'lime' : 'rose'}
            gradientBorder
            padding={Spacing['6']}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.modalIconWrap,
                    {
                      backgroundColor:
                        decision === 'approved' ? 'rgba(0,255,156,0.1)' : 'rgba(255,45,111,0.1)',
                      borderColor:
                        decision === 'approved' ? Palette.neonLime : Palette.neonRose,
                    },
                  ]}
                >
                  {decision === 'approved' ? (
                    <CheckCircle2 color={Palette.neonLime} size={20} />
                  ) : (
                    <XCircle color={Palette.neonRose} size={20} />
                  )}
                </View>
                <NeonText variant="heading" weight="semiBold" tone={decision === 'approved' ? 'lime' : 'rose'}>
                  {decision === 'approved' ? 'APPROVE KYC' : 'REJECT KYC'}
                </NeonText>
              </View>
              <Pressable onPress={() => setReviewModal(false)} hitSlop={10} disabled={reviewing}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            {selected && (
              <View style={styles.modalSubInfo}>
                <Avatar
                  uri={selected.avatar_url}
                  displayName={selected.display_name ?? selected.username}
                  size="sm"
                />
                <View style={styles.modalSubMeta}>
                  <NeonText variant="body" weight="semiBold" tone="cyan">
                    {selected.display_name ?? selected.username}
                  </NeonText>
                  <NeonText variant="body" tone="muted" style={styles.modalSubEmail}>
                    {selected.email}
                  </NeonText>
                </View>
              </View>
            )}

            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              {decision === 'approved'
                ? 'This member will be verified and can access all wallet features.'
                : 'The member will be notified with your reason and can resubmit corrected information.'}
            </NeonText>

            {decision === 'rejected' && (
              <NeonInput
                label="Rejection Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Explain what needs to be corrected..."
                leftIcon={<FileText color={Palette.textTertiary} size={18} />}
                tone="cyan"
                multiline
                style={styles.modalInput}
                error={reviewError}
              />
            )}

            {reviewError && decision === 'approved' && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">
                  {reviewError}
                </NeonText>
              </View>
            )}

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setReviewModal(false)} disabled={reviewing}>
                Cancel
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant={decision === 'approved' ? 'success' : 'danger'}
                  fullWidth
                  loading={reviewing}
                  disabled={decision === 'rejected' && !reason.trim()}
                  onPress={handleReview}
                  leftIcon={
                    decision === 'approved' ? (
                      <Check color="#021810" size={16} />
                    ) : (
                      <X color="#FFFFFF" size={16} />
                    )
                  }
                >
                  {decision === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>{icon}</View>
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['4'],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    fontSize: Typography.sizes.xl,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['12'],
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['8'],
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
  },
  emptySub: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  subCard: {
    gap: Spacing['3'],
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  subMeta: {
    flex: 1,
    gap: 2,
  },
  subName: {
    fontSize: Typography.sizes.base,
  },
  subUsername: {
    fontSize: Typography.sizes.xs,
  },
  subEmail: {
    fontSize: Typography.sizes.xs,
  },
  subDetails: {
    gap: Spacing['2'],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  detailIconWrap: {
    width: 24,
    height: 24,
    borderRadius: Radii.xs,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  detailValue: {
    fontSize: Typography.sizes.xs,
    textAlign: 'right',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2'],
    backgroundColor: 'rgba(255,45,111,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  reasonText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  subActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  flex1: {
    flex: 1,
  },
  footerSpace: {
    height: Spacing['4'],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenPadding,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.75)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    gap: Spacing['4'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  modalSubMeta: {
    flex: 1,
    gap: 2,
  },
  modalSubEmail: {
    fontSize: Typography.sizes.xs,
  },
  modalSub: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  modalInput: {
    marginTop: Spacing['1'],
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
});
