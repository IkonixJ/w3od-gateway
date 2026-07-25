// Campaigns, Rewards, XP, Badges & Leaderboard data shapes.

export type CampaignStatus = 'active' | 'scheduled' | 'ended';
export type SubmissionStatus = 'not_submitted' | 'submitted' | 'under_review' | 'approved' | 'rejected';
export type ProofType = 'image' | 'video' | 'pdf' | 'document' | 'link' | 'zip';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  instructions: string;
  banner_url: string | null;
  reward_amount: number;
  xp_reward: number;
  proof_required: boolean;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  created_at: string;
}

export interface MyCampaign extends Campaign {
  participation_id: string | null;
  submission_status: SubmissionStatus | null;
  proof_type: ProofType | null;
  proof_url: string | null;
  proof_note: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reward_credited: boolean;
}

export interface AdminCampaign extends Campaign {
  participant_count: number;
}

export interface CampaignParticipation {
  id: string;
  user_id: string;
  submission_status: SubmissionStatus;
  proof_type: ProofType | null;
  proof_url: string | null;
  proof_note: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reward_credited: boolean;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  awarded_at?: string;
}

export interface RewardReceipt {
  id: string;
  campaign_id: string | null;
  w3od_amount: number;
  xp_amount: number;
  transaction_reference: string | null;
  receipt_number: string;
  created_at: string;
  campaign_title: string | null;
}

export type LeaderboardCategory = 'xp' | 'contributions' | 'earnings' | 'referrers';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  xp?: number;
  count?: number;
  total?: number;
}

export interface OperationResult {
  success: boolean;
  error?: string;
  campaign_id?: string;
  already_joined?: boolean;
}
