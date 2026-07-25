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
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Check, X, CircleCheck as CheckCircle2, Circle as XCircle, Clock, Gift, Zap, FileText, Link as LinkIcon, ExternalLink, Award } from 'lucide-react-native';

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
  getCampaignParticipations,
  reviewSubmission,
  submissionStatusLabel,
  submissionStatusTone,
} from '@/lib/campaign-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { CampaignParticipation } from '@/types/campaigns';

export default function AdminCampaignReviewScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminCampaignReviewContent />
    </RequireRole>
  );
}

function AdminCampaignReviewContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submissions, setSubmissions] = useState<CampaignParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [selected, setSelected] = useState<CampaignParticipation | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    const data = await getCampaignParticipations(id);
    setSubmissions(data);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const openReview = (sub: CampaignParticipation, dec: 'approved' | 'rejected') => {
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
    const result = await reviewSubmission(selected.id, decision, reason);
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

  const pendingCount = submissions.filter((s) => s.submission_status === 'submitted').length;
  const approvedCount = submissions.filter((s) => s.submission_status === 'approved').length;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonLime} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonLime} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="lime" style={styles.title}>
            SUBMISSIONS
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
            <NeonText variant="display" weight="bold" tone="lime" style={styles.statValue}>
              {approvedCount}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              APPROVED
            </NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.statValue}>
              {submissions.length}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              TOTAL
            </NeonText>
          </View>
        </View>

        {reviewSuccess && (
          <View style={styles.successToast}>
            <CheckCircle2 color={Palette.neonLime} size={18} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone="lime">
              Review submitted — reward credited
            </NeonText>
          </View>
        )}

        {/* Submissions */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonLime} />
          </View>
        ) : submissions.length === 0 ? (
          <GlassCard tone="lime" padding={Spacing['6']} style={styles.emptyCard}>
            <Users color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No submissions yet
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Member submissions will appear here for review.
            </NeonText>
          </GlassCard>
        ) : (
          submissions.map((sub) => (
            <GlassCard
              key={sub.id}
              tone={submissionStatusTone(sub.submission_status)}
              gradientBorder
              padding={Spacing['4']}
              style={styles.subCard}
            >
              <View style={styles.subHeader}>
                <Avatar uri={sub.avatar_url} displayName={sub.display_name ?? sub.username} size="sm" />
                <View style={styles.subMeta}>
                  <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.subName}>
                    {sub.display_name ?? sub.username ?? 'Member'}
                  </NeonText>
                  {sub.username && (
                    <NeonText variant="body" tone="magenta" style={styles.subUsername}>
                      @{sub.username}
                    </NeonText>
                  )}
                </View>
                <Badge tone={submissionStatusTone(sub.submission_status)}>
                  {submissionStatusLabel(sub.submission_status).toUpperCase()}
                </Badge>
              </View>

              <Divider tone="white" />

              {/* Proof */}
              {sub.proof_url && (
                <View style={styles.proofSection}>
                  <View style={styles.proofHeader}>
                    {sub.proof_type === 'link' ? (
                      <LinkIcon color={Palette.neonCyan} size={14} />
                    ) : (
                      <FileText color={Palette.neonCyan} size={14} />
                    )}
                    <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.proofLabel}>
                      PROOF ({(sub.proof_type ?? 'file').toUpperCase()})
                    </NeonText>
                  </View>
                  {sub.proof_type === 'link' ? (
                    <Pressable
                      onPress={() => {
                        if (Platform.OS === 'web' && sub.proof_url) {
                          window.open(sub.proof_url, '_blank');
                        }
                      }}
                      style={styles.proofLink}
                    >
                      <Text style={styles.proofLinkText} numberOfLines={1}>
                        {sub.proof_url}
                      </Text>
                      <ExternalLink color={Palette.neonCyan} size={12} />
                    </Pressable>
                  ) : (
                    <View style={styles.proofFile}>
                      <FileText color={Palette.neonCyan} size={16} />
                      <Text style={styles.proofFileText} numberOfLines={1}>
                        {sub.proof_type} file uploaded
                      </Text>
                    </View>
                  )}
                  {sub.proof_note && (
                    <View style={styles.proofNote}>
                      <NeonText variant="body" tone="muted" style={styles.proofNoteText}>
                        "{sub.proof_note}"
                      </NeonText>
                    </View>
                  )}
                </View>
              )}

              {sub.rejection_reason && (
                <View style={styles.rejectionBox}>
                  <XCircle color={Palette.neonRose} size={14} />
                  <NeonText variant="body" tone="muted" style={styles.rejectionText}>
                    {sub.rejection_reason}
                  </NeonText>
                </View>
              )}

              {sub.submitted_at && (
                <View style={styles.submittedAt}>
                  <Clock color={Palette.textTertiary} size={12} />
                  <NeonText variant="body" tone="muted" style={styles.submittedAtText}>
                    Submitted {new Date(sub.submitted_at).toLocaleString()}
                  </NeonText>
                </View>
              )}

              {/* Actions */}
              {sub.submission_status === 'submitted' && (
                <View style={styles.subActions}>
                  <View style={styles.flex1}>
                    <NeonButton
                      variant="danger"
                      leftIcon={<X color="#FFFFFF" size={16} />}
                      onPress={() => openReview(sub, 'rejected')}
                      fullWidth
                      size="sm"
                    >
                      Reject
                    </NeonButton>
                  </View>
                  <View style={styles.flex1}>
                    <NeonButton
                      variant="success"
                      leftIcon={<Check color="#021810" size={16} />}
                      onPress={() => openReview(sub, 'approved')}
                      fullWidth
                      size="sm"
                    >
                      Approve & Credit
                    </NeonButton>
                  </View>
                </View>
              )}

              {sub.reward_credited && (
                <View style={styles.creditedNotice}>
                  <Award color={Palette.neonLime} size={14} />
                  <NeonText variant="body" weight="semiBold" tone="lime" style={styles.creditedText}>
                    Reward credited
                  </NeonText>
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
                      backgroundColor: decision === 'approved' ? 'rgba(0,255,156,0.1)' : 'rgba(255,45,111,0.1)',
                      borderColor: decision === 'approved' ? Palette.neonLime : Palette.neonRose,
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
                  {decision === 'approved' ? 'APPROVE & CREDIT' : 'REJECT SUBMISSION'}
                </NeonText>
              </View>
              <Pressable onPress={() => setReviewModal(false)} hitSlop={10} disabled={reviewing}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            {selected && (
              <View style={styles.modalSubInfo}>
                <Avatar uri={selected.avatar_url} displayName={selected.display_name ?? selected.username} size="xs" />
                <NeonText variant="body" weight="semiBold" tone="cyan">
                  {selected.display_name ?? selected.username}
                </NeonText>
              </View>
            )}

            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              {decision === 'approved'
                ? 'The member will receive W3OD + XP, a transaction record, a notification, and a reward receipt.'
                : 'The member will be notified with your reason and can resubmit corrected proof.'}
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
    fontSize: Typography.sizes.lg,
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
    fontSize: Typography.sizes.sm,
  },
  subUsername: {
    fontSize: Typography.sizes.xs,
  },
  proofSection: {
    gap: Spacing['2'],
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  proofLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  proofLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderRadius: Radii.sm,
    padding: Spacing['2'],
  },
  proofLinkText: {
    flex: 1,
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.xs,
    color: Palette.neonCyan,
  },
  proofFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderRadius: Radii.sm,
    padding: Spacing['2'],
  },
  proofFileText: {
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
  },
  proofNote: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.sm,
    padding: Spacing['2'],
  },
  proofNoteText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2'],
    backgroundColor: 'rgba(255,45,111,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  rejectionText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  submittedAt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  submittedAtText: {
    fontSize: Typography.sizes.xs,
  },
  subActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  flex1: {
    flex: 1,
  },
  creditedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,255,156,0.08)',
    borderRadius: Radii.sm,
    padding: Spacing['2'],
  },
  creditedText: {
    fontSize: Typography.sizes.xs,
  },
  footerSpace: {
    height: Spacing['8'],
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
    gap: Spacing['2'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['2'],
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
