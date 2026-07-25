import { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Send,
  Download,
  Gift,
  History,
  Sparkles,
  MoreHorizontal,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Avatar,
  Divider,
} from '@/components/ui';
import { WalletCard } from '@/components/dashboard/WalletCard';
import { QuickActionButton } from '@/components/dashboard/QuickActionButton';
import { CampaignCard } from '@/components/dashboard/CampaignCard';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { NotificationPreview } from '@/components/dashboard/NotificationPreview';
import { useAuth } from '@/context/AuthProvider';
import { getLevelInfo } from '@/lib/wallet';
import {
  PLACEHOLDER_CAMPAIGNS,
  PLACEHOLDER_TRANSACTIONS,
  PLACEHOLDER_NOTIFICATIONS,
  PLACEHOLDER_BALANCE,
} from '@/lib/dashboard-data';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getFirstName(profile: { full_name?: string | null; display_name?: string | null; username?: string | null }): string {
  const full = profile.full_name?.trim();
  if (full) return full.split(/\s+/)[0];
  const display = profile.display_name?.trim();
  if (display) return display.split(/\s+/)[0];
  if (profile.username) return profile.username;
  return 'Agent';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const levelInfo = useMemo(() => getLevelInfo(profile?.xp ?? 0), [profile?.xp]);
  const greeting = useMemo(() => getGreeting(), []);
  const firstName = useMemo(() => getFirstName(profile ?? {}), [profile]);
  const isVerified = profile?.kyc_status === 'verified';

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'history':
        router.push('/(tabs)/wallet');
        break;
      case 'earn':
        router.push('/(tabs)/campaigns');
        break;
      default:
        // Send/Receive/Redeem/More — wallet module not built yet
        break;
    }
  }, [router]);

  const handleViewAllTransactions = useCallback(() => {
    router.push('/(tabs)/wallet');
  }, [router]);

  const handleViewAllNotifications = useCallback(() => {
    router.push('/(tabs)/notifications');
  }, [router]);

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Dashboard Header ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Avatar
              uri={profile?.avatar_url}
              displayName={profile?.display_name ?? profile?.username ?? firstName}
              size="md"
            />
            <View style={styles.headerMeta}>
              <NeonText variant="body" weight="medium" tone="muted" style={styles.greeting}>
                {greeting},
              </NeonText>
              <View style={styles.nameRow}>
                <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.firstName}>
                  {firstName}
                </NeonText>
                {isVerified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck color={Palette.neonLime} size={15} />
                  </View>
                )}
              </View>
              {profile?.username && (
                <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.username}>
                  @{profile.username}
                </NeonText>
              )}
            </View>
          </View>
        </View>

        {/* ─── Wallet Card ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <WalletCard
            balance={PLACEHOLDER_BALANCE}
            xp={profile?.xp ?? 0}
            levelInfo={levelInfo}
          />
        </View>

        {/* ─── Quick Actions ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle title="Quick Actions" tone="cyan" />
          <View style={styles.quickActionsGrid}>
            <QuickActionButton label="Send" icon="send" tone="cyan" onPress={() => handleQuickAction('send')} />
            <QuickActionButton label="Receive" icon="receive" tone="lime" onPress={() => handleQuickAction('receive')} />
            <QuickActionButton label="Redeem" icon="redeem" tone="amber" onPress={() => handleQuickAction('redeem')} />
            <QuickActionButton label="History" icon="history" tone="blue" onPress={() => handleQuickAction('history')} />
            <QuickActionButton label="Earn" icon="earn" tone="magenta" onPress={() => handleQuickAction('earn')} />
            <QuickActionButton label="More" icon="more" tone="purple" onPress={() => handleQuickAction('more')} />
          </View>
        </View>

        {/* ─── Active Campaigns ──────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle title="Active Campaigns" tone="lime" actionLabel="View All" onAction={() => router.push('/(tabs)/campaigns')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.campaignScroll}
          >
            {PLACEHOLDER_CAMPAIGNS.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </ScrollView>
        </View>

        {/* ─── Recent Transactions ───────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle
            title="Recent Transactions"
            tone="cyan"
            actionLabel="View All"
            onAction={handleViewAllTransactions}
          />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['4']} style={styles.listCard}>
            {PLACEHOLDER_TRANSACTIONS.slice(0, 5).map((tx, idx) => (
              <View key={tx.id}>
                {idx > 0 && <Divider tone="white" />}
                <TransactionItem tx={tx} />
              </View>
            ))}
          </GlassCard>
        </View>

        {/* ─── Notifications Preview ─────────────────────────────────── */}
        <View style={styles.section}>
          <SectionTitle
            title="Notifications"
            tone="magenta"
            actionLabel="View All"
            onAction={handleViewAllNotifications}
          />
          <GlassCard tone="magenta" gradientBorder padding={Spacing['4']} style={styles.listCard}>
            {PLACEHOLDER_NOTIFICATIONS.slice(0, 3).map((n, idx) => (
              <View key={n.id}>
                {idx > 0 && <Divider tone="white" />}
                <NotificationPreview item={n} />
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

function SectionTitle({
  title,
  tone,
  actionLabel,
  onAction,
}: {
  title: string;
  tone: 'cyan' | 'lime' | 'magenta';
  actionLabel?: string;
  onAction?: () => void;
}) {
  const color = tone === 'cyan' ? Palette.neonCyan : tone === 'lime' ? Palette.neonLime : Palette.neonMagenta;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleLeft}>
        <View style={[styles.sectionAccent, { backgroundColor: color }]} />
        <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>
          {title.toUpperCase()}
        </NeonText>
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} style={styles.viewAllBtn}>
          <Text style={[styles.viewAllText, { color }]}>View All</Text>
          <ChevronRight color={color} size={14} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['6'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: Spacing['3'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  headerMeta: {
    flex: 1,
    gap: 1,
  },
  greeting: {
    fontSize: Typography.sizes.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  firstName: {
    fontSize: Typography.sizes.xl,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(182,255,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: Typography.sizes.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing['4'],
  },
  campaignScroll: {
    gap: Spacing['4'],
    paddingRight: Spacing['2'],
  },
  listCard: {
    gap: 0,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: Typography.sizes.base,
    letterSpacing: Typography.letterSpacings.wide,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: 0.3,
  },
  footerSpace: {
    height: Spacing['4'],
  },
});
