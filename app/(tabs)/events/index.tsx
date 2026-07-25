import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, MapPin, Users, Clock, Plus, ChevronRight, Video, CircleCheck as CheckCircle2, Sparkles } from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Divider,
  NeonButton,
} from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { hasRole } from '@/lib/rbac';
import {
  getEvents,
  subscribeToEvents,
  formatEventDate,
  formatEventTime,
  isEventPast,
} from '@/lib/event-service';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { CommunityEvent, EventStatus } from '@/types/events';

type FilterTab = 'all' | 'upcoming' | 'live' | 'completed';

export default function EventsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = hasRole(profile?.role ?? 'member', 'admin');
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

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

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return e.status === 'upcoming' && !isEventPast(e.event_date);
    if (filter === 'live') return e.status === 'live' || (e.status === 'upcoming' && isEventPast(e.event_date));
    if (filter === 'completed') return e.status === 'completed' || e.status === 'closed';
    return true;
  });

  const upcomingCount = events.filter((e) => e.status === 'upcoming' && !isEventPast(e.event_date)).length;
  const liveCount = events.filter((e) => e.status === 'live').length;

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonAmber} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <CalendarDays color={Palette.neonAmber} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="amber" style={styles.title}>
              EVENTS
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {upcomingCount} upcoming{liveCount > 0 ? ` · ${liveCount} live now` : ''}
            </NeonText>
          </View>
          {isAdmin && (
            <Pressable onPress={() => router.push('/(tabs)/events/admin-events')} hitSlop={10} style={styles.adminBtn}>
              <Users color={Palette.neonAmber} size={20} />
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['all', 'upcoming', 'live', 'completed'] as FilterTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, { color: filter === tab ? Palette.neonAmber : Palette.textTertiary }]}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Events list */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonAmber} />
          </View>
        ) : filteredEvents.length === 0 ? (
          <GlassCard tone="amber" padding={Spacing['6']} style={styles.emptyCard}>
            <CalendarDays color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.emptyTitle}>
              No events found
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              {filter === 'upcoming' ? 'No upcoming events. Check back soon!' : 'No events match this filter.'}
            </NeonText>
          </GlassCard>
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/(tabs)/events/event-detail?id=${event.id}`)}
            />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Event Card ─────────────────────────────────────────────────────────────

function EventCard({ event, onPress }: { event: CommunityEvent; onPress: () => void }) {
  const past = isEventPast(event.event_date);
  const isLive = event.status === 'live' || (event.status === 'upcoming' && past);
  const statusTone = isLive ? 'lime' : event.status === 'closed' ? 'muted' : 'amber';
  const statusLabel = isLive ? 'LIVE' : event.status === 'closed' ? 'CLOSED' : event.status === 'completed' ? 'COMPLETED' : 'UPCOMING';

  return (
    <Pressable onPress={onPress}>
      <GlassCard tone="amber" gradientBorder={event.my_rsvp === 'going'} padding={0} style={styles.eventCard}>
        {/* Banner */}
        {event.banner_url ? (
          <View style={styles.bannerWrap}>
            <Image source={{ uri: event.banner_url }} style={styles.banner} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerBadgeRow}>
              <Badge tone={statusTone as 'lime' | 'muted' | 'amber'} dot>{statusLabel}</Badge>
              {event.my_rsvp === 'going' && (
                <Badge tone="lime" dot>
                  <CheckCircle2 color={Palette.neonLime} size={11} />
                  RSVP'D
                </Badge>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noBannerWrap}>
            <View style={styles.noBannerRow}>
              <Badge tone={statusTone as 'lime' | 'muted' | 'amber'} dot>{statusLabel}</Badge>
              {event.my_rsvp === 'going' && (
                <Badge tone="lime" dot>
                  <CheckCircle2 color={Palette.neonLime} size={11} />
                  RSVP'D
                </Badge>
              )}
            </View>
            <CalendarDays color={Palette.neonAmber} size={36} />
          </View>
        )}

        {/* Content */}
        <View style={styles.eventContent}>
          <NeonText variant="heading" weight="semiBold" tone="amber" style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.eventDesc} numberOfLines={2}>
            {event.description}
          </NeonText>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <CalendarDays color={Palette.neonCyan} size={13} />
              <NeonText variant="body" tone="muted" style={styles.metaText}>
                {formatEventDate(event.event_date)}
              </NeonText>
            </View>
            <View style={styles.metaItem}>
              <Clock color={Palette.neonCyan} size={13} />
              <NeonText variant="body" tone="muted" style={styles.metaText}>
                {formatEventTime(event.event_date)}
              </NeonText>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin color={Palette.neonMagenta} size={13} />
              <NeonText variant="body" tone="muted" style={styles.metaText} numberOfLines={1}>
                {event.venue}
              </NeonText>
            </View>
            <View style={styles.metaItem}>
              <Users color={Palette.neonLime} size={13} />
              <NeonText variant="body" tone="muted" style={styles.metaText}>
                {event.rsvp_count}{event.max_capacity ? `/${event.max_capacity}` : ''} going
              </NeonText>
            </View>
          </View>

          {event.online_link && (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Video color={Palette.neonCyan} size={13} />
                <NeonText variant="body" tone="cyan" style={styles.metaText}>
                  Online meeting available
                </NeonText>
              </View>
            </View>
          )}

          <View style={styles.eventFooter}>
            {event.my_checkin && (
              <Badge tone="lime" dot>
                <CheckCircle2 color={Palette.neonLime} size={11} />
                Checked in
              </Badge>
            )}
            <View style={styles.flex1} />
            <ChevronRight color={Palette.textTertiary} size={18} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['3'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: { flex: 1, gap: 2 },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  subtitle: { fontSize: Typography.sizes.xs },
  adminBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,184,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing['2'],
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: Palette.glass300,
    alignItems: 'center',
  },
  filterTabActive: {
    borderColor: 'rgba(255,184,0,0.4)',
    backgroundColor: 'rgba(255,184,0,0.08)',
  },
  filterTabText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['12'],
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['8'],
  },
  emptyTitle: { fontSize: Typography.sizes.base },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  eventCard: {
    overflow: 'hidden',
  },
  bannerWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.3)',
  },
  bannerBadgeRow: {
    position: 'absolute',
    top: Spacing['3'],
    left: Spacing['3'],
    right: Spacing['3'],
    flexDirection: 'row',
    gap: Spacing['2'],
    flexWrap: 'wrap',
  },
  noBannerWrap: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,184,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
  },
  noBannerRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  eventContent: {
    padding: Spacing['4'],
    gap: Spacing['2'],
  },
  eventTitle: { fontSize: Typography.sizes.md },
  eventDesc: { fontSize: Typography.sizes.sm, lineHeight: 18 },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: Typography.sizes.xs },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['1'],
  },
  flex1: { flex: 1 },
  footerSpace: { height: Spacing['8'] },
});
