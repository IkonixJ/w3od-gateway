import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  UserCheck,
  ShieldAlert,
  Download,
  Megaphone,
  Gift,
  UserPlus,
  LifeBuoy,
  Wifi,
  TrendingUp,
  ChevronRight,
  ArrowRightLeft,
  KeyRound,
  Bell,
  ScrollText,
  BarChart3,
  type LucideIcon,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Avatar,
  Divider,
  StatCard,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { RequireRole } from '@/lib/rbac';
import {
  getAdminStats,
  getRecentActivity,
  formatNumber,
  formatDateTime,
  type AdminStats,
  type ActivityEntry,
} from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

export default function AdminScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminHomeContent />
    </RequireRole>
  );
}

function AdminHomeContent() {
  const router = useRouter();
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, a] = await Promise.all([getAdminStats(), getRecentActivity(15)]);
    setStats(s);
    setActivity(a);
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

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonAmber} />
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonAmber} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <ShieldAlert color={Palette.neonAmber} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
              ADMIN GATEWAY
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'} · {profile?.display_name ?? profile?.username}
            </NeonText>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            hitSlop={10}
            style={styles.switchBtn}
          >
            <ArrowRightLeft color={Palette.neonCyan} size={16} />
            <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.switchBtnText}>
              Member
            </NeonText>
          </Pressable>
        </View>

        {/* Stat cards grid */}
        <View style={styles.statsGrid}>
          <StatCardMini
            icon={<Users color={Palette.neonCyan} size={16} />}
            label="Total Members"
            value={stats ? formatNumber(stats.total_members) : '—'}
            tone="cyan"
            onPress={() => router.push('/(tabs)/admin-members')}
          />
          <StatCardMini
            icon={<Wifi color={Palette.neonLime} size={16} />}
            label="Online Now"
            value={stats ? formatNumber(stats.online_members) : '—'}
            tone="lime"
          />
          <StatCardMini
            icon={<UserCheck color={Palette.neonLime} size={16} />}
            label="Verified"
            value={stats ? formatNumber(stats.verified_members) : '—'}
            tone="lime"
          />
          <StatCardMini
            icon={<ShieldAlert color={Palette.neonAmber} size={16} />}
            label="Pending KYC"
            value={stats ? formatNumber(stats.pending_kyc) : '—'}
            tone="amber"
            onPress={() => router.push('/(tabs)/admin-kyc')}
          />
          <StatCardMini
            icon={<Download color={Palette.neonMagenta} size={16} />}
            label="Pending Redemptions"
            value={stats ? formatNumber(stats.pending_redemptions) : '—'}
            tone="magenta"
            onPress={() => router.push('/(tabs)/admin-redemptions')}
          />
          <StatCardMini
            icon={<Megaphone color={Palette.neonLime} size={16} />}
            label="Active Campaigns"
            value={stats ? formatNumber(stats.active_campaigns) : '—'}
            tone="lime"
            onPress={() => router.push('/(tabs)/admin-campaigns')}
          />
          <StatCardMini
            icon={<Gift color={Palette.neonAmber} size={16} />}
            label="Total Rewards Issued"
            value={stats ? formatNumber(Math.round(stats.total_rewards)) : '—'}
            tone="amber"
          />
          <StatCardMini
            icon={<UserPlus color={Palette.neonCyan} size={16} />}
            label="New Today"
            value={stats ? formatNumber(stats.today_members) : '—'}
            tone="cyan"
          />
          <StatCardMini
            icon={<LifeBuoy color={Palette.neonRose} size={16} />}
            label="Open Tickets"
            value={stats ? formatNumber(stats.open_tickets) : '—'}
            tone="rose"
            onPress={() => router.push('/(tabs)/admin-support')}
          />
        </View>

        {/* Quick actions */}
        <SectionTitle title="Quick Actions" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['4']} style={styles.quickActionsCard}>
          <QuickActionRow icon={Users} label="Members" onPress={() => router.push('/(tabs)/admin-members')} />
          <Divider tone="white" />
          <QuickActionRow icon={Gift} label="Credit Rewards" onPress={() => router.push('/(tabs)/admin-rewards')} />
          <Divider tone="white" />
          <QuickActionRow icon={Download} label="Redemptions" onPress={() => router.push('/(tabs)/admin-redemptions')} />
          <Divider tone="white" />
          <QuickActionRow icon={Megaphone} label="Campaigns" onPress={() => router.push('/(tabs)/admin-campaigns')} />
          <Divider tone="white" />
          <QuickActionRow icon={KeyRound} label="Invite Codes" onPress={() => router.push('/(tabs)/admin-invites')} />
          <Divider tone="white" />
          <QuickActionRow icon={Bell} label="Announcements" onPress={() => router.push('/(tabs)/admin-announcements')} />
          <Divider tone="white" />
          <QuickActionRow icon={LifeBuoy} label="Support Center" onPress={() => router.push('/(tabs)/admin-support')} />
          <Divider tone="white" />
          <QuickActionRow icon={BarChart3} label="Analytics" onPress={() => router.push('/(tabs)/admin-analytics')} />
          {profile?.role === 'super_admin' && (
            <>
              <Divider tone="white" />
              <QuickActionRow icon={ScrollText} label="Audit Logs" onPress={() => router.push('/(tabs)/admin-audit')} tone="rose" />
            </>
          )}
        </GlassCard>

        {/* Recent activity feed */}
        <SectionTitle title="Recent Activity" tone="amber" />
        {activity.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['4']} style={styles.emptyCard}>
            <NeonText variant="body" tone="muted" style={styles.emptyText}>
              No recent activity to show.
            </NeonText>
          </GlassCard>
        ) : (
          <GlassCard tone="amber" padding={Spacing['4']} style={styles.activityCard}>
            {activity.map((entry, idx) => (
              <View key={entry.user_id + idx}>
                {idx > 0 && <Divider tone="white" />}
                <View style={styles.activityRow}>
                  <Avatar uri={entry.avatar_url} displayName={entry.display_name} size="sm" />
                  <View style={styles.activityMeta}>
                    <NeonText variant="body" weight="semiBold" tone="amber" style={styles.activityDesc}>
                      {entry.description}
                    </NeonText>
                    <NeonText variant="body" tone="muted" style={styles.activityTime}>
                      {formatDateTime(entry.created_at)}
                    </NeonText>
                  </View>
                  <Badge tone="cyan">
                    <Text style={styles.activityBadgeText}>{entry.type.toUpperCase()}</Text>
                  </Badge>
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

function StatCardMini({
  icon,
  label,
  value,
  tone,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'cyan' | 'lime' | 'amber' | 'magenta' | 'rose';
  onPress?: () => void;
}) {
  const Wrap = onPress ? Pressable : View;
  const colorMap = {
    cyan: Palette.neonCyan, lime: Palette.neonLime, amber: Palette.neonAmber,
    magenta: Palette.neonMagenta, rose: Palette.neonRose,
  };
  const color = colorMap[tone];

  return (
    <Wrap onPress={onPress} style={styles.statMiniWrap}>
      <GlassCard tone={tone} padding={Spacing['3']} style={styles.statMiniCard}>
        <View style={styles.statMiniTop}>
          <View style={[styles.statMiniIcon, { backgroundColor: `${color}15` }]}>{icon}</View>
          {onPress && <ChevronRight color={Palette.textTertiary} size={14} />}
        </View>
        <Text style={styles.statMiniValue}>{value}</Text>
        <Text style={styles.statMiniLabel}>{label}</Text>
      </GlassCard>
    </Wrap>
  );
}

function QuickActionRow({
  icon: Icon,
  label,
  onPress,
  tone = 'cyan',
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: 'cyan' | 'rose';
}) {
  const color = tone === 'rose' ? Palette.neonRose : Palette.neonCyan;
  return (
    <Pressable onPress={onPress} style={styles.quickActionRow}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Icon color={color} size={18} />
      </View>
      <NeonText variant="body" weight="semiBold" tone={tone} style={styles.quickActionLabel}>
        {label}
      </NeonText>
      <ChevronRight color={Palette.textTertiary} size={18} />
    </Pressable>
  );
}

function SectionTitle({ title, tone }: { title: string; tone: 'cyan' | 'amber' }) {
  const color = tone === 'cyan' ? Palette.neonCyan : Palette.neonAmber;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: color }]} />
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>
        {title.toUpperCase()}
      </NeonText>
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
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    borderRadius: Radii.md,
  },
  switchBtnText: {
    fontSize: Typography.sizes.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['3'],
  },
  statMiniWrap: {
    flexBasis: '31%',
    flexGrow: 1,
  },
  statMiniCard: {
    gap: Spacing['1'],
  },
  statMiniTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMiniValue: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes.lg,
    color: Palette.textPrimary,
  },
  statMiniLabel: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: 9,
    color: Palette.textTertiary,
    letterSpacing: 0.3,
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
  quickActionsCard: {
    gap: 0,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    flex: 1,
    fontSize: Typography.sizes.sm,
  },
  activityCard: {
    gap: 0,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['2'],
  },
  activityMeta: {
    flex: 1,
    gap: 2,
  },
  activityDesc: {
    fontSize: Typography.sizes.sm,
  },
  activityTime: {
    fontSize: Typography.sizes.xs,
  },
  activityBadgeText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 9,
    color: Palette.bg950,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
