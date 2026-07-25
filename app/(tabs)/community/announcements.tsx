import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Megaphone,
  Plus,
  X,
  Send,
  Heart,
  ThumbsUp,
  PartyPopper,
  ShieldCheck,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Avatar,
  Badge,
  Divider,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { hasRole } from '@/lib/rbac';
import {
  getAnnouncementPosts,
  createAnnouncementPost,
  toggleAnnouncementReaction,
  formatTimeAgo,
} from '@/lib/community-service';
import { subscribeToAnnouncementPosts } from '@/lib/messaging-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { AnnouncementPost, MessageReaction } from '@/types/community';

const REACTIONS = [
  { emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { emoji: '❤️', icon: Heart, label: 'Love' },
  { emoji: '🎉', icon: PartyPopper, label: 'Celebrate' },
  { emoji: '👏', icon: Heart, label: 'Clap' },
];

export default function AnnouncementChannelScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = hasRole(profile?.role ?? 'member', 'admin');

  const [posts, setPosts] = useState<AnnouncementPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const data = await getAnnouncementPosts(50, 0);
    setPosts(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPosts();
    const unsub = subscribeToAnnouncementPosts(() => loadPosts());
    return unsub;
  }, [loadPosts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts();
  }, [loadPosts]);

  const handleCreate = async () => {
    setCreateError(null);
    if (!draftTitle.trim() || !draftBody.trim()) {
      setCreateError('Title and body are required.');
      return;
    }
    setCreating(true);
    const result = await createAnnouncementPost(draftTitle.trim(), draftBody.trim());
    setCreating(false);
    if (!result.success) {
      setCreateError(result.error ?? 'Failed to create post.');
      return;
    }
    setCreateModal(false);
    setDraftTitle('');
    setDraftBody('');
    loadPosts();
  };

  const handleReaction = async (postId: string, emoji: string) => {
    await toggleAnnouncementReaction(postId, emoji);
    loadPosts();
  };

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonMagenta} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonMagenta} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>
            ANNOUNCEMENTS
          </NeonText>
          {isAdmin ? (
            <Pressable onPress={() => setCreateModal(true)} hitSlop={10} style={styles.addBtn}>
              <Plus color={Palette.neonMagenta} size={20} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Megaphone color={Palette.neonMagenta} size={14} />
          <NeonText variant="body" tone="muted" style={styles.infoText}>
            Only admins can post. Members can react to announcements.
          </NeonText>
        </View>

        {/* Posts */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonMagenta} />
          </View>
        ) : posts.length === 0 ? (
          <GlassCard tone="magenta" padding={Spacing['6']} style={styles.emptyCard}>
            <Megaphone color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No announcements yet
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              {isAdmin ? 'Create the first announcement to broadcast to the community.' : 'Check back soon for community updates.'}
            </NeonText>
          </GlassCard>
        ) : (
          posts.map((post) => (
            <AnnouncementCard
              key={post.id}
              post={post}
              myId={profile?.id}
              onReact={handleReaction}
            />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Create modal */}
      {isAdmin && (
        <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => !creating && setCreateModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
            <View style={styles.modalBackdrop} />
            <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalIconWrap}>
                    <Megaphone color={Palette.neonMagenta} size={20} />
                  </View>
                  <NeonText variant="heading" weight="semiBold" tone="magenta">
                    NEW ANNOUNCEMENT
                  </NeonText>
                </View>
                <Pressable onPress={() => !creating && setCreateModal(false)} hitSlop={10}>
                  <X color={Palette.textTertiary} size={20} />
                </Pressable>
              </View>

              <NeonInput
                label="Title"
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Announcement title..."
                leftIcon={<Megaphone color={Palette.textTertiary} size={18} />}
                tone="magenta"
              />
              <NeonInput
                label="Body"
                value={draftBody}
                onChangeText={setDraftBody}
                placeholder="Write the announcement message..."
                tone="magenta"
                multiline
                style={styles.modalField}
              />

              {createError && (
                <View style={styles.errorBox}>
                  <NeonText variant="body" weight="medium" tone="rose">
                    {createError}
                  </NeonText>
                </View>
              )}

              <View style={styles.modalActions}>
                <NeonButton variant="ghost" onPress={() => setCreateModal(false)} disabled={creating}>
                  Cancel
                </NeonButton>
                <View style={styles.flex1}>
                  <NeonButton
                    variant="magenta"
                    fullWidth
                    loading={creating}
                    onPress={handleCreate}
                    leftIcon={<Send color="#1A0017" size={16} />}
                  >
                    Post
                  </NeonButton>
                </View>
              </View>
            </GlassCard>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScreenShell>
  );
}

// ─── Announcement Card ──────────────────────────────────────────────────────

function AnnouncementCard({
  post,
  myId,
  onReact,
}: {
  post: AnnouncementPost;
  myId?: string;
  onReact: (postId: string, emoji: string) => void;
}) {
  const myReaction = post.reactions.find((r) => r.user_id === myId)?.emoji;

  return (
    <GlassCard tone="magenta" gradientBorder padding={Spacing['5']} style={styles.postCard}>
      {/* Author */}
      <View style={styles.postHeader}>
        <Avatar uri={post.author_avatar_url} displayName={post.author_display_name ?? post.author_username} size="sm" />
        <View style={styles.authorMeta}>
          <View style={styles.authorNameRow}>
            <NeonText variant="body" weight="semiBold" tone="cyan">
              {post.author_display_name ?? post.author_username ?? 'Admin'}
            </NeonText>
            <Badge tone="amber" dot>ADMIN</Badge>
          </View>
          <NeonText variant="body" tone="muted" style={styles.postTime}>
            {formatTimeAgo(post.created_at)}
          </NeonText>
        </View>
      </View>

      <Divider tone="white" />

      {/* Content */}
      <NeonText variant="heading" weight="semiBold" tone="magenta" style={styles.postTitle}>
        {post.title}
      </NeonText>
      <NeonText variant="body" tone="muted" style={styles.postBody}>
        {post.body}
      </NeonText>

      {/* Reactions */}
      <View style={styles.reactionsRow}>
        {REACTIONS.map((r) => {
          const count = post.reactions.filter((rx) => rx.emoji === r.emoji).length;
          const isMine = myReaction === r.emoji;
          return (
            <Pressable
              key={r.emoji}
              onPress={() => onReact(post.id, r.emoji)}
              style={[
                styles.reactionBtn,
                isMine && styles.reactionBtnActive,
              ]}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              {count > 0 && (
                <Text style={styles.reactionCount}>{count}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,0,229,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,229,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  infoText: {
    fontSize: Typography.sizes.xs,
    flex: 1,
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
  postCard: {
    gap: Spacing['3'],
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  postTime: {
    fontSize: Typography.sizes.xs,
  },
  postTitle: {
    fontSize: Typography.sizes.md,
  },
  postBody: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
    flexWrap: 'wrap',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radii.full,
    backgroundColor: Palette.glass300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255,0,229,0.1)',
    borderColor: 'rgba(255,0,229,0.4)',
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    color: Palette.textSecondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenPadding,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.75)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    gap: Spacing['4'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,0,229,0.1)',
    borderWidth: 1,
    borderColor: Palette.neonMagenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalField: {
    marginTop: Spacing['1'],
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
  footerSpace: {
    height: Spacing['8'],
  },
});
