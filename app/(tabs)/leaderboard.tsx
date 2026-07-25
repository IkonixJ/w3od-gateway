import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import {
  Trophy,
  Zap,
  Gift,
  Users,
  UserPlus,
  Crown,
  Medal,
  Flame,
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
import { getLevelInfo, getRankColor } from '@/lib/wallet';
import { getLeaderboard } from '@/lib/campaign-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type {
  LeaderboardCategory,
  LeaderboardPeriod,
  LeaderboardEntry,
} from '@/types/campaigns';
import type { LucideIcon } from 'lucide-react-native';

const CATEGORIES: { value: LeaderboardCategory; label: string; icon: LucideIcon; tone: 'cyan' | 'lime' | 'magenta' | 'blue' }[] = [
  { value: 'xp', label: 'Top XP', icon: Zap, tone: 'cyan' },
  { value: 'contributions', label: 'Top Contributors', icon: Users, tone: 'lime' },
  { value: 'earnings', label: 'Top Earners', icon: Gift, tone: 'magenta' },
  { value: 'referrers', label: 'Top Referrers', icon: UserPlus, tone: 'blue' },
];

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All Time' },
];

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const [category, setCategory] = useState<LeaderboardCategory>('xp');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getLeaderboard(category, period);
    setEntries(data);
    setLoading(false);
    setRefreshing(false);
  }, [category, period]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const levelInfo = getLevelInfo(profile?.xp ?? 0);
  const myRankColor = getRankColor(levelInfo.level);
  const activeCategory = CATEGORIES.find((c) => c.value === category)!;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonAmber} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Trophy color={Palette.neonAmber} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
              LEADERBOARD
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {activeCategory.label} · {PERIODS.find((p) => p.value === period)?.label}
            </NeonText>
          </View>
        </View>

        {/* My rank card */}
        {profile && (
          <GlassCard tone="amber" gradientBorder padding={Spacing['4']} style={styles.myRankCard}>
            <Avatar uri={profile.avatar_url} displayName={profile.display_name} size="md" />
            <View style={styles.myRankMeta}>
              <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.myRankName}>
                {profile.display_name ?? profile.username ?? 'You'}
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.myRankSub}>
                {levelInfo.rank} · Level {levelInfo.level} · {profile.xp.toLocaleString()} XP
              </NeonText>
            </View>
            <Badge tone="amber">
              <Text style={styles.myRankBadgeText}>YOU</Text>
            </Badge>
          </GlassCard>
        )}

        {/* Category tabs */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = cat.value === category;
            return (
              <PressableCat
                key={cat.value}
                active={isActive}
                tone={cat.tone}
                onPress={() => setCategory(cat.value)}
                icon={<Icon color={isActive ? Palette.bg950 : Palette.textTertiary} size={14} />}
                label={cat.label}
              />
            );
          })}
        </View>

        {/* Period tabs */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const isActive = p.value === period;
            return (
              <Pressable
                key={p.value}
                onPress={() => setPeriod(p.value)}
                style={[
                  styles.periodChip,
                  isActive && styles.periodChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    isActive && styles.periodChipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Leaderboard list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonAmber} />
          </View>
        ) : entries.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['6']} style={styles.emptyCard}>
            <Trophy color={Palette.textTertiary} size={32} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No rankings yet
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Complete campaigns and earn rewards to climb the leaderboard.
            </NeonText>
          </GlassCard>
        ) : (
          <View style={styles.listSection}>
            {entries.map((entry, idx) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                rank={idx + 1}
                category={category}
                isMe={entry.user_id === profile?.id}
              />
            ))}
          </View>
        )}

        {/* Privacy notice */}
        <View style={styles.privacyNotice}>
          <Medal color={Palette.textTertiary} size={14} />
          <NeonText variant="body" tone="muted" style={styles.privacyText}>
            Wallet balances are never displayed publicly. Rankings show XP,
            contributions, earnings from campaigns, and referrals only.
          </NeonText>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

function PressableCat({
  active,
  tone,
  onPress,
  icon,
  label,
}: {
  active: boolean;
  tone: 'cyan' | 'lime' | 'magenta' | 'blue';
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const bgColor = active
    ? (tone === 'cyan' ? Palette.neonCyan : tone === 'lime' ? Palette.neonLime : tone === 'magenta' ? Palette.neonMagenta : Palette.electricBlue)
    : Palette.glass300;
  const borderColor = active
    ? (tone === 'cyan' ? 'rgba(0,240,255,0.5)' : tone === 'lime' ? 'rgba(182,255,0,0.5)' : tone === 'magenta' ? 'rgba(255,0,229,0.5)' : 'rgba(30,144,255,0.5)')
    : 'rgba(255,255,255,0.08)';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.categoryChip, { backgroundColor: bgColor, borderColor }]}
    >
      {icon}
      <Text style={[styles.categoryChipText, { color: active ? Palette.bg950 : Palette.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function LeaderboardRow({
  entry,
  rank,
  category,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  category: LeaderboardCategory;
  isMe: boolean;
}) {
  const medalColor = rank === 1 ? Palette.neonAmber : rank === 2 ? Palette.textSecondary : rank === 3 ? Palette.neonRose : Palette.textTertiary;
  const MedalIcon = rank <= 3 ? (rank === 1 ? Crown : Medal) : Flame;

  const valueLabel = () => {
    if (category === 'xp') return `${(entry.xp ?? 0).toLocaleString()} XP`;
    if (category === 'contributions') return `${entry.count ?? 0} approved`;
    if (category === 'earnings') return `${(entry.total ?? 0).toLocaleString()} W3OD`;
    if (category === 'referrers') return `${entry.count ?? 0} referrals`;
    return '';
  };

  return (
    <GlassCard
      tone={isMe ? 'amber' : 'cyan'}
      gradientBorder={isMe}
      padding={Spacing['4']}
      style={styles.rankCard}
    >
      <View style={styles.rankLeft}>
        <View style={[styles.rankBadge, { borderColor: medalColor }]}>
          {rank <= 3 ? (
            <MedalIcon color={medalColor} size={16} />
          ) : (
            <Text style={[styles.rankNumber, { color: medalColor }]}>{rank}</Text>
          )}
        </View>
        <Avatar uri={entry.avatar_url} displayName={entry.display_name} size="sm" />
        <View style={styles.rankMeta}>
          <NeonText variant="heading" weight="semiBold" tone={isMe ? 'amber' : 'cyan'} style={styles.rankName} numberOfLines={1}>
            {entry.display_name ?? entry.username ?? 'Anonymous'}
          </NeonText>
          {entry.username && (
            <NeonText variant="body" tone="muted" style={styles.rankUsername} numberOfLines={1}>
              @{entry.username}
            </NeonText>
          )}
        </View>
      </View>
      <View style={styles.rankRight}>
        <NeonText variant="body" weight="semiBold" tone={isMe ? 'amber' : 'cyan'} style={styles.rankValue}>
          {valueLabel()}
        </NeonText>
      </View>
    </GlassCard>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['12'],
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
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
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
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  myRankMeta: {
    flex: 1,
    gap: 2,
  },
  myRankName: {
    fontSize: Typography.sizes.base,
  },
  myRankSub: {
    fontSize: Typography.sizes.xs,
  },
  myRankBadgeText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.bg950,
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  categoryChipText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
  },
  periodRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing['2'],
    borderRadius: Radii.sm,
    backgroundColor: Palette.glass300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  periodChipActive: {
    backgroundColor: 'rgba(255,184,0,0.15)',
    borderColor: 'rgba(255,184,0,0.5)',
  },
  periodChipText: {
    fontFamily: Typography.families.headingMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
  },
  periodChipTextActive: {
    color: Palette.neonAmber,
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
  listSection: {
    gap: Spacing['2'],
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing['3'],
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.glass300,
  },
  rankNumber: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes.sm,
  },
  rankMeta: {
    flex: 1,
    gap: 1,
  },
  rankName: {
    fontSize: Typography.sizes.sm,
  },
  rankUsername: {
    fontSize: Typography.sizes.xs,
  },
  rankRight: {
    alignItems: 'flex-end',
  },
  rankValue: {
    fontSize: Typography.sizes.xs,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2'],
    paddingTop: Spacing['2'],
  },
  privacyText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
