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
  Alert,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Megaphone, Zap, Gift, CircleCheck as CheckCircle2, Circle as XCircle, Clock, Upload, Link as LinkIcon, FileText, ChevronRight, ShieldAlert, RotateCw, Trophy, Receipt } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Badge,
  Divider,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getLevelInfo, getRankColor } from '@/lib/wallet';
import {
  getMyCampaigns,
  getActiveCampaigns,
  joinCampaign,
  submitProof,
  submissionStatusLabel,
  submissionStatusTone,
  uploadProofFile,
} from '@/lib/campaign-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { pickFile, fileToDataUrl, canUploadFiles } from '@/lib/file-utils';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { MyCampaign, ProofType } from '@/types/campaigns';

const PROOF_TYPES: { value: ProofType; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Document' },
  { value: 'link', label: 'Link' },
  { value: 'zip', label: 'ZIP File' },
];

export default function CampaignDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, refreshProfile } = useAuth();

  const [campaign, setCampaign] = useState<MyCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Proof modal state
  const [proofModal, setProofModal] = useState(false);
  const [proofType, setProofType] = useState<ProofType>('link');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofError, setProofError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    const [mine, active] = await Promise.all([
      getMyCampaigns(),
      getActiveCampaigns(),
    ]);
    const found = mine.find((c) => c.id === id);
    if (found) {
      setCampaign(found);
    } else {
      const activeFound = active.find((c) => c.id === id);
      if (activeFound) {
        setCampaign({
          ...activeFound,
          participation_id: null,
          submission_status: null,
          proof_type: null,
          proof_url: null,
          proof_note: null,
          rejection_reason: null,
          submitted_at: null,
          reviewed_at: null,
          reward_credited: false,
        });
      } else {
        setCampaign(null);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    setError(null);
    const result = await joinCampaign(id);
    setJoining(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to join campaign.');
      return;
    }
    await loadCampaign();
  };

  const openProofModal = () => {
    setProofType('link');
    setProofUrl('');
    setProofNote('');
    setProofError(null);
    setProofModal(true);
  };

  const handleFileUpload = async () => {
    if (!profile?.id || !campaign?.participation_id) return;
    if (!canUploadFiles()) {
      Alert.alert('Upload Unavailable', 'File upload is only available on web. Please use a browser to upload files.');
      return;
    }
    const file = await pickFile('image/*,video/*,application/pdf,.doc,.docx,.zip');
    if (!file) return;
    setSubmitting(true);
    setProofError(null);
    const dataUrl = await fileToDataUrl(file.uri);
    const detectedType = detectProofType(file.type, file.name);
    const { url, error: uploadError } = await uploadProofFile(
      profile.id,
      campaign.participation_id!,
      dataUrl,
      `${Date.now()}-${file.name}`,
      file.type
    );
    setSubmitting(false);
    if (uploadError || !url) {
      setProofError(uploadError ?? 'Upload failed.');
      return;
    }
    setProofType(detectedType);
    setProofUrl(url);
  };

  const handleSubmitProof = async () => {
    if (!campaign?.participation_id) return;
    setProofError(null);
    if (!proofUrl.trim()) {
      setProofError('Please provide a proof URL or upload a file.');
      return;
    }
    setSubmitting(true);
    const result = await submitProof(
      campaign.participation_id,
      proofType,
      proofUrl,
      proofNote
    );
    setSubmitting(false);
    if (!result.success) {
      setProofError(result.error ?? 'Submission failed.');
      return;
    }
    setProofModal(false);
    setSuccess(true);
    await loadCampaign();
    await refreshProfile();
    setTimeout(() => setSuccess(false), 3000);
  };

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonLime} />
        </View>
      </ScreenShell>
    );
  }

  if (!campaign) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.notFoundWrap}>
          <ShieldAlert color={Palette.textTertiary} size={40} />
          <NeonText variant="heading" weight="medium" tone="muted" style={styles.notFoundText}>
            Campaign not found
          </NeonText>
          <NeonButton variant="ghost" onPress={() => router.back()}>
            Go Back
          </NeonButton>
        </View>
      </ScreenShell>
    );
  }

  const status = campaign.submission_status;
  const sTone = status ? submissionStatusTone(status) : 'cyan';
  const hasJoined = !!campaign.participation_id;
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const canSubmit = hasJoined && !isApproved;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <ArrowLeft color={Palette.neonLime} size={22} />
            </Pressable>
            <NeonText variant="display" weight="bold" tone="lime" style={styles.title}>
              CAMPAIGN
            </NeonText>
            <View style={{ width: 22 }} />
          </View>

          {/* Status banner */}
          {status && status !== 'not_submitted' && (
            <GlassCard tone={sTone} gradientBorder padding={Spacing['4']} style={styles.statusBanner}>
              <View style={styles.statusIconWrap}>
                {isApproved ? (
                  <CheckCircle2 color={Palette.neonLime} size={24} strokeWidth={2.5} />
                ) : isRejected ? (
                  <XCircle color={Palette.neonRose} size={24} strokeWidth={2.5} />
                ) : (
                  <Clock color={Palette.neonAmber} size={24} strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.statusMeta}>
                <NeonText variant="heading" weight="semiBold" tone={sTone}>
                  {submissionStatusLabel(status).toUpperCase()}
                </NeonText>
                {isRejected && campaign.rejection_reason && (
                  <NeonText variant="body" tone="muted" style={styles.statusSub}>
                    {campaign.rejection_reason}
                  </NeonText>
                )}
                {isApproved && (
                  <NeonText variant="body" tone="muted" style={styles.statusSub}>
                    Reward credited to your wallet and XP.
                  </NeonText>
                )}
              </View>
            </GlassCard>
          )}

          {/* Success toast */}
          {success && (
            <View style={styles.successToast}>
              <CheckCircle2 color={Palette.neonLime} size={18} strokeWidth={2.5} />
              <NeonText variant="body" weight="semiBold" tone="lime">
                Proof submitted successfully!
              </NeonText>
            </View>
          )}

          {/* Main campaign card */}
          <GlassCard tone="lime" gradientBorder padding={0} style={styles.campaignCard}>
            {/* Banner */}
            {campaign.banner_url ? (
              <View style={styles.bannerWrap}>
                <View style={styles.bannerImg} />
              </View>
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Megaphone color={Palette.neonLime} size={40} />
              </View>
            )}

            <View style={styles.campaignBody}>
              <NeonText variant="display" weight="bold" tone="lime" style={styles.campaignTitle}>
                {campaign.title}
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.campaignDesc}>
                {campaign.description}
              </NeonText>

              {/* Reward chips */}
              <View style={styles.rewardRow}>
                <View style={styles.rewardBox}>
                  <Gift color={Palette.neonLime} size={18} />
                  <View style={styles.rewardMeta}>
                    <Text style={styles.rewardValue}>{Number(campaign.reward_amount).toLocaleString()}</Text>
                    <Text style={styles.rewardUnit}>W3OD</Text>
                  </View>
                </View>
                <View style={styles.xpBox}>
                  <Zap color={Palette.neonCyan} size={18} />
                  <View style={styles.rewardMeta}>
                    <Text style={styles.xpValue}>+{campaign.xp_reward}</Text>
                    <Text style={styles.xpUnit}>XP</Text>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Instructions */}
          <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <FileText color={Palette.neonCyan} size={18} />
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.sectionTitle}>
                INSTRUCTIONS
              </NeonText>
            </View>
            <NeonText variant="body" tone="muted" style={styles.instructionsText}>
              {campaign.instructions}
            </NeonText>
            {campaign.proof_required && (
              <View style={styles.proofNotice}>
                <ShieldAlert color={Palette.neonAmber} size={14} />
                <NeonText variant="body" tone="muted" style={styles.proofNoticeText}>
                  Proof of completion is required to earn rewards.
                </NeonText>
              </View>
            )}
          </GlassCard>

          {/* Reward receipt (if approved) */}
          {isApproved && (
            <GlassCard tone="lime" gradientBorder padding={Spacing['5']} style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Receipt color={Palette.neonLime} size={18} />
                <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.sectionTitle}>
                  REWARD RECEIPT
                </NeonText>
              </View>
              <View style={styles.receiptRows}>
                <ReceiptRow label="W3OD Credited" value={`${Number(campaign.reward_amount).toLocaleString()} W3OD`} tone="lime" />
                <Divider tone="white" />
                <ReceiptRow label="XP Earned" value={`+${campaign.xp_reward} XP`} tone="cyan" />
                <Divider tone="white" />
                <ReceiptRow label="Reviewed On" value={campaign.reviewed_at ? new Date(campaign.reviewed_at).toLocaleDateString() : '—'} tone="muted" />
              </View>
            </GlassCard>
          )}

          {/* Actions */}
          {!hasJoined && campaign.status === 'active' && (
            <NeonButton
              variant="success"
              fullWidth
              loading={joining}
              leftIcon={<Trophy color="#021810" size={18} />}
              onPress={handleJoin}
              style={styles.actionBtn}
            >
              Join Campaign
            </NeonButton>
          )}

          {canSubmit && (
            <NeonButton
              variant="cyan"
              fullWidth
              leftIcon={<Upload color="#03121A" size={18} />}
              onPress={openProofModal}
              style={styles.actionBtn}
            >
              {isRejected ? 'Resubmit Proof' : 'Submit Proof'}
            </NeonButton>
          )}

          {campaign.status === 'scheduled' && (
            <GlassCard tone="amber" padding={Spacing['4']} style={styles.scheduledNotice}>
              <Clock color={Palette.neonAmber} size={18} />
              <NeonText variant="body" tone="muted" style={styles.scheduledText}>
                This campaign hasn't started yet. Check back soon.
              </NeonText>
            </GlassCard>
          )}

          {error && (
            <View style={styles.errorBox}>
              <NeonText variant="body" weight="medium" tone="rose">
                {error}
              </NeonText>
            </View>
          )}

          <View style={styles.footerSpace} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Proof submission modal */}
      <Modal visible={proofModal} transparent animationType="fade" onRequestClose={() => setProofModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <NeonText variant="heading" weight="semiBold" tone="cyan">
                SUBMIT PROOF
              </NeonText>
              <Pressable onPress={() => setProofModal(false)} hitSlop={10}>
                <XCircle color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              Upload a file or paste a link to prove you completed the campaign.
              Accepted: images, videos, PDFs, documents, links, ZIP files.
            </NeonText>

            {/* Proof type selector */}
            <Text style={styles.inputLabel}>PROOF TYPE</Text>
            <View style={styles.proofTypeRow}>
              {PROOF_TYPES.map((pt) => (
                <Pressable
                  key={pt.value}
                  onPress={() => setProofType(pt.value)}
                  style={[
                    styles.proofTypeChip,
                    proofType === pt.value && styles.proofTypeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.proofTypeChipText,
                      proofType === pt.value && styles.proofTypeChipTextActive,
                    ]}
                  >
                    {pt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Upload or link */}
            {proofType === 'link' ? (
              <NeonInput
                label="Proof Link"
                value={proofUrl}
                onChangeText={setProofUrl}
                placeholder="https://..."
                leftIcon={<LinkIcon color={Palette.textTertiary} size={18} />}
                tone="cyan"
                keyboardType="url"
                style={styles.modalField}
                error={proofError}
              />
            ) : (
              <View style={styles.uploadSection}>
                <Pressable onPress={handleFileUpload} style={styles.uploadBtn}>
                  <Upload color={Palette.neonCyan} size={20} />
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.uploadBtnText}>
                    {proofUrl ? 'File uploaded — replace?' : 'Choose File'}
                  </NeonText>
                </Pressable>
                {proofUrl && (
                  <View style={styles.uploadedFile}>
                    <CheckCircle2 color={Palette.neonLime} size={14} />
                    <NeonText variant="body" tone="muted" style={styles.uploadedFileText} numberOfLines={1}>
                      File ready to submit
                    </NeonText>
                  </View>
                )}
                {proofError && (
                  <NeonText variant="body" weight="medium" tone="rose" style={styles.uploadError}>
                    {proofError}
                  </NeonText>
                )}
              </View>
            )}

            <NeonInput
              label="Note (optional)"
              value={proofNote}
              onChangeText={setProofNote}
              placeholder="Add a note for the reviewer..."
              tone="cyan"
              multiline
              style={styles.modalField}
            />

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setProofModal(false)}>
                Cancel
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant="cyan"
                  fullWidth
                  loading={submitting}
                  disabled={!proofUrl.trim()}
                  onPress={handleSubmitProof}
                  leftIcon={<CheckCircle2 color="#03121A" size={16} />}
                >
                  Submit
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

function ReceiptRow({ label, value, tone }: { label: string; value: string; tone: 'lime' | 'cyan' | 'muted' }) {
  return (
    <View style={styles.receiptRow}>
      <NeonText variant="body" tone="muted" style={styles.receiptLabel}>
        {label}
      </NeonText>
      <NeonText variant="body" weight="semiBold" tone={tone} style={styles.receiptValue}>
        {value}
      </NeonText>
    </View>
  );
}

function detectProofType(mimeType: string, fileName: string): ProofType {
  const lower = (mimeType || fileName).toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('video/')) return 'video';
  if (lower.includes('pdf')) return 'pdf';
  if (lower.endsWith('.zip') || lower.includes('zip')) return 'zip';
  return 'document';
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['4'],
  },
  notFoundText: {
    fontSize: Typography.sizes.base,
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMeta: {
    flex: 1,
    gap: 2,
  },
  statusSub: {
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
  campaignCard: {
    overflow: 'hidden',
  },
  bannerWrap: {
    height: 140,
  },
  bannerImg: {
    flex: 1,
    backgroundColor: 'rgba(182,255,0,0.08)',
  },
  bannerPlaceholder: {
    height: 100,
    backgroundColor: 'rgba(182,255,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignBody: {
    padding: Spacing['5'],
    gap: Spacing['3'],
  },
  campaignTitle: {
    fontSize: Typography.sizes.xl,
  },
  campaignDesc: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  rewardBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  xpBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  rewardMeta: {
    gap: 0,
  },
  rewardValue: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes.lg,
    color: Palette.neonLime,
  },
  rewardUnit: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.neonLime,
    letterSpacing: 0.5,
  },
  xpValue: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes.lg,
    color: Palette.neonCyan,
  },
  xpUnit: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.neonCyan,
    letterSpacing: 0.5,
  },
  sectionCard: {
    gap: Spacing['3'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  instructionsText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 22,
  },
  proofNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: Radii.sm,
    padding: Spacing['2'],
  },
  proofNoticeText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  receiptCard: {
    gap: Spacing['3'],
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  receiptRows: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['4'],
    gap: Spacing['1'],
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing['2'],
  },
  receiptLabel: {
    fontSize: Typography.sizes.sm,
  },
  receiptValue: {
    fontSize: Typography.sizes.sm,
  },
  actionBtn: {
    marginTop: Spacing['1'],
  },
  scheduledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  scheduledText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
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
  modalSub: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  inputLabel: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
  proofTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  proofTypeChip: {
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radii.sm,
    backgroundColor: Palette.glass300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  proofTypeChipActive: {
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderColor: 'rgba(0,240,255,0.5)',
  },
  proofTypeChipText: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
  },
  proofTypeChipTextActive: {
    color: Palette.neonCyan,
    fontWeight: '600',
  },
  uploadSection: {
    gap: Spacing['2'],
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    borderRadius: Radii.md,
    paddingVertical: Spacing['4'],
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: Typography.sizes.sm,
  },
  uploadedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(0,255,156,0.08)',
    borderRadius: Radii.sm,
    padding: Spacing['2'],
  },
  uploadedFileText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
  },
  uploadError: {
    fontSize: Typography.sizes.xs,
  },
  modalField: {
    marginTop: Spacing['2'],
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
});
