import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  Zap,
  Trophy,
  Megaphone,
  Search,
  MessageSquare,
  Crown,
  Award,
  TrendingUp,
  CalendarDays,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
  Badge,
  Divider,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getCommunityHub } from '@/lib/community-service';
import { getMyConversations, getMyGroups } from '@/lib/messaging-service';
import { getLevelInfo, getRankColor } from '@/lib/wallet';
import { formatTimeAgo } from '@/lib/community-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type {
  CommunityHubData,
  FeaturedMember,
  ActivityEntry,
} from '@/types/community';
import type { ConversationSummary, GroupSummary } from '@/types/community';

export default function CommunityHubScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [hubData, setHubData] = useState<CommunityHubData | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const levelInfo = useMemo(() => getLevelInfo(profile?.xp ?? 0), [profile?.xp]);
  const rankColor = getRankColor(levelInfo.level);

  const loadData = useCallback(async () => {
    const [hub, convs, grps] = await Promise.all([
      getCommunityHub(),
      getMyConversations(),
      getMyGroups(),
    ]);
    setHubData(hub);
    setConversations(convs);
    setGroups(grps);
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

  const totalUnread =
    conversations.reduce((sum, c) => sum + c.unread_count, 0) +
    groups.reduce((sum, g) => sum + g.unread_count, 0);

  if (loading) {
    return (
      <ScreenShell variant="deep">
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.purpleGlow} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.purpleGlow}
            colors={[Palette.purpleGlow]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Users color={Palette.purpleGlow} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="purple" style={styles.title}>
              COMMUNITY
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {totalUnread > 0 ? `${totalUnread} unread messages` : 'Connect with the community'}
            </NeonText>
          </View>
          {totalUnread > 0 && (
            <View style={styles.unreadBadge}>
              <NeonText variant="body" weight="bold" tone="purple" style={styles.unreadText}>
                {totalUnread}
              </NeonText>
            </View>
          )}
        </View>

        {/* My Reputation Card */}
        <GlassCard tone="purple" gradientBorder padding={Spacing['5']} style={styles.reputationCard}>
          <View style={styles.repHeader}>
            <NeonText variant="heading" weight="semiBold" tone="purple" style={styles.repTitle}>
              YOUR REPUTATION
            </NeonText>
            <Badge tone="purple" dot>{levelInfo.rank.toUpperCase()}</Badge>
          </View>
          <View style={styles.repStats}>
            <RepStat icon={<Zap color={Palette.neonCyan} size={14} />} label="XP" value={profile?.xp ?? 0} tone="cyan" />
            <View style={styles.repDivider} />
            <RepStat icon={<Trophy color={rankColor} size={14} />} label="LEVEL" value={levelInfo.level} tone="purple" />
            <View style={styles.repDivider} />
            <RepStat icon={<Award color={Palette.neonMagenta} size={14} />} label="REP" value={profile?.reputation ?? 0} tone="magenta" />
          </View>
          {/* XP Progress bar */}
          <View style={styles.xpBarTrack}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.round(levelInfo.progress * 100)}%`, backgroundColor: rankColor },
              ]}
            />
          </View>
          <View style={styles.xpRow}>
            <NeonText variant="body" tone="muted" style={styles.xpLabel}>
              {levelInfo.xpIntoLevel} / {levelInfo.xpForNext} XP
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.xpLabel}>
              LV {levelInfo.level + 1}
            </NeonText>
          </View>
        </GlassCard>

        {/* Quick nav */}
        <View style={styles.quickNavRow}>
          <QuickNavBtn
            icon={<Search color={Palette.neonCyan} size={20} />}
            label="Directory"
            tone="cyan"
            onPress={() => router.push('/(tabs)/community/directory')}
          />
          <QuickNavBtn
            icon={<MessageSquare color={Palette.neonMagenta} size={20} />}
            label="Messages"
            tone="magenta"
            badge={conversations.reduce((s, c) => s + c.unread_count, 0)}
            onPress={() => router.push('/(tabs)/messaging')}
          />
          <QuickNavBtn
            icon={<Megaphone color={Palette.neonAmber} size={20} />}
            label="Announcements"
            tone="amber"
            onPress={() => router.push('/(tabs)/community/announcements')}
          />
        </View>

        {/* Featured Members */}
        {hubData && hubData.featured_members.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Featured Members" tone="purple" icon={<Crown color={Palette.purpleGlow} size={16} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {hubData.featured_members.map((m) => (
                <FeaturedMemberCard key={m.id} member={m} onPress={() => router.push(`/(tabs)/community/member-profile?id=${m.id}`)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Contributors */}
        {hubData && hubData.top_contributors.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Top Contributors" tone="lime" icon={<TrendingUp color={Palette.neonLime} size={16} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {hubData.top_contributors.map((m) => (
                <FeaturedMemberCard key={m.id} member={m} onPress={() => router.push(`/(tabs)/community/member-profile?id=${m.id}`)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top XP Earners */}
        {hubData && hubData.top_xp_earners.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Top XP Earners" tone="cyan" icon={<Zap color={Palette.neonCyan} size={16} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {hubData.top_xp_earners.map((m) => (
                <FeaturedMemberCard key={m.id} member={m} onPress={() => router.push(`/(tabs)/community/member-profile?id=${m.id}`)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Activity */}
        {hubData && hubData.recent_activity.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title="Recent Activity" tone="amber" icon={<Sparkles color={Palette.neonAmber} size={16} />} />
            <GlassCard tone="amber" padding={Spacing['4']} style={styles.activityCard}>
              {hubData.recent_activity.map((entry, idx) => (
                <View key={entry.user_id + idx}>
                  {idx > 0 && <Divider tone="white" />}
                  <Pressable
                    onPress={() => router.push(`/(tabs)/community/member-profile?id=${entry.user_id}`)}
                    style={styles.activityRow}
                  >
                    <Avatar uri={entry.avatar_url} displayName={entry.display_name ?? entry.username} size="sm" />
                    <View style={styles.activityMeta}>
                      <NeonText variant="body" weight="semiBold" tone="amber" style={styles.activityDesc} numberOfLines={2}>
                        {entry.description}
                      </NeonText>
                      <NeonText variant="body" tone="muted" style={styles.activityTime}>
                        {formatTimeAgo(entry.created_at)}
                      </NeonText>
                    </View>
                    <ChevronRight color={Palette.textTertiary} size={16} />
                  </Pressable>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {/* Community Announcements */}
        {hubData && hubData.announcements.length > 0 && (
          <View style={styles.section}>
            <SectionTitle
              title="Announcements"
              tone="magenta"
              icon={<Megaphone color={Palette.neonMagenta} size={16} />}
              actionLabel="View All"
              onAction={() => router.push('/(tabs)/community/announcements')}
            />
            <GlassCard tone="magenta" padding={Spacing['4']} style={styles.activityCard}>
              {hubData.announcements.map((a, idx) => (
                <View key={a.id}>
                  {idx > 0 && <Divider tone="white" />}
                  <View style={styles.activityRow}>
                    <View style={styles.announceIconWrap}>
                      <Megaphone color={Palette.neonMagenta} size={14} />
                    </View>
                    <View style={styles.activityMeta}>
                      <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.announceTitle} numberOfLines={1}>
                        {a.title}
                      </NeonText>
                      <NeonText variant="body" tone="muted" style={styles.activityTime}>
                        {formatTimeAgo(a.created_at)}
                      </NeonText>
                    </View>
                  </View>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

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

function QuickNavBtn({
  icon,
  label,
  tone,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'cyan' | 'magenta' | 'amber';
  badge?: number;
  onPress: () => void;
}) {
  const bgMap = {
    cyan: 'rgba(0,240,255,0.08)',
    magenta: 'rgba(255,0,229,0.08)',
    amber: 'rgba(255,184,0,0.08)',
  };
  const borderMap = {
    cyan: 'rgba(0,240,255,0.3)',
    magenta: 'rgba(255,0,229,0.3)',
    amber: 'rgba(255,184,0,0.3)',
  };
  return (
    <Pressable onPress={onPress} style={[styles.quickNav, { backgroundColor: bgMap[tone], borderColor: borderMap[tone] }]}>
      <View style={styles.quickNavIcon}>{icon}</View>
      <NeonText variant="body" weight="semiBold" tone={tone} style={styles.quickNavLabel}>
        {label.toUpperCase()}
      </NeonText>
      {badge !== undefined && badge > 0 && (
        <View style={styles.quickNavBadge}>
          <NeonText variant="body" weight="bold" tone="rose" style={styles.quickNavBadgeText}>
            {badge}
          </NeonText>
        </View>
      )}
    </Pressable>
  );
}

function FeaturedMemberCard({ member, onPress }: { member: FeaturedMember; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard tone="purple" padding={Spacing['4']} style={styles.featuredCard}>
        <Avatar uri={member.avatar_url} displayName={member.display_name ?? member.username} size="md" />
        <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.featuredName} numberOfLines={1}>
          {member.display_name ?? member.username ?? 'Member'}
        </NeonText>
        {member.username && (
          <NeonText variant="body" tone="magenta" style={styles.featuredUsername} numberOfLines={1}>
            @{member.username}
          </NeonText>
        )}
        {member.contribution_count !== undefined && (
          <Badge tone="lime" dot>{member.contribution_count} approved</Badge>
        )}
        {member.xp !== undefined && (
          <View style={styles.featuredXp}>
            <Zap color={Palette.neonCyan} size={11} />
            <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.featuredXpText}>
              {member.xp.toLocaleString()}
            </NeonText>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

function SectionTitle({
  title,
  tone,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  tone: 'cyan' | 'lime' | 'magenta' | 'amber' | 'purple';
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colorMap = {
    cyan: Palette.neonCyan,
    lime: Palette.neonLime,
    magenta: Palette.neonMagenta,
    amber: Palette.neonAmber,
    purple: Palette.purpleGlow,
  };
  const color = colorMap[tone];
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleLeft}>
        <View style={[styles.sectionAccent, { backgroundColor: color }]} />
        {icon}
        <NeonText variant="heading" weight="semiBold" tone={tone === 'purple' ? 'purple' : tone} style={styles.sectionTitleText}>
          {title.toUpperCase()}
        </NeonText>
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10}>
          <View style={styles.viewAllRow}>
            <NeonText variant="body" weight="semiBold" tone={tone === 'purple' ? 'purple' : tone} style={styles.viewAllText}>
              {actionLabel}
            </NeonText>
            <ChevronRight color={color} size={14} />
          </View>
        </Pressable>
      )}
    </View>
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
    backgroundColor: 'rgba(138,43,226,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(138,43,226,0.3)',
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
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: Spacing['2'],
    backgroundColor: 'rgba(138,43,226,0.15)',
    borderWidth: 1,
    borderColor: Palette.purpleGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: Typography.sizes.xs,
  },
  reputationCard: {
    gap: Spacing['3'],
  },
  repHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repTitle: {
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
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontSize: Typography.sizes.xs,
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  quickNav: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['4'],
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickNavIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  quickNavBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,45,111,0.2)',
    borderWidth: 1,
    borderColor: Palette.neonRose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavBadgeText: {
    fontSize: 9,
  },
  section: {
    gap: Spacing['3'],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitleText: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: Typography.sizes.xs,
  },
  hScroll: {
    gap: Spacing['3'],
    paddingRight: Spacing['2'],
  },
  featuredCard: {
    width: 140,
    alignItems: 'center',
    gap: Spacing['2'],
  },
  featuredName: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  featuredUsername: {
    fontSize: Typography.sizes.xs,
  },
  featuredXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredXpText: {
    fontSize: 10,
  },
  activityCard: {
    gap: 0,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  activityMeta: {
    flex: 1,
    gap: 2,
  },
  activityDesc: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: Typography.sizes.xs,
  },
  announceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(255,0,229,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announceTitle: {
    fontSize: Typography.sizes.sm,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
