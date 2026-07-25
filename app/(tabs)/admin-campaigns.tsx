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
  Text,
  Switch,
} from 'react-native';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, Plus, X, Check, CreditCard as Edit3, Trash2, Users, Gift, Zap, ChevronRight, Save } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Badge,
  Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  endCampaign,
  campaignStatusLabel,
  campaignStatusTone,
} from '@/lib/campaign-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { AdminCampaign } from '@/types/campaigns';

export default function AdminCampaignsScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminCampaignsContent />
    </RequireRole>
  );
}

function AdminCampaignsContent() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AdminCampaign | null>(null);

  const loadData = useCallback(async () => {
    const data = await getAllCampaigns();
    setCampaigns(data);
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

  const openCreate = () => {
    setEditing(null);
    setModal(true);
  };

  const openEdit = (c: AdminCampaign) => {
    setEditing(c);
    setModal(true);
  };

  const handleEnd = async (id: string) => {
    await endCampaign(id);
    loadData();
  };

  const pendingCount = campaigns.filter((c) => c.status !== 'ended').length;

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
            MANAGE CAMPAIGNS
          </NeonText>
          <Pressable onPress={openCreate} hitSlop={10} style={styles.addBtn}>
            <Plus color={Palette.neonLime} size={20} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="lime" style={styles.statValue}>
              {campaigns.length}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              TOTAL
            </NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.statValue}>
              {pendingCount}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              ACTIVE
            </NeonText>
          </View>
        </View>

        {/* Campaign list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonLime} />
          </View>
        ) : campaigns.length === 0 ? (
          <GlassCard tone="lime" padding={Spacing['6']} style={styles.emptyCard}>
            <Megaphone color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No campaigns yet
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Create your first campaign to start rewarding members.
            </NeonText>
            <NeonButton
              variant="success"
              leftIcon={<Plus color="#021810" size={16} />}
              onPress={openCreate}
            >
              Create Campaign
            </NeonButton>
          </GlassCard>
        ) : (
          campaigns.map((c) => (
            <GlassCard
              key={c.id}
              tone={campaignStatusTone(c.status)}
              gradientBorder
              padding={Spacing['4']}
              style={styles.campaignCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.cardTitle} numberOfLines={1}>
                    {c.title}
                  </NeonText>
                  <Badge tone={campaignStatusTone(c.status)}>
                    {campaignStatusLabel(c.status).toUpperCase()}
                  </Badge>
                </View>
              </View>

              <NeonText variant="body" tone="muted" style={styles.cardDesc} numberOfLines={2}>
                {c.description}
              </NeonText>

              <View style={styles.cardMeta}>
                <View style={styles.metaChip}>
                  <Gift color={Palette.neonLime} size={12} />
                  <Text style={styles.metaText}>{Number(c.reward_amount).toLocaleString()} W3OD</Text>
                </View>
                <View style={styles.metaChip}>
                  <Zap color={Palette.neonCyan} size={12} />
                  <Text style={styles.metaText}>+{c.xp_reward} XP</Text>
                </View>
                <View style={styles.metaChip}>
                  <Users color={Palette.textTertiary} size={12} />
                  <Text style={styles.metaText}>{c.participant_count}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => router.push(`/(tabs)/admin-campaign-review?id=${c.id}`)}
                  style={styles.reviewBtn}
                >
                  <Users color={Palette.neonCyan} size={15} />
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.actionText}>
                    Review Submissions
                  </NeonText>
                  <ChevronRight color={Palette.neonCyan} size={15} />
                </Pressable>
              </View>

              <Divider tone="white" />

              <View style={styles.cardFooterActions}>
                <Pressable onPress={() => openEdit(c)} style={styles.editBtn}>
                  <Edit3 color={Palette.neonCyan} size={15} />
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.footerActionText}>
                    Edit
                  </NeonText>
                </Pressable>
                {c.status !== 'ended' && (
                  <Pressable onPress={() => handleEnd(c.id)} style={styles.endBtn}>
                    <Trash2 color={Palette.neonRose} size={15} />
                    <NeonText variant="body" weight="semiBold" tone="rose" style={styles.footerActionText}>
                      End Campaign
                    </NeonText>
                  </Pressable>
                )}
              </View>
            </GlassCard>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Create/Edit modal */}
      <CampaignFormModal
        visible={modal}
        editing={editing}
        onClose={() => setModal(false)}
        onSaved={() => {
          setModal(false);
          loadData();
        }}
      />
    </ScreenShell>
  );
}

function CampaignFormModal({
  visible,
  editing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: AdminCampaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [xpReward, setXpReward] = useState('');
  const [proofRequired, setProofRequired] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setTitle(editing.title);
        setDescription(editing.description);
        setInstructions(editing.instructions);
        setBannerUrl(editing.banner_url ?? '');
        setRewardAmount(String(editing.reward_amount));
        setXpReward(String(editing.xp_reward));
        setProofRequired(editing.proof_required);
        setStartDate(editing.start_date ? editing.start_date.slice(0, 10) : '');
        setEndDate(editing.end_date ? editing.end_date.slice(0, 10) : '');
      } else {
        setTitle('');
        setDescription('');
        setInstructions('');
        setBannerUrl('');
        setRewardAmount('0');
        setXpReward('0');
        setProofRequired(true);
        setStartDate('');
        setEndDate('');
      }
      setError(null);
    }
  }, [visible, editing]);

  const handleSave = async () => {
    setError(null);
    if (!title.trim() || !description.trim() || !instructions.trim()) {
      setError('Title, description, and instructions are required.');
      return;
    }
    setSaving(true);
    const params = {
      title: title.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      bannerUrl: bannerUrl.trim() || null,
      rewardAmount: Number(rewardAmount) || 0,
      xpReward: Number(xpReward) || 0,
      proofRequired,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
    };
    const result = editing
      ? await updateCampaign(editing.id, params)
      : await createCampaign(params);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Save failed.');
      return;
    }
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop} />
        <GlassCard tone="lime" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <NeonText variant="heading" weight="semiBold" tone="lime">
              {editing ? 'EDIT CAMPAIGN' : 'NEW CAMPAIGN'}
            </NeonText>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={Palette.textTertiary} size={20} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <NeonInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Campaign title"
              tone="lime"
              style={styles.modalField}
            />
            <NeonInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Short description for the campaign"
              tone="lime"
              multiline
              style={styles.modalField}
            />
            <NeonInput
              label="Instructions"
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Detailed instructions for members..."
              tone="lime"
              multiline
              style={styles.modalField}
            />
            <NeonInput
              label="Banner URL (optional)"
              value={bannerUrl}
              onChangeText={setBannerUrl}
              placeholder="https://..."
              tone="lime"
              keyboardType="url"
              style={styles.modalField}
            />
            <View style={styles.rowInputs}>
              <View style={styles.flex1}>
                <NeonInput
                  label="W3OD Reward"
                  value={rewardAmount}
                  onChangeText={(v) => setRewardAmount(v.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  tone="lime"
                  keyboardType="numeric"
                  leftIcon={<Gift color={Palette.textTertiary} size={16} />}
                />
              </View>
              <View style={styles.flex1}>
                <NeonInput
                  label="XP Reward"
                  value={xpReward}
                  onChangeText={(v) => setXpReward(v.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  tone="lime"
                  keyboardType="numeric"
                  leftIcon={<Zap color={Palette.textTertiary} size={16} />}
                />
              </View>
            </View>
            <View style={styles.rowInputs}>
              <View style={styles.flex1}>
                <NeonInput
                  label="Start Date (optional)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  tone="lime"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.flex1}>
                <NeonInput
                  label="End Date (optional)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  tone="lime"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchMeta}>
                <NeonText variant="body" weight="semiBold" tone="lime">
                  Proof Required
                </NeonText>
                <NeonText variant="body" tone="muted" style={styles.switchSub}>
                  Members must upload proof to earn rewards
                </NeonText>
              </View>
              <Switch
                value={proofRequired}
                onValueChange={setProofRequired}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(182,255,0,0.4)' }}
                thumbColor={proofRequired ? Palette.neonLime : Palette.textTertiary}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">
                  {error}
                </NeonText>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <NeonButton variant="ghost" onPress={onClose}>
              Cancel
            </NeonButton>
            <View style={styles.flex1}>
              <NeonButton
                variant="success"
                fullWidth
                loading={saving}
                onPress={handleSave}
                leftIcon={<Save color="#021810" size={16} />}
              >
                {editing ? 'Update' : 'Create'}
              </NeonButton>
            </View>
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
  campaignCard: {
    gap: Spacing['3'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    gap: Spacing['2'],
  },
  cardTitle: {
    fontSize: Typography.sizes.base,
  },
  cardDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['2'],
    paddingVertical: 3,
    borderRadius: Radii.xs,
    backgroundColor: Palette.glass300,
  },
  metaText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.textSecondary,
  },
  cardActions: {},
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['2'],
  },
  actionText: {
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: Spacing['4'],
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  footerActionText: {
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
    maxWidth: 520,
    maxHeight: '90%',
    gap: Spacing['4'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalField: {
    marginTop: Spacing['2'],
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing['3'],
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  switchMeta: {
    flex: 1,
    gap: 2,
  },
  switchSub: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
    marginTop: Spacing['3'],
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
});
