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
import { ArrowLeft, Plus, CalendarDays, Users, CircleCheck as CheckCircle2, X, Send, Image as ImageIcon } from 'lucide-react-native';

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
import { getEvents, createEvent, subscribeToEvents, formatEventDate, isEventPast } from '@/lib/event-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { CommunityEvent } from '@/types/events';

export default function AdminEventsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', bannerUrl: '', date: '', time: '', venue: '', onlineLink: '', maxCapacity: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const data = await getEvents(undefined, 100, 0);
    setEvents(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadEvents();
    const unsub = subscribeToEvents(() => loadEvents());
    return unsub;
  }, [loadEvents]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const handleCreate = async () => {
    setCreateError(null);
    if (!form.title.trim() || !form.description.trim() || !form.date.trim() || !form.time.trim()) {
      setCreateError('Title, description, date, and time are required.');
      return;
    }
    // Combine date + time into ISO
    const eventDate = new Date(`${form.date}T${form.time}`);
    if (isNaN(eventDate.getTime())) {
      setCreateError('Invalid date or time format. Use YYYY-MM-DD and HH:MM.');
      return;
    }
    setCreating(true);
    const result = await createEvent(
      form.title.trim(),
      form.description.trim(),
      form.bannerUrl.trim() || null,
      eventDate.toISOString(),
      form.venue.trim() || 'Online',
      form.onlineLink.trim() || null,
      form.maxCapacity ? parseInt(form.maxCapacity, 10) : null
    );
    setCreating(false);
    if (!result.success) {
      setCreateError(result.error ?? 'Failed to create event.');
      return;
    }
    setCreateModal(false);
    setForm({ title: '', description: '', bannerUrl: '', date: '', time: '', venue: '', onlineLink: '', maxCapacity: '' });
    loadEvents();
  };

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
            MANAGE EVENTS
          </NeonText>
          <Pressable onPress={() => setCreateModal(true)} hitSlop={10} style={styles.addBtn}>
            <Plus color={Palette.neonAmber} size={20} />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatChip label="Total" value={events.length} tone="amber" />
          <StatChip label="Upcoming" value={events.filter((e) => e.status === 'upcoming' && !isEventPast(e.event_date)).length} tone="cyan" />
          <StatChip label="Checked In" value={events.reduce((s, e) => s + e.checkin_count, 0)} tone="lime" />
        </View>

        {/* Events list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonAmber} />
          </View>
        ) : events.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['6']} style={styles.emptyCard}>
            <CalendarDays color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted">No events yet</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              Create your first community event to get started.
            </NeonText>
            <NeonButton variant="amber" onPress={() => setCreateModal(true)} leftIcon={<Plus color="#1A0010" size={16} />}>
              Create Event
            </NeonButton>
          </GlassCard>
        ) : (
          events.map((event) => (
            <Pressable key={event.id} onPress={() => router.push(`/(tabs)/events/event-detail?id=${event.id}`)}>
              <GlassCard tone="amber" gradientBorder padding={Spacing['4']} style={styles.eventCard}>
                <View style={styles.eventRow}>
                  <View style={styles.eventIconWrap}>
                    <CalendarDays color={Palette.neonAmber} size={18} />
                  </View>
                  <View style={styles.eventMeta}>
                    <NeonText variant="body" weight="semiBold" tone="amber" style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </NeonText>
                    <View style={styles.eventSubRow}>
                      <NeonText variant="body" tone="muted" style={styles.eventSub}>
                        {formatEventDate(event.event_date)}
                      </NeonText>
                      <View style={styles.eventStatChip}>
                        <Users color={Palette.neonLime} size={11} />
                        <Text style={styles.eventStatText}>{event.rsvp_count}</Text>
                      </View>
                      <View style={styles.eventStatChip}>
                        <CheckCircle2 color={Palette.neonCyan} size={11} />
                        <Text style={styles.eventStatText}>{event.checkin_count}</Text>
                      </View>
                    </View>
                  </View>
                  <Badge tone={event.status === 'live' ? 'lime' : event.status === 'closed' ? 'muted' : 'amber'} dot>
                    {event.status === 'live' ? 'LIVE' : event.status.toUpperCase()}
                  </Badge>
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => !creating && setCreateModal(false)}>
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="amber" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <CalendarDays color={Palette.neonAmber} size={20} />
                <NeonText variant="heading" weight="semiBold" tone="amber">CREATE EVENT</NeonText>
              </View>
              <Pressable onPress={() => !creating && setCreateModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>

            <NeonInput label="Event Title" value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="Event title..." tone="amber" leftIcon={<CalendarDays color={Palette.textTertiary} size={18} />} />
            <NeonInput label="Description" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} placeholder="Event description..." tone="amber" multiline style={styles.modalField} />
            <NeonInput label="Banner URL (optional)" value={form.bannerUrl} onChangeText={(t) => setForm({ ...form, bannerUrl: t })} placeholder="https://..." tone="amber" leftIcon={<ImageIcon color={Palette.textTertiary} size={18} />} />
            <View style={styles.dateTimeRow}>
              <View style={styles.flex1}>
                <NeonInput label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(t) => setForm({ ...form, date: t })} placeholder="2026-08-15" tone="amber" keyboardType="default" />
              </View>
              <View style={styles.flex1}>
                <NeonInput label="Time (HH:MM)" value={form.time} onChangeText={(t) => setForm({ ...form, time: t })} placeholder="18:00" tone="amber" keyboardType="default" />
              </View>
            </View>
            <NeonInput label="Venue" value={form.venue} onChangeText={(t) => setForm({ ...form, venue: t })} placeholder="Venue or location..." tone="amber" />
            <NeonInput label="Online Link (optional)" value={form.onlineLink} onChangeText={(t) => setForm({ ...form, onlineLink: t })} placeholder="https://meet..." tone="amber" />
            <NeonInput label="Max Capacity (optional)" value={form.maxCapacity} onChangeText={(t) => setForm({ ...form, maxCapacity: t })} placeholder="100" tone="amber" keyboardType="numeric" />

            {createError && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">{createError}</NeonText>
              </View>
            )}

            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setCreateModal(false)} disabled={creating}>Cancel</NeonButton>
              <View style={styles.flex1}>
                <NeonButton variant="amber" fullWidth loading={creating} onPress={handleCreate} leftIcon={<Send color="#1A0010" size={16} />}>
                  Create Event
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </Modal>
    </ScreenShell>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'cyan' | 'lime' }) {
  const colorMap = { amber: Palette.neonAmber, cyan: Palette.neonCyan, lime: Palette.neonLime };
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color: colorMap[tone] }]}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['3'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  addBtn: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing['3'] },
  statChip: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing['3'], borderRadius: Radii.md, backgroundColor: Palette.glass300, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statValue: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl },
  statLabel: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.textTertiary, letterSpacing: Typography.letterSpacings.wide },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  eventCard: { gap: Spacing['2'] },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  eventIconWrap: { width: 40, height: 40, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  eventMeta: { flex: 1, gap: 2 },
  eventTitle: { fontSize: Typography.sizes.sm },
  eventSubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  eventSub: { fontSize: Typography.sizes.xs },
  eventStatChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing['2'], paddingVertical: 2, borderRadius: Radii.sm, backgroundColor: Palette.glass300 },
  eventStatText: { fontFamily: Typography.families.headingSemiBold, fontSize: 10, color: Palette.textSecondary },
  footerSpace: { height: Spacing['8'] },
  // Modal
  modalOverlay: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 460, gap: Spacing['3'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  modalField: { marginTop: Spacing['1'] },
  dateTimeRow: { flexDirection: 'row', gap: Spacing['3'] },
  flex1: { flex: 1 },
  errorBox: { backgroundColor: 'rgba(255,45,111,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.3)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
});
