import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Text,
  Modal,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, Video, CircleCheck as CheckCircle2, Circle as XCircle, QrCode, Sparkles, Gift, ImagePlus, Trophy, UserCheck, X, Send, ExternalLink } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Divider,
  NeonButton,
  NeonInput,
  Avatar,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  getEventDetail,
  rsvpEvent,
  cancelRsvp,
  checkInEvent,
  closeEvent,
  markAttendance,
  rewardAttendees,
  uploadEventPhoto,
  uploadEventPhotoFile,
  formatEventDate,
  formatEventTime,
  isEventPast,
  subscribeToEvents,
} from '@/lib/event-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { EventDetail as EventDetailType } from '@/types/events';

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [event, setEvent] = useState<EventDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardW3od, setRewardW3od] = useState('');
  const [rewardXp, setRewardXp] = useState('');
  const [rewardResult, setRewardResult] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    const data = await getEventDetail(id);
    setEvent(data);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    loadEvent();
    const unsub = subscribeToEvents(() => loadEvent());
    return unsub;
  }, [id, loadEvent]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvent();
  }, [loadEvent]);

  const handleRsvp = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    const result = await rsvpEvent(id);
    setActionLoading(false);
    if (!result.success) setError(result.error ?? 'Failed to RSVP.');
    else loadEvent();
  };

  const handleCancelRsvp = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    const result = await cancelRsvp(id);
    setActionLoading(false);
    if (!result.success) setError(result.error ?? 'Failed to cancel RSVP.');
    else loadEvent();
  };

  const handleCheckIn = async () => {
    if (!id || !qrInput.trim()) return;
    setActionLoading(true);
    setQrError(null);
    const result = await checkInEvent(id, qrInput.trim());
    setActionLoading(false);
    if (!result.success) {
      setQrError(result.error ?? 'Check-in failed.');
    } else {
      setShowQRModal(false);
      setQrInput('');
      setQrError(null);
      loadEvent();
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const calUrl = Platform.OS === 'web'
      ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(startDate)}/${fmt(endDate)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venue)}`
      : `data:text/calendar;charset=utf8,${encodeURIComponent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${fmt(startDate)}\nDTEND:${fmt(endDate)}\nSUMMARY:${event.title}\nDESCRIPTION:${event.description}\nLOCATION:${event.venue}\nEND:VEVENT\nEND:VCALENDAR`)}`;
    if (Platform.OS === 'web') {
      window.open(calUrl, '_blank');
    } else {
      Linking.openURL(calUrl).catch(() => {});
    }
  };

  const handleCloseEvent = async () => {
    if (!id) return;
    setActionLoading(true);
    const result = await closeEvent(id);
    setActionLoading(false);
    if (result.success) loadEvent();
  };

  const handleReward = async () => {
    if (!id) return;
    setActionLoading(true);
    setRewardResult(null);
    const w3od = parseFloat(rewardW3od) || 0;
    const xp = parseInt(rewardXp, 10) || 0;
    const result = await rewardAttendees(id, w3od, xp);
    setActionLoading(false);
    if (result.success) {
      setRewardResult(`Rewarded ${result.rewarded_count} attendees with ${w3od} W3OD and ${xp} XP each.`);
      loadEvent();
    } else {
      setRewardResult(result.error ?? 'Failed to reward attendees.');
    }
  };

  const handlePhotoUpload = () => {
    if (!profile?.id) return;
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = 'image/*';
    inputEl.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setPhotoUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const { url, error: uploadError } = await uploadEventPhotoFile(profile.id, dataUrl, `${Date.now()}-${file.name}`, file.type);
      setPhotoUploading(false);
      if (uploadError || !url) return;
      const result = await uploadEventPhoto(id, url, photoCaption.trim() || null);
      if (result.success) {
        setShowPhotoModal(false);
        setPhotoCaption('');
        loadEvent();
      }
    };
    inputEl.click();
  };

  if (loading) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonAmber} />
        </View>
      </ScreenShell>
    );
  }

  if (!event || !event.success) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.notFoundWrap}>
          <NeonText variant="heading" weight="medium" tone="muted">
            Event not found
          </NeonText>
          <NeonButton variant="ghost" onPress={() => router.back()}>Go Back</NeonButton>
        </View>
      </ScreenShell>
    );
  }

  const past = isEventPast(event.event_date);
  const isLive = event.status === 'live' || (event.status === 'upcoming' && past);
  const isClosed = event.status === 'closed';
  const hasRsvp = event.my_rsvp === 'going';
  const hasCheckedIn = event.my_checkin;
  const capacityFull = event.max_capacity !== null && event.rsvp_count >= event.max_capacity && !hasRsvp;

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonAmber} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonAmber} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
            EVENT DETAILS
          </NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Banner */}
        {event.banner_url && (
          <View style={styles.bannerWrap}>
            <Image source={{ uri: event.banner_url }} style={styles.banner} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
          </View>
        )}

        {/* Event info card */}
        <GlassCard tone="amber" gradientBorder padding={Spacing['5']} style={styles.infoCard}>
          <View style={styles.statusRow}>
            <Badge tone={isLive ? 'lime' : isClosed ? 'muted' : 'amber'} dot>
              {isLive ? 'LIVE NOW' : isClosed ? 'CLOSED' : event.status.toUpperCase()}
            </Badge>
            {hasRsvp && <Badge tone="lime" dot><CheckCircle2 color={Palette.neonLime} size={11} />RSVP'D</Badge>}
            {hasCheckedIn && <Badge tone="cyan" dot><QrCode color={Palette.neonCyan} size={11} />CHECKED IN</Badge>}
          </View>

          <NeonText variant="display" weight="bold" tone="amber" style={styles.eventTitle}>
            {event.title}
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.eventDesc}>
            {event.description}
          </NeonText>

          <Divider tone="white" />

          {/* Meta */}
          <View style={styles.metaGrid}>
            <MetaItem icon={<CalendarDays color={Palette.neonCyan} size={14} />} label="Date" value={formatEventDate(event.event_date)} />
            <MetaItem icon={<Clock color={Palette.neonCyan} size={14} />} label="Time" value={formatEventTime(event.event_date)} />
            <MetaItem icon={<MapPin color={Palette.neonMagenta} size={14} />} label="Venue" value={event.venue} />
            <MetaItem icon={<Users color={Palette.neonLime} size={14} />} label="Attendance" value={`${event.rsvp_count} going${event.max_capacity ? ` / ${event.max_capacity} max` : ''}`} />
          </View>

          {event.online_link && (
            <Pressable onPress={() => Platform.OS === 'web' ? window.open(event.online_link!, '_blank') : Linking.openURL(event.online_link!).catch(() => {})} style={styles.onlineLinkBtn}>
              <Video color={Palette.neonCyan} size={16} />
              <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.onlineLinkText}>
                Join Online Meeting
              </NeonText>
              <ExternalLink color={Palette.neonCyan} size={14} />
            </Pressable>
          )}

          {error && (
            <View style={styles.errorBox}>
              <NeonText variant="body" weight="medium" tone="rose">{error}</NeonText>
            </View>
          )}

          {/* Member actions */}
          {!isClosed && (
            <View style={styles.actionsRow}>
              {!hasRsvp ? (
                <View style={styles.flex1}>
                  <NeonButton
                    variant="amber"
                    fullWidth
                    loading={actionLoading}
                    disabled={capacityFull}
                    onPress={handleRsvp}
                    leftIcon={<CheckCircle2 color="#1A0010" size={16} />}
                  >
                    {capacityFull ? 'Event Full' : 'RSVP'}
                  </NeonButton>
                </View>
              ) : (
                <View style={styles.flex1}>
                  <NeonButton
                    variant="ghost"
                    fullWidth
                    loading={actionLoading}
                    onPress={handleCancelRsvp}
                    leftIcon={<XCircle color={Palette.neonRose} size={16} />}
                  >
                    Cancel RSVP
                  </NeonButton>
                </View>
              )}
              <NeonButton
                variant="outline"
                onPress={handleAddToCalendar}
                leftIcon={<CalendarDays color={Palette.neonCyan} size={16} />}
              >
                Calendar
              </NeonButton>
            </View>
          )}

          {/* QR Check-in */}
          {hasRsvp && !hasCheckedIn && !isClosed && (
            <NeonButton
              variant="cyan"
              fullWidth
              onPress={() => setShowQRModal(true)}
              leftIcon={<QrCode color="#03121A" size={16} />}
            >
              Check In with QR Code
            </NeonButton>
          )}

          {/* Admin actions */}
          {event.is_admin && !isClosed && (
            <>
              <Divider tone="white" />
              <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.adminSectionTitle}>
                ADMIN CONTROLS
              </NeonText>
              <View style={styles.adminActionsGrid}>
                <Pressable onPress={() => setShowRewardModal(true)} style={styles.adminActionBtn}>
                  <View style={styles.adminActionIcon}>
                    <Gift color={Palette.neonAmber} size={18} />
                  </View>
                  <NeonText variant="body" weight="semiBold" tone="amber" style={styles.adminActionText}>
                    Reward Attendees
                  </NeonText>
                </Pressable>
                <Pressable onPress={() => setShowPhotoModal(true)} style={styles.adminActionBtn}>
                  <View style={styles.adminActionIcon}>
                    <ImagePlus color={Palette.neonCyan} size={18} />
                  </View>
                  <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.adminActionText}>
                    Upload Photos
                  </NeonText>
                </Pressable>
                <Pressable onPress={handleCloseEvent} style={styles.adminActionBtn}>
                  <View style={styles.adminActionIcon}>
                    <XCircle color={Palette.neonRose} size={18} />
                  </View>
                  <NeonText variant="body" weight="semiBold" tone="rose" style={styles.adminActionText}>
                    Close Event
                  </NeonText>
                </Pressable>
              </View>

              {/* QR code for admin */}
              {event.qr_code && (
                <GlassCard tone="cyan" padding={Spacing['4']} style={styles.qrCodeBox}>
                  <NeonText variant="body" weight="semiBold" tone="cyan">
                    Event QR Check-in Code
                  </NeonText>
                  <NeonText variant="display" weight="bold" tone="cyan" style={styles.qrCodeText}>
                    {event.qr_code}
                  </NeonText>
                  <NeonText variant="body" tone="muted" style={styles.qrCodeHint}>
                    Share this code with attendees for check-in
                  </NeonText>
                </GlassCard>
              )}
            </>
          )}
        </GlassCard>

        {/* Attendees (admin sees all, member sees RSVP count) */}
        {event.is_admin && event.checkins.length > 0 && (
          <View style={styles.section}>
            <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.sectionTitle}>
              CHECKED-IN ATTENDEES ({event.checkins.length})
            </NeonText>
            <GlassCard tone="lime" padding={Spacing['4']} style={styles.attendeesCard}>
              {event.checkins.map((c, idx) => (
                <View key={c.user_id}>
                  {idx > 0 && <Divider tone="white" />}
                  <View style={styles.attendeeRow}>
                    <Avatar uri={c.avatar_url} displayName={c.display_name ?? c.username} size="sm" />
                    <View style={styles.attendeeMeta}>
                      <NeonText variant="body" weight="semiBold" tone="cyan">
                        {c.display_name ?? c.username ?? 'Member'}
                      </NeonText>
                      <NeonText variant="body" tone="muted" style={styles.attendeeTime}>
                        {c.method === 'qr' ? 'QR check-in' : 'Manual'} · {formatEventTime(c.checked_in_at)}
                      </NeonText>
                    </View>
                    {!c.has_rsvp && (
                      <Pressable onPress={async () => { await markAttendance(event.id, c.user_id); loadEvent(); }} hitSlop={10}>
                        <UserCheck color={Palette.neonAmber} size={18} />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </GlassCard>
          </View>
        )}

        {/* Event Photos */}
        {event.photos.length > 0 && (
          <View style={styles.section}>
            <NeonText variant="heading" weight="semiBold" tone="magenta" style={styles.sectionTitle}>
              EVENT PHOTOS ({event.photos.length})
            </NeonText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
              {event.photos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.photo_url }} style={styles.photoImg} resizeMode="cover" />
                  {photo.caption && (
                    <View style={styles.photoCaption}>
                      <NeonText variant="body" tone="muted" style={styles.photoCaptionText} numberOfLines={2}>
                        {photo.caption}
                      </NeonText>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* QR Check-in Modal */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => !actionLoading && setShowQRModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <QrCode color={Palette.neonCyan} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="cyan">QR CHECK-IN</NeonText>
              </View>
              <Pressable onPress={() => !actionLoading && setShowQRModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              Enter the QR code shown at the event to check in.
            </NeonText>
            <NeonInput
              label="QR Code"
              value={qrInput}
              onChangeText={(t) => { setQrInput(t); setQrError(null); }}
              placeholder="Enter code..."
              tone="cyan"
              leftIcon={<QrCode color={Palette.textTertiary} size={18} />}
            />
            {qrError && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">{qrError}</NeonText>
              </View>
            )}
            <NeonButton variant="cyan" fullWidth loading={actionLoading} onPress={handleCheckIn} leftIcon={<CheckCircle2 color="#03121A" size={16} />}>
              Check In
            </NeonButton>
          </GlassCard>
        </View>
      </Modal>

      {/* Reward Modal */}
      <Modal visible={showRewardModal} transparent animationType="fade" onRequestClose={() => !actionLoading && setShowRewardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="amber" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Gift color={Palette.neonAmber} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="amber">REWARD ATTENDEES</NeonText>
              </View>
              <Pressable onPress={() => !actionLoading && setShowRewardModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              Reward all {event.checkin_count} checked-in attendees with W3OD Balance and/or XP.
            </NeonText>
            <NeonInput
              label="W3OD Amount (per attendee)"
              value={rewardW3od}
              onChangeText={setRewardW3od}
              placeholder="0.00"
              keyboardType="numeric"
              tone="amber"
              leftIcon={<Trophy color={Palette.textTertiary} size={18} />}
            />
            <NeonInput
              label="XP Amount (per attendee)"
              value={rewardXp}
              onChangeText={setRewardXp}
              placeholder="0"
              keyboardType="numeric"
              tone="amber"
              leftIcon={<Sparkles color={Palette.textTertiary} size={18} />}
            />
            {rewardResult && (
              <View style={rewardResult.includes('Failed') ? styles.errorBox : styles.successBox}>
                <NeonText variant="body" weight="medium" tone={rewardResult.includes('Failed') ? 'rose' : 'lime'}>
                  {rewardResult}
                </NeonText>
              </View>
            )}
            <NeonButton variant="amber" fullWidth loading={actionLoading} onPress={handleReward} leftIcon={<Send color="#1A0010" size={16} />}>
              Distribute Rewards
            </NeonButton>
          </GlassCard>
        </View>
      </Modal>

      {/* Photo Upload Modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => !photoUploading && setShowPhotoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <ImagePlus color={Palette.neonCyan} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="cyan">UPLOAD PHOTO</NeonText>
              </View>
              <Pressable onPress={() => !photoUploading && setShowPhotoModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonInput
              label="Caption (optional)"
              value={photoCaption}
              onChangeText={setPhotoCaption}
              placeholder="Add a caption..."
              tone="cyan"
            />
            <NeonButton variant="cyan" fullWidth loading={photoUploading} onPress={handlePhotoUpload} leftIcon={<ImagePlus color="#03121A" size={16} />}>
              Select & Upload Photo
            </NeonButton>
          </GlassCard>
        </View>
      </Modal>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaIconWrap}>{icon}</View>
      <View style={styles.metaContent}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
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

import { Image } from 'react-native';

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['4'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing['4'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  bannerWrap: { width: '100%', height: 180, borderRadius: Radii.lg, overflow: 'hidden', position: 'relative' },
  banner: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.2)' },
  infoCard: { gap: Spacing['3'] },
  statusRow: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap' },
  eventTitle: { fontSize: Typography.sizes.xl },
  eventDesc: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flexBasis: '47%', flexGrow: 1 },
  metaIconWrap: { width: 32, height: 32, borderRadius: Radii.sm, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  metaContent: { flex: 1, gap: 1 },
  metaLabel: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.xs, color: Palette.textTertiary, letterSpacing: Typography.letterSpacings.wide, textTransform: 'uppercase' },
  metaValue: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Palette.textPrimary },
  onlineLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], padding: Spacing['3'], borderRadius: Radii.md, backgroundColor: 'rgba(0,240,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,240,255,0.2)' },
  onlineLinkText: { flex: 1, fontSize: Typography.sizes.sm },
  errorBox: { backgroundColor: 'rgba(255,45,111,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.3)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  successBox: { backgroundColor: 'rgba(0,255,156,0.1)', borderWidth: 1, borderColor: 'rgba(0,255,156,0.3)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: Spacing['3'] },
  flex1: { flex: 1 },
  adminSectionTitle: { fontSize: Typography.sizes.sm, letterSpacing: Typography.letterSpacings.wide },
  adminActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'] },
  adminActionBtn: { alignItems: 'center', gap: Spacing['2'], flexBasis: '30%', flexGrow: 1 },
  adminActionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Palette.glass300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  adminActionText: { fontSize: Typography.sizes.xs, textAlign: 'center' },
  qrCodeBox: { alignItems: 'center', gap: Spacing['2'] },
  qrCodeText: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.ultra },
  qrCodeHint: { fontSize: Typography.sizes.xs },
  section: { gap: Spacing['3'] },
  sectionTitle: { fontSize: Typography.sizes.sm, letterSpacing: Typography.letterSpacings.wide },
  attendeesCard: { gap: 0 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  attendeeMeta: { flex: 1, gap: 2 },
  attendeeTime: { fontSize: Typography.sizes.xs },
  photoScroll: { gap: Spacing['3'], paddingRight: Spacing['2'] },
  photoCard: { width: 200, borderRadius: Radii.md, overflow: 'hidden', backgroundColor: Palette.glass300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  photoImg: { width: '100%', height: 140 },
  photoCaption: { padding: Spacing['3'] },
  photoCaptionText: { fontSize: Typography.sizes.xs },
  footerSpace: { height: Spacing['8'] },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 460, gap: Spacing['4'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  modalSub: { fontSize: Typography.sizes.sm, lineHeight: 18 },
});
