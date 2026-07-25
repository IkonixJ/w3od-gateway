import { supabase } from '@/lib/supabase';
import type {
  KycSubmission,
  KycStatusHistoryEntry,
  PendingKycSubmission,
  KycSubmitResult,
  KycReviewResult,
} from '@/types/kyc';

const NIN_LENGTH = 11;
const MIN_AGE = 18;

// ─── Client-side validation ──────────────────────────────────────────────────

export function validateNin(nin: string): { valid: boolean; error?: string } {
  const clean = nin.trim();
  if (!/^\d{11}$/.test(clean)) {
    return { valid: false, error: `NIN must be exactly ${NIN_LENGTH} digits.` };
  }
  return { valid: true };
}

export function validateDateOfBirth(dob: string): { valid: boolean; error?: string } {
  if (!dob) return { valid: false, error: 'Date of birth is required.' };
  const date = new Date(dob);
  if (isNaN(date.getTime())) return { valid: false, error: 'Invalid date.' };
  if (date >= new Date()) return { valid: false, error: 'Date of birth cannot be today or in the future.' };
  const age = calculateAge(date);
  if (age < MIN_AGE) return { valid: false, error: `You must be at least ${MIN_AGE} years old.` };
  return { valid: true };
}

export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function validateFullName(name: string): { valid: boolean; error?: string } {
  const clean = name.trim();
  if (clean.length < 3) return { valid: false, error: 'Full name must be at least 3 characters.' };
  if (clean.length > 100) return { valid: false, error: 'Full name is too long.' };
  return { valid: true };
}

// ─── KYC submission ──────────────────────────────────────────────────────────

export async function submitKyc(
  nin: string,
  fullName: string,
  dateOfBirth: string
): Promise<KycSubmitResult> {
  const ninCheck = validateNin(nin);
  if (!ninCheck.valid) return { success: false, error: ninCheck.error };

  const nameCheck = validateFullName(fullName);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error };

  const dobCheck = validateDateOfBirth(dateOfBirth);
  if (!dobCheck.valid) return { success: false, error: dobCheck.error };

  const { data, error } = await supabase.rpc('submit_kyc', {
    p_nin: nin.trim(),
    p_full_name: fullName.trim(),
    p_date_of_birth: dateOfBirth,
  });

  if (error) return { success: false, error: error.message };
  return (data as KycSubmitResult) ?? { success: false, error: 'Submission failed.' };
}

export async function getMyKyc(): Promise<KycSubmission | null> {
  const { data, error } = await supabase
    .from('kyc_submissions')
    .select('*')
    .maybeSingle();
  if (error) {
    console.warn('[kyc] fetch failed', error.message);
    return null;
  }
  return (data as KycSubmission) ?? null;
}

export async function getKycHistory(kycId: string): Promise<KycStatusHistoryEntry[]> {
  const { data, error } = await supabase.rpc('get_kyc_status_history', {
    p_kyc_id: kycId,
  });
  if (error || !data) return [];
  return data as KycStatusHistoryEntry[];
}

// ─── Admin: review KYC ───────────────────────────────────────────────────────

export async function getPendingKycSubmissions(): Promise<PendingKycSubmission[]> {
  const { data, error } = await supabase.rpc('get_pending_kyc_submissions');
  if (error || !data) return [];
  return data as PendingKycSubmission[];
}

export async function reviewKyc(
  kycId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<KycReviewResult> {
  if (decision === 'rejected' && (!reason || !reason.trim())) {
    return { success: false, error: 'A rejection reason is required.' };
  }
  const { data, error } = await supabase.rpc('review_kyc', {
    p_kyc_id: kycId,
    p_decision: decision,
    p_reason: reason?.trim() || null,
  });
  if (error) return { success: false, error: error.message };
  return (data as KycReviewResult) ?? { success: false, error: 'Review failed.' };
}

// ─── Profile picture (Storage) ───────────────────────────────────────────────

export async function uploadAvatar(
  userId: string,
  fileUri: string,
  mimeType: string
): Promise<{ url: string | null; error: string | null }> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  try {
    // For web, fileUri is a data URL / blob URL; fetch the blob
    let blob: Blob;
    if (fileUri.startsWith('data:')) {
      const resp = await fetch(fileUri);
      blob = await resp.blob();
    } else {
      const resp = await fetch(fileUri);
      blob = await resp.blob();
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: pubData.publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

export async function updateAvatarUrl(userId: string, url: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Profile bio + full name updates ─────────────────────────────────────────

export async function updateProfile(
  userId: string,
  fields: { bio?: string; full_name?: string; phone?: string }
): Promise<{ error: string | null }> {
  const update: Record<string, string> = {};
  if (fields.bio !== undefined) update.bio = fields.bio.trim();
  if (fields.full_name !== undefined) update.full_name = fields.full_name.trim();
  if (fields.phone !== undefined) update.phone = fields.phone.trim();

  if (Object.keys(update).length === 0) return { error: null };

  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Status helpers ──────────────────────────────────────────────────────────

export function isKycApproved(profileKycStatus: string | undefined): boolean {
  return profileKycStatus === 'verified';
}

export function kycStatusLabel(status: string): string {
  switch (status) {
    case 'none':
      return 'Not Submitted';
    case 'pending':
      return 'Pending Review';
    case 'approved':
    case 'verified':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

export function kycStatusTone(
  status: string
): 'cyan' | 'amber' | 'lime' | 'rose' {
  switch (status) {
    case 'none':
      return 'cyan';
    case 'pending':
      return 'amber';
    case 'approved':
    case 'verified':
      return 'lime';
    case 'rejected':
      return 'rose';
    default:
      return 'cyan';
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
