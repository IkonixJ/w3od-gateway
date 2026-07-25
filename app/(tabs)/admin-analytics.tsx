import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, TrendingUp, Gift, Megaphone, RefreshCw, Users, BarChart3,
} from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, Divider } from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import { getAnalytics, formatNumber, type AnalyticsPoint } from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

// ─── Types & config ──────────────────────────────────────────────────────────

type Tone = 'cyan' | 'lime' | 'magenta' | 'amber' | 'purple';

type MetricType = 'series' | 'campaigns';

interface MetricDef {
  key: string;
  label: string;
  icon: typeof TrendingUp;
  tone: Tone;
  type: MetricType;
  showAmount: boolean;
}

const METRICS: MetricDef[] = [
  { key: 'member_growth', label: 'Member Growth', icon: TrendingUp, tone: 'cyan', type: 'series', showAmount: false },
  { key: 'rewards', label: 'Rewards', icon: Gift, tone: 'lime', type: 'series', showAmount: true },
  { key: 'campaign_participation', label: 'Campaign Participation', icon: Megaphone, tone: 'magenta', type: 'campaigns', showAmount: false },
  { key: 'redemptions', label: 'Redemptions', icon: RefreshCw, tone: 'amber', type: 'series', showAmount: true },
  { key: 'active_users', label: 'Active Users', icon: Users, tone: 'purple', type: 'series', showAmount: false },
];

const PERIODS: { label: string; days: number }[] = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const CHART_HEIGHT = 180;

const TONE_COLOR: Record<Tone, string> = {
  cyan: Palette.neonCyan,
  lime: Palette.neonLime,
  magenta: Palette.neonMagenta,
  amber: Palette.neonAmber,
  purple: Palette.purpleGlow,
};

const TONE_SUBTLE: Record<Tone, string> = {
  cyan: Palette.neonCyanSubtle,
  lime: 'rgba(182,255,0,0.12)',
  magenta: Palette.neonMagentaSubtle,
  amber: 'rgba(255,184,0,0.12)',
  purple: Palette.purpleGlowSubtle,
};

const TONE_BORDER: Record<Tone, string> = {
  cyan: Palette.neonCyanBorder,
  lime: 'rgba(182,255,0,0.4)',
  magenta: Palette.neonMagentaBorder,
  amber: 'rgba(255,184,0,0.4)',
  purple: Palette.purpleGlowBorder,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAmount(n: number): string {
  return `₦${formatNumber(Math.round(n))}`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AdminAnalyticsScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminAnalyticsContent />
    </RequireRole>
  );
}

function AdminAnalyticsContent() {
  const router = useRouter();
  const [period, setPeriod] = useState(30);
  const [activeKey, setActiveKey] = useState<string>('member_growth');
  const [data, setData] = useState<AnalyticsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const active = METRICS.find((m) => m.key === activeKey) ?? METRICS[0];

  const load = useCallback(async (days: number, metric: string) => {
    const result = await getAnalytics(metric, days);
    setData(result);
  }, []);

  useEffect(() => {
    setLoading(true);
    load(period, activeKey).finally(() => setLoading(false));
  }, [period, activeKey, load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(period, activeKey).finally(() => setRefreshing(false));
  }, [period, activeKey, load]);

  const totalAmount = active.showAmount
    ? data.reduce((sum, d) => sum + (d.amount ?? 0), 0)
    : 0;
  const totalCount = data.reduce((sum, d) => sum + (d.count ?? 0), 0);

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.neonCyan}
            colors={[Palette.neonCyan]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            ANALYTICS
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => {
            const isActive = p.days === period;
            return (
              <Pressable
                key={p.days}
                onPress={() => setPeriod(p.days)}
                style={[styles.periodChip, isActive && styles.periodChipActive]}
              >
                <NeonText
                  variant="body"
                  weight="semiBold"
                  tone={isActive ? 'cyan' : 'muted'}
                  glow={!isActive}
                  style={styles.periodChipText}
                >
                  {p.label}
                </NeonText>
              </Pressable>
            );
          })}
        </View>

        {/* Metric tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {METRICS.map((m) => {
            const isActive = m.key === activeKey;
            const Icon = m.icon;
            const color = TONE_COLOR[m.tone];
            const chipStyle: ViewStyle = isActive
              ? { backgroundColor: TONE_SUBTLE[m.tone], borderColor: TONE_BORDER[m.tone] }
              : { backgroundColor: Palette.glass300, borderColor: 'rgba(255,255,255,0.06)' };
            return (
              <Pressable
                key={m.key}
                onPress={() => setActiveKey(m.key)}
                style={[styles.metricChip, chipStyle]}
              >
                <Icon color={isActive ? color : Palette.textTertiary} size={15} />
                <NeonText
                  variant="body"
                  weight="semiBold"
                  tone={isActive ? m.tone : 'muted'}
                  glow={!isActive}
                  style={styles.metricChipText}
                >
                  {m.label}
                </NeonText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Chart card */}
        <GlassCard
          tone={active.tone}
          gradientBorder
          padding={Spacing['5']}
          style={styles.chartCard}
        >
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartIconWrap, { backgroundColor: TONE_SUBTLE[active.tone] }]}>
                <active.icon color={TONE_COLOR[active.tone]} size={18} />
              </View>
              <NeonText variant="heading" weight="semiBold" tone={active.tone} style={styles.chartTitle}>
                {active.label.toUpperCase()}
              </NeonText>
            </View>
            <NeonText variant="body" tone="muted" style={styles.periodLabel}>
              {period} day{period === 1 ? '' : 's'}
            </NeonText>
          </View>

          <Divider tone="white" />

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={TONE_COLOR[active.tone]} />
              <NeonText variant="body" tone="muted" glow={false} style={styles.loadingText}>
                Loading analytics…
              </NeonText>
            </View>
          ) : data.length === 0 ? (
            <View style={styles.emptyWrap}>
              <BarChart3 color={Palette.textTertiary} size={40} />
              <NeonText variant="heading" weight="medium" tone="muted" glow={false} style={styles.emptyTitle}>
                No data available
              </NeonText>
              <NeonText variant="body" tone="muted" glow={false} style={styles.emptySub}>
                There is no analytics data for this metric in the selected period.
              </NeonText>
            </View>
          ) : active.type === 'series' ? (
            <BarChart data={data} tone={active.tone} />
          ) : (
            <CampaignList data={data} tone={active.tone} />
          )}

          {/* Totals footer */}
          {!loading && data.length > 0 && (
            <View style={styles.totalsRow}>
              <View style={styles.totalCell}>
                <NeonText variant="body" tone="muted" glow={false} style={styles.totalLabel}>
                  Total Count
                </NeonText>
                <NeonText variant="heading" weight="semiBold" tone={active.tone} style={styles.totalValue}>
                  {formatNumber(totalCount)}
                </NeonText>
              </View>
              {active.showAmount && (
                <View style={styles.totalCell}>
                  <NeonText variant="body" tone="muted" glow={false} style={styles.totalLabel}>
                    Total Amount
                  </NeonText>
                  <NeonText variant="heading" weight="semiBold" tone={active.tone} style={styles.totalValue}>
                    {formatAmount(totalAmount)}
                  </NeonText>
                </View>
              )}
            </View>
          )}
        </GlassCard>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Bar chart (time-series) ─────────────────────────────────────────────────

function BarChart({ data, tone }: { data: AnalyticsPoint[]; tone: Tone }) {
  const color = TONE_COLOR[tone];
  const counts = data.map((d) => d.count ?? 0);
  const maxCount = Math.max(...counts, 1);
  const maxIndex = counts.indexOf(maxCount);
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartArea}>
        {data.map((d, i) => {
          const raw = d.count ?? 0;
          const h = Math.max(3, (raw / maxCount) * CHART_HEIGHT);
          const isMax = i === maxIndex && raw > 0;
          return (
            <View key={i} style={styles.barCol}>
              {isMax && (
                <NeonText
                  variant="body"
                  weight="semiBold"
                  tone={tone}
                  glow={false}
                  style={styles.barTopLabel}
                >
                  {formatNumber(raw)}
                </NeonText>
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: color,
                    shadowColor: color,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View style={styles.xAxis}>
        {data.map((d, i) => (
          <View key={i} style={styles.xLabelCol}>
            {i % labelEvery === 0 ? (
              <NeonText variant="body" tone="muted" glow={false} style={styles.xLabelText}>
                {shortDate(d.date)}
              </NeonText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Campaign participation (horizontal bars) ────────────────────────────────

function CampaignList({ data, tone }: { data: AnalyticsPoint[]; tone: Tone }) {
  const color = TONE_COLOR[tone];
  const sorted = [...data]
    .map((d) => ({ title: d.title ?? 'Untitled', count: d.participants ?? d.count ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...sorted.map((c) => c.count), 1);

  return (
    <View style={styles.campaignList}>
      {sorted.map((c, i) => {
        const pct = Math.max(4, (c.count / maxCount) * 100);
        return (
          <View key={i} style={styles.campaignRow}>
            <View style={styles.campaignTitleRow}>
              <NeonText
                variant="body"
                weight="semiBold"
                tone="cyan"
                style={styles.campaignTitle}
                numberOfLines={1}
              >
                {c.title}
              </NeonText>
              <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.campaignCount}>
                {formatNumber(c.count)}
              </NeonText>
            </View>
            <View style={styles.hBarTrack}>
              <View
                style={[
                  styles.hBar,
                  { width: `${pct}%`, backgroundColor: color, shadowColor: color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  // Period selector
  periodRow: { flexDirection: 'row', gap: Spacing['2'] },
  periodChip: {
    flex: 1, paddingVertical: Spacing['3'], borderRadius: Radii.md, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', backgroundColor: Palette.glass300, alignItems: 'center',
  },
  periodChipActive: { borderColor: Palette.neonCyanBorder, backgroundColor: Palette.neonCyanSubtle },
  periodChipText: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  // Metric tabs
  tabsRow: { flexDirection: 'row', gap: Spacing['2'], paddingVertical: 2 },
  metricChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['2'],
    paddingVertical: Spacing['2'], paddingHorizontal: Spacing['4'],
    borderRadius: Radii.full, borderWidth: 1,
  },
  metricChipText: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  // Chart card
  chartCard: { gap: Spacing['3'] },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], flex: 1 },
  chartIconWrap: { width: 34, height: 34, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  chartTitle: {
    fontSize: Typography.sizes.base,
    letterSpacing: Typography.letterSpacings.wide,
    flexShrink: 1,
  },
  periodLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  // Loading / empty
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'], gap: Spacing['3'] },
  loadingText: { fontSize: Typography.sizes.sm },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['10'], gap: Spacing['3'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  // Bar chart
  chartWrap: { gap: Spacing['2'] },
  chartArea: {
    height: CHART_HEIGHT + 22, flexDirection: 'row', alignItems: 'flex-end',
    gap: 2, paddingVertical: 2,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: {
    width: '100%',
    borderRadius: Radii.xs,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  barTopLabel: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  xAxis: { flexDirection: 'row', gap: 2 },
  xLabelCol: { flex: 1, alignItems: 'center', height: 16 },
  xLabelText: { fontSize: 9 },
  // Totals
  totalsRow: { flexDirection: 'row', gap: Spacing['3'] },
  totalCell: { flex: 1, backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'], gap: 2 },
  totalLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  totalValue: { fontSize: Typography.sizes.lg },
  // Campaign list
  campaignList: { gap: Spacing['3'], paddingVertical: Spacing['1'] },
  campaignRow: { gap: Spacing['2'] },
  campaignTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing['2'] },
  campaignTitle: { fontSize: Typography.sizes.sm, flex: 1 },
  campaignCount: { fontSize: Typography.sizes.base },
  hBarTrack: { height: 10, borderRadius: Radii.full, backgroundColor: Palette.glass300, overflow: 'hidden' },
  hBar: {
    height: '100%',
    borderRadius: Radii.full,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  footerSpace: { height: Spacing['4'] },
});
