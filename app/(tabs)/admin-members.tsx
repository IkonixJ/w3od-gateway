import { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Search, Ban, RefreshCw, MessageSquarePlus, Wallet, Award,
  Zap, Phone, ShieldCheck, ShieldOff, X, Check, FileText, ChevronRight,
  Clock, Calendar, User as UserIcon, Mail, Hash,
} from 'lucide-react-native';

import {
  ScreenShell, GlassCard, NeonText, NeonButton, NeonInput, Badge, Avatar, Divider,
} from '@/components/ui';
import { RequireRole } from '@/lib/rbac';
import {
  searchMembers, getMemberDetail, suspendMember, reactivateMember, addAdminNote,
  formatDateTime, formatNumber,
  type AdminMember, type MemberDetail,
} from '@/lib/admin-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

export default function AdminMembersScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <AdminMembersContent />
    </RequireRole>
  );
}

// ─── Tone helpers ────────────────────────────────────────────────────────────

type BadgeTone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'lime' | 'amber' | 'rose' | 'muted';

const ROLE_TONE: Record<string, BadgeTone> = { super_admin: 'magenta', admin: 'amber', moderator: 'purple' };
const ROLE_LABEL: Record<string, string> = { super_admin: 'SUPER ADMIN', admin: 'ADMIN', moderator: 'MODERATOR' };
const KYC_TONE: Record<string, BadgeTone> = { verified: 'lime', approved: 'lime', pending: 'amber', in_review: 'amber', rejected: 'rose' };
const KYC_LABEL: Record<string, string> = { verified: 'VERIFIED', approved: 'VERIFIED', pending: 'PENDING', in_review: 'PENDING', rejected: 'REJECTED' };
const KYC_ICON_COLOR: Record<BadgeTone, string> = {
  lime: Palette.neonLime, amber: Palette.neonAmber, rose: Palette.neonRose,
  cyan: Palette.neonCyan, blue: Palette.electricBlue, purple: Palette.purpleGlow,
  magenta: Palette.neonMagenta, muted: Palette.textTertiary,
};
const RARITY_TONE: Record<string, BadgeTone> = { legendary: 'amber', epic: 'magenta', rare: 'purple' };

const roleTone = (r: string): BadgeTone => ROLE_TONE[r] ?? 'cyan';
const roleLabel = (r: string): string => ROLE_LABEL[r] ?? 'MEMBER';
const kycTone = (s: string): BadgeTone => KYC_TONE[s] ?? 'muted';
const kycLabel = (s: string): string => KYC_LABEL[s] ?? 'UNVERIFIED';
const rarityTone = (r: string): BadgeTone => RARITY_TONE[r?.toLowerCase()] ?? 'cyan';

// ─── Screen ──────────────────────────────────────────────────────────────────

function AdminMembersContent() {
  const router = useRouter();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(false);

  const [actionModal, setActionModal] = useState<null | 'suspend' | 'note'>(null);
  const [actionText, setActionText] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ tone: 'lime' | 'rose' | 'cyan'; text: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((tone: 'lime' | 'rose' | 'cyan', text: string) => {
    setToast({ tone, text });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    setMembers(await searchMembers(q, 50));
    setSearching(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    runSearch(query).finally(() => setRefreshing(false));
  }, [query, runSearch]);

  const openDetail = useCallback(async (member: AdminMember) => {
    setSelectedMember(member);
    setDetail(null);
    setDetailLoading(true);
    setDetailModal(true);
    setDetail(await getMemberDetail(member.id));
    setDetailLoading(false);
  }, []);

  const reloadDetail = useCallback(async () => {
    if (!selectedMember) return;
    setDetail(await getMemberDetail(selectedMember.id));
  }, [selectedMember]);

  const openAction = (kind: 'suspend' | 'note') => {
    setActionText('');
    setActionError(null);
    setActionModal(kind);
  };

  const handleAction = async () => {
    if (!selectedMember || !actionText.trim()) return;
    setActionBusy(true);
    setActionError(null);
    const uid = selectedMember.id;
    const text = actionText.trim();
    const result = actionModal === 'suspend'
      ? await suspendMember(uid, text)
      : await addAdminNote(uid, text);
    setActionBusy(false);
    if (!result.success) {
      setActionError(result.error ?? 'Action failed.');
      return;
    }
    if (actionModal === 'suspend') {
      showToast('rose', 'Member suspended');
      runSearch(query);
    } else {
      showToast('cyan', 'Note added');
    }
    setActionModal(null);
    reloadDetail();
  };

  const handleReactivate = async () => {
    if (!selectedMember) return;
    const result = await reactivateMember(selectedMember.id);
    if (!result.success) {
      showToast('rose', 'Failed to reactivate');
      return;
    }
    showToast('lime', 'Member reactivated');
    reloadDetail();
    runSearch(query);
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
          <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>MEMBERS</NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Search */}
        <NeonInput
          value={query} onChangeText={setQuery}
          placeholder="Search by username, name, or email..."
          leftIcon={<Search color={Palette.textTertiary} size={18} />}
          tone="amber" style={styles.searchInput}
        />

        <View style={styles.resultRow}>
          <NeonText variant="body" tone="muted" style={styles.resultCount}>
            {searching ? 'Searching…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
          </NeonText>
        </View>

        {/* Toast */}
        {toast && (
          <View style={[
            styles.toast,
            {
              backgroundColor: toast.tone === 'lime' ? Palette.successSubtle : toast.tone === 'rose' ? Palette.errorSubtle : Palette.neonCyanSubtle,
              borderColor: toast.tone === 'lime' ? 'rgba(0,255,156,0.3)' : toast.tone === 'rose' ? 'rgba(255,45,111,0.3)' : Palette.neonCyanBorder,
            },
          ]}>
            <Check color={toast.tone === 'lime' ? Palette.success : toast.tone === 'rose' ? Palette.error : Palette.neonCyan} size={16} strokeWidth={2.5} />
            <NeonText variant="body" weight="semiBold" tone={toast.tone}>{toast.text}</NeonText>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={Palette.neonAmber} /></View>
        ) : members.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['6']} style={styles.emptyCard}>
            <Search color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>No members found</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>Try a different search term to find members.</NeonText>
          </GlassCard>
        ) : (
          members.map((m) => (
            <Pressable key={m.id} onPress={() => openDetail(m)}>
              <GlassCard tone={m.suspended ? 'rose' : 'cyan'} gradientBorder padding={Spacing['4']} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <Avatar uri={m.avatar_url} displayName={m.display_name ?? m.username} size="md" />
                  <View style={styles.memberMeta}>
                    <View style={styles.memberNameRow}>
                      <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.memberName} numberOfLines={1}>
                        {m.display_name ?? m.username ?? 'Member'}
                      </NeonText>
                      {m.suspended && (
                        <Badge tone="rose"><ShieldOff color={Palette.neonRose} size={11} />SUSPENDED</Badge>
                      )}
                    </View>
                    {m.username && (
                      <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.memberUsername} numberOfLines={1}>@{m.username}</NeonText>
                    )}
                    <NeonText variant="body" tone="muted" style={styles.memberEmail} numberOfLines={1}>{m.email}</NeonText>
                    <View style={styles.badgeRow}>
                      <Badge tone={roleTone(m.role)}>{roleLabel(m.role)}</Badge>
                      <Badge tone={kycTone(m.kyc_status)}>
                        <ShieldCheck color={KYC_ICON_COLOR[kycTone(m.kyc_status)]} size={11} />
                        {kycLabel(m.kyc_status)}
                      </Badge>
                    </View>
                  </View>
                  <ChevronRight color={Palette.textTertiary} size={18} style={styles.chevron} />
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* ── Detail modal ─────────────────────────────────────────────────────── */}
      <Modal visible={detailModal} transparent animationType="fade" onRequestClose={() => setDetailModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="amber" gradientBorder padding={Spacing['5']} style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <Avatar uri={selectedMember?.avatar_url ?? null} displayName={selectedMember?.display_name ?? selectedMember?.username} size="md" />
                <View style={styles.detailHeaderMeta}>
                  <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.detailName}>
                    {selectedMember?.display_name ?? selectedMember?.username ?? 'Member'}
                  </NeonText>
                  {selectedMember?.username && (
                    <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.detailUsername}>@{selectedMember.username}</NeonText>
                  )}
                </View>
              </View>
              <Pressable onPress={() => setDetailModal(false)} hitSlop={10}><X color={Palette.textTertiary} size={20} /></Pressable>
            </View>

            {detailLoading ? (
              <View style={styles.detailLoading}><ActivityIndicator size="large" color={Palette.neonAmber} /></View>
            ) : detail ? (
              <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.detailBadgeRow}>
                  <Badge tone={roleTone(detail.profile.role)}>{roleLabel(detail.profile.role)}</Badge>
                  <Badge tone={kycTone(detail.profile.kyc_status)}>{kycLabel(detail.profile.kyc_status)}</Badge>
                  {detail.profile.suspended && <Badge tone="rose"><ShieldOff color={Palette.neonRose} size={11} />SUSPENDED</Badge>}
                </View>

                <SectionLabel>PROFILE</SectionLabel>
                <View style={styles.detailGrid}>
                  <DetailRow icon={<Mail color={Palette.neonCyan} size={14} />} label="Email" value={detail.profile.email} />
                  {detail.profile.full_name && <DetailRow icon={<UserIcon color={Palette.neonCyan} size={14} />} label="Legal Name" value={detail.profile.full_name} />}
                  <DetailRow icon={<Phone color={Palette.neonCyan} size={14} />} label="Phone" value={detail.profile.phone ?? '—'} />
                  <DetailRow icon={<Hash color={Palette.neonCyan} size={14} />} label="Username" value={detail.profile.username ?? '—'} />
                  <DetailRow icon={<Zap color={Palette.neonCyan} size={14} />} label="XP" value={formatNumber(detail.profile.xp)} />
                  <DetailRow icon={<Calendar color={Palette.neonCyan} size={14} />} label="Member Since" value={formatDateTime(detail.profile.created_at)} />
                  <DetailRow icon={<Clock color={Palette.neonCyan} size={14} />} label="Last Active" value={formatDateTime(detail.profile.last_active_at)} />
                </View>

                {detail.profile.bio && (
                  <View style={styles.bioBox}>
                    <NeonText variant="body" tone="muted" style={styles.bioText}>{detail.profile.bio}</NeonText>
                  </View>
                )}

                <Divider tone="white" />

                <SectionLabel><Wallet color={Palette.neonAmber} size={13} /> WALLET</SectionLabel>
                {detail.wallet ? (
                  <View style={styles.walletGrid}>
                    <WalletStat label="Balance" value={`₦${formatNumber(detail.wallet.balance)}`} />
                    <WalletStat label="Pending" value={`₦${formatNumber(detail.wallet.pending_balance)}`} />
                    <WalletStat label="Lifetime Earned" value={`₦${formatNumber(detail.wallet.lifetime_earned)}`} />
                    <WalletStat label="Lifetime Redeemed" value={`₦${formatNumber(detail.wallet.lifetime_redeemed)}`} />
                    <View style={styles.walletAccountRow}>
                      <NeonText variant="body" tone="muted" style={styles.walletAccountLabel}>Account No.</NeonText>
                      <NeonText variant="body" weight="semiBold" tone="amber" style={styles.walletAccountValue}>{detail.wallet.account_number}</NeonText>
                    </View>
                  </View>
                ) : (
                  <NeonText variant="body" tone="muted" style={styles.noDataText}>No wallet linked.</NeonText>
                )}

                <Divider tone="white" />

                <SectionLabel><Award color={Palette.neonAmber} size={13} /> BADGES</SectionLabel>
                {detail.badges.length > 0 ? (
                  <View style={styles.badgeList}>
                    {detail.badges.map((b) => <Badge key={b.id} tone={rarityTone(b.rarity)} dot>{b.name}</Badge>)}
                  </View>
                ) : (
                  <NeonText variant="body" tone="muted" style={styles.noDataText}>No badges earned.</NeonText>
                )}

                <Divider tone="white" />

                <SectionLabel><ChevronRight color={Palette.neonAmber} size={13} /> CAMPAIGNS</SectionLabel>
                {detail.participations.length > 0 ? (
                  <View style={styles.campaignList}>
                    {detail.participations.map((p) => (
                      <View key={p.id} style={styles.campaignItem}>
                        <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.campaignTitle} numberOfLines={1}>{p.campaign_title}</NeonText>
                        <Badge tone={kycTone(p.submission_status)}>{p.submission_status.toUpperCase()}</Badge>
                      </View>
                    ))}
                  </View>
                ) : (
                  <NeonText variant="body" tone="muted" style={styles.noDataText}>No campaign participation.</NeonText>
                )}

                <Divider tone="white" />

                <SectionLabel><FileText color={Palette.neonAmber} size={13} /> ADMIN NOTES</SectionLabel>
                {detail.notes.length > 0 ? (
                  <View style={styles.noteList}>
                    {detail.notes.map((n) => (
                      <View key={n.id} style={styles.noteItem}>
                        <NeonText variant="body" tone="cyan" style={styles.noteText}>{n.note}</NeonText>
                        <NeonText variant="body" tone="muted" style={styles.noteDate}>{formatDateTime(n.created_at)}</NeonText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <NeonText variant="body" tone="muted" style={styles.noDataText}>No admin notes.</NeonText>
                )}

                <View style={styles.detailActions}>
                  <NeonButton variant="outline" size="sm" leftIcon={<MessageSquarePlus color={Palette.neonCyan} size={15} />} onPress={() => openAction('note')} style={styles.flex1}>Add Note</NeonButton>
                  {detail.profile.suspended ? (
                    <NeonButton variant="success" size="sm" leftIcon={<RefreshCw color="#021810" size={15} />} onPress={handleReactivate} style={styles.flex1}>Reactivate</NeonButton>
                  ) : (
                    <NeonButton variant="danger" size="sm" leftIcon={<Ban color="#FFFFFF" size={15} />} onPress={() => openAction('suspend')} style={styles.flex1}>Suspend</NeonButton>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.detailLoading}><NeonText variant="body" tone="muted">Could not load member details.</NeonText></View>
            )}
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Action modal (suspend / note) ─────────────────────────────────────── */}
      <ActionModal
        kind={actionModal}
        member={selectedMember}
        text={actionText}
        onText={setActionText}
        busy={actionBusy}
        error={actionError}
        onClose={() => setActionModal(null)}
        onConfirm={handleAction}
      />
    </ScreenShell>
  );
}

// ─── Reusable action modal ───────────────────────────────────────────────────

function ActionModal({
  kind, member, text, onText, busy, error, onClose, onConfirm,
}: {
  kind: null | 'suspend' | 'note';
  member: AdminMember | null;
  text: string;
  onText: (t: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isSuspend = kind === 'suspend';
  const tone = isSuspend ? 'rose' : 'cyan';
  const iconWrap = isSuspend
    ? { backgroundColor: 'rgba(255,45,111,0.1)', borderColor: Palette.neonRose }
    : { backgroundColor: Palette.neonCyanSubtle, borderColor: Palette.neonCyanBorder };
  const title = isSuspend ? 'SUSPEND MEMBER' : 'ADD ADMIN NOTE';
  const subtitle = isSuspend
    ? 'The member will lose access to the platform until reactivated. Provide a reason for the audit log.'
    : 'Notes are visible only to admins and recorded in the audit trail.';
  const inputLabel = isSuspend ? 'Suspension Reason' : 'Note';
  const placeholder = isSuspend ? 'Reason for suspension...' : 'Write an internal note...';

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
        <View style={styles.modalBackdrop} />
        <GlassCard tone={tone} gradientBorder padding={Spacing['6']} style={styles.actionModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIconWrap, iconWrap]}>
                {isSuspend ? <ShieldOff color={Palette.neonRose} size={20} /> : <MessageSquarePlus color={Palette.neonCyan} size={20} />}
              </View>
              <NeonText variant="heading" weight="semiBold" tone={tone}>{title}</NeonText>
            </View>
            <Pressable onPress={onClose} hitSlop={10} disabled={busy}><X color={Palette.textTertiary} size={20} /></Pressable>
          </View>

          {member && (
            <View style={styles.modalSubInfo}>
              <Avatar uri={member.avatar_url} displayName={member.display_name ?? member.username} size="sm" />
              <View style={styles.modalSubMeta}>
                <NeonText variant="body" weight="semiBold" tone="cyan">{member.display_name ?? member.username}</NeonText>
                <NeonText variant="body" tone="muted" style={styles.modalSubEmail}>{member.email}</NeonText>
              </View>
            </View>
          )}

          <NeonText variant="body" tone="muted" style={styles.modalSub}>{subtitle}</NeonText>

          <NeonInput
            label={inputLabel} value={text} onChangeText={onText}
            placeholder={placeholder} leftIcon={<FileText color={Palette.textTertiary} size={18} />}
            tone={tone} multiline style={styles.modalInput} error={error}
          />

          <View style={styles.modalActions}>
            <NeonButton variant="ghost" onPress={onClose} disabled={busy}>Cancel</NeonButton>
            <View style={styles.flex1}>
              <NeonButton
                variant={isSuspend ? 'danger' : 'cyan'} fullWidth loading={busy}
                disabled={!text.trim()} onPress={onConfirm}
                leftIcon={isSuspend ? <Ban color="#FFFFFF" size={16} /> : <Check color="#03121A" size={16} />}
              >
                {isSuspend ? 'Confirm Suspend' : 'Add Note'}
              </NeonButton>
            </View>
          </View>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Small sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <NeonText variant="body" weight="semiBold" tone="amber" style={styles.sectionLabelText}>{children}</NeonText>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>{icon}</View>
      <NeonText variant="body" tone="muted" style={styles.detailLabel}>{label}</NeonText>
      <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.detailValue} numberOfLines={1}>{value}</NeonText>
    </View>
  );
}

function WalletStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.walletStat}>
      <NeonText variant="body" tone="muted" style={styles.walletStatLabel}>{label}</NeonText>
      <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.walletStatValue}>{value}</NeonText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['3'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  searchInput: { marginTop: Spacing['1'] },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['1'] },
  resultCount: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  toast: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], borderWidth: 1, borderRadius: Radii.md, padding: Spacing['3'] },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  // Member card
  memberCard: { gap: Spacing['2'] },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  memberMeta: { flex: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flexWrap: 'wrap' },
  memberName: { fontSize: Typography.sizes.base, flexShrink: 1 },
  memberUsername: { fontSize: Typography.sizes.xs },
  memberEmail: { fontSize: Typography.sizes.xs },
  badgeRow: { flexDirection: 'row', gap: Spacing['2'], marginTop: 2, flexWrap: 'wrap' },
  chevron: { marginLeft: Spacing['1'] },
  footerSpace: { height: Spacing['4'] },
  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.78)' },
  // Detail modal
  detailCard: { width: '100%', maxWidth: 520, maxHeight: '88%', gap: Spacing['3'] },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], flex: 1 },
  detailHeaderMeta: { flex: 1, gap: 2 },
  detailName: { fontSize: Typography.sizes.md },
  detailUsername: { fontSize: Typography.sizes.xs },
  detailLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['10'], gap: Spacing['3'] },
  detailScroll: { flex: 1 },
  detailScrollContent: { gap: Spacing['2'] },
  detailBadgeRow: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap' },
  sectionLabel: { marginTop: Spacing['1'] },
  sectionLabelText: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wider },
  detailGrid: { gap: Spacing['2'] },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  detailIconWrap: { width: 24, height: 24, borderRadius: Radii.xs, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: Typography.sizes.xs, flex: 1 },
  detailValue: { fontSize: Typography.sizes.xs, textAlign: 'right', flexShrink: 1 },
  bioBox: { backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'] },
  bioText: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  // Wallet
  walletGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
  walletStat: { width: '48%', backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'], gap: 2 },
  walletStatLabel: { fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  walletStatValue: { fontSize: Typography.sizes.base },
  walletAccountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'], marginTop: Spacing['1'] },
  walletAccountLabel: { fontSize: Typography.sizes.xs },
  walletAccountValue: { fontSize: Typography.sizes.sm },
  noDataText: { fontSize: Typography.sizes.sm, fontStyle: 'italic' },
  badgeList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
  // Campaigns
  campaignList: { gap: Spacing['2'] },
  campaignItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing['2'], backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'] },
  campaignTitle: { fontSize: Typography.sizes.sm, flex: 1 },
  // Notes
  noteList: { gap: Spacing['2'] },
  noteItem: { backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'], gap: 2 },
  noteText: { fontSize: Typography.sizes.sm, lineHeight: 18 },
  noteDate: { fontSize: Typography.sizes.xs },
  detailActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['3'] },
  flex1: { flex: 1 },
  // Action modal
  actionModalCard: { width: '100%', maxWidth: 460, gap: Spacing['4'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], flex: 1 },
  modalIconWrap: { width: 36, height: 36, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalSubInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], backgroundColor: Palette.glass300, borderRadius: Radii.md, padding: Spacing['3'] },
  modalSubMeta: { flex: 1, gap: 2 },
  modalSubEmail: { fontSize: Typography.sizes.xs },
  modalSub: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  modalInput: { marginTop: Spacing['1'] },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
});
