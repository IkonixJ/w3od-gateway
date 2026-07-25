import type { CampaignCard, NotificationItem, TransactionRow } from '@/types/dashboard';

// Placeholder data for v1 dashboard. Replaced by Supabase queries when the
// Wallet, Campaigns, and Notifications modules ship.

export const PLACEHOLDER_CAMPAIGNS: CampaignCard[] = [
  {
    id: 'c1',
    title: 'DeFi Trivia Quest',
    bannerUri:
      'https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&cs=tinysrgb&w=900',
    reward: 250,
    xpReward: 80,
    deadline: '2026-08-02T23:59:00Z',
    participants: 1284,
    status: 'active',
  },
  {
    id: 'c2',
    title: 'Onchain scavenger Hunt',
    bannerUri:
      'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=900',
    reward: 500,
    xpReward: 150,
    deadline: '2026-07-31T23:59:00Z',
    participants: 642,
    status: 'active',
  },
  {
    id: 'c3',
    title: 'Community Builder Drive',
    bannerUri:
      'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=900',
    reward: 120,
    xpReward: 40,
    deadline: null,
    participants: 318,
    status: 'active',
  },
];

export const PLACEHOLDER_TRANSACTIONS: TransactionRow[] = [
  {
    id: 't1',
    user: 'neon_falcon',
    avatarSeed: 'neon_falcon',
    amount: 120,
    type: 'receive',
    date: '2026-07-25T09:32:00Z',
    status: 'completed',
  },
  {
    id: 't2',
    user: 'quest_engine',
    avatarSeed: 'quest_engine',
    amount: 80,
    type: 'reward',
    date: '2026-07-24T18:10:00Z',
    status: 'completed',
  },
  {
    id: 't3',
    user: 'cyber_viper',
    avatarSeed: 'cyber_viper',
    amount: 45,
    type: 'send',
    date: '2026-07-24T12:45:00Z',
    status: 'pending',
  },
  {
    id: 't4',
    user: 'reward_pool',
    avatarSeed: 'reward_pool',
    amount: 200,
    type: 'reward',
    date: '2026-07-23T20:00:00Z',
    status: 'completed',
  },
  {
    id: 't5',
    user: 'nft_vault',
    avatarSeed: 'nft_vault',
    amount: 15,
    type: 'redeem',
    date: '2026-07-22T15:22:00Z',
    status: 'completed',
  },
];

export const PLACEHOLDER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Reward Received',
    body: 'You earned 80 W3OD from DeFi Trivia Quest.',
    time: '2h ago',
    tone: 'lime',
    icon: 'reward',
  },
  {
    id: 'n2',
    title: 'New Campaign Live',
    body: 'Onchain Scavenger Hunt just dropped — 500 W3OD up for grabs.',
    time: '5h ago',
    tone: 'cyan',
    icon: 'campaign',
  },
  {
    id: 'n3',
    title: 'Security Check',
    body: 'A new device signed into your account. Was this you?',
    time: '1d ago',
    tone: 'magenta',
    icon: 'security',
  },
];

export const PLACEHOLDER_BALANCE = 1840.5;
