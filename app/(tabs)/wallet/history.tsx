import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  RotateCw,
  Sparkles,
  X,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
  Divider,
  Badge,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getTransactions, formatAmount, formatW3od } from '@/lib/wallet-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { TransactionWithProfiles, TransactionType, TransactionStatus } from '@/types/wallet';

const TYPE_CONFIG: Record<
  TransactionType,
  { icon: LucideIcon; color: string; bg: string; sign: string; label: string }
> = {
  transfer: { icon: ArrowUpRight, color: Palette.neonRose, bg: 'rgba(255,45,111,0.1)', sign: '-', label: 'TRANSFER' },
  reward: { icon: Gift, color: Palette.neonCyan, bg: 'rgba(0,240,255,0.1)', sign: '+', label: 'REWARD' },
  redemption: { icon: RotateCw, color: Palette.neonAmber, bg: 'rgba(255,184,0,0.1)', sign: '-', label: 'REDEMPTION' },
  system: { icon: Sparkles, color: Palette.purpleGlow, bg: 'rgba(138,43,226,0.1)', sign: '+', label: 'SYSTEM' },
};

const STATUS_COLOR: Record<TransactionStatus, string> = {
  completed: Palette.success,
  pending: Palette.warning,
  failed: Palette.error,
};

const TYPE_FILTERS: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Transfers', value: 'transfer' },
  { label: 'Rewards', value: 'reward' },
  { label: 'Redemptions', value: 'redemption' },
];

const STATUS_FILTERS: { label: string; value: TransactionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WalletHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadTransactions = useCallback(async () => {
    const data = await getTransactions({ search, type: typeFilter, status: statusFilter });
    setTransactions(data);
    setLoading(false);
    setRefreshing(false);
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(loadTransactions, 350);
    return () => clearTimeout(t);
  }, [loadTransactions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [typeFilter, statusFilter]);

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
            HISTORY
          </NeonText>
          <Pressable onPress={() => setShowFilters((s) => !s)} hitSlop={10}>
            <View style={styles.filterBtn}>
              <SlidersHorizontal color={Palette.neonCyan} size={18} />
              {activeFilterCount > 0 && <View style={styles.filterDot} />}
            </View>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search color={Palette.textTertiary} size={18} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search reference, name, description..."
            placeholderTextColor={Palette.textDisabled}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <X color={Palette.textTertiary} size={16} />
            </Pressable>
          )}
        </View>

        {/* Filters */}
        {showFilters && (
          <GlassCard tone="cyan" padding={Spacing['4']} style={styles.filtersCard}>
            <NeonText variant="body" weight="semiBold" tone="muted" style={styles.filterGroupLabel}>
              TYPE
            </NeonText>
            <View style={styles.filterChips}>
              {TYPE_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={typeFilter === f.value}
                  onPress={() => setTypeFilter(f.value)}
                />
              ))}
            </View>
            <View style={styles.filterDivider} />
            <NeonText variant="body" weight="semiBold" tone="muted" style={styles.filterGroupLabel}>
              STATUS
            </NeonText>
            <View style={styles.filterChips}>
              {STATUS_FILTERS.map((f) => (
                <FilterChip
                  key={f.value}
                  label={f.label}
                  active={statusFilter === f.value}
                  onPress={() => setStatusFilter(f.value)}
                />
              ))}
            </View>
          </GlassCard>
        )}

        {/* Active filter summary */}
        {(typeFilter !== 'all' || statusFilter !== 'all') && (
          <View style={styles.activeFiltersRow}>
            <NeonText variant="body" tone="muted" style={styles.activeFiltersText}>
              {transactions.length} result{transactions.length !== 1 ? 's' : ''}
              {typeFilter !== 'all' && ` · ${typeFilter}`}
              {statusFilter !== 'all' && ` · ${statusFilter}`}
            </NeonText>
            <Pressable
              onPress={() => {
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              hitSlop={8}
            >
              <NeonText variant="body" weight="semiBold" tone="cyan">
                Clear
              </NeonText>
            </Pressable>
          </View>
        )}

        {/* Transactions list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonCyan} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Gift color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No transactions yet
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Your transaction history will appear here once you start sending or receiving W3OD.
            </NeonText>
          </View>
        ) : (
          <GlassCard tone="cyan" gradientBorder padding={Spacing['4']} style={styles.listCard}>
            {transactions.map((tx, idx) => {
              const cfg = TYPE_CONFIG[tx.type];
              const Icon = cfg.icon;
              const isIncoming = tx.receiver_id === profile?.id;
              const counterparty =
                isIncoming
                  ? tx.sender_display_name ?? tx.sender_username ?? 'Member'
                  : tx.receiver_display_name ?? tx.receiver_username ?? 'Member';
              const avatarSeed = isIncoming ? tx.sender_username : tx.receiver_username;
              const sign = tx.type === 'reward' || isIncoming ? '+' : cfg.sign;
              const amountColor = sign === '+' ? Palette.neonLime : cfg.color;

              return (
                <View key={tx.id}>
                  {idx > 0 && <Divider tone="white" />}
                  <Pressable
                    onPress={() => router.push(`/(tabs)/wallet/transaction-detail?ref=${tx.reference}`)}
                    style={styles.txRow}
                  >
                    <View style={styles.txAvatarWrap}>
                      <Avatar uri={null} displayName={counterparty} size="sm" ring={false} />
                      <View style={[styles.txTypeBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                        <Icon color={cfg.color} size={11} strokeWidth={2.5} />
                      </View>
                    </View>

                    <View style={styles.txCenter}>
                      <NeonText variant="body" weight="semiBold" tone="cyan" numberOfLines={1}>
                        {counterparty}
                      </NeonText>
                      <View style={styles.txMetaRow}>
                        <Badge tone={tx.status === 'completed' ? 'lime' : tx.status === 'pending' ? 'amber' : 'rose'}>
                          {tx.status.toUpperCase()}
                        </Badge>
                        <NeonText variant="body" tone="muted" style={styles.txDate}>
                          {formatDate(tx.created_at)}
                        </NeonText>
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <NeonText variant="body" weight="semiBold" tone={sign === '+' ? 'lime' : 'rose'} style={styles.txAmount}>
                        {sign}₦{formatAmount(tx.amount)}
                      </NeonText>
                      <ChevronRight color={Palette.textTertiary} size={14} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </GlassCard>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          borderColor: active ? Palette.neonCyan : 'rgba(255,255,255,0.1)',
          backgroundColor: active ? 'rgba(0,240,255,0.1)' : 'transparent',
        },
      ]}
    >
      <NeonText variant="body" weight="semiBold" tone={active ? 'cyan' : 'muted'} style={styles.filterChipText}>
        {label}
      </NeonText>
    </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.neonCyan,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    backgroundColor: Palette.glassDark,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing['4'],
    height: 50,
  },
  searchInput: {
    flex: 1,
    color: Palette.textPrimary,
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.base,
    height: '100%',
  },
  filtersCard: {
    gap: Spacing['3'],
  },
  filterGroupLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  filterChip: {
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: Typography.sizes.xs,
  },
  filterDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeFiltersText: {
    fontSize: Typography.sizes.xs,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['12'],
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['12'],
    gap: Spacing['3'],
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
  },
  emptySub: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listCard: {
    gap: 0,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  txAvatarWrap: {
    position: 'relative',
  },
  txTypeBadge: {
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
  txCenter: {
    flex: 1,
    gap: 4,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  txDate: {
    fontSize: Typography.sizes.xs,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: Typography.sizes.sm,
  },
});
