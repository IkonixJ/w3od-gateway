import { useState, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, ShieldAlert, ShieldCheck, Coins, Gavel, Megaphone,
  Ticket, UserCog, Clock, ChevronDown, ChevronUp, FileJson, ScrollText,
} from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, NeonButton, Badge, Divider } from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import { getAuditLogs, formatDateTime, type AuditLog } from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

type ActionTone = 'rose' | 'lime' | 'amber' | 'cyan' | 'blue' | 'purple' | 'magenta';

const PAGE_SIZE = 25;

export default function AdminAuditScreen() {
  return (
    <RequireRole role="super_admin" fallback="/(tabs)">
      <AdminAuditContent />
    </RequireRole>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatActionName(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function actionTone(action: string): ActionTone {
  const a = action.toLowerCase();
  if (a.includes('suspend') || a.includes('ban') || a.includes('disable') || a.includes('close') || a.includes('reject')) {
    return 'rose';
  }
  if (a.includes('credit') || a.includes('reward') || a.includes('reactivate') || a.includes('approve') || a.includes('paid')) {
    return 'lime';
  }
  if (a.includes('review') || a.includes('verify') || a.includes('update') || a.includes('edit')) {
    return 'amber';
  }
  if (a.includes('announce') || a.includes('broadcast')) {
    return 'magenta';
  }
  if (a.includes('invite')) {
    return 'blue';
  }
  if (a.includes('ticket') || a.includes('support')) {
    return 'purple';
  }
  return 'cyan';
}

function actionIcon(action: string) {
  const a = action.toLowerCase();
  const size = 18;
  if (a.includes('suspend') || a.includes('ban')) return <ShieldAlert color={Palette.neonRose} size={size} />;
  if (a.includes('reactivate')) return <ShieldCheck color={Palette.neonLime} size={size} />;
  if (a.includes('credit') || a.includes('reward')) return <Coins color={Palette.neonLime} size={size} />;
  if (a.includes('review') || a.includes('reject') || a.includes('approve')) return <Gavel color={Palette.neonAmber} size={size} />;
  if (a.includes('announce') || a.includes('broadcast')) return <Megaphone color={Palette.neonMagenta} size={size} />;
  if (a.includes('invite')) return <Ticket color={Palette.electricBlue} size={size} />;
  if (a.includes('ticket') || a.includes('support')) return <ScrollText color={Palette.purpleGlow} size={size} />;
  if (a.includes('role') || a.includes('member')) return <UserCog color={Palette.neonCyan} size={size} />;
  return <FileJson color={Palette.neonCyan} size={size} />;
}

function targetIcon(type: string | null) {
  const t = (type ?? '').toLowerCase();
  const size = 13;
  if (t.includes('member')) return <UserCog color={Palette.textTertiary} size={size} />;
  if (t.includes('redemption')) return <Coins color={Palette.textTertiary} size={size} />;
  if (t.includes('announce')) return <Megaphone color={Palette.textTertiary} size={size} />;
  if (t.includes('invite')) return <Ticket color={Palette.textTertiary} size={size} />;
  if (t.includes('ticket')) return <ScrollText color={Palette.textTertiary} size={size} />;
  return <FileJson color={Palette.textTertiary} size={size} />;
}

function userLabel(name: string | null, username: string | null): string {
  if (name && username) return `${name}  @${username}`;
  if (name) return name;
  if (username) return `@${username}`;
  return '—';
}

const TONE_COLOR: Record<ActionTone, string> = {
  rose: Palette.neonRose,
  lime: Palette.neonLime,
  amber: Palette.neonAmber,
  cyan: Palette.neonCyan,
  blue: Palette.electricBlue,
  purple: Palette.purpleGlow,
  magenta: Palette.neonMagenta,
};

// ─── Main content ────────────────────────────────────────────────────────────

function AdminAuditContent() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadInitial = useCallback(async () => {
    const data = await getAuditLogs(PAGE_SIZE, 0);
    setLogs(data);
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInitial();
  }, [loadInitial]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const offset = logs.length;
    const data = await getAuditLogs(PAGE_SIZE, offset);
    setLogs((prev) => [...prev, ...data]);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, logs.length]);

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonRose} colors={[Palette.neonRose]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonRose} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="rose" style={styles.title}>AUDIT LOGS</NeonText>
          <View style={{ width: 22 }} />
        </View>

        <NeonText variant="body" tone="muted" style={styles.subtitle}>
          Immutable record of every administrative action performed on the gateway.
        </NeonText>

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonRose} />
          </View>
        ) : logs.length === 0 ? (
          <GlassCard tone="rose" padding={Spacing['6']} style={styles.emptyCard}>
            <ScrollText color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>No audit logs</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Administrative actions will appear here once they are performed.
            </NeonText>
          </GlassCard>
        ) : (
          <>
            {logs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))}

            {/* Load more */}
            {hasMore ? (
              <NeonButton
                variant="outline"
                fullWidth
                loading={loadingMore}
                onPress={handleLoadMore}
                leftIcon={<ChevronDown color={Palette.neonRose} size={16} />}
              >
                Load More
              </NeonButton>
            ) : (
              <View style={styles.endMarker}>
                <Divider tone="white" />
                <NeonText variant="body" tone="muted" style={styles.endText}>END OF LOGS</NeonText>
                <Divider tone="white" />
              </View>
            )}
          </>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Audit log card ──────────────────────────────────────────────────────────

function AuditLogCard({ log }: { log: AuditLog }) {
  const tone = actionTone(log.action);
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <GlassCard tone={tone} gradientBorder padding={Spacing['5']} style={styles.card}>
      {/* Header row: icon + action */}
      <View style={styles.cardHeader}>
        <View style={styles.actionRow}>
          <View style={[styles.iconWrap, { borderColor: `${TONE_COLOR[tone]}40`, backgroundColor: `${TONE_COLOR[tone]}14` }]}>
            {actionIcon(log.action)}
          </View>
          <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.actionName}>
            {formatActionName(log.action)}
          </NeonText>
        </View>
        <Badge tone={tone} dot>{(log.target_type ?? 'system').toUpperCase()}</Badge>
      </View>

      <Divider tone="white" />

      {/* Meta rows */}
      <View style={styles.metaSection}>
        <MetaRow
          icon={<UserCog color={Palette.textTertiary} size={13} />}
          label="Admin"
          value={userLabel(log.admin_display_name, log.admin_username)}
          valueTone="cyan"
        />
        <MetaRow
          icon={targetIcon(log.target_type)}
          label="Target"
          value={userLabel(log.target_display_name, log.target_username)}
          valueTone="lime"
        />
        <MetaRow
          icon={<Clock color={Palette.textTertiary} size={13} />}
          label="When"
          value={formatDateTime(log.created_at)}
          valueTone="muted"
        />
      </View>

      {/* Details */}
      {hasDetails && (
        <>
          <Divider tone="white" />
          <Pressable style={styles.detailsToggle} onPress={() => setExpanded((e) => !e)} hitSlop={8}>
            <View style={styles.detailsToggleLeft}>
              <FileJson color={Palette.textTertiary} size={14} />
              <NeonText variant="body" weight="medium" tone="muted" style={styles.detailsLabel}>DETAILS</NeonText>
            </View>
            {expanded ? <ChevronUp color={Palette.textSecondary} size={16} /> : <ChevronDown color={Palette.textSecondary} size={16} />}
          </Pressable>
          {expanded && (
            <View style={styles.detailsBox}>
              {Object.entries(log.details as Record<string, unknown>).map(([key, value]) => (
                <View key={key} style={styles.detailRow}>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.detailKey}>{key}</NeonText>
                  <NeonText variant="body" tone="muted" style={styles.detailValue}>{formatDetailValue(value)}</NeonText>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </GlassCard>
  );
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function MetaRow({
  icon, label, value, valueTone,
}: {
  icon: React.ReactNode; label: string; value: string; valueTone: 'cyan' | 'lime' | 'muted';
}) {
  return (
    <View style={styles.metaRow}>
      {icon}
      <NeonText variant="body" tone="muted" style={styles.metaLabel}>{label}</NeonText>
      <NeonText variant="body" weight="semiBold" tone={valueTone} style={styles.metaValue} numberOfLines={1}>
        {value}
      </NeonText>
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
  subtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
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
  footerSpace: {
    height: Spacing['4'],
  },
  // Card
  card: {
    gap: Spacing['3'],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing['2'],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionName: {
    fontSize: Typography.sizes.md,
    flexShrink: 1,
  },
  metaSection: {
    gap: Spacing['2'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  metaLabel: {
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  metaValue: {
    fontSize: Typography.sizes.xs,
    textAlign: 'right',
    flexShrink: 1,
  },
  // Details
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['1'],
  },
  detailsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  detailsLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  detailsBox: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: Spacing['3'],
    gap: Spacing['2'],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['2'],
  },
  detailKey: {
    fontSize: Typography.sizes.xs,
    minWidth: 80,
  },
  detailValue: {
    fontSize: Typography.sizes.xs,
    flex: 1,
    flexShrink: 1,
  },
  // End marker
  endMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  endText: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
});
