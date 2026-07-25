import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  X,
  Send,
  Lock,
  Clock,
  Calendar,
  MessageSquare,
  Headphones,
  CircleCheck as CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  NeonButton,
  NeonInput,
  Badge,
  Avatar,
  Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  getSupportTickets,
  getTicketReplies,
  replyTicket,
  closeTicket,
  formatDateTime,
  type SupportTicket,
  type TicketReply,
} from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

// ─── Types & lookup tables ───────────────────────────────────────────────────

type FilterTab = 'all' | 'open' | 'responded' | 'closed';
type BadgeTone = 'cyan' | 'amber' | 'rose' | 'muted';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'open', label: 'OPEN' },
  { key: 'responded', label: 'RESPONDED' },
  { key: 'closed', label: 'CLOSED' },
];

const PRIORITY_META: Record<string, { label: string; tone: BadgeTone }> = {
  urgent: { label: 'URGENT', tone: 'rose' },
  high: { label: 'HIGH', tone: 'amber' },
  normal: { label: 'NORMAL', tone: 'cyan' },
  low: { label: 'LOW', tone: 'muted' },
};

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: 'OPEN', tone: 'amber' },
  responded: { label: 'RESPONDED', tone: 'cyan' },
  closed: { label: 'CLOSED', tone: 'muted' },
};

function priorityMeta(p: string) {
  return PRIORITY_META[(p ?? '').toLowerCase()] ?? PRIORITY_META.normal;
}
function statusMeta(s: string) {
  return STATUS_META[(s ?? '').toLowerCase()] ?? STATUS_META.open;
}
// GlassCard accepts only neon tones (no 'muted') — map closed → 'none'.
function statusCardTone(s: string): 'amber' | 'cyan' | 'none' {
  const t = (s ?? '').toLowerCase();
  return t === 'open' ? 'amber' : t === 'responded' ? 'cyan' : 'none';
}

const TOAST_STYLE = {
  lime: { bg: 'rgba(0,255,156,0.10)', border: 'rgba(0,255,156,0.30)', color: Palette.neonLime },
  rose: { bg: 'rgba(255,45,111,0.10)', border: 'rgba(255,45,111,0.30)', color: Palette.neonRose },
} as const;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AdminSupportScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminSupportContent />
    </RequireRole>
  );
}

function AdminSupportContent() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'lime' | 'rose' } | null>(null);

  const showToast = useCallback((msg: string, tone: 'lime' | 'rose' = 'lime') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const loadData = useCallback(
    async (filter: FilterTab) => {
      const data = await getSupportTickets(filter === 'all' ? 'all' : filter);
      setTickets(data);
      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    loadData(activeFilter);
  }, [activeFilter, loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(activeFilter);
  }, [loadData, activeFilter]);

  const loadReplies = useCallback(async (ticketId: string) => {
    setRepliesLoading(true);
    const data = await getTicketReplies(ticketId);
    setReplies(data);
    setRepliesLoading(false);
  }, []);

  const openTicket = useCallback(
    (ticket: SupportTicket) => {
      setSelected(ticket);
      setReplyText('');
      setActionError(null);
      setCloseConfirm(false);
      setReplies([]);
      loadReplies(ticket.id);
    },
    [loadReplies]
  );

  const closeTicketModal = useCallback(() => {
    setSelected(null);
    setReplies([]);
    setReplyText('');
    setActionError(null);
    setCloseConfirm(false);
  }, []);

  const handleReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    setActionError(null);
    const result = await replyTicket(selected.id, replyText.trim());
    setReplying(false);
    if (!result.success) {
      setActionError(result.error ?? 'Reply failed.');
      return;
    }
    setReplyText('');
    showToast('Reply sent');
    loadReplies(selected.id);
  }, [selected, replyText, loadReplies, showToast]);

  const handleConfirmClose = useCallback(async () => {
    if (!selected) return;
    setClosing(true);
    setActionError(null);
    const result = await closeTicket(selected.id);
    setClosing(false);
    if (!result.success) {
      setActionError(result.error ?? 'Failed to close ticket.');
      return;
    }
    showToast('Ticket closed', 'rose');
    closeTicketModal();
    loadData(activeFilter);
  }, [selected, activeFilter, closeTicketModal, loadData, showToast]);

  const counts = {
    open: tickets.filter((t) => (t.status ?? '').toLowerCase() === 'open').length,
    responded: tickets.filter((t) => (t.status ?? '').toLowerCase() === 'responded').length,
    closed: tickets.filter((t) => (t.status ?? '').toLowerCase() === 'closed').length,
  };

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
            SUPPORT
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="amber" style={styles.statValue}>
              {counts.open}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              OPEN
            </NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.statValue}>
              {counts.responded}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              RESPONDED
            </NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="muted" style={styles.statValue}>
              {counts.closed}
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>
              CLOSED
            </NeonText>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}
                hitSlop={6}
              >
                <NeonText
                  variant="body"
                  weight="semiBold"
                  tone={active ? 'cyan' : 'muted'}
                  glow={active}
                  style={styles.filterLabel}
                >
                  {tab.label}
                </NeonText>
              </Pressable>
            );
          })}
        </View>

        {/* Toast */}
        {toast && (
          <View
            style={[
              styles.toast,
              { backgroundColor: TOAST_STYLE[toast.tone].bg, borderColor: TOAST_STYLE[toast.tone].border },
            ]}
          >
            <CheckCircle2 color={TOAST_STYLE[toast.tone].color} size={18} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone={toast.tone}>
              {toast.msg}
            </NeonText>
          </View>
        )}

        {/* Ticket list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonCyan} />
          </View>
        ) : tickets.length === 0 ? (
          <GlassCard tone="cyan" padding={Spacing['6']} style={styles.emptyCard}>
            <MessageSquare color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No support tickets
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Member support requests will appear here for you to respond to.
            </NeonText>
          </GlassCard>
        ) : (
          tickets.map((ticket) => (
            <Pressable key={ticket.id} onPress={() => openTicket(ticket)}>
              <GlassCard
                tone={statusCardTone(ticket.status)}
                gradientBorder
                padding={Spacing['5']}
                style={styles.ticketCard}
              >
                <View style={styles.ticketContent}>
                  {/* Header row */}
                  <View style={styles.ticketHeader}>
                    <Avatar
                      uri={ticket.avatar_url}
                      displayName={ticket.display_name ?? ticket.username}
                      size="md"
                    />
                    <View style={styles.ticketMeta}>
                      <NeonText
                        variant="heading"
                        weight="semiBold"
                        tone="cyan"
                        style={styles.ticketSubject}
                        numberOfLines={1}
                      >
                        {ticket.subject}
                      </NeonText>
                      <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.ticketMember}>
                        {ticket.display_name ?? ticket.username ?? 'Member'}
                      </NeonText>
                    </View>
                    <Badge tone={statusMeta(ticket.status).tone}>
                      {statusMeta(ticket.status).label}
                    </Badge>
                  </View>

                  {/* Footer row */}
                  <View style={styles.ticketFooter}>
                    <Badge tone={priorityMeta(ticket.priority).tone} dot>
                      {priorityMeta(ticket.priority).label}
                    </Badge>
                    <View style={styles.ticketDates}>
                      <View style={styles.dateItem}>
                        <Calendar color={Palette.textTertiary} size={12} />
                        <NeonText variant="body" tone="muted" style={styles.dateText}>
                          {formatDateTime(ticket.created_at)}
                        </NeonText>
                      </View>
                      <View style={styles.dateItem}>
                        <Clock color={Palette.textTertiary} size={12} />
                        <NeonText variant="body" tone="muted" style={styles.dateText}>
                          {formatDateTime(ticket.updated_at)}
                        </NeonText>
                      </View>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={closeTicketModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          style={styles.detailOverlay}
        >
          <View style={styles.detailBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['4']} style={styles.detailCard}>
            <View style={styles.detailInner}>
              {/* Modal header */}
              <View style={styles.detailHeader}>
                <View style={styles.detailHeaderLeft}>
                  <Headphones color={Palette.neonCyan} size={20} />
                  <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.detailHeaderTitle}>
                    TICKET
                  </NeonText>
                </View>
                <Pressable onPress={closeTicketModal} hitSlop={10} disabled={closing}>
                  <X color={Palette.textTertiary} size={20} />
                </Pressable>
              </View>

              {selected && (
                <>
                  {/* Subject + badges */}
                  <View style={styles.detailSubjectRow}>
                    <NeonText variant="heading" weight="bold" tone="cyan" style={styles.detailSubject}>
                      {selected.subject}
                    </NeonText>
                    <View style={styles.detailBadges}>
                      <Badge tone={statusMeta(selected.status).tone} dot>
                        {statusMeta(selected.status).label}
                      </Badge>
                      <Badge tone={priorityMeta(selected.priority).tone} dot>
                        {priorityMeta(selected.priority).label}
                      </Badge>
                    </View>
                  </View>

                  {/* Member info */}
                  <View style={styles.detailMember}>
                    <Avatar
                      uri={selected.avatar_url}
                      displayName={selected.display_name ?? selected.username}
                      size="sm"
                    />
                    <View style={styles.detailMemberMeta}>
                      <NeonText variant="body" weight="semiBold" tone="cyan">
                        {selected.display_name ?? selected.username ?? 'Member'}
                      </NeonText>
                      {selected.username && (
                        <NeonText variant="body" tone="magenta" style={styles.detailUsername}>
                          @{selected.username}
                        </NeonText>
                      )}
                      <NeonText variant="body" tone="muted" style={styles.detailEmail}>
                        {selected.email}
                      </NeonText>
                    </View>
                  </View>

                  <Divider tone="white" />

                  {/* Conversation thread */}
                  <ScrollView
                    style={styles.thread}
                    contentContainerStyle={styles.threadContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <MessageBubble
                      isAdmin={false}
                      authorName={selected.display_name ?? selected.username ?? 'Member'}
                      authorAvatar={selected.avatar_url}
                      body={selected.body}
                      time={formatDateTime(selected.created_at)}
                    />
                    {repliesLoading ? (
                      <View style={styles.repliesLoading}>
                        <ActivityIndicator color={Palette.neonCyan} size="small" />
                      </View>
                    ) : (
                      replies.map((reply) => (
                        <MessageBubble
                          key={reply.id}
                          isAdmin={reply.is_admin_reply}
                          authorName={reply.author_name ?? (reply.is_admin_reply ? 'Admin' : 'Member')}
                          authorAvatar={reply.author_avatar}
                          body={reply.body}
                          time={formatDateTime(reply.created_at)}
                        />
                      ))
                    )}
                    {!repliesLoading && replies.length === 0 && (
                      <NeonText variant="body" tone="muted" style={styles.noReplies}>
                        No replies yet — be the first to respond.
                      </NeonText>
                    )}
                  </ScrollView>

                  {/* Reply + actions */}
                  <View style={styles.replySection}>
                    {actionError && (
                      <View style={styles.errorBox}>
                        <AlertCircle color={Palette.neonRose} size={16} />
                        <NeonText variant="body" weight="medium" tone="rose">
                          {actionError}
                        </NeonText>
                      </View>
                    )}

                    <View style={styles.replyInputRow}>
                      <NeonInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Type your reply..."
                        tone="cyan"
                        multiline
                        style={styles.replyInput}
                      />
                      <NeonButton
                        variant="cyan"
                        size="sm"
                        loading={replying}
                        disabled={!replyText.trim() || replying || closing}
                        onPress={handleReply}
                        leftIcon={<Send color="#03121A" size={16} />}
                      >
                        Send
                      </NeonButton>
                    </View>

                    {selected.status?.toLowerCase() !== 'closed' ? (
                      closeConfirm ? (
                        <View style={styles.closeConfirm}>
                          <NeonText variant="body" tone="muted" style={styles.closeConfirmText}>
                            Close this ticket? The member will be notified.
                          </NeonText>
                          <View style={styles.closeConfirmActions}>
                            <NeonButton
                              variant="ghost"
                              size="sm"
                              onPress={() => setCloseConfirm(false)}
                              disabled={closing}
                            >
                              Cancel
                            </NeonButton>
                            <View style={styles.flex1}>
                              <NeonButton
                                variant="danger"
                                size="sm"
                                fullWidth
                                loading={closing}
                                disabled={closing || replying}
                                onPress={handleConfirmClose}
                                leftIcon={<Lock color="#FFFFFF" size={15} />}
                              >
                                Confirm Close
                              </NeonButton>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <NeonButton
                          variant="outline"
                          size="sm"
                          fullWidth
                          onPress={() => setCloseConfirm(true)}
                          disabled={replying || closing}
                          leftIcon={<Lock color={Palette.neonCyan} size={16} />}
                        >
                          Close Ticket
                        </NeonButton>
                      )
                    ) : (
                      <View style={styles.closedNotice}>
                        <CheckCircle2 color={Palette.textTertiary} size={16} />
                        <NeonText variant="body" tone="muted">
                          This ticket is closed
                        </NeonText>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  isAdmin,
  authorName,
  authorAvatar,
  body,
  time,
}: {
  isAdmin: boolean;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  time: string;
}) {
  return (
    <View style={[styles.bubbleWrap, isAdmin ? styles.bubbleWrapAdmin : styles.bubbleWrapMember]}>
      <View style={[styles.bubble, isAdmin ? styles.bubbleAdmin : styles.bubbleMember]}>
        <View style={styles.bubbleHeader}>
          <Avatar uri={authorAvatar} displayName={authorName} size="xs" ring={false} />
          <NeonText
            variant="body"
            weight="semiBold"
            tone={isAdmin ? 'lime' : 'cyan'}
            glow={false}
            style={styles.bubbleAuthor}
          >
            {isAdmin ? 'Admin' : authorName}
          </NeonText>
        </View>
        <Text style={styles.bubbleBody}>{body}</Text>
        <NeonText variant="body" tone="muted" glow={false} style={styles.bubbleTime}>
          {time}
        </NeonText>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center', paddingBottom: Spacing['20'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['4'] },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  statValue: { fontSize: Typography.sizes.xl },
  statLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  filterRow: { flexDirection: 'row', gap: Spacing['2'] },
  filterPill: { flex: 1, alignItems: 'center', paddingVertical: Spacing['3'], paddingHorizontal: Spacing['2'], borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Palette.glass300 },
  filterPillActive: { borderColor: 'rgba(0,240,255,0.5)', backgroundColor: 'rgba(0,240,255,0.10)' },
  filterLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  toast: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], borderWidth: 1, borderRadius: Radii.md, padding: Spacing['3'] },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  ticketCard: { gap: 0 },
  ticketContent: { gap: Spacing['3'] },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  ticketMeta: { flex: 1, gap: 2 },
  ticketSubject: { fontSize: Typography.sizes.base },
  ticketMember: { fontSize: Typography.sizes.xs },
  ticketFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing['3'] },
  ticketDates: { flexDirection: 'row', gap: Spacing['3'] },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing['1'] },
  dateText: { fontSize: Typography.sizes.xs },
  footerSpace: { height: Spacing['4'] },
  // Detail modal
  detailOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  detailBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.80)' },
  detailCard: { width: '100%', maxWidth: wideCardMaxWidth, height: '90%' },
  detailInner: { flex: 1, gap: Spacing['3'] },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  detailHeaderTitle: { fontSize: Typography.sizes.base, letterSpacing: Typography.letterSpacings.wide },
  detailSubjectRow: { gap: Spacing['2'] },
  detailSubject: { fontSize: Typography.sizes.md, lineHeight: 22 },
  detailBadges: { flexDirection: 'row', gap: Spacing['2'] },
  detailMember: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'] },
  detailMemberMeta: { flex: 1, gap: 2 },
  detailUsername: { fontSize: Typography.sizes.xs },
  detailEmail: { fontSize: Typography.sizes.xs },
  thread: { flex: 1 },
  threadContent: { gap: Spacing['3'], paddingVertical: Spacing['2'] },
  repliesLoading: { alignItems: 'center', paddingVertical: Spacing['4'] },
  noReplies: { fontSize: Typography.sizes.sm, textAlign: 'center', paddingVertical: Spacing['4'] },
  replySection: { gap: Spacing['3'] },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], backgroundColor: 'rgba(255,45,111,0.10)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.30)', borderRadius: Radii.md, padding: Spacing['3'] },
  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing['3'] },
  replyInput: { flex: 1 },
  closeConfirm: { gap: Spacing['2'] },
  closeConfirmText: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  closeConfirmActions: { flexDirection: 'row', gap: Spacing['3'], alignItems: 'center' },
  closedNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing['2'], backgroundColor: Palette.glass300, borderRadius: Radii.md, paddingVertical: Spacing['3'] },
  flex1: { flex: 1 },
  // Message bubbles
  bubbleWrap: { width: '100%', alignItems: 'flex-start' },
  bubbleWrapAdmin: { alignItems: 'flex-end' },
  bubbleWrapMember: { alignItems: 'flex-start' },
  bubble: { maxWidth: '88%', gap: Spacing['2'], borderRadius: Radii.md, borderWidth: 1, padding: Spacing['3'] },
  bubbleAdmin: { backgroundColor: 'rgba(182,255,0,0.08)', borderColor: 'rgba(182,255,0,0.30)' },
  bubbleMember: { backgroundColor: Palette.glass300, borderColor: 'rgba(255,255,255,0.08)' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  bubbleAuthor: { fontSize: Typography.sizes.xs },
  bubbleBody: { fontFamily: Typography.families.bodyRegular, fontSize: Typography.sizes.sm, color: Palette.textPrimary, lineHeight: 20 },
  bubbleTime: { fontSize: Typography.sizes.xs },
});
