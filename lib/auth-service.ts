import { supabase } from '@/lib/supabase';

const OTP_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-otp`;
const RESET_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-password`;

const ANON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
  apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
};

export type OtpPurpose = 'signup' | 'login' | 'reset';

// In-memory store for the dev OTP code returned by the edge function when no
// email provider is configured. The verify screens read this to display the
// code so the auth flow is testable in the Bolt preview. Cleared on read.
let lastDevOtp: { code: string; purpose: OtpPurpose; email: string; at: number } | null = null;

export function getLastDevOtp(): { code: string; purpose: OtpPurpose; email: string } | null {
  if (!lastDevOtp) return null;
  // Expire after 10 minutes (matches OTP expiry).
  if (Date.now() - lastDevOtp.at > 10 * 60 * 1000) {
    lastDevOtp = null;
    return null;
  }
  return { code: lastDevOtp.code, purpose: lastDevOtp.purpose, email: lastDevOtp.email };
}

export function clearLastDevOtp(): void {
  lastDevOtp = null;
}

export interface SendOtpResult {
  error: string | null;
  // Returned only in development (edge function logs + returns dev_code).
  // Used to surface the code in the UI so the flow is testable without an
  // email provider. In production this field is absent.
  devCode: string | null;
}

export async function sendOtp(email: string, purpose: OtpPurpose): Promise<SendOtpResult> {
  try {
    const res = await fetch(OTP_FUNCTION_URL, {
      method: 'POST',
      headers: ANON_HEADERS,
      body: JSON.stringify({ email, purpose }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || 'Failed to send verification code.', devCode: null };
    }
    const body = await res.json().catch(() => ({}));
    if (body.dev_code) {
      lastDevOtp = {
        code: String(body.dev_code),
        purpose,
        email: email.toLowerCase(),
        at: Date.now(),
      };
    }
    return { error: null, devCode: body.dev_code ?? null };
  } catch {
    return { error: 'Network error. Please try again.', devCode: null };
  }
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: OtpPurpose
): Promise<{ verified: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('verify_otp', {
      p_email: email,
      p_code: code,
      p_purpose: purpose,
    });
    if (error) return { verified: false, error: error.message };
    if (!data) return { verified: false, error: 'Invalid or expired code.' };
    return { verified: true, error: null };
  } catch {
    return { verified: false, error: 'Network error.' };
  }
}

export async function markEmailVerified(email: string): Promise<void> {
  await supabase.rpc('mark_email_verified', { p_email: email });
}

export async function checkUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_taken', {
    p_username: username,
  });
  if (error) return true; // assume taken on error (safe default)
  return !!data;
}

export async function changeUsername(userId: string, username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('change_username', {
    p_user_id: userId,
    p_username: username,
  });
  if (error) return false;
  return !!data;
}

export async function consumeInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_invite_code', {
    p_code: code,
  });
  if (error) return false;
  return !!data;
}

export async function refundInviteCode(code: string): Promise<void> {
  await supabase.rpc('refund_invite_code', { p_code: code });
}

export async function setBiometricEnabled(userId: string, enabled: boolean): Promise<void> {
  await supabase.rpc('set_biometric_enabled', { p_user_id: userId, p_enabled: enabled });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(RESET_FUNCTION_URL, {
      method: 'POST',
      headers: ANON_HEADERS,
      body: JSON.stringify({ email, code, newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || 'Failed to reset password.' };
    }
    return { error: null };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function isTrustedDevice(userId: string, fingerprint: string): Promise<boolean> {
  const { data } = await supabase
    .from('trusted_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('device_fingerprint', fingerprint)
    .maybeSingle();
  return !!data;
}

export async function trustDevice(
  userId: string,
  fingerprint: string,
  deviceName: string
): Promise<void> {
  await supabase.from('trusted_devices').upsert(
    { user_id: userId, device_fingerprint: fingerprint, device_name: deviceName },
    { onConflict: 'user_id,device_fingerprint' }
  );
}

export async function listTrustedDevices(userId: string): Promise<
  { id: string; device_name: string | null; trusted_at: string }[]
> {
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('id, device_name, trusted_at, platform, last_login_at')
    .eq('user_id', userId)
    .order('trusted_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  await supabase
    .from('trusted_devices')
    .delete()
    .eq('id', deviceId)
    .eq('user_id', userId);
}

export async function logLoginAttempt(
  userId: string | null,
  email: string,
  success: boolean,
  fingerprint: string
): Promise<void> {
  await supabase.from('login_attempts').insert({
    user_id: userId,
    email,
    success,
    device_fingerprint: fingerprint,
  });
}

export async function getLoginLockStatus(
  email: string
): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const { data } = await supabase.rpc('get_login_lock_status', { p_email: email });
  if (!data) return { locked: false, lockedUntil: null };
  const lockedUntil = data.locked_until ? new Date(data.locked_until) : null;
  const locked = !!data.locked;
  return { locked, lockedUntil };
}

export async function incrementLoginFailures(
  email: string
): Promise<{ attempts: number; locked: boolean }> {
  const { data } = await supabase.rpc('increment_login_failures', { p_email: email });
  if (!data) return { attempts: 0, locked: false };
  return { attempts: data.attempts ?? 0, locked: !!data.locked };
}

export async function resetLoginFailures(email: string): Promise<void> {
  await supabase.rpc('reset_login_failures', { p_email: email });
}

export async function updateLastActive(userId: string): Promise<void> {
  await supabase.rpc('update_last_active', { p_user_id: userId });
}

export async function getLastActive(userId: string): Promise<Date | null> {
  const { data } = await supabase
    .from('profiles')
    .select('last_active_at')
    .eq('id', userId)
    .maybeSingle();
  return data?.last_active_at ? new Date(data.last_active_at) : null;
}
