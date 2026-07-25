import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Megaphone, Zap, Gift, Users, ArrowRight, Plus } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  Badge,
  Divider,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { hasRole } from '@/lib/rbac';
import {
  getMyCampaigns,
  getActiveCampaigns,
  campaignStatusLabel,
  campaignStatusTone,
} from '@/lib/campaign-service';
import { Palette, Typography, Spacing, Radii, Gradients } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import type { Campaign, MyCampaign } from '@/types/campaigns';

export default function CampaignsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = hasRole(profile?.role ?? 'member', 'admin');

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<MyCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [active, mine] = await Promise.all([
      getActiveCampaigns(),
      getMyCampaigns(),
    ]);
    setCampaigns(active);
    setMyCampaigns(mine);
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

  // Merge to show participation status on active campaigns
  const myParticipationMap = new Map(myCampaigns.map((c) => [c.id, c]));
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled');
  const inProgressCampaigns = myCampaigns.filter(
    (c) => c.submission_status && c.submission_status !== 'approved' && c.submission_status !== 'rejected'
  );

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonLime} />
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonLime} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Megaphone color={Palette.neonLime} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="lime" style={styles.title}>
              CAMPAIGNS
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {activeCampaigns.length} active · {inProgressCampaigns.length} in progress
            </NeonText>
          </View>
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/(tabs)/admin-campaigns')}
              hitSlop={10}
              style={styles.adminBtn}
            >
              <Plus color={Palette.neonLime} size={18} />
              <NeonText variant="body" weight="semiBold" tone="lime" style={styles.adminBtnText}>
                Manage
              </NeonText>
            </Pressable>
          )}
        </View>

        {/* In-progress campaigns (joined but not completed) */}
        {inProgressCampaigns.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="In Progress" tone="amber" />
            {inProgressCampaigns.map((c) => (
              <CampaignRow
                key={c.id}
                campaign={c}
                status={c.submission_status ?? 'not_submitted'}
                onPress={() => router.push(`/(tabs)/campaign-detail?id=${c.id}`)}
              />
            ))}
          </View>
        )}

        {/* Active campaigns */}
        <View style={styles.section}>
          <SectionTitle title="Active Campaigns" tone="lime" />
          {activeCampaigns.length === 0 ? (
            <GlassCard tone="lime" padding={Spacing['6']} style={styles.emptyCard}>
              <Megaphone color={Palette.textTertiary} size={32} />
              <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
                No active campaigns
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.emptySub}>
                New campaigns will appear here. Check back soon!
              </NeonText>
            </GlassCard>
          ) : (
            activeCampaigns.map((c) => {
              const mine = myParticipationMap.get(c.id);
              return (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  status={mine?.submission_status ?? null}
                  onPress={() => router.push(`/(tabs)/campaign-detail?id=${c.id}`)}
                />
              );
            })
          )}
        </View>

        {/* Scheduled campaigns */}
        {scheduledCampaigns.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Upcoming" tone="amber" />
            {scheduledCampaigns.map((c) => (
              <CampaignRow
                key={c.id}
                campaign={c}
                status={null}
                upcoming
                onPress={() => router.push(`/(tabs)/campaign-detail?id=${c.id}`)}
              />
            ))}
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

function SectionTitle({ title, tone }: { title: string; tone: 'lime' | 'amber' }) {
  const color = tone === 'lime' ? Palette.neonLime : Palette.neonAmber;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: color }]} />
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>
        {title.toUpperCase()}
      </NeonText>
    </View>
  );
}

function CampaignRow({
  campaign,
  status,
  upcoming,
  onPress,
}: {
  campaign: Campaign;
  status: string | null;
  upcoming?: boolean;
  onPress: () => void;
}) {
  const sTone = campaignStatusTone(campaign.status);

  return (
    <GlassCard
      tone={upcoming ? 'amber' : 'lime'}
      gradientBorder
      padding={0}
      style={styles.campaignCard}
    >
      <Pressable onPress={onPress} style={styles.campaignPressable}>
        {/* Banner */}
        {campaign.banner_url ? (
          <View style={styles.bannerWrap}>
            <LinearGradient
              colors={Gradients.glassDark}
              style={styles.bannerOverlay}
            />
            <View style={styles.bannerImgWrap}>
              <View style={styles.bannerImg} />
            </View>
          </View>
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Megaphone color={Palette.neonLime} size={28} />
          </View>
        )}

        {/* Body */}
        <View style={styles.campaignBody}>
          <View style={styles.campaignHeader}>
            <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.campaignTitle} numberOfLines={1}>
              {campaign.title}
            </NeonText>
            {upcoming ? (
              <Badge tone="amber">SCHEDULED</Badge>
            ) : status ? (
              <Badge tone={status === 'approved' ? 'lime' : status === 'rejected' ? 'rose' : status === 'submitted' ? 'blue' : 'amber'}>
                {campaignStatusLabel(status)}
              </Badge>
            ) : (
              <Badge tone="lime">ACTIVE</Badge>
            )}
          </View>

          <NeonText variant="body" tone="muted" style={styles.campaignDesc} numberOfLines={2}>
            {campaign.description}
          </NeonText>

          <View style={styles.campaignMeta}>
            <View style={styles.rewardChip}>
              <Gift color={Palette.neonLime} size={13} />
              <NeonText variant="body" weight="semiBold" tone="lime" style={styles.metaText}>
                {Number(campaign.reward_amount).toLocaleString()} W3OD
              </NeonText>
            </View>
            <View style={styles.xpChip}>
              <Zap color={Palette.neonCyan} size={13} />
              <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.metaText}>
                +{campaign.xp_reward} XP
              </NeonText>
            </View>
            {campaign.proof_required && (
              <View style={styles.proofChip}>
                <NeonText variant="body" tone="muted" style={styles.metaTextSmall}>
                  PROOF REQUIRED
                </NeonText>
              </View>
            )}
          </View>

          <View style={styles.campaignFooter}>
            <NeonText variant="body" weight="semiBold" tone="lime" style={styles.viewText}>
              {status === 'approved' ? 'View Receipt' : status && status !== 'not_submitted' ? 'View Status' : upcoming ? 'View Details' : 'Join & Earn'}
            </NeonText>
            <ArrowRight color={Palette.neonLime} size={16} />
          </View>
        </View>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['5'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    backgroundColor: 'rgba(182,255,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
    borderRadius: Radii.md,
  },
  adminBtnText: {
    fontSize: Typography.sizes.xs,
  },
  section: {
    gap: Spacing['3'],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  sectionTitleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitleText: {
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.letterSpacings.wide,
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
    overflow: 'hidden',
  },
  campaignPressable: {
    width: '100%',
  },
  bannerWrap: {
    height: 120,
    position: 'relative',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1,
  },
  bannerImgWrap: {
    flex: 1,
    backgroundColor: 'rgba(182,255,0,0.08)',
  },
  bannerImg: {
    flex: 1,
  },
  bannerPlaceholder: {
    height: 80,
    backgroundColor: 'rgba(182,255,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignBody: {
    padding: Spacing['4'],
    gap: Spacing['3'],
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  campaignTitle: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  campaignDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  campaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexWrap: 'wrap',
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['2'],
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
  },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['2'],
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  proofChip: {
    paddingHorizontal: Spacing['2'],
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  metaText: {
    fontSize: 10,
  },
  metaTextSmall: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  campaignFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing['2'],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  viewText: {
    fontSize: Typography.sizes.xs,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
