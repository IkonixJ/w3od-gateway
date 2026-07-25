import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Reply,
  X,
  Check,
  Users,
  Info,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Avatar,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  getGroupMessages,
  sendGroupMessage,
  toggleGroupMessageReaction,
  subscribeToGroupMessages,
} from '@/lib/messaging-service';
import { setTyping, clearTyping, subscribeToTyping, uploadChatMedia } from '@/lib/community-service';
import { formatMessageTime } from '@/lib/community-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { pickFile, fileToDataUrl, canUploadFiles } from '@/lib/file-utils';
import { screenPadding } from '@/design/responsive';
import type { GroupMessage, MessageType } from '@/types/community';

const QUICK_EMOJIS = ['👍', '❤️', '🎉', '🔥', '👏', '😂'];

export default function GroupChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    const data = await getGroupMessages(id, 100, 0);
    setMessages(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadMessages();
    if (!id) return;
    const unsub = subscribeToGroupMessages(id, () => loadMessages());
    return unsub;
  }, [id, loadMessages]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToTyping('group', id, (userId) => {
      if (userId !== profile?.id) {
        setTypingUser(userId);
        setTimeout(() => setTypingUser(null), 3000);
      }
    });
    return unsub;
  }, [id, profile?.id]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !id) return;
    setSending(true);
    const body = input.trim();
    setInput('');
    await clearTyping('group', id);
    const result = await sendGroupMessage(id, body, 'text', null, replyTo?.id ?? null);
    setSending(false);
    if (result.success) {
      setReplyTo(null);
      loadMessages();
    } else {
      setInput(body);
    }
  }, [input, id, replyTo, loadMessages]);

  const handleTyping = useCallback((text: string) => {
    setInput(text);
    if (!id) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTyping('group', id);
    typingTimer.current = setTimeout(() => {
      clearTyping('group', id);
    }, 2000);
  }, [id]);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!id) return;
    setReactingTo(null);
    await toggleGroupMessageReaction(messageId, emoji);
    loadMessages();
  };

  const handleFileUpload = async () => {
    if (!profile?.id || !id) return;
    if (!canUploadFiles()) {
      Alert.alert('Upload Unavailable', 'File upload is only available on web. Please use a browser to upload files.');
      return;
    }
    const file = await pickFile('image/*,video/*,application/pdf,.doc,.docx,.zip');
    if (!file) return;
    setSending(true);
    const dataUrl = await fileToDataUrl(file.uri);
    const { url, error } = await uploadChatMedia(profile.id, dataUrl, `${Date.now()}-${file.name}`, file.type);
    setSending(false);
    if (error || !url) return;
    const msgType: MessageType = detectMsgType(file.type, file.name);
    const result = await sendGroupMessage(id, file.name, msgType, url, null);
    if (result.success) loadMessages();
  };

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonLime} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonLime} size={22} />
          </Pressable>
          <View style={styles.headerMeta}>
            <View style={styles.groupIconWrap}>
              <Users color={Palette.neonLime} size={18} />
            </View>
            <View style={styles.headerNameWrap}>
              <NeonText variant="body" weight="semiBold" tone="lime" style={styles.headerName} numberOfLines={1}>
                Group Chat
              </NeonText>
              {typingUser ? (
                <NeonText variant="body" tone="muted" style={styles.typingText}>
                  someone is typing...
                </NeonText>
              ) : (
                <NeonText variant="body" tone="muted" style={styles.headerSub}>
                  Tap info for members
                </NeonText>
              )}
            </View>
          </View>
          <Pressable onPress={() => router.push(`/(tabs)/community/group-info?id=${id}`)} hitSlop={10}>
            <Info color={Palette.neonLime} size={20} />
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesScroll}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <NeonText variant="body" tone="muted" style={styles.emptyText}>
                No messages yet. Start the conversation!
              </NeonText>
            </View>
          ) : (
            messages.map((msg) => (
              <GroupMessageBubble
                key={msg.id}
                message={msg}
                isMe={msg.sender_id === profile?.id}
                onReply={() => setReplyTo(msg)}
                onReactOpen={() => setReactingTo(reactingTo === msg.id ? null : msg.id)}
                showReactions={reactingTo === msg.id}
                onReact={(emoji) => handleReaction(msg.id, emoji)}
              />
            ))
          )}
        </ScrollView>

        {/* Reply preview */}
        {replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyLeft}>
              <Reply color={Palette.neonLime} size={14} />
              <View style={styles.replyMeta}>
                <NeonText variant="body" tone="muted" style={styles.replyLabel}>
                  Replying to {replyTo.sender_display_name ?? replyTo.sender_username}
                </NeonText>
                <NeonText variant="body" weight="semiBold" tone="lime" style={styles.replyText} numberOfLines={1}>
                  {replyTo.body ?? `Media (${replyTo.message_type})`}
                </NeonText>
              </View>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
              <X color={Palette.textTertiary} size={16} />
            </Pressable>
          </View>
        )}

        {/* Emoji picker */}
        {showEmojis && (
          <View style={styles.emojiBar}>
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  setInput((prev) => prev + emoji);
                  setShowEmojis(false);
                }}
                style={styles.emojiBtn}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <Pressable onPress={() => setShowEmojis((s) => !s)} hitSlop={10} style={styles.inputIconBtn}>
            <Smile color={Palette.neonLime} size={22} />
          </Pressable>
          <Pressable onPress={handleFileUpload} hitSlop={10} style={styles.inputIconBtn}>
            <Paperclip color={Palette.neonLime} size={22} />
          </Pressable>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={handleTyping}
              placeholder="Type a message..."
              placeholderTextColor={Palette.textDisabled}
              multiline
              maxLength={2000}
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          >
            {sending ? (
              <ActivityIndicator color={Palette.bg950} size={16} />
            ) : (
              <Send color={Palette.bg950} size={18} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function GroupMessageBubble({
  message,
  isMe,
  onReply,
  onReactOpen,
  showReactions,
  onReact,
}: {
  message: GroupMessage;
  isMe: boolean;
  onReply: () => void;
  onReactOpen: () => void;
  showReactions: boolean;
  onReact: (emoji: string) => void;
}) {
  return (
    <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
      {!isMe && (
        <View style={styles.senderRow}>
          <Avatar uri={message.sender_avatar_url} displayName={message.sender_display_name ?? message.sender_username} size="xs" ring={false} />
          <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.senderName}>
            {message.sender_display_name ?? message.sender_username ?? 'Member'}
          </NeonText>
        </View>
      )}
      <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        {message.reply_to && (
          <View style={styles.replyContext}>
            <Reply color={Palette.textTertiary} size={12} />
            <NeonText variant="body" tone="muted" style={styles.replyContextText}>Reply</NeonText>
          </View>
        )}
        {message.message_type !== 'text' && message.media_url && (
          <View style={styles.mediaBox}>
            <Paperclip color={Palette.neonLime} size={24} />
            <NeonText variant="body" tone="lime" style={styles.mediaLabel}>
              {message.message_type.toUpperCase()}
            </NeonText>
          </View>
        )}
        {message.body && (
          <Text style={[styles.bubbleBody, isMe ? styles.bubbleBodyRight : styles.bubbleBodyLeft]}>
            {message.body}
          </Text>
        )}
        <View style={styles.bubbleFooter}>
          <NeonText variant="body" tone="muted" glow={false} style={styles.bubbleTime}>
            {formatMessageTime(message.created_at)}
          </NeonText>
          {isMe && <Check color={Palette.neonLime} size={12} />}
        </View>
        {message.reactions.length > 0 && (
          <View style={styles.reactionsRow}>
            {groupByEmoji(message.reactions).map((group) => (
              <View key={group.emoji} style={styles.reactionChip}>
                <Text style={styles.reactionEmoji}>{group.emoji}</Text>
                <Text style={styles.reactionCount}>{group.count}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={[styles.msgActions, isMe ? styles.msgActionsRight : styles.msgActionsLeft]}>
        <Pressable onPress={onReply} hitSlop={8} style={styles.msgActionBtn}>
          <Reply color={Palette.textTertiary} size={13} />
        </Pressable>
        <Pressable onPress={onReactOpen} hitSlop={8} style={styles.msgActionBtn}>
          <Smile color={Palette.textTertiary} size={13} />
        </Pressable>
      </View>
      {showReactions && (
        <View style={[styles.reactionPicker, isMe ? styles.reactionPickerRight : styles.reactionPickerLeft]}>
          {QUICK_EMOJIS.map((emoji) => (
            <Pressable key={emoji} onPress={() => onReact(emoji)} style={styles.reactionPickerBtn}>
              <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function groupByEmoji(reactions: { emoji: string; user_id: string; username: string | null }[]) {
  const map = new Map<string, { emoji: string; count: number }>();
  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) existing.count++;
    else map.set(r.emoji, { emoji: r.emoji, count: 1 });
  }
  return Array.from(map.values());
}

function detectMsgType(mimeType: string, fileName: string): MessageType {
  const lower = (mimeType || fileName).toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('video/')) return 'video';
  if (lower.includes('pdf')) return 'pdf';
  if (lower.endsWith('.zip') || lower.includes('zip')) return 'zip';
  return 'document';
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: screenPadding, paddingVertical: Spacing['2'] },
  headerMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], justifyContent: 'center' },
  groupIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(182,255,0,0.1)', borderWidth: 1, borderColor: 'rgba(182,255,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerNameWrap: { gap: 1 },
  headerName: { fontSize: Typography.sizes.sm },
  headerSub: { fontSize: Typography.sizes.xs },
  typingText: { fontSize: Typography.sizes.xs, fontStyle: 'italic' },
  messagesScroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['2'] },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyText: { fontSize: Typography.sizes.sm },
  bubbleWrap: { maxWidth: '85%' },
  bubbleWrapRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], marginBottom: 2 },
  senderName: { fontSize: Typography.sizes.xs },
  bubble: { maxWidth: '100%', borderRadius: Radii.lg, borderWidth: 1, padding: Spacing['3'], gap: Spacing['1'] },
  bubbleRight: { backgroundColor: 'rgba(182,255,0,0.08)', borderColor: 'rgba(182,255,0,0.3)', borderBottomRightRadius: Radii.xs },
  bubbleLeft: { backgroundColor: Palette.glass300, borderColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: Radii.xs },
  replyContext: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: Radii.xs, paddingHorizontal: Spacing['2'], paddingVertical: 2 },
  replyContextText: { fontSize: Typography.sizes.xs },
  mediaBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], backgroundColor: 'rgba(182,255,0,0.06)', borderRadius: Radii.sm, padding: Spacing['3'] },
  mediaLabel: { fontSize: Typography.sizes.xs },
  bubbleBody: { fontFamily: Typography.families.bodyRegular, fontSize: Typography.sizes.sm, lineHeight: 20, color: Palette.textPrimary },
  bubbleBodyRight: {},
  bubbleBodyLeft: {},
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bubbleTime: { fontSize: 9 },
  reactionsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  reactionChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Spacing['2'], paddingVertical: 2, borderRadius: Radii.full, backgroundColor: 'rgba(255,255,255,0.06)' },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontFamily: Typography.families.headingSemiBold, fontSize: 9, color: Palette.textSecondary },
  msgActions: { flexDirection: 'row', gap: Spacing['2'], marginTop: 2 },
  msgActionsRight: { justifyContent: 'flex-end' },
  msgActionsLeft: { justifyContent: 'flex-start' },
  msgActionBtn: { padding: 4 },
  reactionPicker: { flexDirection: 'row', gap: 4, backgroundColor: Palette.glassDark, borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(182,255,0,0.2)', padding: Spacing['2'], marginTop: 4 },
  reactionPickerRight: { alignSelf: 'flex-end' },
  reactionPickerLeft: { alignSelf: 'flex-start' },
  reactionPickerBtn: { padding: 4 },
  reactionPickerEmoji: { fontSize: 18 },
  replyPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: screenPadding, paddingVertical: Spacing['2'], backgroundColor: Palette.glass300, borderTopWidth: 1, borderTopColor: 'rgba(182,255,0,0.2)' },
  replyLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flex: 1 },
  replyMeta: { flex: 1, gap: 1 },
  replyLabel: { fontSize: Typography.sizes.xs },
  replyText: { fontSize: Typography.sizes.sm },
  emojiBar: { flexDirection: 'row', gap: Spacing['2'], paddingHorizontal: screenPadding, paddingVertical: Spacing['2'], backgroundColor: Palette.glass300, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  emojiBtn: { padding: Spacing['1'] },
  emojiText: { fontSize: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing['2'], paddingHorizontal: screenPadding, paddingVertical: Spacing['2'], backgroundColor: Palette.glassDark, borderTopWidth: 1, borderTopColor: 'rgba(182,255,0,0.2)' },
  inputIconBtn: { padding: Spacing['2'] },
  inputWrap: { flex: 1, backgroundColor: Palette.glass300, borderRadius: Radii.lg, borderWidth: 1, borderColor: 'rgba(182,255,0,0.2)', paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'], minHeight: 40, maxHeight: 120 },
  textInput: { flex: 1, color: Palette.textPrimary, fontFamily: Typography.families.bodyRegular, fontSize: Typography.sizes.base, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.neonLime, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
