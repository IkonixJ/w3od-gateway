export type UserRole = 'member' | 'admin' | 'moderator' | 'super_admin';

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type RedemptionStatus = 'pending' | 'fulfilled' | 'cancelled';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export type EventMode = 'virtual' | 'in_person' | 'hybrid';

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
  kyc_status: KycStatus;
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
  created_at: string;
  updated_at: string;
}
