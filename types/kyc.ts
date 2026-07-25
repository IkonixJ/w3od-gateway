// KYC verification + profile management data shapes.

export type KycSubmissionStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface KycSubmission {
  id: string;
  user_id: string;
  nin: string;
  full_name: string;
  date_of_birth: string;
  status: KycSubmissionStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycStatusHistoryEntry {
  id: string;
  from_status: KycSubmissionStatus;
  to_status: KycSubmissionStatus;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface PendingKycSubmission {
  id: string;
  user_id: string;
  nin: string;
  full_name: string;
  date_of_birth: string;
  status: KycSubmissionStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface KycSubmitResult {
  success: boolean;
  error?: string;
  kyc_id?: string;
}

export interface KycReviewResult {
  success: boolean;
  error?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned_at: string;
  icon: string;
}
