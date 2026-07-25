import { supabase } from '@/lib/supabase';

// ─── Admin types ─────────────────────────────────────────────────────────────

export interface AdminStats {
  total_members: number;
  verified_members: number;
  pending_kyc: number;
  pending_redemptions: number;
  active_campaigns: number;
  total_rewards: number;
  today_members: number;
  open_tickets: number;
  online_members: number;
}

export interface ActivityEntry {
  type: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  description: string;
}

export interface AdminMember {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  role: string;
  kyc_status: string;
  suspended: boolean;
  xp: number;
  created_at: string;
  last_active_at: string | null;
}

export interface MemberDetail {
  profile: {
    id: string;
    email: string;
    display_name: string | null;
    username: string | null;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    kyc_status: string;
    xp: number;
    reputation: number;
    bio: string | null;
    email_verified: boolean;
    suspended: boolean;
    login_locked_until: string | null;
    last_active_at: string | null;
    created_at: string;
  };
  wallet: {
    user_id: string;
    account_number: string;
    balance: number;
    pending_balance: number;
    lifetime_earned: number;
    lifetime_redeemed: number;
  } | null;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: string;
    color: string;
    awarded_at: string;
  }>;
  participations: Array<{
    id: string;
    campaign_title: string;
    submission_status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
  }>;
  notes: Array<{
    id: string;
    note: string;
    admin_id: string;
    created_at: string;
  }>;
}

export interface InviteCode {
  id: string;
  code: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  disabled: boolean;
  created_at: string;
  created_by_username: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: string;
  scheduled_at: string | null;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface TicketReply {
  id: string;
  author_id: string;
  body: string;
  is_admin_reply: boolean;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  target_user_id: string | null;
  target_type: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_username: string | null;
  admin_display_name: string | null;
  target_username: string | null;
  target_display_name: string | null;
}

export interface PayoutEntry {
  id: string;
  reference: string;
  amount: number;
  account_name: string;
  account_number: string;
  requested_at: string;
  processing_date: string;
  username: string | null;
  display_name: string | null;
  email: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
  code?: string;
  id?: string;
  count?: number;
  reference?: string;
}

// ─── Stats & Activity ────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats | null> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error || !data) return null;
  return data as AdminStats;
}

export async function getRecentActivity(limit = 20): Promise<ActivityEntry[]> {
  const { data, error } = await supabase.rpc('get_recent_activity', { p_limit: limit });
  if (error || !data) return [];
  return data as ActivityEntry[];
}

// ─── Member management ───────────────────────────────────────────────────────

export async function searchMembers(query: string, limit = 50): Promise<AdminMember[]> {
  const { data, error } = await supabase.rpc('search_members', {
    p_query: query,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminMember[];
}

export async function getMemberDetail(userId: string): Promise<MemberDetail | null> {
  const { data, error } = await supabase.rpc('get_member_detail', { p_user_id: userId });
  if (error || !data) return null;
  return data as MemberDetail;
}

export async function suspendMember(userId: string, reason: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('suspend_member', {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function reactivateMember(userId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('reactivate_member', { p_user_id: userId });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function addAdminNote(userId: string, note: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('add_admin_note', {
    p_user_id: userId,
    p_note: note,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export async function adminCreditReward(
  userId: string,
  amount: number,
  xp: number,
  reason: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('admin_credit_reward', {
    p_user_id: userId,
    p_amount: amount,
    p_xp: xp,
    p_reason: reason,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function adminCreditMultiple(
  userIds: string[],
  amount: number,
  xp: number,
  reason: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('admin_credit_multiple', {
    p_user_ids: userIds,
    p_amount: amount,
    p_xp: xp,
    p_reason: reason,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function adminCreditCampaignParticipants(
  campaignId: string,
  amount: number,
  xp: number,
  reason: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('admin_credit_campaign_participants', {
    p_campaign_id: campaignId,
    p_amount: amount,
    p_xp: xp,
    p_reason: reason,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Redemptions ─────────────────────────────────────────────────────────────

export async function getAllRedemptions(): Promise<PayoutEntry[]> {
  const { data, error } = await supabase.rpc('admin_export_payout_list');
  if (error || !data) return [];
  return data as PayoutEntry[];
}

export async function reviewRedemption(
  redemptionId: string,
  decision: 'approved' | 'rejected' | 'paid',
  reason?: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('admin_review_redemption', {
    p_redemption_id: redemptionId,
    p_decision: decision,
    p_reason: reason ?? null,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function bulkApproveRedemptions(ids: string[]): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('admin_bulk_approve_redemptions', { p_ids: ids });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Invite codes ────────────────────────────────────────────────────────────

export async function getInviteCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabase.rpc('get_invite_codes');
  if (error || !data) return [];
  return data as InviteCode[];
}

export async function createInviteCode(maxUses: number, expiresAt: string | null): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('create_invite_code', {
    p_max_uses: maxUses,
    p_expires_at: expiresAt,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function disableInviteCode(codeId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('disable_invite_code', { p_code_id: codeId });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function reactivateInviteCode(codeId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('reactivate_invite_code', { p_code_id: codeId });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('get_announcements');
  if (error || !data) return [];
  return data as Announcement[];
}

export async function createAnnouncement(
  title: string,
  body: string,
  type: 'push' | 'in_app' | 'popup',
  scheduledAt: string | null
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('create_announcement', {
    p_title: title,
    p_body: body,
    p_type: type,
    p_scheduled_at: scheduledAt,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function sendAnnouncement(announcementId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('send_announcement', {
    p_announcement_id: announcementId,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Support tickets ─────────────────────────────────────────────────────────

export async function getSupportTickets(status: string = 'all'): Promise<SupportTicket[]> {
  const { data, error } = await supabase.rpc('get_support_tickets', { p_status: status });
  if (error || !data) return [];
  return data as SupportTicket[];
}

export async function getTicketReplies(ticketId: string): Promise<TicketReply[]> {
  const { data, error } = await supabase.rpc('get_ticket_replies', { p_ticket_id: ticketId });
  if (error || !data) return [];
  return data as TicketReply[];
}

export async function replyTicket(ticketId: string, body: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('reply_support_ticket', {
    p_ticket_id: ticketId,
    p_body: body,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function closeTicket(ticketId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('close_support_ticket', { p_ticket_id: ticketId });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Audit logs ──────────────────────────────────────────────────────────────

export async function getAuditLogs(limit = 100, offset = 0): Promise<AuditLog[]> {
  const { data, error } = await supabase.rpc('get_audit_logs', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as AuditLog[];
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsPoint {
  date?: string;
  count: number;
  amount?: number;
  title?: string;
  participants?: number;
}

export async function getAnalytics(metric: string, days = 30): Promise<AnalyticsPoint[]> {
  const { data, error } = await supabase.rpc('get_analytics', {
    p_metric: metric,
    p_days: days,
  });
  if (error || !data) return [];
  return data as AnalyticsPoint[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin';
}
