// Support module data shapes.

export type SupportCategory =
  | 'account'
  | 'kyc'
  | 'rewards'
  | 'redemption'
  | 'campaigns'
  | 'technical'
  | 'suggestions'
  | 'other';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_for_user'
  | 'responded'
  | 'resolved'
  | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: SupportCategory;
  priority: TicketPriority;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  user_id?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  assigned_to?: string | null;
  reply_count: number;
}

export interface TicketReply {
  id: string;
  author_id: string;
  body: string;
  is_admin_reply: boolean;
  attachment_urls: string[];
  created_at: string;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
}

export interface TicketDetail {
  success: boolean;
  error?: string;
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: SupportCategory;
  priority: TicketPriority;
  attachment_urls: string[];
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  is_admin: boolean;
  replies: TicketReply[];
}

export interface TicketOperationResult {
  success: boolean;
  error?: string;
  ticket_id?: string;
}

export const TICKET_CATEGORIES: { key: SupportCategory; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'kyc', label: 'KYC' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'redemption', label: 'Redemption' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'technical', label: 'Technical Issues' },
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'other', label: 'Other' },
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting_for_user: 'Waiting for User',
  responded: 'Responded',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_STATUS_TONES: Record<TicketStatus, 'cyan' | 'amber' | 'lime' | 'rose' | 'muted'> = {
  open: 'cyan',
  in_progress: 'amber',
  waiting_for_user: 'amber',
  responded: 'lime',
  resolved: 'lime',
  closed: 'muted',
};
