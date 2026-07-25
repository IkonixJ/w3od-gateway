import { supabase } from '@/lib/supabase';
import { hashPin, verifyPin } from '@/lib/security';
import { sendOtp, verifyOtp } from '@/lib/auth-service';

export interface NotificationPrefs {
  push_enabled: boolean;
  email_enabled: boolean;
  marketing_enabled: boolean;
  campaign_alerts: boolean;
  security_alerts: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  device_name: string | null;
  platform: string | null;
  ip_address: string | null;
  success: boolean;
  created_at: string;
}

export interface SecurityEventEntry {
  id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DeletionStatus {
  scheduled: boolean;
  deletion_date?: string;
  days_remaining?: number;
}

export type OperationResult = { success: boolean; error?: string };

// ─── Notification Preferences ───────────────────────────────────────────────

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const { data, error } = await supabase.rpc('get_notification_preferences');
  if (error || !data) {
    return {
      push_enabled: true,
      email_enabled: true,
      marketing_enabled: true,
      campaign_alerts: true,
      security_alerts: true,
    };
  }
  return data as NotificationPrefs;
}

export async function updateNotificationPrefs(prefs: Partial<NotificationPrefs>): Promise<OperationResult> {
  const full: NotificationPrefs = {
    push_enabled: prefs.push_enabled ?? true,
    email_enabled: prefs.email_enabled ?? true,
    marketing_enabled: prefs.marketing_enabled ?? true,
    campaign_alerts: prefs.campaign_alerts ?? true,
    security_alerts: prefs.security_alerts ?? true,
  };
  const { data, error } = await supabase.rpc('update_notification_preferences', {
    p_push: full.push_enabled,
    p_email: full.email_enabled,
    p_marketing: full.marketing_enabled,
    p_campaign: full.campaign_alerts,
    p_security: full.security_alerts,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Trusted Devices ────────────────────────────────────────────────────────

export async function renameTrustedDevice(deviceId: string, name: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('rename_trusted_device', {
    p_device_id: deviceId,
    p_name: name,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Login History & Security Events ─────────────────────────────────────────

export async function getLoginHistory(limit = 20, offset = 0): Promise<LoginHistoryEntry[]> {
  const { data, error } = await supabase.rpc('get_login_history', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as LoginHistoryEntry[];
}

export async function getSecurityEvents(limit = 20, offset = 0): Promise<SecurityEventEntry[]> {
  const { data, error } = await supabase.rpc('get_security_events', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as SecurityEventEntry[];
}

export async function signOutAllDevices(currentFingerprint: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('sign_out_all_devices', {
    p_current_fingerprint: currentFingerprint,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Account Deletion ────────────────────────────────────────────────────────

export async function getDeletionStatus(): Promise<DeletionStatus> {
  const { data, error } = await supabase.rpc('get_deletion_status');
  if (error || !data) return { scheduled: false };
  return data as DeletionStatus;
}

export async function requestAccountDeletion(
  passwordVerified: boolean,
  pinVerified: boolean,
  otpVerified: boolean
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('request_account_deletion', {
    p_password_verified: passwordVerified,
    p_pin_verified: pinVerified,
    p_otp_verified: otpVerified,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

export async function cancelAccountDeletion(): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('cancel_account_deletion');
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Change Email ────────────────────────────────────────────────────────────

export async function changeEmail(
  newEmail: string,
  passwordVerified: boolean,
  otpVerified: boolean
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('change_email', {
    p_new_email: newEmail,
    p_password_verified: passwordVerified,
    p_otp_verified: otpVerified,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Change Password ─────────────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<OperationResult> {
  // Verify current password by re-authenticating
  const { data: userData, error: verifyError } = await supabase.auth.signInWithPassword({
    email: (await supabase.auth.getUser()).data.user?.email ?? '',
    password: currentPassword,
  });
  if (verifyError || !userData.user) {
    return { success: false, error: 'Current password is incorrect.' };
  }
  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { success: false, error: updateError.message };
  // Log the change
  await supabase.rpc('log_password_change');
  return { success: true };
}

// ─── Change Transaction PIN ──────────────────────────────────────────────────

export async function changeTransactionPin(
  currentPin: string,
  storedPinHash: string | null,
  newPin: string,
  otpVerified: boolean
): Promise<OperationResult> {
  // Verify current PIN
  if (!storedPinHash) return { success: false, error: 'No PIN is currently set.' };
  const pinValid = await verifyPin(currentPin, storedPinHash);
  if (!pinValid) return { success: false, error: 'Current PIN is incorrect.' };

  // Hash new PIN
  const newPinHash = await hashPin(newPin);

  const { data, error } = await supabase.rpc('change_transaction_pin', {
    p_new_pin_hash: newPinHash,
    p_current_pin_verified: true,
    p_otp_verified: otpVerified,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── OTP Helpers ──────────────────────────────────────────────────────────────

export async function sendEmailOtp(email: string): Promise<{ error: string | null; devCode: string | null }> {
  return sendOtp(email, 'reset');
}

export async function verifyEmailOtp(email: string, code: string): Promise<boolean> {
  const { verified } = await verifyOtp(email, code, 'reset');
  return verified;
}

// ─── Username Availability ────────────────────────────────────────────────────

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_taken', { p_username: username });
  if (error) return false;
  return !data;
}

export function suggestUsernames(base: string): string[] {
  const suggestions: string[] = [];
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!clean) return [];
  const suffixes = ['_1', '_x', '_og', '0x', '_hq', '_io', '_pro'];
  for (const suffix of suffixes) {
    if ((clean + suffix).length <= 20) suggestions.push(clean + suffix);
  }
  return suggestions.slice(0, 4);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatTimestamp(iso);
}
