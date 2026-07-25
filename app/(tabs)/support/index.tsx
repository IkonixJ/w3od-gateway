import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  LifeBuoy,
  Plus,
  X,
  Send,
  Paperclip,
  ChevronRight,
  Clock,
  MessageSquare,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Divider,
  NeonButton,
  NeonInput,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  createSupportTicket,
  getMyTickets,
  uploadTicketAttachment,
  subscribeToAllTickets,
  formatTicketTime,
} from '@/lib/support-service';
import { TICKET_CATEGORIES, TICKET_STATUS_LABELS, TICKET_STATUS_TONES } from '@/types/support';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { SupportTicket, SupportCategory } from '@/types/support';

export default function SupportCenterScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', category: 'account' as SupportCategory });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    const data = await getMyTickets(100, 0);
    setTickets(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadTickets();
    const unsub = subscribeToAllTickets(() => loadTickets());
    return unsub;
  }, [loadTickets]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async () => {
    setCreateError(null);
    if (!form.subject.trim() || !form.body.trim()) {
      setCreateError('Subject and description are required.');
      return;
    }
    setCreating(true);
    const result = await createSupportTicket(form.subject.trim(), form.body.trim(), form.category, attachments);
    setCreating(false);
    if (!result.success) {
      setCreateError(result.error ?? 'Failed to create ticket.');
      return;
    }
    setCreateModal(false);
    setForm({ subject: '', body: '', category: 'account' });
    setAttachments([]);
    loadTickets();
  };

  const handleFileUpload = () => {
    if (!profile?.id) return;
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = 'image/*,.pdf,.doc,.docx,.zip';
    inputEl.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setCreating(true);
      const dataUrl = await fileToDataUrl(file);
      const { url, error: uploadError } = await uploadTicketAttachment(profile.id, dataUrl, `${Date.now()}-${file.name}`, file.type);
      setCreating(false);
      if (uploadError || !url) return;
      setAttachments((prev) => [...prev, url]);
    };
    inputEl.click();
  };

  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_for_user').length;

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonCyan} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <LifeBuoy color={Palette.neonCyan} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>
              SUPPORT CENTER
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {openCount > 0 ? `${openCount} active ticket${openCount === 1 ? '' : 's'}` : 'All tickets resolved'}
            </NeonText>
          </View>
          <Pressable onPress={() => setCreateModal(true)} hitSlop={10} style={styles.addBtn}>
            <Plus color={Palette.neonCyan} size={20} />
          </Pressable>
        </View>

        {/* Quick help banner */}
        <GlassCard tone="cyan" padding={Spacing['4']} style={styles.helpBanner}>
          <View style={styles.helpRow}>
            <View style={styles.helpIconWrap}>
              <LifeBuoy color={Palette.neonCyan} size={16} />
            </View>
            <View style={styles.helpMeta}>
              <NeonText variant="body" weight="semiBold" tone="cyan">Need help?</NeonText>
              <NeonText variant="body" tone="muted" style={styles.helpText}>
                Create a support ticket and our team will assist you.
              </NeonText>
            </View>
          </View>
        </GlassCard>

        {/* Tickets */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonCyan} />
          </View>
        ) : tickets.length === 0 ? (
          <GlassCard tone="cyan" padding={Spacing['6']} style={styles.emptyCard}>
            <MessageSquare color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted">No support tickets</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Create a ticket if you need help with your account, rewards, or any other issue.
            </NeonText>
            <NeonButton variant="cyan" onPress={() => setCreateModal(true)} leftIcon={<Plus color="#03121A" size={16} />}>
              Create Ticket
            </NeonButton>
          </GlassCard>
        ) : (
          tickets.map((ticket) => (
            <Pressable key={ticket.id} onPress={() => router.push(`/(tabs)/support/ticket-detail?id=${ticket.id}`)}>
              <GlassCard tone="cyan" gradientBorder={ticket.status === 'open' || ticket.status === 'in_progress'} padding={Spacing['4']} style={styles.ticketCard}>
                <View style={styles.ticketRow}>
                  <View style={styles.ticketIconWrap}>
                    <LifeBuoy color={Palette.neonCyan} size={18} />
                  </View>
                  <View style={styles.ticketMeta}>
                    <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.ticketSubject} numberOfLines={1}>
                      {ticket.subject}
                    </NeonText>
                    <View style={styles.ticketSubRow}>
                      <Badge tone={TICKET_STATUS_TONES[ticket.status] === 'muted' ? 'muted' : TICKET_STATUS_TONES[ticket.status] as 'cyan' | 'amber' | 'lime' | 'rose'}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                      <NeonText variant="body" tone="muted" style={styles.ticketCategory}>
                        {TICKET_CATEGORIES.find((c) => c.key === ticket.category)?.label ?? ticket.category}
                      </NeonText>
                    </View>
                    <View style={styles.ticketFooter}>
                      <Clock color={Palette.textTertiary} size={11} />
                      <NeonText variant="body" tone="muted" style={styles.ticketTime}>
                        {formatTicketTime(ticket.updated_at)}
                      </NeonText>
                      {ticket.reply_count > 0 && (
                        <View style={styles.replyChip}>
                          <MessageSquare color={Palette.neonCyan} size={10} />
                          <Text style={styles.replyText}>{ticket.reply_count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <ChevronRight color={Palette.textTertiary} size={18} />
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Create Ticket Modal */}
      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => !creating && setCreateModal(false)}>
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <LifeBuoy color={Palette.neonCyan} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="cyan">NEW SUPPORT TICKET</NeonText>
              </View>
              <Pressable onPress={() => !creating && setCreateModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            {/* Category selector */}
            <View style={styles.categoryWrap}>
              <Text style={styles.categoryLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {TICKET_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    onPress={() => setForm({ ...form, category: cat.key })}
                    style={[styles.categoryChip, form.category === cat.key && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, { color: form.category === cat.key ? Palette.neonCyan : Palette.textTertiary }]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <NeonInput label="Subject" value={form.subject} onChangeText={(t) => setForm({ ...form, subject: t })} placeholder="Brief subject..." tone="cyan" />
            <NeonInput label="Description" value={form.body} onChangeText={(t) => setForm({ ...form, body: t })} placeholder="Describe your issue in detail..." tone="cyan" multiline style={styles.modalField} />

            {/* Attachments */}
            {attachments.length > 0 && (
              <View style={styles.attachmentsBox}>
                {attachments.map((url, idx) => (
                  <View key={idx} style={styles.attachmentChip}>
                    <Paperclip color={Palette.neonCyan} size={12} />
                    <Text style={styles.attachmentText} numberOfLines={1}>Attachment {idx + 1}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable onPress={handleFileUpload} style={styles.uploadBtn}>
              <Paperclip color={Palette.neonCyan} size={16} />
              <NeonText variant="body" weight="semiBold" tone="cyan">Add Attachment</NeonText>
            </Pressable>

            {createError && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">{createError}</NeonText>
              </View>
            )}

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setCreateModal(false)} disabled={creating}>Cancel</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="cyan" fullWidth loading={creating} onPress={handleCreate} leftIcon={<Send color="#03121A" size={16} />}>
                  Submit Ticket
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </Modal>
    </ScreenShell>
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
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['3'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  headerIconWrap: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: 'rgba(0,240,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1, gap: 2 },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  subtitle: { fontSize: Typography.sizes.xs },
  addBtn: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(0,240,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  helpBanner: { gap: Spacing['2'] },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  helpIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(0,240,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,240,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  helpMeta: { flex: 1, gap: 1 },
  helpText: { fontSize: Typography.sizes.xs },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  ticketCard: { gap: Spacing['2'] },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  ticketIconWrap: { width: 40, height: 40, borderRadius: Radii.md, backgroundColor: 'rgba(0,240,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  ticketMeta: { flex: 1, gap: 2 },
  ticketSubject: { fontSize: Typography.sizes.sm },
  ticketSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  ticketCategory: { fontSize: Typography.sizes.xs },
  ticketFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  ticketTime: { fontSize: 10 },
  replyChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing['2'], paddingVertical: 2, borderRadius: Radii.sm, backgroundColor: Palette.glass300 },
  replyText: { fontFamily: Typography.families.headingSemiBold, fontSize: 9, color: Palette.textSecondary },
  footerSpace: { height: Spacing['8'] },
  // Modal
  modalOverlay: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 460, gap: Spacing['3'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  modalField: { marginTop: Spacing['1'] },
  categoryWrap: { gap: Spacing['2'] },
  categoryLabel: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.textTertiary, letterSpacing: Typography.letterSpacings.wide },
  categoryScroll: { gap: Spacing['2'] },
  categoryChip: { paddingHorizontal: Spacing['4'], paddingVertical: Spacing['2'], borderRadius: Radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: Palette.glass300 },
  categoryChipActive: { borderColor: 'rgba(0,240,255,0.4)', backgroundColor: 'rgba(0,240,255,0.08)' },
  categoryChipText: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs },
  attachmentsBox: { gap: Spacing['2'] },
  attachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'], borderRadius: Radii.sm, backgroundColor: 'rgba(0,240,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)' },
  attachmentText: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.xs, color: Palette.neonCyan },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], paddingVertical: Spacing['3'], borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)', borderStyle: 'dashed', justifyContent: 'center' },
  errorBox: { backgroundColor: 'rgba(255,45,111,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.3)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
  flex1: { flex: 1 },
});
