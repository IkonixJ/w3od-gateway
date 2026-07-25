import { View, Text, StyleSheet } from 'react-native';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Sparkles,
  RotateCw,
  type LucideIcon,
} from 'lucide-react-native';

import { Avatar } from '@/components/ui';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import type { TransactionRow } from '@/types/dashboard';

interface TransactionItemProps {
  tx: TransactionRow;
}

const TYPE_CONFIG: Record<
  TransactionRow['type'],
  { icon: LucideIcon; color: string; bg: string; sign: string }
> = {
  send: { icon: ArrowUpRight, color: Palette.neonRose, bg: 'rgba(255,45,111,0.1)', sign: '-' },
  receive: { icon: ArrowDownLeft, color: Palette.neonLime, bg: 'rgba(182,255,0,0.1)', sign: '+' },
  reward: { icon: Gift, color: Palette.neonCyan, bg: 'rgba(0,240,255,0.1)', sign: '+' },
  redeem: { icon: RotateCw, color: Palette.neonAmber, bg: 'rgba(255,184,0,0.1)', sign: '-' },
  stake: { icon: Sparkles, color: Palette.purpleGlow, bg: 'rgba(138,43,226,0.1)', sign: '-' },
};

const STATUS_COLOR: Record<TransactionRow['status'], string> = {
  completed: Palette.success,
  pending: Palette.warning,
  failed: Palette.error,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TransactionItem({ tx }: TransactionItemProps) {
  const cfg = TYPE_CONFIG[tx.type];
  const Icon = cfg.icon;
  const statusColor = STATUS_COLOR[tx.status];

  return (
    <View style={styles.row}>
      <View style={styles.avatarWrap}>
        <Avatar uri={null} displayName={tx.avatarSeed} size="sm" ring={false} />
        <View style={[styles.typeBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
          <Icon color={cfg.color} size={11} strokeWidth={2.5} />
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.user} numberOfLines={1}>
          {tx.user}
        </Text>
        <Text style={styles.type}>
          {tx.type.toUpperCase()} · {formatDate(tx.date)}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: cfg.color }]}>
          {cfg.sign}
          {tx.amount.toLocaleString()} W3OD
        </Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  avatarWrap: {
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bg900,
  },
  center: {
    flex: 1,
    gap: 2,
  },
  user: {
    fontFamily: Typography.families.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Palette.textPrimary,
  },
  type: {
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
    letterSpacing: 0.3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
