// Notifications module data shapes.

export type NotificationCategory =
  | 'rewards'
  | 'transfers'
  | 'redemption'
  | 'campaign'
  | 'events'
  | 'security'
  | 'kyc'
  | 'messages'
  | 'announcements'
  | 'system';

export type NotificationType =
  | 'transaction'
  | 'redemption'
  | 'security'
  | 'campaign'
  | 'system';

export type NotificationTone =
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'magenta'
  | 'lime'
  | 'amber'
  | 'rose';

export type NotificationIcon =
  | 'award'
  | 'transaction'
  | 'redemption'
  | 'campaign'
  | 'security'
  | 'life-buoy'
  | 'message'
  | 'megaphone'
  | 'calendar'
  | 'shield'
  | 'bell'
  | 'gift'
  | 'zap';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  category: NotificationCategory;
  tone: NotificationTone;
  icon: NotificationIcon;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationCategoryInfo {
  key: NotificationCategory | 'all';
  label: string;
  tone: NotificationTone;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryInfo[] = [
  { key: 'all', label: 'All', tone: 'cyan' },
  { key: 'rewards', label: 'Rewards', tone: 'lime' },
  { key: 'transfers', label: 'Transfers', tone: 'cyan' },
  { key: 'redemption', label: 'Redemptions', tone: 'amber' },
  { key: 'campaign', label: 'Campaigns', tone: 'magenta' },
  { key: 'events', label: 'Events', tone: 'purple' },
  { key: 'security', label: 'Security', tone: 'rose' },
  { key: 'kyc', label: 'KYC', tone: 'blue' },
  { key: 'messages', label: 'Messages', tone: 'cyan' },
  { key: 'announcements', label: 'Announcements', tone: 'amber' },
  { key: 'system', label: 'System', tone: 'muted' as NotificationTone },
];
