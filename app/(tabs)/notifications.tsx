import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import {
  Bell,
  CheckCheck,
  Trash2,
  ArrowLeft,
  Award,
  ArrowLeftRight,
  Gift,
  Megaphone,
  CalendarDays,
  Shield,
  ShieldCheck,
  MessageSquare,
  LifeBuoy,
  Zap,
  X,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonText,
  Badge,
  Divider,
  NeonButton,
} from '@/components/ui';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  subscribeToNotifications,
  formatNotificationTime,
} from '@/lib/notification-service';
import { NOTIFICATION_CATEGORIES } from '@/types/notifications';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { NotificationItem, NotificationCategory, NotificationTone, NotificationIcon } from '@/types/notifications';

const ICON_MAP: Record<string, typeof Bell> = {
  award: Award,
  transaction: ArrowLeftRight,
  redemption: Gift,
  campaign: Megaphone,
  security: Shield,
  'life-buoy': LifeBuoy,
  message: MessageSquare,
  megaphone: Megaphone,
  calendar: CalendarDays,
  shield: ShieldCheck,
  bell: Bell,
  gift: Gift,
  zap: Zap,
};

const TONE_COLOR: Record<NotificationTone, string> = {
  cyan: Palette.neonCyan,
  blue: Palette.electricBlue,
  purple: Palette.purpleGlow,
  magenta: Palette.neonMagenta,
  lime: Palette.neonLime,
  amber: Palette.neonAmber,
  rose: Palette.neonRose,
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | 'all'>('all');

  const loadNotifications = useCallback(async () => {
    const cat = filter === 'all' ? null : filter;
    const data = await getNotifications(cat as NotificationCategory | null, 100, 0);
    setNotifications(data);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => {
    loadNotifications();
    const unsub = subscribeToNotifications(() => loadNotifications());
    return unsub;
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    loadNotifications();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNotification(id);
          loadNotifications();
        },
      },
    ]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonMagenta} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Bell color={Palette.neonMagenta} size={22} />
          </View>
          <View style={styles.headerMeta}>
            <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>
              NOTIFICATIONS
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </NeonText>
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllRead} hitSlop={10} style={styles.markAllBtn}>
              <CheckCheck color={Palette.neonLime} size={20} />
            </Pressable>
          )}
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => setFilter(cat.key)}
              style={[styles.filterChip, filter === cat.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, { color: filter === cat.key ? (cat.tone === 'muted' as NotificationTone ? Palette.textSecondary : TONE_COLOR[cat.tone as NotificationTone]) : Palette.textTertiary }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Notifications */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Palette.neonMagenta} />
          </View>
        ) : notifications.length === 0 ? (
          <GlassCard tone="magenta" padding={Spacing['6']} style={styles.emptyCard}>
            <Bell color={Palette.textTertiary} size={40} />
            <NeonText variant="heading" weight="medium" tone="muted">No notifications</NeonText>
            <NeonText variant="body" tone="muted" style={styles.emptySub}>
              {filter === 'all' ? 'You have no notifications yet.' : 'No notifications in this category.'}
            </NeonText>
          </GlassCard>
        ) : (
          notifications.map((notif) => (
            <NotificationRow
              key={notif.id}
              notification={notif}
              onMarkRead={() => handleMarkRead(notif.id)}
              onDelete={() => handleDelete(notif.id)}
            />
          ))
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Notification Row ───────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationItem;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const Icon = ICON_MAP[notification.icon] ?? Bell;
  const color = TONE_COLOR[notification.tone] ?? Palette.neonCyan;

  return (
    <GlassCard
      tone={notification.tone === 'muted' as NotificationTone ? 'none' : (notification.tone as any)}
      gradientBorder={!notification.read}
      padding={Spacing['4']}
      style={styles.notifCard}
    >
      <View style={styles.notifRow}>
        <View style={[styles.notifIconWrap, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
          <Icon color={color} size={18} />
        </View>
        <View style={styles.notifMeta}>
          <View style={styles.notifTitleRow}>
            <NeonText variant="body" weight="semiBold" tone={notification.tone === 'muted' as NotificationTone ? 'muted' : (notification.tone as any)} style={styles.notifTitle} numberOfLines={1}>
              {notification.title}
            </NeonText>
            {!notification.read && <View style={styles.unreadDot} />}
          </View>
          <NeonText variant="body" tone="muted" style={styles.notifBody} numberOfLines={3}>
            {notification.body}
          </NeonText>
          <View style={styles.notifFooter}>
            <NeonText variant="body" tone="muted" glow={false} style={styles.notifTime}>
              {formatNotificationTime(notification.created_at)}
            </NeonText>
            <View style={styles.notifActions}>
              {!notification.read && (
                <Pressable onPress={onMarkRead} hitSlop={10} style={styles.notifActionBtn}>
                  <CheckCheck color={Palette.neonLime} size={15} />
                </Pressable>
              )}
              <Pressable onPress={onDelete} hitSlop={10} style={styles.notifActionBtn}>
                <Trash2 color={Palette.neonRose} size={15} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['3'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  headerIconWrap: { width: 44, height: 44, borderRadius: Radii.md, backgroundColor: 'rgba(255,0,229,0.1)', borderWidth: 1, borderColor: 'rgba(255,0,229,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1, gap: 2 },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  subtitle: { fontSize: Typography.sizes.xs },
  markAllBtn: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(0,255,156,0.1)', borderWidth: 1, borderColor: 'rgba(0,255,156,0.3)', alignItems: 'center', justifyContent: 'center' },
  filterScroll: { gap: Spacing['2'], paddingRight: Spacing['2'] },
  filterChip: { paddingHorizontal: Spacing['4'], paddingVertical: Spacing['2'], borderRadius: Radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: Palette.glass300 },
  filterChipActive: { borderColor: 'rgba(255,0,229,0.4)', backgroundColor: 'rgba(255,0,229,0.08)' },
  filterChipText: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, letterSpacing: Typography.letterSpacings.wide },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  emptyCard: { alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['8'] },
  emptySub: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  notifCard: { gap: Spacing['2'] },
  notifCardUnread: {},
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['3'] },
  notifIconWrap: { width: 40, height: 40, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifMeta: { flex: 1, gap: 2 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  notifTitle: { flex: 1, fontSize: Typography.sizes.sm },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.neonMagenta },
  notifBody: { fontSize: Typography.sizes.xs, lineHeight: 16 },
  notifFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing['1'] },
  notifTime: { fontSize: 10 },
  notifActions: { flexDirection: 'row', gap: Spacing['2'] },
  notifActionBtn: { padding: 4 },
  footerSpace: { height: Spacing['8'] },
});
