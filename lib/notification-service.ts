import { supabase } from '@/lib/supabase';
import type { NotificationItem, NotificationCategory } from '@/types/notifications';

// ─── Fetch ──────────────────────────────────────────────────────────────────

export async function getNotifications(
  category?: NotificationCategory | null,
  limit = 50,
  offset = 0
): Promise<NotificationItem[]> {
  const { data, error } = await supabase.rpc('get_notifications', {
    p_category: category ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as NotificationItem[];
}

export async function getUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error || data === null || data === undefined) return 0;
  return data as number;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase.rpc('mark_all_notifications_read');
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await supabase.rpc('delete_notification', { p_notification_id: notificationId });
}

// ─── Real-time ───────────────────────────────────────────────────────────────

export function subscribeToNotifications(callback: () => void) {
  const channel = supabase
    .channel('notifications-feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notifications' },
      () => callback()
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatNotificationTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
