import { supabase } from '@/lib/supabase';

const OTP_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-otp`;
const RESET_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/reset-password`;

const ANON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
  apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
};

export type OtpPurpose = 'signup' | 'login' | 'reset';

export async function sendOtp(email: string, purpose: OtpPurpose): Promise<{ error: string | null }> {
  try {
    const res = await fetch(OTP_FUNCTION_URL, {
      method: 'POST',
      headers: ANON_HEADERS,
      body: JSON.stringify({ email, purpose }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || 'Failed to send verification code.' };
    }
    return { error: null };
  } catch {
    return { error: 'Network error. Please try again.' };
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

export async function consumeInviteCode(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_invite_code', {
    p_code: code,
  });
  if (error) return false;
  return !!data;
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

export async function getLoginLockStatus(email: string): Promise<{ locked: boolean; lockedUntil: Date | null }> {
  const { data } = await supabase
    .from('profiles')
    .select('login_locked_until, login_failed_attempts')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (!data) return { locked: false, lockedUntil: null };

  const lockedUntil = data.login_locked_until ? new Date(data.login_locked_until) : null;
  const locked = lockedUntil ? lockedUntil > new Date() : false;

  return { locked, lockedUntil };
}

export async function incrementLoginFailures(email: string): Promise<{ attempts: number; locked: boolean }> {
  // Fetch current attempts
  const { data } = await supabase
    .from('profiles')
    .select('login_failed_attempts, login_locked_until')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  const current = (data?.login_failed_attempts ?? 0) + 1;
  const shouldLock = current >= 5;
  const lockUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

  await supabase
    .from('profiles')
    .update({
      login_failed_attempts: current,
      login_locked_until: lockUntil,
    })
    .eq('email', email.toLowerCase());

  return { attempts: current, locked: shouldLock };
}

export async function resetLoginFailures(email: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ login_failed_attempts: 0, login_locked_until: null })
    .eq('email', email.toLowerCase());
}

export async function updateLastActive(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function getLastActive(userId: string): Promise<Date | null> {
  const { data } = await supabase
    .from('profiles')
    .select('last_active_at')
    .eq('id', userId)
    .maybeSingle();
  return data?.last_active_at ? new Date(data.last_active_at) : null;
}
