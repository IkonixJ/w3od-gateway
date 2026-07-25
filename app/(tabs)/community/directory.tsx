import { useState, useCallback, useEffect, useRef } from 'react';
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
import { Search, ArrowLeft, X, ShieldCheck, Zap, ChevronRight } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
  Badge,
} from '@/components/ui';
import { searchMemberDirectory } from '@/lib/community-service';
import { getLevelInfo, getRankColor } from '@/lib/wallet';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { DirectoryMember } from '@/types/community';

export default function MemberDirectoryScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    const data = await searchMemberDirectory(q, 50);
    setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    runSearch(query).finally(() => setRefreshing(false));
  }, [query, runSearch]);

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonCyan} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            DIRECTORY
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search color={Palette.textTertiary} size={18} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by username or full name..."
            placeholderTextColor={Palette.textDisabled}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <X color={Palette.textTertiary} size={16} />
            </Pressable>
          )}
        </View>

        {/* Results count */}
        <View style={styles.resultRow}>
          <NeonText variant="body" tone="muted" style={styles.resultCount}>
            {loading ? 'Searching…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
          </NeonText>
        </View>

        {/* Member list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonCyan} />
          </View>
        ) : members.length === 0 ? (
          <GlassCard tone="cyan" padding={Spacing['6']} style={styles.emptyCard}>
            <Search color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No members found
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Try a different search term to find community members.
            </NeonText>
          </GlassCard>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} member={m} onPress={() => router.push(`/(tabs)/community/member-profile?id=${m.id}`)} />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

function MemberRow({ member, onPress }: { member: DirectoryMember; onPress: () => void }) {
  const levelInfo = getLevelInfo(member.xp);
  const rankColor = getRankColor(levelInfo.level);
  const isVerified = member.kyc_status === 'verified';

  return (
    <Pressable onPress={onPress}>
      <GlassCard tone="cyan" gradientBorder padding={Spacing['4']} style={styles.memberCard}>
        <View style={styles.memberRow}>
          <Avatar uri={member.avatar_url} displayName={member.display_name ?? member.username} size="md" />
          <View style={styles.memberMeta}>
            <View style={styles.memberNameRow}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.memberName} numberOfLines={1}>
                {member.display_name ?? member.username ?? 'Member'}
              </NeonText>
              {isVerified && <ShieldCheck color={Palette.neonLime} size={14} />}
            </View>
            {member.username && (
              <NeonText variant="body" tone="magenta" style={styles.memberUsername} numberOfLines={1}>
                @{member.username}
              </NeonText>
            )}
            <View style={styles.memberStats}>
              <View style={styles.statChip}>
                <Zap color={Palette.neonCyan} size={11} />
                <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.statText}>
                  {member.xp.toLocaleString()} XP
                </NeonText>
              </View>
              <Badge tone="purple" dot>{levelInfo.rank.toUpperCase()}</Badge>
            </View>
          </View>
          <ChevronRight color={Palette.textTertiary} size={18} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['3'],
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['1'],
  },
  resultCount: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
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
  memberCard: {
    gap: Spacing['2'],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  memberMeta: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  memberName: {
    fontSize: Typography.sizes.base,
    flexShrink: 1,
  },
  memberUsername: {
    fontSize: Typography.sizes.xs,
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginTop: 2,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 10,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
