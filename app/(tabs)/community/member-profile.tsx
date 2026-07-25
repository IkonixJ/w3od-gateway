import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  Trophy,
  Award,
  Crown,
  Calendar,
  Hash,
  Users,
  Megaphone,
  MessageSquare,
  ChevronRight,
  Link as LinkIcon,
  Star,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
  Badge,
  Divider,
  NeonButton,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getMemberPublicProfile } from '@/lib/community-service';
import { getOrCreateConversation } from '@/lib/messaging-service';
import { getRankColor } from '@/lib/wallet';
import { formatDate } from '@/lib/kyc-service';
import { formatTimeAgo } from '@/lib/community-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { MemberPublicProfile, ProfileBadge } from '@/types/community';

const BADGE_ICONS: Record<string, typeof Crown> = {
  crown: Crown,
  rocket: Trophy,
  trophy: Trophy,
  heart: Award,
  'graduation-cap': Award,
  'hand-heart': Award,
  mic: Award,
  presentation: Award,
  palette: Award,
  code: Award,
  users: Users,
};

export default function MemberProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: myProfile } = useAuth();
  const [member, setMember] = useState<MemberPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const loadMember = useCallback(async () => {
    const data = await getMemberPublicProfile(id);
    setMember(data);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMember();
  }, [loadMember]);

  const handleMessage = useCallback(async () => {
    if (!id) return;
    setMessaging(true);
    const result = await getOrCreateConversation(id);
    setMessaging(false);
    if (result.success && result.conversation_id) {
      router.push(`/(tabs)/community/chat?id=${result.conversation_id}` as never);
    }
  }, [id, router]);

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
        </View>
      </ScreenShell>
    );
  }

  if (!member || !member.success) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.notFoundWrap}>
          <ShieldCheck color={Palette.textTertiary} size={40} />
          <NeonText variant="heading" weight="medium" tone="muted">
            Member not found
          </NeonText>
          <NeonButton variant="ghost" onPress={() => router.back()}>
            Go Back
          </NeonButton>
        </View>
      </ScreenShell>
    );
  }

  const rankColor = getRankColor(member.level);
  const isMe = member.id === myProfile?.id;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonCyan} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            PROFILE
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Identity Card */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.identityCard}>
          <View style={styles.identityRow}>
            <Avatar uri={member.avatar_url} displayName={member.display_name ?? member.username} size="xl" />
            <View style={styles.identityMeta}>
              <View style={styles.nameRow}>
                <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.displayName}>
                  {member.display_name ?? member.username ?? 'Member'}
                </NeonText>
                {member.email_verified && <ShieldCheck color={Palette.neonLime} size={16} />}
              </View>
              {member.username && (
                <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.username}>
                  @{member.username}
                </NeonText>
              )}
              <View style={styles.badgeRow}>
                <Badge tone="purple" dot>{member.rank.toUpperCase()}</Badge>
                <Badge tone="cyan">LV {member.level}</Badge>
                {member.is_founding_member && (
                  <Badge tone="amber" dot>
                    <Crown color={Palette.neonAmber} size={11} />
                    FOUNDING
                  </Badge>
                )}
              </View>
            </View>
          </View>

          {/* Bio */}
          {member.bio ? (
            <View style={styles.bioBox}>
              <NeonText variant="body" tone="muted" style={styles.bioText}>
                {member.bio}
              </NeonText>
            </View>
          ) : null}

          {/* Social Links */}
          {member.social_links && Object.keys(member.social_links).length > 0 && (
            <View style={styles.socialRow}>
              {Object.entries(member.social_links).map(([platform, url]) => (
                <View key={platform} style={styles.socialChip}>
                  <LinkIcon color={Palette.neonCyan} size={12} />
                  <Text style={styles.socialText}>{platform}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Message button */}
          {!isMe && (
            <NeonButton
              variant="cyan"
              fullWidth
              loading={messaging}
              onPress={handleMessage}
              leftIcon={<MessageSquare color="#03121A" size={16} />}
            >
              Send Message
            </NeonButton>
          )}
        </GlassCard>

        {/* Reputation Card */}
        <GlassCard tone="purple" gradientBorder padding={Spacing['5']} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Trophy color={rankColor} size={18} />
            <NeonText variant="heading" weight="semiBold" tone="purple" style={styles.sectionTitle}>
              REPUTATION
            </NeonText>
          </View>
          <View style={styles.repStats}>
            <RepStat icon={<Zap color={Palette.neonCyan} size={14} />} label="XP" value={member.xp} tone="cyan" />
            <View style={styles.repDivider} />
            <RepStat icon={<Trophy color={rankColor} size={14} />} label="LEVEL" value={member.level} tone="purple" />
            <View style={styles.repDivider} />
            <RepStat icon={<Star color={Palette.neonMagenta} size={14} />} label="REP" value={member.reputation} tone="magenta" />
          </View>
          {/* XP Progress */}
          <View style={styles.xpBarTrack}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.round((member.xp % 100) / 100 * 100)}%`, backgroundColor: rankColor },
              ]}
            />
          </View>
          <NeonText variant="body" tone="muted" style={styles.xpHint}>
            Rank: {member.rank} · Level {member.level}
          </NeonText>
        </GlassCard>

        {/* Badges */}
        {member.badges.length > 0 && (
          <View style={styles.section}>
            <SectionLabel title="Badges" tone="amber" icon={<Award color={Palette.neonAmber} size={16} />} />
            <GlassCard tone="amber" padding={Spacing['5']} style={styles.sectionCard}>
              <View style={styles.badgesGrid}>
                {member.badges.map((badge) => (
                  <BadgeTile key={badge.id} badge={badge} />
                ))}
              </View>
            </GlassCard>
          </View>
        )}

        {/* Founder Legacy */}
        <View style={styles.section}>
          <SectionLabel title="Legacy" tone="purple" icon={<Crown color={Palette.purpleGlow} size={16} />} />
          <GlassCard tone="purple" padding={Spacing['5']} style={styles.sectionCard}>
            {member.is_founding_member && (
              <View style={styles.foundingBanner}>
                <Crown color={Palette.neonAmber} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.foundingText}>
                  FOUNDING MEMBER
                </NeonText>
              </View>
            )}
            <View style={styles.legacyGrid}>
              <LegacyStat icon={<Calendar color={Palette.neonCyan} size={14} />} label="Member Since" value={formatDate(member.member_since)} />
              <LegacyStat icon={<Hash color={Palette.neonCyan} size={14} />} label="Invite Number" value={member.invite_number ? `#${member.invite_number}` : '—'} />
              <LegacyStat icon={<Megaphone color={Palette.neonLime} size={14} />} label="Campaigns" value={String(member.campaigns_completed)} />
              <LegacyStat icon={<Users color={Palette.neonMagenta} size={14} />} label="Referrals" value={String(member.referrals)} />
              <LegacyStat icon={<Calendar color={Palette.neonAmber} size={14} />} label="Events Attended" value={String(member.events_attended)} />
              <LegacyStat icon={<Award color={Palette.purpleGlow} size={14} />} label="Badges" value={String(member.badges.length)} />
            </View>
          </GlassCard>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RepStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'cyan' | 'purple' | 'magenta' }) {
  return (
    <View style={styles.repStat}>
      {icon}
      <NeonText variant="display" weight="bold" tone={tone} style={styles.repStatValue}>
        {value.toLocaleString()}
      </NeonText>
      <NeonText variant="body" tone="muted" style={styles.repStatLabel}>
        {label}
      </NeonText>
    </View>
  );
}

function BadgeTile({ badge }: { badge: ProfileBadge }) {
  const Icon = BADGE_ICONS[badge.icon] ?? Award;
  return (
    <View style={styles.badgeTile}>
      <View style={[styles.badgeTileIcon, { backgroundColor: `${badge.color}20`, borderColor: badge.color }]}>
        <Icon color={badge.color} size={22} />
      </View>
      <NeonText variant="body" weight="semiBold" tone="amber" style={styles.badgeTileLabel}>
        {badge.name}
      </NeonText>
      <NeonText variant="body" tone="muted" style={styles.badgeTileRarity}>
        {badge.rarity.toUpperCase()}
      </NeonText>
    </View>
  );
}

function LegacyStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.legacyStat}>
      <View style={styles.legacyIconWrap}>{icon}</View>
      <View style={styles.legacyMeta}>
        <Text style={styles.legacyLabel}>{label}</Text>
        <Text style={styles.legacyValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionLabel({ title, tone, icon }: { title: string; tone: 'cyan' | 'amber' | 'purple'; icon: React.ReactNode }) {
  const colorMap = { cyan: Palette.neonCyan, amber: Palette.neonAmber, purple: Palette.purpleGlow };
  const color = colorMap[tone];
  return (
    <View style={styles.sectionLabelRow}>
      <View style={[styles.sectionAccent, { backgroundColor: color }]} />
      {icon}
      <NeonText variant="heading" weight="semiBold" tone={tone === 'purple' ? 'purple' : tone} style={styles.sectionLabelText}>
        {title.toUpperCase()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  identityCard: {
    gap: Spacing['4'],
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  identityMeta: {
    flex: 1,
    gap: Spacing['1'],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  displayName: {
    fontSize: Typography.sizes.lg,
  },
  username: {
    fontSize: Typography.sizes.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
    marginTop: Spacing['1'],
  },
  bioBox: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  bioText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radii.full,
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
  },
  socialText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    color: Palette.neonCyan,
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
  repStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  repDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  repStatValue: {
    fontSize: Typography.sizes.lg,
  },
  repStatLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  xpBarTrack: {
    height: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.glass300,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  xpHint: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  section: {
    gap: Spacing['3'],
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionLabelText: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: Spacing['3'],
  },
  badgeTile: {
    alignItems: 'center',
    gap: Spacing['2'],
    flex: 1,
    minWidth: 80,
  },
  badgeTileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTileLabel: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  badgeTileRarity: {
    fontSize: 9,
  },
  foundingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  foundingText: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  legacyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['3'],
  },
  legacyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexBasis: '47%',
    flexGrow: 1,
  },
  legacyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legacyMeta: {
    flex: 1,
    gap: 1,
  },
  legacyLabel: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
  legacyValue: {
    fontFamily: Typography.families.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Palette.textPrimary,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
