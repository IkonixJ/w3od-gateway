import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl, Share, type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Check, X, Download, ListChecks, Hash, Wallet, Landmark,
  Calendar, Clock, CircleCheck as CheckCircle2, Circle as XCircle,
  FileText, CheckCheck, Banknote,
} from 'lucide-react-native';

import {
  ScreenShell, GlassCard, NeonText, NeonButton, NeonInput, Badge, Avatar, Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  getAllRedemptions, reviewRedemption, bulkApproveRedemptions,
  formatDateTime, formatNumber, type PayoutEntry, type OperationResult,
} from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

type RedStatus = 'pending' | 'approved' | 'rejected' | 'paid';
type Tone = 'amber' | 'lime' | 'rose' | 'cyan' | 'magenta';

const STATUS_META: Record<RedStatus, { label: string; tone: Tone }> = {
  pending: { label: 'PENDING', tone: 'amber' },
  approved: { label: 'APPROVED', tone: 'lime' },
  rejected: { label: 'REJECTED', tone: 'rose' },
  paid: { label: 'PAID', tone: 'cyan' },
};

const TOAST_STYLE: Record<'lime' | 'rose' | 'cyan', { bg: string; border: string; color: string }> = {
  lime: { bg: 'rgba(0,255,156,0.10)', border: 'rgba(0,255,156,0.30)', color: Palette.neonLime },
  rose: { bg: 'rgba(255,45,111,0.10)', border: 'rgba(255,45,111,0.30)', color: Palette.neonRose },
  cyan: { bg: 'rgba(0,240,255,0.10)', border: 'rgba(0,240,255,0.30)', color: Palette.neonCyan },
};

export default function AdminRedemptionsScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminRedemptionsContent />
    </RequireRole>
  );
}

function AdminRedemptionsContent() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<PayoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, RedStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PayoutEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'lime' | 'rose' | 'cyan' } | null>(null);

  const showToast = useCallback((msg: string, tone: 'lime' | 'rose' | 'cyan' = 'lime') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const loadData = useCallback(async () => {
    setRedemptions(await getAllRedemptions());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const deriveStatus = useCallback((entry: PayoutEntry): RedStatus =>
    statusMap[entry.id] ?? (entry.processing_date ? 'approved' : 'pending'), [statusMap]);

  const pendingIds = useMemo(
    () => redemptions.filter((r) => deriveStatus(r) === 'pending').map((r) => r.id),
    [redemptions, deriveStatus]
  );

  const counts = useMemo(() => {
    const c: Record<RedStatus, number> = { pending: 0, approved: 0, rejected: 0, paid: 0 };
    redemptions.forEach((r) => { c[deriveStatus(r)]++; });
    return c;
  }, [redemptions, deriveStatus]);

  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const allSelected = pendingIds.length > 0 && selectedIds.size === pendingIds.length;
  const toggleSelectAll = () => setSelectedIds(allSelected ? new Set() : new Set(pendingIds));
  const enterSelection = () => { setSelectionMode(true); setSelectedIds(new Set()); };
  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const runReview = async (entry: PayoutEntry, decision: 'approved' | 'paid', label: string) => {
    setBusyId(entry.id);
    const result = await reviewRedemption(entry.id, decision);
    setBusyId(null);
    if (!result.success) { showToast(result.error ?? `${label} failed`, 'rose'); return; }
    setStatusMap((m) => ({ ...m, [entry.id]: decision }));
    showToast(`${label} ${entry.reference}`);
  };

  const openReject = (entry: PayoutEntry) => {
    setRejectTarget(entry); setRejectReason(''); setRejectError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { setRejectError('A reason is required to reject a redemption.'); return; }
    setRejecting(true); setRejectError(null);
    const result = await reviewRedemption(rejectTarget.id, 'rejected', rejectReason.trim());
    setRejecting(false);
    if (!result.success) { setRejectError(result.error ?? 'Rejection failed.'); return; }
    setStatusMap((m) => ({ ...m, [rejectTarget.id]: 'rejected' }));
    showToast(`Rejected ${rejectTarget.reference}`, 'rose');
    setRejectTarget(null);
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const result: OperationResult = await bulkApproveRedemptions(ids);
    setBulkBusy(false);
    if (!result.success) { showToast(result.error ?? 'Bulk approval failed', 'rose'); return; }
    setStatusMap((m) => { const n = { ...m }; ids.forEach((id) => (n[id] = 'approved')); return n; });
    showToast(`Approved ${ids.length} redemption${ids.length > 1 ? 's' : ''}`);
    exitSelection();
  };

  const handleExport = async () => {
    const header = ['Reference', 'Member', 'Username', 'Email', 'Amount (W3OD)',
      'Account Name', 'Account Number', 'Requested At', 'Processing Date'];
    const esc = (v: string | null | undefined) => {
      const s = v ?? '';
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = redemptions.map((r) => [
      r.reference, r.display_name ?? r.username ?? '', r.username ?? '', r.email,
      String(r.amount), r.account_name, r.account_number,
      formatDateTime(r.requested_at), formatDateTime(r.processing_date),
    ].map(esc).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const filename = `w3od-payouts-${new Date().toISOString().slice(0, 10)}.csv`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV exported', 'cyan');
      } catch { showToast('Export failed', 'rose'); }
      return;
    }
    try { await Share.share({ title: filename, message: csv }); }
    catch { showToast('Export failed', 'rose'); }
  };

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonMagenta} colors={[Palette.neonMagenta]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonMagenta} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>REDEMPTIONS</NeonText>
          <View style={styles.headerActions}>
            <Pressable onPress={handleExport} hitSlop={10} style={styles.headerIconBtn}>
              <Download color={Palette.neonMagenta} size={20} />
            </Pressable>
            <Pressable onPress={selectionMode ? exitSelection : enterSelection} hitSlop={10} style={styles.headerIconBtn}>
              {selectionMode ? <X color={Palette.neonMagenta} size={20} /> : <ListChecks color={Palette.neonMagenta} size={20} />}
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {(['pending', 'approved', 'paid', 'rejected'] as RedStatus[]).map((s, i) => (
            <View key={s} style={styles.statGroup}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statBox}>
                <NeonText variant="display" weight="bold" tone={STATUS_META[s].tone} style={styles.statValue}>{counts[s]}</NeonText>
                <NeonText variant="body" tone="muted" style={styles.statLabel}>{STATUS_META[s].label}</NeonText>
              </View>
            </View>
          ))}
        </View>

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, { backgroundColor: TOAST_STYLE[toast.tone].bg, borderColor: TOAST_STYLE[toast.tone].border }]}>
            <CheckCircle2 color={TOAST_STYLE[toast.tone].color} size={18} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone={toast.tone}>{toast.msg}</NeonText>
          </View>
        )}

        {/* Selection toolbar */}
        {selectionMode && (
          <View style={styles.selectionBar}>
            <Pressable style={styles.selectAllBtn} onPress={toggleSelectAll} hitSlop={8}>
              <View style={[styles.checkbox, allSelected ? styles.checkboxOn : styles.checkboxOff]}>
                {allSelected && <Check color={Palette.bg950} size={14} strokeWidth={3} />}
              </View>
              <NeonText variant="body" weight="semiBold" tone="magenta">
                {allSelected ? 'Deselect all' : 'Select all pending'}
              </NeonText>
            </Pressable>
            <NeonText variant="body" tone="muted" style={styles.selectionCount}>{selectedIds.size} selected</NeonText>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={Palette.neonMagenta} /></View>
        ) : redemptions.length === 0 ? (
          <GlassCard tone="magenta" padding={Spacing['6']} style={styles.emptyCard}>
            <Wallet color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>No redemptions</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>Member payout requests will appear here for review.</NeonText>
          </GlassCard>
        ) : (
          redemptions.map((entry) => (
            <RedemptionCard
              key={entry.id}
              entry={entry}
              status={deriveStatus(entry)}
              busy={busyId === entry.id}
              selectionMode={selectionMode}
              selected={selectedIds.has(entry.id)}
              onToggleSelect={() => toggleSelect(entry.id)}
              onApprove={() => runReview(entry, 'approved', 'Approved')}
              onReject={() => openReject(entry)}
              onMarkPaid={() => runReview(entry, 'paid', 'Marked paid')}
            />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Bulk approve floating bar */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={styles.bulkBar} pointerEvents="box-none">
          <GlassCard tone="magenta" gradientBorder padding={Spacing['3']} style={styles.bulkBarCard}>
            <View style={styles.bulkBarInfo}>
              <CheckCheck color={Palette.neonMagenta} size={18} />
              <NeonText variant="body" weight="semiBold" tone="magenta">
                {selectedIds.size} pending payout{selectedIds.size > 1 ? 's' : ''}
              </NeonText>
            </View>
            <NeonButton variant="magenta" size="sm" loading={bulkBusy}
              leftIcon={<Check color="#1A0017" size={16} />} onPress={handleBulkApprove}>
              Approve all
            </NeonButton>
          </GlassCard>
        </View>
      )}

      {/* Reject reason modal */}
      <Modal visible={rejectTarget !== null} transparent animationType="fade"
        onRequestClose={() => !rejecting && setRejectTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="rose" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, styles.modalIconRose]}>
                  <XCircle color={Palette.neonRose} size={20} />
                </View>
                <NeonText variant="heading" weight="semiBold" tone="rose">REJECT REDEMPTION</NeonText>
              </View>
              <Pressable onPress={() => !rejecting && setRejectTarget(null)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            {rejectTarget && (
              <View style={styles.modalSubInfo}>
                <Avatar displayName={rejectTarget.display_name ?? rejectTarget.username} size="sm" />
                <View style={styles.modalSubMeta}>
                  <NeonText variant="body" weight="semiBold" tone="cyan">
                    {rejectTarget.display_name ?? rejectTarget.username ?? 'Member'}
                  </NeonText>
                  <NeonText variant="body" tone="muted" style={styles.modalSubEmail}>
                    {rejectTarget.reference} · {formatNumber(rejectTarget.amount)} W3OD
                  </NeonText>
                </View>
              </View>
            )}

            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              The member will be notified with your reason and the payout will be cancelled.
            </NeonText>

            <NeonInput label="Rejection Reason" value={rejectReason} onChangeText={setRejectReason}
              placeholder="Explain why this redemption is rejected..."
              leftIcon={<FileText color={Palette.textTertiary} size={18} />}
              tone="rose" multiline style={styles.modalInput} error={rejectError} />

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setRejectTarget(null)} disabled={rejecting}>Cancel</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="danger" fullWidth loading={rejecting} disabled={!rejectReason.trim()}
                  onPress={handleConfirmReject} leftIcon={<X color="#FFFFFF" size={16} />}>
                  Confirm Rejection
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>{icon}</View>
      <NeonText variant="body" tone="muted" style={styles.detailLabel}>{label}</NeonText>
      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.detailValue}>{value}</NeonText>
    </View>
  );
}

function RedemptionCard({
  entry, status, busy, selectionMode, selected, onToggleSelect, onApprove, onReject, onMarkPaid,
}: {
  entry: PayoutEntry; status: RedStatus; busy: boolean; selectionMode: boolean; selected: boolean;
  onToggleSelect: () => void; onApprove: () => void; onReject: () => void; onMarkPaid: () => void;
}) {
  const meta = STATUS_META[status];
  const actionable = (status === 'pending' || status === 'approved') && !selectionMode;
  return (
    <GlassCard tone={meta.tone} gradientBorder padding={Spacing['5']}
      style={StyleSheet.flatten([styles.card, selected && styles.cardSelected]) as ViewStyle}>
      <View style={styles.cardHeader}>
        {selectionMode && (
          <Pressable onPress={onToggleSelect} disabled={status !== 'pending'} hitSlop={8} style={styles.checkboxWrap}>
            <View style={[styles.checkbox, selected ? styles.checkboxOn : styles.checkboxOff]}>
              {selected && <Check color={Palette.bg950} size={16} strokeWidth={3} />}
            </View>
          </Pressable>
        )}
        <Avatar displayName={entry.display_name ?? entry.username} size="md" />
        <View style={styles.cardMeta}>
          <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.cardName}>
            {entry.display_name ?? entry.username ?? 'Member'}
          </NeonText>
          {entry.username && (
            <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.cardUsername}>@{entry.username}</NeonText>
          )}
          <NeonText variant="body" tone="muted" style={styles.cardEmail}>{entry.email}</NeonText>
        </View>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </View>

      <View style={styles.amountRow}>
        <Wallet color={Palette.neonLime} size={16} />
        <NeonText variant="body" tone="muted" style={styles.amountLabel}>PAYOUT</NeonText>
        <NeonText variant="display" weight="bold" tone="lime" style={styles.amountValue}>{formatNumber(entry.amount)}</NeonText>
        <NeonText variant="body" weight="semiBold" tone="muted" style={styles.amountUnit}>W3OD</NeonText>
      </View>

      <Divider tone="white" />

      <View style={styles.cardDetails}>
        <DetailRow icon={<Landmark color={Palette.neonCyan} size={14} />} label="Account Name" value={entry.account_name || '—'} />
        <DetailRow icon={<Hash color={Palette.neonCyan} size={14} />} label="Account No." value={entry.account_number || '—'} />
        <DetailRow icon={<Hash color={Palette.neonCyan} size={14} />} label="Reference" value={entry.reference || '—'} />
        <DetailRow icon={<Clock color={Palette.neonCyan} size={14} />} label="Requested" value={formatDateTime(entry.requested_at)} />
        <DetailRow icon={<Calendar color={Palette.neonCyan} size={14} />} label="Processing" value={formatDateTime(entry.processing_date)} />
      </View>

      {actionable && (
        <View style={styles.cardActions}>
          <View style={styles.flex1}>
            <NeonButton variant="danger" size="sm" fullWidth loading={busy} disabled={busy}
              leftIcon={<X color="#FFFFFF" size={15} />} onPress={onReject}>Reject</NeonButton>
          </View>
          <View style={styles.flex1}>
            {status === 'pending' ? (
              <NeonButton variant="success" size="sm" fullWidth loading={busy} disabled={busy}
                leftIcon={<Check color="#021810" size={15} />} onPress={onApprove}>Approve</NeonButton>
            ) : (
              <NeonButton variant="cyan" size="sm" fullWidth loading={busy} disabled={busy}
                leftIcon={<Banknote color="#03121A" size={15} />} onPress={onMarkPaid}>Mark Paid</NeonButton>
            )}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center', paddingBottom: Spacing['20'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, textAlign: 'center', fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  headerIconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['4'] },
  statGroup: { flexDirection: 'row', flex: 1 },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  statValue: { fontSize: Typography.sizes.lg },
  statLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  toast: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], borderWidth: 1, borderRadius: Radii.md, padding: Spacing['3'] },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Palette.glass300, borderRadius: Radii.md, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'] },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  selectionCount: { fontSize: Typography.sizes.xs },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  card: { gap: Spacing['3'] },
  cardSelected: { shadowColor: Palette.neonMagenta, shadowOpacity: 0.5, shadowRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  cardMeta: { flex: 1, gap: 2 },
  cardName: { fontSize: Typography.sizes.base },
  cardUsername: { fontSize: Typography.sizes.xs },
  cardEmail: { fontSize: Typography.sizes.xs },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], backgroundColor: 'rgba(0,255,156,0.06)', borderWidth: 1, borderColor: 'rgba(0,255,156,0.2)', borderRadius: Radii.md, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'] },
  amountLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  amountValue: { flex: 1, fontSize: Typography.sizes.lg, marginLeft: Spacing['2'] },
  amountUnit: { fontSize: Typography.sizes.xs },
  cardDetails: { gap: Spacing['2'] },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  detailIconWrap: { width: 24, height: 24, borderRadius: Radii.xs, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: Typography.sizes.xs, flex: 1 },
  detailValue: { fontSize: Typography.sizes.xs, textAlign: 'right' },
  cardActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['1'] },
  flex1: { flex: 1 },
  footerSpace: { height: Spacing['4'] },
  checkboxWrap: { padding: Spacing['1'] },
  checkbox: { width: 22, height: 22, borderRadius: Radii.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: Palette.neonMagenta, borderColor: Palette.neonMagenta },
  checkboxOff: { backgroundColor: 'rgba(255,0,229,0.06)', borderColor: 'rgba(255,0,229,0.4)' },
  bulkBar: { position: 'absolute', bottom: Spacing['6'], left: 0, right: 0, alignItems: 'center', paddingHorizontal: screenPadding },
  bulkBarCard: { width: '100%', maxWidth: wideCardMaxWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadows.xl },
  bulkBarInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 460, gap: Spacing['4'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  modalIconWrap: { width: 36, height: 36, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalIconRose: { backgroundColor: 'rgba(255,45,111,0.10)', borderColor: Palette.neonRose },
  modalSubInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'] },
  modalSubMeta: { flex: 1, gap: 2 },
  modalSubEmail: { fontSize: Typography.sizes.xs },
  modalSub: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  modalInput: { marginTop: Spacing['1'] },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
});
