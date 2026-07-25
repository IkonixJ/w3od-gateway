// Dashboard data shapes. Wallet/transaction/notification/campaign rows are
// placeholder data for v1 — the database tables will be added when the
// Wallet, Campaigns, and Notifications modules are built.

export interface QuickAction {
  id: string;
  label: string;
  icon: 'send' | 'receive' | 'redeem' | 'history' | 'earn' | 'more';
  tone: 'cyan' | 'magenta' | 'lime' | 'amber' | 'blue' | 'purple';
}

export interface CampaignCard {
  id: string;
  title: string;
  bannerUri: string;
  reward: number;
  xpReward: number;
  deadline: string | null;
  participants: number;
  status: 'active' | 'paused';
}

export interface TransactionRow {
  id: string;
  user: string;
  avatarSeed: string;
  amount: number;
  type: 'send' | 'receive' | 'reward' | 'redeem' | 'stake';
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: 'cyan' | 'magenta' | 'lime' | 'amber';
  icon: 'reward' | 'campaign' | 'security' | 'event';
}
