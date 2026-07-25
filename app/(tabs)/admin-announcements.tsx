import { useState, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl, Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Megaphone, Send, Bell, Smartphone, Square,
  Calendar, Clock, CircleCheck as CheckCircle2, AlertTriangle, X,
  type LucideIcon,
} from 'lucide-react-native';

import {
  ScreenShell, GlassCard, NeonText, NeonButton, NeonInput, Badge, Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  getAnnouncements, createAnnouncement, sendAnnouncement,
  formatDateTime, type Announcement,
} from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

type AnnouncementType = 'push' | 'in_app' | 'popup';
type Tone = 'lime' | 'amber' | 'cyan' | 'rose';

const TYPE_META: Record<AnnouncementType, {
  label: string; tone: 'blue' | 'amber' | 'magenta'; icon: LucideIcon;
}> = {
  push: { label: 'Push', tone: 'blue', icon: Bell },
  in_app: { label: 'In-App', tone: 'amber', icon: Smartphone },
  popup: { label: 'Popup', tone: 'magenta', icon: Square },
};

const TYPE_OPTIONS: { key: AnnouncementType; label: string; icon: LucideIcon }[] = [
  { key: 'push', label: 'Push', icon: Bell },
  { key: 'in_app', label: 'In-App', icon: Smartphone },
  { key: 'popup', label: 'Popup', icon: Square },
];

const TOAST_STYLE: Record<Tone, { bg: string; border: string; color: string }> = {
  lime: { bg: 'rgba(0,255,156,0.10)', border: 'rgba(0,255,156,0.30)', color: Palette.neonLime },
  amber: { bg: 'rgba(255,184,0,0.10)', border: 'rgba(255,184,0,0.30)', color: Palette.neonAmber },
  cyan: { bg: 'rgba(0,240,255,0.10)', border: 'rgba(0,240,255,0.30)', color: Palette.neonCyan },
  rose: { bg: 'rgba(255,45,111,0.10)', border: 'rgba(255,45,111,0.30)', color: Palette.neonRose },
};

function statusBadge(a: Announcement): { label: string; tone: 'lime' | 'amber' | 'cyan' } {
  if (a.sent) return { label: 'Sent', tone: 'lime' };
  if (a.scheduled_at) return { label: 'Scheduled', tone: 'amber' };
  return { label: 'Draft', tone: 'cyan' };
}

export default function AdminAnnouncementsScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminAnnouncementsContent />
    </RequireRole>
  );
}

function AdminAnnouncementsContent() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftType, setDraftType] = useState<AnnouncementType>('push');
  const [draftScheduled, setDraftScheduled] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: Tone } | null>(null);

  const showToast = useCallback((msg: string, tone: Tone = 'lime') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const loadData = useCallback(async () => {
    setAnnouncements(await getAnnouncements());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const openCreateModal = () => {
    setDraftTitle(''); setDraftBody(''); setDraftType('push');
    setDraftScheduled(''); setModalError(null); setModalOpen(true);
  };

  const handleCreate = async () => {
    setModalError(null);
    if (!draftTitle.trim()) { setModalError('A title is required.'); return; }
    if (!draftBody.trim()) { setModalError('A message body is required.'); return; }

    let scheduledAt: string | null = null;
    const trimmedDate = draftScheduled.trim();
    if (trimmedDate) {
      const parsed = new Date(`${trimmedDate}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        setModalError('Scheduled date must be in YYYY-MM-DD format.');
        return;
      }
      scheduledAt = parsed.toISOString();
    }

    setCreating(true);
    const result = await createAnnouncement(draftTitle.trim(), draftBody.trim(), draftType, scheduledAt);
    setCreating(false);

    if (!result.success) { setModalError(result.error ?? 'Failed to create announcement.'); return; }
    showToast(scheduledAt ? 'Announcement scheduled' : 'Announcement draft created', scheduledAt ? 'amber' : 'cyan');
    setModalOpen(false);
    loadData();
  };

  const handleSend = async (a: Announcement) => {
    setBusyId(a.id);
    const result = await sendAnnouncement(a.id);
    setBusyId(null);
    if (!result.success) { showToast(result.error ?? 'Failed to send announcement', 'rose'); return; }
    showToast(`Announcement sent · ${result.count ?? 0} members notified`, 'lime');
    loadData();
  };

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={Palette.neonAmber} colors={[Palette.neonAmber]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonAmber} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>ANNOUNCEMENTS</NeonText>
          <View style={styles.headerIconWrap}>
            <Megaphone color={Palette.neonAmber} size={18} />
          </View>
        </View>

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, { backgroundColor: TOAST_STYLE[toast.tone].bg, borderColor: TOAST_STYLE[toast.tone].border }]}>
            {toast.tone === 'rose' ? (
              <AlertTriangle color={TOAST_STYLE[toast.tone].color} size={18} strokeWidth={2.5} />
            ) : (
              <CheckCircle2 color={TOAST_STYLE[toast.tone].color} size={18} strokeWidth={2.5} />
            )}
            <NeonText variant="body" weight="semiBold" tone={toast.tone}>{toast.msg}</NeonText>
          </View>
        )}

        {/* Create button */}
        <NeonButton variant="amber" fullWidth
          leftIcon={<Plus color="#1A1200" size={18} />} onPress={openCreateModal}>
          Create Announcement
        </NeonButton>

        {/* Warning */}
        <View style={styles.warnBox}>
          <AlertTriangle color={Palette.neonAmber} size={15} />
          <NeonText variant="body" tone="amber" style={styles.warnText}>
            Sending an announcement creates in-app notifications for all active members.
          </NeonText>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonAmber} />
          </View>
        ) : announcements.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['6']} style={styles.emptyCard}>
            <Megaphone color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>No announcements</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Create an announcement to broadcast updates to all members.
            </NeonText>
          </GlassCard>
        ) : (
          announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} busy={busyId === a.id} onSend={() => handleSend(a)} />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Create modal */}
      <Modal visible={modalOpen} transparent animationType="fade"
        onRequestClose={() => !creating && setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="amber" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Megaphone color={Palette.neonAmber} size={20} />
                </View>
                <NeonText variant="heading" weight="semiBold" tone="amber">NEW ANNOUNCEMENT</NeonText>
              </View>
              <Pressable onPress={() => !creating && setModalOpen(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            <NeonInput label="Title" value={draftTitle} onChangeText={setDraftTitle}
              placeholder="Announcement title..."
              leftIcon={<Megaphone color={Palette.textTertiary} size={18} />} tone="amber" />

            <NeonInput label="Body" value={draftBody} onChangeText={setDraftBody}
              placeholder="Write the announcement message..."
              leftIcon={<Square color={Palette.textTertiary} size={18} />} tone="amber"
              multiline style={styles.modalInputGap} />

            {/* Type selector chips */}
            <View style={styles.modalInputGap}>
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.chipsRow}>
                {TYPE_OPTIONS.map((opt) => {
                  const active = draftType === opt.key;
                  const Icon = opt.icon;
                  return (
                    <Pressable key={opt.key} onPress={() => setDraftType(opt.key)}
                      style={[styles.chip, active && styles.chipActive]}>
                      <Icon color={active ? Palette.neonAmber : Palette.textSecondary} size={15} />
                      <Text style={[styles.chipText, { color: active ? Palette.neonAmber : Palette.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <NeonInput label="Scheduled Date (optional, YYYY-MM-DD)"
              value={draftScheduled} onChangeText={setDraftScheduled}
              placeholder="Leave empty to send immediately"
              leftIcon={<Calendar color={Palette.textTertiary} size={18} />} tone="amber"
              style={styles.modalInputGap} />

            <NeonText variant="body" tone="muted" style={styles.scheduleHint}>
              Leave the date empty to create a draft you can send immediately.
            </NeonText>

            {modalError && (
              <View style={styles.errorBox}>
                <AlertTriangle color={Palette.neonRose} size={15} />
                <NeonText variant="body" weight="medium" tone="rose" style={styles.errorText}>{modalError}</NeonText>
              </View>
            )}

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setModalOpen(false)} disabled={creating}>Cancel</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="amber" fullWidth loading={creating} disabled={creating}
                  leftIcon={<Plus color="#1A1200" size={16} />} onPress={handleCreate}>
                  Create
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

// ─── Announcement card ───────────────────────────────────────────────────────

function AnnouncementCard({
  announcement, busy, onSend,
}: {
  announcement: Announcement; busy: boolean; onSend: () => void;
}) {
  const typeMeta = TYPE_META[announcement.type as AnnouncementType] ?? TYPE_META.in_app;
  const status = statusBadge(announcement);
  const TypeIcon = typeMeta.icon;

  return (
    <GlassCard tone={typeMeta.tone === 'blue' ? 'blue' : typeMeta.tone} gradientBorder
      padding={Spacing['5']} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <TypeIcon color={Palette.neonAmber} size={18} />
        </View>
        <View style={styles.cardMeta}>
          <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.cardTitle} numberOfLines={1}>
            {announcement.title}
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.cardBody} numberOfLines={2}>
            {announcement.body}
          </NeonText>
        </View>
      </View>

      <View style={styles.badgesRow}>
        <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
        <Badge tone={status.tone} dot>{status.label}</Badge>
      </View>

      <Divider tone="white" />

      <View style={styles.cardDetails}>
        <DetailRow icon={<Calendar color={Palette.neonCyan} size={13} />} label="Created" value={formatDateTime(announcement.created_at)} />
        <DetailRow icon={<Clock color={Palette.neonAmber} size={13} />} label="Scheduled" value={formatDateTime(announcement.scheduled_at)} />
        <DetailRow icon={<CheckCircle2 color={Palette.neonLime} size={13} />} label="Sent" value={formatDateTime(announcement.sent_at)} />
      </View>

      {announcement.sent ? (
        <View style={styles.sentBadge}>
          <CheckCircle2 color={Palette.neonLime} size={15} />
          <NeonText variant="body" weight="semiBold" tone="lime" style={styles.sentText}>
            Sent {formatDateTime(announcement.sent_at)}
          </NeonText>
        </View>
      ) : (
        <NeonButton variant="success" size="sm" fullWidth loading={busy} disabled={busy}
          leftIcon={<Send color="#021810" size={15} />} onPress={onSend}>
          Send Now
        </NeonButton>
      )}
    </GlassCard>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>{icon}</View>
      <NeonText variant="body" tone="muted" style={styles.detailLabel}>{label}</NeonText>
      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.detailValue}>{value}</NeonText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center', paddingBottom: Spacing['20'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, textAlign: 'center', fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  headerIconWrap: { width: 40, height: 40, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], borderWidth: 1, borderRadius: Radii.md, padding: Spacing['3'] },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2'], backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.25)', borderRadius: Radii.md, padding: Spacing['3'] },
  warnText: { flex: 1, fontSize: Typography.sizes.xs, lineHeight: 17 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  // Card
  card: { gap: Spacing['3'] },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['3'] },
  cardIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { fontSize: Typography.sizes.base },
  cardBody: { fontSize: Typography.sizes.xs, lineHeight: 17 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flexWrap: 'wrap' },
  cardDetails: { gap: Spacing['2'] },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  detailIconWrap: { width: 22, height: 22, borderRadius: Radii.xs, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: Typography.sizes.xs, flex: 1 },
  detailValue: { fontSize: Typography.sizes.xs, textAlign: 'right' },
  sentBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], backgroundColor: 'rgba(0,255,156,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,156,0.25)', borderRadius: Radii.md, paddingVertical: Spacing['3'], paddingHorizontal: Spacing['4'], justifyContent: 'center' },
  sentText: { fontSize: Typography.sizes.xs },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 480, gap: Spacing['4'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  modalIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.10)', borderWidth: 1, borderColor: Palette.neonAmber, alignItems: 'center', justifyContent: 'center' },
  modalInputGap: { marginTop: Spacing['1'] },
  fieldLabel: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide, textTransform: 'uppercase', color: Palette.textTertiary, marginBottom: Spacing['2'] },
  chipsRow: { flexDirection: 'row', gap: Spacing['2'] },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing['2'], paddingVertical: Spacing['3'], borderRadius: Radii.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: Palette.glass300 },
  chipActive: { borderColor: 'rgba(255,184,0,0.5)', backgroundColor: 'rgba(255,184,0,0.1)' },
  chipText: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  scheduleHint: { fontSize: Typography.sizes.xs, lineHeight: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], backgroundColor: 'rgba(255,45,111,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.3)', borderRadius: Radii.md, padding: Spacing['3'] },
  errorText: { flex: 1, fontSize: Typography.sizes.xs, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['1'] },
  flex1: { flex: 1 },
  footerSpace: { height: Spacing['4'] },
});
