import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  RotateCw,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, Avatar, Divider, Badge, NeonButton } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getTransactionByReference, formatW3od, formatAmount } from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { cardMaxWidth, screenPadding } from '@/design/responsive';
import type { TransactionWithProfiles, TransactionType, TransactionStatus } from '@/types/wallet';

const TYPE_CONFIG: Record<TransactionType, { icon: LucideIcon; color: string; label: string }> = {
  transfer: { icon: ArrowUpRight, color: Palette.neonCyan, label: 'TRANSFER' },
  reward: { icon: Gift, color: Palette.neonCyan, label: 'REWARD' },
  redemption: { icon: RotateCw, color: Palette.neonAmber, label: 'REDEMPTION' },
  system: { icon: Sparkles, color: Palette.purpleGlow, label: 'SYSTEM' },
};

const STATUS_CONFIG: Record<TransactionStatus, { icon: LucideIcon; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: Palette.neonLime, label: 'Completed' },
  pending: { icon: Clock, color: Palette.neonAmber, label: 'Pending' },
  failed: { icon: XCircle, color: Palette.neonRose, label: 'Failed' },
};

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [tx, setTx] = useState<TransactionWithProfiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    getTransactionByReference(ref).then((data) => {
      setTx(data);
      setLoading(false);
    });
  }, [ref]);

  const copyReference = () => {
    if (!tx?.reference) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(tx.reference).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
        </View>
      </ScreenShell>
    );
  }

  if (!tx) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.errorWrap}>
          <NeonText variant="heading" weight="medium" tone="muted">
            Transaction not found
          </NeonText>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <NeonText variant="body" weight="semiBold" tone="cyan">
              Go back
            </NeonText>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const typeCfg = TYPE_CONFIG[tx.type];
  const statusCfg = STATUS_CONFIG[tx.status];
  const TypeIcon = typeCfg.icon;
  const StatusIcon = statusCfg.icon;
  const isIncoming = tx.receiver_id === profile?.id;
  const counterparty = isIncoming
    ? tx.sender_display_name ?? tx.sender_username ?? 'Member'
    : tx.receiver_display_name ?? tx.receiver_username ?? 'Member';
  const sign = tx.type === 'reward' || isIncoming ? '+' : '-';
  const amountColor = sign === '+' ? Palette.neonLime : Palette.neonRose;
  const d = new Date(tx.created_at);

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            RECEIPT
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Status banner */}
        <GlassCard tone={tx.status === 'completed' ? 'lime' : tx.status === 'pending' ? 'amber' : 'rose'} gradientBorder padding={Spacing['6']} style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <StatusIcon color={statusCfg.color} size={32} strokeWidth={2.5} />
          </View>
          <NeonText variant="display" weight="bold" tone={tx.status === 'completed' ? 'lime' : tx.status === 'pending' ? 'amber' : 'rose'} style={styles.statusAmount}>
            {sign}₦{formatAmount(tx.amount)}
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.statusLabel}>
            {typeCfg.label} · {statusCfg.label}
          </NeonText>
        </GlassCard>

        {/* Counterparty */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.card}>
          <NeonText variant="body" weight="semiBold" tone="muted" style={styles.sectionLabel}>
            {isIncoming ? 'FROM' : 'TO'}
          </NeonText>
          <View style={styles.counterpartyRow}>
            <Avatar
              uri={isIncoming ? tx.sender_avatar_url : tx.receiver_avatar_url}
              displayName={counterparty}
              size="md"
            />
            <View style={styles.counterpartyMeta}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.counterpartyName}>
                {counterparty}
              </NeonText>
              <NeonText variant="body" weight="semiBold" tone="magenta">
                @{isIncoming ? tx.sender_username : tx.receiver_username}
              </NeonText>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(0,240,255,0.1)', borderColor: typeCfg.color }]}>
              <TypeIcon color={typeCfg.color} size={16} />
            </View>
          </View>
        </GlassCard>

        {/* Receipt details */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.card}>
          <NeonText variant="body" weight="semiBold" tone="muted" style={styles.sectionLabel}>
            TRANSACTION DETAILS
          </NeonText>

          <DetailRow label="Reference" value={tx.reference} onCopy={copyReference} copied={copied} />
          <Divider tone="white" />
          <DetailRow label="Type" value={typeCfg.label} />
          <Divider tone="white" />
          <DetailRow label="Amount" value={formatW3od(tx.amount)} highlight />
          <Divider tone="white" />
          <DetailRow label="Fee" value="₦0.00" />
          <Divider tone="white" />
          <DetailRow label="Status" value={statusCfg.label} />
          <Divider tone="white" />
          {tx.description && (
            <>
              <DetailRow label="Description" value={tx.description} />
              <Divider tone="white" />
            </>
          )}
          <DetailRow label="Date" value={d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
          <Divider tone="white" />
          <DetailRow label="Time" value={d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })} />
        </GlassCard>

        <NeonButton variant="outline" fullWidth onPress={() => router.push('/(tabs)/wallet/history')} style={styles.backBtn}>
          View All Transactions
        </NeonButton>
      </ScrollView>
    </ScreenShell>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <NeonText variant="body" tone="muted" style={styles.detailLabel}>
        {label}
      </NeonText>
      <Pressable onPress={onCopy} disabled={!onCopy} style={styles.detailValueWrap}>
        <NeonText
          variant={highlight ? 'display' : 'body'}
          weight={highlight ? 'bold' : 'semiBold'}
          tone={highlight ? 'cyan' : 'cyan'}
          style={styles.detailValue}
        >
          {value}
        </NeonText>
        {onCopy && (
          copied ? (
            <Check color={Palette.neonLime} size={15} strokeWidth={3} />
          ) : (
            <Copy color={Palette.textTertiary} size={15} />
          )
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['4'],
    maxWidth: cardMaxWidth,
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['4'],
  },
  statusCard: {
    alignItems: 'center',
    gap: Spacing['3'],
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusAmount: {
    fontSize: Typography.sizes['3xl'],
    textShadowRadius: 14,
  },
  statusLabel: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  card: {
    gap: Spacing['3'],
  },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  counterpartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  counterpartyMeta: {
    flex: 1,
    gap: 2,
  },
  counterpartyName: {
    fontSize: Typography.sizes.base,
  },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing['2'],
    gap: Spacing['3'],
  },
  detailLabel: {
    fontSize: Typography.sizes.sm,
  },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexShrink: 1,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    textAlign: 'right',
  },
  backBtn: {
    marginTop: Spacing['2'],
  },
});
