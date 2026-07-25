import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, ShieldCheck, Calendar, Hash, UserMinus } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
  Badge,
  Divider,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getGroupInfo, removeGroupMember } from '@/lib/messaging-service';
import { formatDateTime } from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { GroupInfo as GroupInfoType, GroupMember } from '@/types/community';

export default function GroupInfoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [group, setGroup] = useState<GroupInfoType | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    if (!id) return;
    const result = await getGroupInfo(id);
    if (result.success && result.group && result.members) {
      setGroup(result.group);
      setMembers(result.members);
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInfo();
  }, [loadInfo]);

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    setRemovingId(userId);
    await removeGroupMember(id, userId);
    setRemovingId(null);
    loadInfo();
  };

  const isAdmin = members.find((m) => m.id === profile?.id)?.is_admin ?? false;

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonLime} />
        </View>
      </ScreenShell>
    );
  }

  if (!group) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.notFoundWrap}>
          <NeonText variant="heading" weight="medium" tone="muted">
            Group not found
          </NeonText>
          <Pressable onPress={() => router.back()}>
            <NeonText variant="body" weight="semiBold" tone="lime">
              Go back
            </NeonText>
          </Pressable>
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonLime} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonLime} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="lime" style={styles.title}>
            GROUP INFO
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Group identity */}
        <GlassCard tone="lime" gradientBorder padding={Spacing['6']} style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={styles.groupAvatarWrap}>
              <Users color={Palette.neonLime} size={32} />
            </View>
            <View style={styles.identityMeta}>
              <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.groupName}>
                {group.name}
              </NeonText>
              {group.description && (
                <NeonText variant="body" tone="muted" style={styles.groupDesc}>
                  {group.description}
                </NeonText>
              )}
              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Users color={Palette.neonLime} size={12} />
                  <NeonText variant="body" weight="semiBold" tone="lime" style={styles.metaText}>
                    {members.length} members
                  </NeonText>
                </View>
                <View style={styles.metaChip}>
                  <Calendar color={Palette.neonCyan} size={12} />
                  <NeonText variant="body" tone="muted" style={styles.metaText}>
                    {formatDateTime(group.created_at)}
                  </NeonText>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Members */}
        <View style={styles.section}>
          <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.sectionTitle}>
            MEMBERS ({members.length})
          </NeonText>
          <GlassCard tone="lime" padding={Spacing['4']} style={styles.membersCard}>
            {members.map((m, idx) => (
              <View key={m.id}>
                {idx > 0 && <Divider tone="white" />}
                <View style={styles.memberRow}>
                  <Avatar uri={m.avatar_url} displayName={m.display_name ?? m.username} size="sm" />
                  <View style={styles.memberMeta}>
                    <View style={styles.memberNameRow}>
                      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.memberName} numberOfLines={1}>
                        {m.display_name ?? m.username ?? 'Member'}
                      </NeonText>
                      {m.id === profile?.id && <Badge tone="lime">YOU</Badge>}
                    </View>
                    {m.username && (
                      <NeonText variant="body" tone="magenta" style={styles.memberUsername}>
                        @{m.username}
                      </NeonText>
                    )}
                  </View>
                  {m.is_admin && <Badge tone="amber" dot>ADMIN</Badge>}
                  {isAdmin && !m.is_admin && m.id !== profile?.id && (
                    <Pressable
                      onPress={() => handleRemoveMember(m.id)}
                      disabled={removingId === m.id}
                      hitSlop={10}
                    >
                      {removingId === m.id ? (
                        <ActivityIndicator color={Palette.neonRose} size={16} />
                      ) : (
                        <UserMinus color={Palette.neonRose} size={16} />
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing['4'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  identityCard: { gap: Spacing['3'] },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['4'] },
  groupAvatarWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(182,255,0,0.1)', borderWidth: 1.5, borderColor: 'rgba(182,255,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  identityMeta: { flex: 1, gap: Spacing['1'] },
  groupName: { fontSize: Typography.sizes.lg },
  groupDesc: { fontSize: Typography.sizes.sm, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap', marginTop: Spacing['1'] },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing['2'], paddingVertical: 3, borderRadius: Radii.sm, backgroundColor: Palette.glass300 },
  metaText: { fontSize: 10 },
  section: { gap: Spacing['3'] },
  sectionTitle: { fontSize: Typography.sizes.sm, letterSpacing: Typography.letterSpacings.wide },
  membersCard: { gap: 0 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  memberMeta: { flex: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  memberName: { fontSize: Typography.sizes.sm, flexShrink: 1 },
  memberUsername: { fontSize: Typography.sizes.xs },
  footerSpace: { height: Spacing['8'] },
});
