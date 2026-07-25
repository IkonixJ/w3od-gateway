import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Send,
  Download,
  Gift,
  History,
  Sparkles,
  Banknote,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  Copy,
  Clock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { ScreenShell, GlassCard, NeonText, Divider } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import {
  getMyWallet,
  formatW3od,
  getWalletLimits,
  getNextProcessingDate,
} from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii, Gradients, Animation } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding, responsive } from '@/design/responsive';
import { copyToClipboard } from '@/lib/file-utils';
import type { Wallet } from '@/types/wallet';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function WalletOverviewScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [nextProcessing, setNextProcessing] = useState<string | null>(null);

  const limits = getWalletLimits();

  const loadWallet = useCallback(async () => {
    setError(null);
    try {
      const w = await getMyWallet();
      setWallet(w);
    } catch {
      setError('Failed to load wallet. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadProcessingDate = useCallback(async () => {
    const d = await getNextProcessingDate();
    setNextProcessing(d);
  }, []);

  useEffect(() => {
    loadWallet();
    loadProcessingDate();
  }, [loadWallet, loadProcessingDate]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadWallet();
  }, [loadWallet]);

  const toggleHidden = useCallback(() => setHidden((h) => !h), []);

  const copyAccountNumber = useCallback(async () => {
    if (!wallet?.account_number) return;
    await copyToClipboard(wallet.account_number);
  }, [wallet?.account_number]);

  // Ambient pulse for token glyph
  const pulse = useSharedValue(0);
  pulse.value = withDelay(
    400,
    withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  );
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.3,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  if (loading) {
    return (
      <ScreenShell variant="deep">
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonLime} />
          <NeonText variant="body" tone="muted" style={styles.loadingText}>
            Loading wallet...
          </NeonText>
        </View>
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell variant="deep">
        <View style={styles.loadingWrap}>
          <NeonText variant="body" tone="rose">{error}</NeonText>
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
            tintColor={Palette.neonLime}
            colors={[Palette.neonLime]}
          />
        }
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <WalletIcon color={Palette.neonLime} size={22} />
            <NeonText variant="display" weight="bold" tone="lime" style={styles.headerTitle}>
              WALLET
            </NeonText>
          </View>
          <Pressable onPress={toggleHidden} hitSlop={12} style={styles.eyeBtn}>
            {hidden ? (
              <EyeOff color={Palette.textTertiary} size={18} />
            ) : (
              <Eye color={Palette.neonLime} size={18} />
            )}
          </Pressable>
        </View>

        {/* ─── Balance Hero Card ──────────────────────────────────────── */}
        <GlassCard tone="lime" gradientBorder padding={0} style={styles.balanceCard}>
          <LinearGradient
            colors={['rgba(182,255,0,0.06)', 'rgba(0,240,255,0.04)', 'rgba(5,6,10,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheen}
          />
          <View style={styles.balanceBody}>
            <View style={styles.balanceLabelRow}>
              <NeonText variant="body" weight="semiBold" tone="muted" style={styles.balanceLabel}>
                W3OD BALANCE
              </NeonText>
              <Animated.View style={[styles.tokenGlow, pulseStyle]}>
                <W3ODLogo size={16} showText={false} glowIntensity="low" />
              </Animated.View>
            </View>

            <View style={styles.balanceValueRow}>
              <NeonText
                variant="display"
                weight="bold"
                tone="lime"
                style={styles.balanceValue}
              >
                {formatW3od(wallet?.balance ?? 0, hidden)}
              </NeonText>
            </View>

            {/* Account number chip */}
            <Pressable onPress={copyAccountNumber} style={styles.accountChip}>
              <View style={styles.accountChipLeft}>
                <NeonText variant="body" tone="muted" style={styles.accountChipLabel}>
                  ACCOUNT
                </NeonText>
                <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.accountNumber}>
                  {wallet?.account_number ?? '—'}
                </NeonText>
              </View>
              <Copy color={Palette.textTertiary} size={14} />
            </Pressable>
          </View>
        </GlassCard>

        {/* ─── Quick Actions ──────────────────────────────────────────── */}
        <View style={styles.quickActionsGrid}>
          <QuickActionTile
            label="Send"
            icon={<Send color={Palette.neonCyan} size={20} />}
            tone="cyan"
            onPress={() => router.push('/(tabs)/wallet/send')}
          />
          <QuickActionTile
            label="Receive"
            icon={<Download color={Palette.neonLime} size={20} />}
            tone="lime"
            onPress={() => router.push('/(tabs)/wallet/receive')}
          />
          <QuickActionTile
            label="Redeem"
            icon={<Gift color={Palette.neonAmber} size={20} />}
            tone="amber"
            onPress={() => router.push('/(tabs)/wallet/redemption')}
          />
          <QuickActionTile
            label="History"
            icon={<History color={Palette.electricBlue} size={20} />}
            tone="blue"
            onPress={() => router.push('/(tabs)/wallet/history')}
          />
        </View>

        {/* ─── Stats Grid ─────────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatTile
            label="Pending Redemption"
            value={formatW3od(wallet?.pending_balance ?? 0, hidden)}
            icon={<Clock color={Palette.neonAmber} size={15} />}
            tone="amber"
          />
          <StatTile
            label="Lifetime Earned"
            value={formatW3od(wallet?.lifetime_earned ?? 0, hidden)}
            icon={<TrendingUp color={Palette.neonLime} size={15} />}
            tone="lime"
          />
          <StatTile
            label="Lifetime Redeemed"
            value={formatW3od(wallet?.lifetime_redeemed ?? 0, hidden)}
            icon={<TrendingDown color={Palette.neonRose} size={15} />}
            tone="rose"
          />
          <StatTile
            label="XP Balance"
            value={(profile?.xp ?? 0).toLocaleString()}
            icon={<Zap color={Palette.neonCyan} size={15} />}
            tone="cyan"
          />
        </View>

        {/* ─── Bank account + redemption quick links ──────────────────── */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.sectionCard}>
          <NavRow
            icon={<Banknote color={Palette.neonCyan} size={20} />}
            title="Payout Account"
            subtitle="Moniepoint account for redemptions"
            onPress={() => router.push('/(tabs)/wallet/bank-account')}
            tone="cyan"
          />
          <Divider tone="white" />
          <NavRow
            icon={<Gift color={Palette.neonAmber} size={20} />}
            title="Redeem W3OD"
            subtitle={
              nextProcessing
                ? `Next processing: ${new Date(nextProcessing).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Submit a redemption request'
            }
            onPress={() => router.push('/(tabs)/wallet/redemption')}
            tone="amber"
          />
          <Divider tone="white" />
          <NavRow
            icon={<History color={Palette.electricBlue} size={20} />}
            title="Transaction History"
            subtitle="View all your transactions"
            onPress={() => router.push('/(tabs)/wallet/history')}
            tone="blue"
          />
        </GlassCard>

        {/* ─── Transfer limits info ───────────────────────────────────── */}
        <View style={styles.limitsCard}>
          <Sparkles color={Palette.textTertiary} size={14} />
          <NeonText variant="body" tone="muted" style={styles.limitsText}>
            Min transfer ₦{limits.minTransfer.toLocaleString()} · Max ₦{limits.maxDailyTransfer.toLocaleString()}/day · No fees
          </NeonText>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function QuickActionTile({
  label,
  icon,
  tone,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'lime' | 'amber' | 'blue';
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const TONE_STYLE = {
    cyan: { bg: 'rgba(0,240,255,0.08)', border: 'rgba(0,240,255,0.3)' },
    lime: { bg: 'rgba(182,255,0,0.08)', border: 'rgba(182,255,0,0.3)' },
    amber: { bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.3)' },
    blue: { bg: 'rgba(30,144,255,0.08)', border: 'rgba(30,144,255,0.3)' },
  };
  const s = TONE_STYLE[tone];

  const handlePressIn = () => {
    'worklet';
    scale.value = withSpring(0.92, Animation.spring.snappy);
  };
  const handlePressOut = () => {
    'worklet';
    scale.value = withSpring(1, Animation.spring.bouncy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.quickTileWrap}
    >
      <Animated.View
        style={[styles.quickTileIcon, { backgroundColor: s.bg, borderColor: s.border }, animatedStyle]}
      >
        {icon}
      </Animated.View>
      <NeonText variant="body" weight="semiBold" tone={tone === 'blue' ? 'blue' : tone} style={styles.quickTileLabel}>
        {label.toUpperCase()}
      </NeonText>
    </AnimatedPressable>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'lime' | 'amber' | 'rose';
}) {
  const TONE_BG = {
    cyan: 'rgba(0,240,255,0.08)',
    lime: 'rgba(182,255,0,0.08)',
    amber: 'rgba(255,184,0,0.08)',
    rose: 'rgba(255,45,111,0.08)',
  };
  return (
    <GlassCard tone={tone} padding={Spacing['4']} style={styles.statTile}>
      <View style={[styles.statIconWrap, { backgroundColor: TONE_BG[tone] }]}>{icon}</View>
      <NeonText variant="body" tone="muted" style={styles.statLabel}>
        {label.toUpperCase()}
      </NeonText>
      <NeonText variant="heading" weight="semiBold" tone={tone === 'rose' ? 'rose' : tone} style={styles.statValue}>
        {value}
      </NeonText>
    </GlassCard>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  tone: 'cyan' | 'amber' | 'blue';
}) {
  return (
    <Pressable onPress={onPress} style={styles.navRow} hitSlop={8}>
      <View style={styles.navIconWrap}>{icon}</View>
      <View style={styles.navTextWrap}>
        <NeonText variant="body" weight="semiBold" tone="cyan">
          {title}
        </NeonText>
        <NeonText variant="body" tone="muted" style={styles.navSub}>
          {subtitle}
        </NeonText>
      </View>
      <ArrowRight color={Palette.textTertiary} size={18} />
    </Pressable>
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
    gap: Spacing['3'],
  },
  loadingText: {
    fontSize: Typography.sizes.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  balanceBody: {
    padding: Spacing['5'],
    gap: Spacing['4'],
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  balanceLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  tokenGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceValue: {
    fontSize: responsive(Typography.sizes['4xl'], 30, 40),
    textShadowColor: Palette.neonLime,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    letterSpacing: -1,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['3'],
  },
  accountChipLeft: {
    gap: 2,
  },
  accountChipLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  accountNumber: {
    fontSize: Typography.sizes.base,
    letterSpacing: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing['3'],
  },
  quickTileWrap: {
    alignItems: 'center',
    gap: Spacing['2'],
    flexBasis: '23%',
    flexGrow: 1,
  },
  quickTileIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTileLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['3'],
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: Spacing['2'],
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  statValue: {
    fontSize: Typography.sizes.base,
  },
  sectionCard: {
    gap: 0,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  navIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextWrap: {
    flex: 1,
    gap: 2,
  },
  navSub: {
    fontSize: Typography.sizes.xs,
  },
  limitsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    justifyContent: 'center',
    paddingVertical: Spacing['2'],
  },
  limitsText: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  footerSpace: {
    height: Spacing['4'],
  },
});
