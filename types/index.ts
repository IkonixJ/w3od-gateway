// Canonical type re-exports.
// Domain-specific types live in their own files (campaigns.ts, wallet.ts, etc.)
// and are re-exported here for convenience: `import { Profile } from '@/types'`.

export type { CampaignStatus, SubmissionStatus, ProofType, Campaign, MyCampaign, AdminCampaign, CampaignParticipation, Badge, RewardReceipt, LeaderboardCategory, LeaderboardPeriod, LeaderboardEntry, OperationResult } from './campaigns';

export type { TransactionType, TransactionStatus, RedemptionStatus, Wallet, TransactionWithProfiles, RedemptionRow, BankAccount, WalletNotification, RecipientLookup, TransferResult, RedemptionResult, TransactionFilter } from './wallet';

export type { KycSubmissionStatus, KycSubmission, KycStatusHistoryEntry, PendingKycSubmission, KycSubmitResult, KycReviewResult } from './kyc';

export type { EventStatus, RSVPStatus, CheckInMethod, CommunityEvent, EventDetail, EventRSVP, EventCheckIn, EventPhoto, MyEvent, EventOperationResult } from './events';

// Profile is the only type that lives here — it's the central user model.
export type UserRole = 'member' | 'admin' | 'moderator' | 'super_admin';

export type OnboardingStep =
  | 'splash'
  | 'welcome'
  | 'sign-up'
  | 'verify-email'
  | 'sign-in'
  | 'forgot-password'
  | 'reset-password'
  | 'device-verify'
  | 'create-pin'
  | 'complete';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  kyc_status: string;
  xp: number;
  reputation: number;
  bio: string | null;
  email_verified: boolean;
  pin_hash: string | null;
  pin_failed_attempts: number;
  pin_locked: boolean;
  biometric_enabled: boolean;
  login_locked_until: string | null;
  login_failed_attempts: number;
  last_active_at: string | null;
  deletion_scheduled_at: string | null;
  deletion_verified: boolean;
  deletion_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
