import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Users,
  ArrowLeft,
  Search,
  ShieldCheck,
  Megaphone,
  ChevronRight,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
  Badge,
  Divider,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getMyConversations, getMyGroups } from '@/lib/messaging-service';
import { formatTimeAgo, formatMessageTime } from '@/lib/community-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { ConversationSummary, GroupSummary } from '@/types/community';

type Tab = 'dms' | 'groups';

export default function MessagingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('dms');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [convs, grps] = await Promise.all([
      getMyConversations(),
      getMyGroups(),
    ]);
    setConversations(convs);
    setGroups(grps);
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

  const totalUnread =
    conversations.reduce((s, c) => s + c.unread_count, 0) +
    groups.reduce((s, g) => s + g.unread_count, 0);

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonMagenta} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <MessageSquare color={Palette.neonMagenta} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>
              MESSAGES
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {totalUnread > 0 ? `${totalUnread} unread` : 'Your conversations'}
            </NeonText>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab('dms')}
            style={[styles.tab, tab === 'dms' && styles.tabActive]}
          >
            <MessageSquare color={tab === 'dms' ? Palette.neonMagenta : Palette.textTertiary} size={16} />
            <Text style={[styles.tabText, { color: tab === 'dms' ? Palette.neonMagenta : Palette.textTertiary }]}>
              DIRECT
            </Text>
            {conversations.reduce((s, c) => s + c.unread_count, 0) > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{conversations.reduce((s, c) => s + c.unread_count, 0)}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setTab('groups')}
            style={[styles.tab, tab === 'groups' && styles.tabActive]}
          >
            <Users color={tab === 'groups' ? Palette.neonLime : Palette.textTertiary} size={16} />
            <Text style={[styles.tabText, { color: tab === 'groups' ? Palette.neonLime : Palette.textTertiary }]}>
              GROUPS
            </Text>
            {groups.reduce((s, g) => s + g.unread_count, 0) > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{groups.reduce((s, g) => s + g.unread_count, 0)}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Quick link to announcements */}
        <Pressable onPress={() => router.push('/(tabs)/community/announcements')}>
          <GlassCard tone="amber" padding={Spacing['4']} style={styles.announceLink}>
            <View style={styles.announceLinkRow}>
              <View style={styles.announceIconWrap}>
                <Megaphone color={Palette.neonAmber} size={18} />
              </View>
              <View style={styles.announceLinkMeta}>
                <NeonText variant="body" weight="semiBold" tone="amber">
                  Announcement Channel
                </NeonText>
                <NeonText variant="body" tone="muted" style={styles.announceLinkSub}>
                  View community announcements
                </NeonText>
              </View>
              <ChevronRight color={Palette.textTertiary} size={18} />
            </View>
          </GlassCard>
        </Pressable>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonMagenta} />
          </View>
        ) : tab === 'dms' ? (
          conversations.length === 0 ? (
            <GlassCard tone="magenta" padding={Spacing['6']} style={styles.emptyCard}>
              <MessageSquare color={Palette.textTertiary} size={40} />
              <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
                No conversations yet
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.emptySub}>
                Find a member in the directory and send them a message to start chatting.
              </NeonText>
            </GlassCard>
          ) : (
            conversations.map((conv) => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                onPress={() => router.push(`/(tabs)/community/chat?id=${conv.id}`)}
              />
            ))
          )
        ) : groups.length === 0 ? (
          <GlassCard tone="lime" padding={Spacing['6']} style={styles.emptyCard}>
            <Users color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No groups yet
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Admins can create groups. Join one to start chatting with the community.
            </NeonText>
          </GlassCard>
        ) : (
          groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              onPress={() => router.push(`/(tabs)/community/group-chat?id=${g.id}`)}
            />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

function ConversationRow({ conv, onPress }: { conv: ConversationSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard tone="magenta" gradientBorder={conv.unread_count > 0} padding={Spacing['4']} style={styles.convCard}>
        <View style={styles.convRow}>
          <Avatar uri={conv.other_avatar_url} displayName={conv.other_display_name ?? conv.other_username} size="md" />
          <View style={styles.convMeta}>
            <View style={styles.convNameRow}>
              <NeonText variant="body" weight="semiBold" tone={conv.unread_count > 0 ? 'magenta' : 'cyan'} style={styles.convName} numberOfLines={1}>
                {conv.other_display_name ?? conv.other_username ?? 'Member'}
              </NeonText>
              {conv.other_email_verified && <ShieldCheck color={Palette.neonLime} size={12} />}
            </View>
            {conv.other_username && (
              <NeonText variant="body" tone="muted" style={styles.convUsername}>
                @{conv.other_username}
              </NeonText>
            )}
            {conv.last_message_body && (
              <NeonText variant="body" tone="muted" style={styles.convPreview} numberOfLines={1}>
                {conv.last_message_type !== 'text' ? `[${conv.last_message_type}] ` : ''}
                {conv.last_message_sender_id === conv.other_user_id ? '' : 'You: '}
                {conv.last_message_body}
              </NeonText>
            )}
          </View>
          <View style={styles.convRight}>
            {conv.last_message_at && (
              <NeonText variant="body" tone="muted" style={styles.convTime}>
                {formatMessageTime(conv.last_message_at)}
              </NeonText>
            )}
            {conv.unread_count > 0 && (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadDotText}>{conv.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

function GroupRow({ group, onPress }: { group: GroupSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard tone="lime" gradientBorder={group.unread_count > 0} padding={Spacing['4']} style={styles.convCard}>
        <View style={styles.convRow}>
          <View style={styles.groupAvatarWrap}>
            <Users color={Palette.neonLime} size={20} />
          </View>
          <View style={styles.convMeta}>
            <View style={styles.convNameRow}>
              <NeonText variant="body" weight="semiBold" tone={group.unread_count > 0 ? 'lime' : 'cyan'} style={styles.convName} numberOfLines={1}>
                {group.name}
              </NeonText>
              {group.is_admin && <Badge tone="amber" dot>ADMIN</Badge>}
            </View>
            <NeonText variant="body" tone="muted" style={styles.convPreview} numberOfLines={1}>
              {group.member_count} members
              {group.last_message_body ? ` · ${group.last_message_body}` : ''}
            </NeonText>
          </View>
          <View style={styles.convRight}>
            {group.last_message_at && (
              <NeonText variant="body" tone="muted" style={styles.convTime}>
                {formatMessageTime(group.last_message_at)}
              </NeonText>
            )}
            {group.unread_count > 0 && (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadDotText}>{group.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['3'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  headerIconWrap: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: 'rgba(255,0,229,0.1)', borderWidth: 1, borderColor: 'rgba(255,0,229,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1, gap: 2 },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  subtitle: { fontSize: Typography.sizes.xs },
  tabRow: { flexDirection: 'row', gap: Spacing['2'] },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing['2'], paddingVertical: Spacing['3'], borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Palette.glass300 },
  tabActive: { borderColor: 'rgba(255,0,229,0.4)', backgroundColor: 'rgba(255,0,229,0.08)' },
  tabText: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: 'rgba(255,45,111,0.2)', borderWidth: 1, borderColor: Palette.neonRose, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontFamily: Typography.families.headingSemiBold, fontSize: 9, color: Palette.neonRose },
  announceLink: { gap: Spacing['2'] },
  announceLinkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  announceIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  announceLinkMeta: { flex: 1, gap: 1 },
  announceLinkSub: { fontSize: Typography.sizes.xs },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  convCard: { gap: Spacing['2'] },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  convMeta: { flex: 1, gap: 2 },
  convNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  convName: { fontSize: Typography.sizes.sm, flexShrink: 1 },
  convUsername: { fontSize: Typography.sizes.xs },
  convPreview: { fontSize: Typography.sizes.xs },
  convRight: { alignItems: 'flex-end', gap: 4 },
  convTime: { fontSize: Typography.sizes.xs },
  unreadDot: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: Palette.neonMagenta, alignItems: 'center', justifyContent: 'center' },
  unreadDotText: { fontFamily: Typography.families.headingSemiBold, fontSize: 10, color: Palette.bg950 },
  groupAvatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(182,255,0,0.1)', borderWidth: 1, borderColor: 'rgba(182,255,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  footerSpace: { height: Spacing['8'] },
});
