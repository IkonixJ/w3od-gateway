// Wallet module data shapes.

export type TransactionType = 'transfer' | 'reward' | 'redemption' | 'system';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Wallet {
  user_id: string;
  account_number: string;
  balance: number;
  pending_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithProfiles {
  id: string;
  reference: string;
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string | null;
  created_at: string;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  receiver_username: string | null;
  receiver_display_name: string | null;
  receiver_avatar_url: string | null;
}

export interface RedemptionRow {
  id: string;
  user_id: string;
  amount: number;
  status: RedemptionStatus;
  account_name: string;
  account_number: string;
  requested_at: string;
  processing_date: string;
  processed_at: string | null;
  reference: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  created_at: string;
  updated_at: string;
}

export interface WalletNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'transaction' | 'redemption' | 'security' | 'campaign' | 'system';
  tone: string;
  icon: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface RecipientLookup {
  found: boolean;
  is_self?: boolean;
  id?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
}

export interface TransferResult {
  success: boolean;
  error?: string;
  reference?: string;
  recipient?: string | null;
  amount?: number;
}

export interface RedemptionResult {
  success: boolean;
  error?: string;
  reference?: string;
  processing_date?: string;
  amount?: number;
}

export interface TransactionFilter {
  type?: TransactionType | 'all';
  status?: TransactionStatus | 'all';
  search?: string;
  fromDate?: Date | null;
  toDate?: Date | null;
}
