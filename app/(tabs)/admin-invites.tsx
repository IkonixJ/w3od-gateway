import { useState, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Ticket, Copy, Check, Ban, Power, Calendar, Clock, User,
  Infinity as InfinityIcon,
} from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, NeonButton, NeonInput, Badge, Divider } from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  getInviteCodes, createInviteCode, disableInviteCode, reactivateInviteCode,
  formatDateTime, type InviteCode,
} from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

type BadgeTone = 'cyan' | 'lime' | 'amber' | 'rose';
type Status = 'active' | 'disabled' | 'expired';

export default function AdminInvitesScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminInvitesContent />
    </RequireRole>
  );
}

function codeStatus(code: InviteCode): Status {
  if (code.disabled) return 'disabled';
  if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) return 'expired';
  return 'active';
}

function statusTone(s: Status): BadgeTone {
  return s === 'active' ? 'lime' : s === 'disabled' ? 'rose' : 'amber';
}

function AdminInvitesContent() {
  const router = useRouter();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [maxUses, setMaxUses] = useState('1');
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((kind: 'success' | 'error', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const loadData = useCallback(async () => {
    setCodes(await getInviteCodes());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const openCreate = () => {
    setMaxUses('1'); setExpiry(''); setCreateError(null); setCreateModal(true);
  };

  const handleCreate = async () => {
    const parsed = parseInt(maxUses, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setCreateError('Enter a valid number of uses (1 or more).'); return;
    }
    let expiresAt: string | null = null;
    if (expiry.trim()) {
      const m = expiry.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) { setCreateError('Expiry must be in YYYY-MM-DD format, or leave blank.'); return; }
      const d = new Date(`${expiry.trim()}T23:59:59`);
      if (Number.isNaN(d.getTime())) { setCreateError('Invalid expiry date.'); return; }
      expiresAt = d.toISOString();
    }
    setCreating(true); setCreateError(null);
    const result = await createInviteCode(parsed, expiresAt);
    setCreating(false);
    if (!result.success) { setCreateError(result.error ?? 'Failed to create invite code.'); return; }
    setCreateModal(false);
    showToast('success', 'Invite code generated');
    loadData();
  };

  const handleDisable = async (code: InviteCode) => {
    const result = await disableInviteCode(code.id);
    if (!result.success) { showToast('error', result.error ?? 'Failed to disable code.'); return; }
    showToast('success', 'Code disabled'); loadData();
  };

  const handleReactivate = async (code: InviteCode) => {
    const result = await reactivateInviteCode(code.id);
    if (!result.success) { showToast('error', result.error ?? 'Failed to reactivate code.'); return; }
    showToast('success', 'Code reactivated'); loadData();
  };

  const handleCopy = async (code: InviteCode) => {
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(code.code);
    } catch { /* clipboard may be blocked */ }
    setCopiedId(code.id);
    showToast('success', 'Code copied to clipboard');
    setTimeout(() => setCopiedId((id) => (id === code.id ? null : id)), 1800);
  };

  const activeCount = codes.filter((c) => codeStatus(c) === 'active').length;
  const usedTotal = codes.reduce((sum, c) => sum + c.used_count, 0);

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonCyan} colors={[Palette.neonCyan]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>INVITE CODES</NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.statValue}>{activeCount}</NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>ACTIVE</NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="lime" style={styles.statValue}>{usedTotal}</NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>USES</NeonText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <NeonText variant="display" weight="bold" tone="amber" style={styles.statValue}>{codes.length}</NeonText>
            <NeonText variant="body" tone="muted" style={styles.statLabel}>TOTAL</NeonText>
          </View>
        </View>

        {/* Generate button */}
        <NeonButton variant="cyan" leftIcon={<Plus color="#03121A" size={18} />} onPress={openCreate} fullWidth>
          Generate New Code
        </NeonButton>

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, toast.kind === 'success' ? styles.toastSuccess : styles.toastError]}>
            {toast.kind === 'success'
              ? <Check color={Palette.neonLime} size={18} strokeWidth={2.5} />
              : <Ban color={Palette.neonRose} size={18} strokeWidth={2.5} />}
            <NeonText variant="body" weight="semiBold" tone={toast.kind === 'success' ? 'lime' : 'rose'}>
              {toast.msg}
            </NeonText>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonCyan} />
          </View>
        ) : codes.length === 0 ? (
          <GlassCard tone="cyan" padding={Spacing['6']} style={styles.emptyCard}>
            <Ticket color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>No invite codes</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Generate a code to start inviting members to the W3OD Gateway.
            </NeonText>
          </GlassCard>
        ) : (
          codes.map((code) => (
            <InviteCard
              key={code.id}
              code={code}
              copied={copiedId === code.id}
              onCopy={() => handleCopy(code)}
              onDisable={() => handleDisable(code)}
              onReactivate={() => handleReactivate(code)}
            />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Generate modal */}
      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => !creating && setCreateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Ticket color={Palette.neonCyan} size={20} />
                </View>
                <NeonText variant="heading" weight="semiBold" tone="cyan">GENERATE CODE</NeonText>
              </View>
              <Pressable onPress={() => setCreateModal(false)} hitSlop={10} disabled={creating}>
                <Ban color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              Create a new invite code. Set a usage limit and optional expiry date.
            </NeonText>

            <NeonInput label="Max Uses" value={maxUses} onChangeText={setMaxUses} placeholder="1" keyboardType="numeric" tone="cyan" />
            <NeonInput
              label="Expiry Date (optional)" value={expiry} onChangeText={setExpiry}
              placeholder="YYYY-MM-DD" keyboardType="numeric" tone="cyan"
              leftIcon={<Calendar color={Palette.textTertiary} size={18} />}
            />

            {createError && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">{createError}</NeonText>
              </View>
            )}

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setCreateModal(false)} disabled={creating}>Cancel</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="cyan" fullWidth loading={creating} onPress={handleCreate} leftIcon={<Plus color="#03121A" size={16} />}>
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

// ─── Invite card ────────────────────────────────────────────────────────────

function InviteCard({
  code, copied, onCopy, onDisable, onReactivate,
}: {
  code: InviteCode; copied: boolean; onCopy: () => void; onDisable: () => void; onReactivate: () => void;
}) {
  const status = codeStatus(code);
  const tone = statusTone(status);
  const pct = code.max_uses > 0 ? Math.min(1, code.used_count / code.max_uses) : 0;
  const isExhausted = code.used_count >= code.max_uses;

  return (
    <GlassCard tone={tone} gradientBorder padding={Spacing['5']} style={styles.card}>
      {/* Code + copy */}
      <View style={styles.codeRow}>
        <View style={styles.codeWrap}>
          <Ticket color={Palette.neonCyan} size={18} />
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.codeText}>{code.code}</NeonText>
        </View>
        <Pressable onPress={onCopy} hitSlop={10} style={styles.copyBtn}>
          {copied ? <Check color={Palette.neonLime} size={18} strokeWidth={2.5} /> : <Copy color={Palette.textSecondary} size={18} />}
        </Pressable>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <NeonText variant="body" tone="muted" style={styles.progressLabel}>USAGE</NeonText>
          <NeonText variant="body" weight="semiBold" tone={isExhausted ? 'amber' : 'cyan'} style={styles.progressValue}>
            {code.used_count}/{code.max_uses}
          </NeonText>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct * 100}%`,
                backgroundColor: isExhausted || pct > 0.8 ? Palette.neonAmber : Palette.neonCyan,
              },
            ]}
          />
        </View>
      </View>

      <Divider tone="white" />

      {/* Meta */}
      <View style={styles.metaSection}>
        <MetaRow icon={code.expires_at ? <Calendar color={Palette.textTertiary} size={14} /> : <InfinityIcon color={Palette.textTertiary} size={14} />} label="Expiry" value={code.expires_at ? formatDateTime(code.expires_at) : 'No expiry'} />
        <MetaRow icon={<User color={Palette.textTertiary} size={14} />} label="Created by" value={code.created_by_username ? `@${code.created_by_username}` : '—'} />
        <MetaRow icon={<Clock color={Palette.textTertiary} size={14} />} label="Created" value={formatDateTime(code.created_at)} />
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Badge tone={tone} dot>{status.toUpperCase()}</Badge>
        {status === 'active' ? (
          <NeonButton variant="danger" size="sm" leftIcon={<Power color="#FFFFFF" size={15} />} onPress={onDisable}>Disable</NeonButton>
        ) : status === 'disabled' ? (
          <NeonButton variant="success" size="sm" leftIcon={<Power color="#021810" size={15} />} onPress={onReactivate}>Reactivate</NeonButton>
        ) : (
          <NeonText variant="body" tone="muted" style={styles.expiredNote}>Expired</NeonText>
        )}
      </View>
    </GlassCard>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      {icon}
      <NeonText variant="body" tone="muted" style={styles.metaLabel}>{label}</NeonText>
      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.metaValue}>{value}</NeonText>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['4'] },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  statValue: { fontSize: Typography.sizes.xl },
  statLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  toast: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], borderWidth: 1, borderRadius: Radii.md, padding: Spacing['3'] },
  toastSuccess: { backgroundColor: 'rgba(0,255,156,0.10)', borderColor: 'rgba(0,255,156,0.30)' },
  toastError: { backgroundColor: 'rgba(255,45,111,0.10)', borderColor: 'rgba(255,45,111,0.30)' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  footerSpace: { height: Spacing['4'] },
  // Card
  card: { gap: Spacing['3'] },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flex: 1 },
  codeText: { fontSize: Typography.sizes.lg, letterSpacing: Typography.letterSpacings.wide, fontFamily: Typography.families.headingSemiBold },
  copyBtn: { width: 36, height: 36, borderRadius: Radii.sm, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  progressSection: { gap: Spacing['2'] },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  progressValue: { fontSize: Typography.sizes.sm },
  progressTrack: { height: 6, borderRadius: Radii.full, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.full },
  metaSection: { gap: Spacing['2'] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  metaLabel: { fontSize: Typography.sizes.xs, flex: 1 },
  metaValue: { fontSize: Typography.sizes.xs, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expiredNote: { fontSize: Typography.sizes.xs },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 460, gap: Spacing['4'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  modalIconWrap: { width: 36, height: 36, borderRadius: Radii.md, borderWidth: 1, borderColor: Palette.neonCyanBorder, backgroundColor: Palette.neonCyanSubtle, alignItems: 'center', justifyContent: 'center' },
  modalSub: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  errorBox: { backgroundColor: 'rgba(255,45,111,0.10)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.30)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
  flex1: { flex: 1 },
});
