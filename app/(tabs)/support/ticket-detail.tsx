import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Text,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Send,
  LifeBuoy,
  Paperclip,
  ShieldCheck,
  Clock,
  X,
  FileText,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Divider,
  NeonButton,
  Avatar,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  getTicketDetail,
  replyToTicket,
  uploadTicketAttachment,
  subscribeToTicketReplies,
  formatTicketTime,
} from '@/lib/support-service';
import { TICKET_CATEGORIES, TICKET_STATUS_LABELS, TICKET_STATUS_TONES } from '@/types/support';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { TicketDetail as TicketDetailType, TicketReply } from '@/types/support';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    const data = await getTicketDetail(id);
    setTicket(data);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    loadTicket();
    if (!id) return;
    const unsub = subscribeToTicketReplies(id, () => loadTicket());
    return unsub;
  }, [id, loadTicket]);

  useEffect(() => {
    if (ticket && ticket.replies.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [ticket?.replies.length]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTicket();
  }, [loadTicket]);

  const handleReply = async () => {
    if (!id || !reply.trim()) return;
    setSending(true);
    setError(null);
    const result = await replyToTicket(id, reply.trim(), attachments);
    setSending(false);
    if (!result.success) {
      setError(result.error ?? 'Failed to send reply.');
      return;
    }
    setReply('');
    setAttachments([]);
    loadTicket();
  };

  const handleFileUpload = () => {
    if (!profile?.id) return;
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = 'image/*,.pdf,.doc,.docx,.zip';
    inputEl.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setSending(true);
      const dataUrl = await fileToDataUrl(file);
      const { url, error: uploadError } = await uploadTicketAttachment(profile.id, dataUrl, `${Date.now()}-${file.name}`, file.type);
      setSending(false);
      if (uploadError || !url) return;
      setAttachments((prev) => [...prev, url]);
    };
    inputEl.click();
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

  if (!ticket || !ticket.success) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.notFoundWrap}>
          <NeonText variant="heading" weight="medium" tone="muted">Ticket not found</NeonText>
          <NeonButton variant="ghost" onPress={() => router.back()}>Go Back</NeonButton>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
            TICKET
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonCyan} />}
        >
          {/* Ticket info */}
          <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.ticketCard}>
            <View style={styles.statusRow}>
              <Badge tone={TICKET_STATUS_TONES[ticket.status] === 'muted' ? 'muted' : TICKET_STATUS_TONES[ticket.status] as 'cyan' | 'amber' | 'lime' | 'rose'}>
                {TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge tone="purple">
                {TICKET_CATEGORIES.find((c) => c.key === ticket.category)?.label ?? ticket.category}
              </Badge>
            </View>

            <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.ticketSubject}>
              {ticket.subject}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.ticketBody}>
              {ticket.body}
            </NeonText>

            <View style={styles.ticketMetaRow}>
              <Clock color={Palette.textTertiary} size={12} />
              <NeonText variant="body" tone="muted" style={styles.ticketMetaText}>
                Created {formatTicketTime(ticket.created_at)}
              </NeonText>
            </View>

            {/* Attachments */}
            {ticket.attachment_urls && ticket.attachment_urls.length > 0 && (
              <View style={styles.attachmentsBox}>
                <Text style={styles.attachmentsLabel}>ATTACHMENTS</Text>
                {ticket.attachment_urls.map((url, idx) => (
                  <View key={idx} style={styles.attachmentChip}>
                    <Paperclip color={Palette.neonCyan} size={12} />
                    <Text style={styles.attachmentText} numberOfLines={1}>File {idx + 1}</Text>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>

          {/* Replies */}
          {ticket.replies.length > 0 && (
            <View style={styles.repliesSection}>
              <NeonText variant="heading" weight="semiBold" tone="muted" style={styles.repliesTitle}>
                CONVERSATION ({ticket.replies.length})
              </NeonText>
              {ticket.replies.map((r) => (
                <ReplyBubble key={r.id} reply={r} isMe={r.author_id === profile?.id} />
              ))}
            </View>
          )}

          <View style={styles.footerSpace} />
        </ScrollView>

        {/* Reply bar */}
        {ticket.status !== 'closed' && (
          <View style={styles.replyBar}>
            {attachments.length > 0 && (
              <View style={styles.replyAttachments}>
                {attachments.map((url, idx) => (
                  <View key={idx} style={styles.replyAttachmentChip}>
                    <Paperclip color={Palette.neonCyan} size={10} />
                    <Text style={styles.replyAttachmentText}>File {idx + 1}</Text>
                    <Pressable onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))} hitSlop={10}>
                      <X color={Palette.textTertiary} size={12} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.replyInputRow}>
              <Pressable onPress={handleFileUpload} hitSlop={10} style={styles.replyIconBtn}>
                <Paperclip color={Palette.neonCyan} size={20} />
              </Pressable>
              <View style={styles.replyInputWrap}>
                <TextInput
                  style={styles.replyInput}
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Type a reply..."
                  placeholderTextColor={Palette.textDisabled}
                  multiline
                  maxLength={2000}
                />
              </View>
              <Pressable
                onPress={handleReply}
                disabled={!reply.trim() || sending}
                style={[styles.sendBtn, (!reply.trim() || sending) && styles.sendBtnDisabled]}
              >
                {sending ? (
                  <ActivityIndicator color={Palette.bg950} size={16} />
                ) : (
                  <Send color={Palette.bg950} size={18} />
                )}
              </Pressable>
            </View>
            {error && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">{error}</NeonText>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

// ─── Reply Bubble ───────────────────────────────────────────────────────────

function ReplyBubble({ reply, isMe }: { reply: TicketReply; isMe: boolean }) {
  return (
    <View style={[styles.replyWrap, isMe ? styles.replyWrapRight : styles.replyWrapLeft]}>
      {!isMe && (
        <View style={styles.replyAuthorRow}>
          <Avatar uri={reply.author_avatar_url} displayName={reply.author_display_name ?? reply.author_username} size="xs" ring={false} />
          <View style={styles.replyAuthorMeta}>
            <NeonText variant="body" weight="semiBold" tone={reply.is_admin_reply ? 'amber' : 'cyan'} style={styles.replyAuthorName}>
              {reply.author_display_name ?? reply.author_username ?? 'User'}
            </NeonText>
            {reply.is_admin_reply && <Badge tone="amber" dot>ADMIN</Badge>}
          </View>
        </View>
      )}
      <View style={[styles.replyBubble, isMe ? styles.replyBubbleRight : styles.replyBubbleLeft]}>
        <Text style={styles.replyBody}>{reply.body}</Text>
        {reply.attachment_urls && reply.attachment_urls.length > 0 && (
          <View style={styles.replyAttachments}>
            {reply.attachment_urls.map((url, idx) => (
              <View key={idx} style={styles.replyAttachmentChip}>
                <FileText color={isMe ? Palette.bg950 : Palette.neonCyan} size={11} />
                <Text style={[styles.replyAttachmentText, { color: isMe ? Palette.bg950 : Palette.neonCyan }]}>File {idx + 1}</Text>
              </View>
            ))}
          </View>
        )}
        <NeonText variant="body" tone="muted" glow={false} style={styles.replyTime}>
          {formatTicketTime(reply.created_at)}
        </NeonText>
      </View>
    </View>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing['4'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: screenPadding, paddingVertical: Spacing['2'] },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['3'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  ticketCard: { gap: Spacing['3'] },
  statusRow: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap' },
  ticketSubject: { fontSize: Typography.sizes.md },
  ticketBody: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  ticketMetaText: { fontSize: Typography.sizes.xs },
  attachmentsBox: { gap: Spacing['2'] },
  attachmentsLabel: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.textTertiary, letterSpacing: Typography.letterSpacings.wide },
  attachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'], borderRadius: Radii.sm, backgroundColor: 'rgba(0,240,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)' },
  attachmentText: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.xs, color: Palette.neonCyan },
  repliesSection: { gap: Spacing['2'] },
  repliesTitle: { fontSize: Typography.sizes.sm, letterSpacing: Typography.letterSpacings.wide },
  footerSpace: { height: Spacing['4'] },
  // Reply bubble
  replyWrap: { maxWidth: '85%' },
  replyWrapRight: { alignSelf: 'flex-end' },
  replyWrapLeft: { alignSelf: 'flex-start' },
  replyAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], marginBottom: 2 },
  replyAuthorMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  replyAuthorName: { fontSize: Typography.sizes.xs },
  replyBubble: { maxWidth: '100%', borderRadius: Radii.lg, borderWidth: 1, padding: Spacing['3'], gap: Spacing['1'] },
  replyBubbleRight: { backgroundColor: 'rgba(0,240,255,0.08)', borderColor: 'rgba(0,240,255,0.3)', borderBottomRightRadius: Radii.xs },
  replyBubbleLeft: { backgroundColor: Palette.glass300, borderColor: 'rgba(255,255,255,0.08)', borderBottomLeftRadius: Radii.xs },
  replyBody: { fontFamily: Typography.families.bodyRegular, fontSize: Typography.sizes.sm, lineHeight: 20, color: Palette.textPrimary },
  replyAttachments: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap' },
  replyAttachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing['2'], paddingVertical: 2, borderRadius: Radii.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  replyAttachmentText: { fontFamily: Typography.families.headingSemiBold, fontSize: 10 },
  replyTime: { fontSize: 9 },
  // Reply bar
  replyBar: { backgroundColor: Palette.glassDark, borderTopWidth: 1, borderTopColor: 'rgba(0,240,255,0.2)' },
  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing['2'], paddingHorizontal: screenPadding, paddingVertical: Spacing['2'] },
  replyIconBtn: { padding: Spacing['2'] },
  replyInputWrap: { flex: 1, backgroundColor: Palette.glass300, borderRadius: Radii.lg, borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)', paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'], minHeight: 40, maxHeight: 120 },
  replyInput: { flex: 1, color: Palette.textPrimary, fontFamily: Typography.families.bodyRegular, fontSize: Typography.sizes.base, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.neonCyan, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  errorBox: { paddingHorizontal: screenPadding, paddingVertical: Spacing['2'], backgroundColor: 'rgba(255,45,111,0.1)' },
});
