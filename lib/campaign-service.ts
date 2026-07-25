import { supabase } from '@/lib/supabase';
import type {
  Campaign,
  MyCampaign,
  AdminCampaign,
  CampaignParticipation,
  Badge,
  RewardReceipt,
  LeaderboardEntry,
  LeaderboardCategory,
  LeaderboardPeriod,
  OperationResult,
  ProofType,
} from '@/types/campaigns';

// ─── Campaigns (member) ──────────────────────────────────────────────────────

export async function getActiveCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .in('status', ['active', 'scheduled'])
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Campaign[];
}

export async function getMyCampaigns(): Promise<MyCampaign[]> {
  const { data, error } = await supabase.rpc('get_my_campaigns');
  if (error || !data) return [];
  return data as MyCampaign[];
}

export async function joinCampaign(campaignId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('join_campaign', { p_campaign_id: campaignId });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Join failed.' };
}

export async function submitProof(
  participationId: string,
  proofType: ProofType,
  proofUrl: string,
  proofNote: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('submit_campaign_proof', {
    p_participation_id: participationId,
    p_proof_type: proofType,
    p_proof_url: proofUrl,
    p_proof_note: proofNote,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Submission failed.' };
}

// ─── Campaigns (admin) ───────────────────────────────────────────────────────

export async function getAllCampaigns(): Promise<AdminCampaign[]> {
  const { data, error } = await supabase.rpc('get_all_campaigns');
  if (error || !data) return [];
  return data as AdminCampaign[];
}

export async function getCampaignParticipations(campaignId: string): Promise<CampaignParticipation[]> {
  const { data, error } = await supabase.rpc('get_campaign_participations', {
    p_campaign_id: campaignId,
  });
  if (error || !data) return [];
  return data as CampaignParticipation[];
}

export async function createCampaign(params: {
  title: string;
  description: string;
  instructions: string;
  bannerUrl: string | null;
  rewardAmount: number;
  xpReward: number;
  proofRequired: boolean;
  startDate: string | null;
  endDate: string | null;
}): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('create_campaign', {
    p_title: params.title,
    p_description: params.description,
    p_instructions: params.instructions,
    p_banner_url: params.bannerUrl,
    p_reward_amount: params.rewardAmount,
    p_xp_reward: params.xpReward,
    p_proof_required: params.proofRequired,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Create failed.' };
}

export async function updateCampaign(
  campaignId: string,
  params: {
    title: string;
    description: string;
    instructions: string;
    bannerUrl: string | null;
    rewardAmount: number;
    xpReward: number;
    proofRequired: boolean;
    startDate: string | null;
    endDate: string | null;
  }
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('update_campaign', {
    p_campaign_id: campaignId,
    p_title: params.title,
    p_description: params.description,
    p_instructions: params.instructions,
    p_banner_url: params.bannerUrl,
    p_reward_amount: params.rewardAmount,
    p_xp_reward: params.xpReward,
    p_proof_required: params.proofRequired,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Update failed.' };
}

export async function endCampaign(campaignId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('end_campaign', { p_campaign_id: campaignId });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'End failed.' };
}

export async function reviewSubmission(
  participationId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('review_campaign_submission', {
    p_participation_id: participationId,
    p_decision: decision,
    p_reason: reason ?? null,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Review failed.' };
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').order('name');
  if (error || !data) return [];
  return data as Badge[];
}

export async function getMyBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.rpc('get_my_badges');
  if (error || !data) return [];
  return data as Badge[];
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const { data, error } = await supabase.rpc('get_user_badges', { p_user_id: userId });
  if (error || !data) return [];
  return data as Badge[];
}

export async function awardBadge(userId: string, badgeId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('award_badge', {
    p_user_id: userId,
    p_badge_id: badgeId,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Award failed.' };
}

export async function revokeBadge(userId: string, badgeId: string): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('revoke_badge', {
    p_user_id: userId,
    p_badge_id: badgeId,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Revoke failed.' };
}

// ─── Reward receipts ─────────────────────────────────────────────────────────

export async function getMyRewardReceipts(): Promise<RewardReceipt[]> {
  const { data, error } = await supabase.rpc('get_my_reward_receipts');
  if (error || !data) return [];
  return data as RewardReceipt[];
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(
  category: LeaderboardCategory,
  period: LeaderboardPeriod
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_category: category,
    p_period: period,
  });
  if (error || !data) return [];
  return data as LeaderboardEntry[];
}

// ─── Proof file upload ───────────────────────────────────────────────────────

export async function uploadProofFile(
  userId: string,
  participationId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<{ url: string | null; error: string | null }> {
  const path = `${userId}/${participationId}/${fileName}`;
  try {
    let blob: Blob;
    if (fileUri.startsWith('data:')) {
      const resp = await fetch(fileUri);
      blob = await resp.blob();
    } else {
      const resp = await fetch(fileUri);
      blob = await resp.blob();
    }
    const { error: uploadError } = await supabase.storage
      .from('campaign-proof')
      .upload(path, blob, { contentType: mimeType, upsert: false });
    if (uploadError) return { url: null, error: uploadError.message };
    const { data } = supabase.storage.from('campaign-proof').getPublicUrl(path);
    // Private bucket — create a signed URL instead
    const { data: signedData, error: signedError } = await supabase.storage
      .from('campaign-proof')
      .createSignedUrl(path, 3600);
    if (signedError || !signedData) return { url: null, error: 'Could not generate file URL.' };
    return { url: signedData.signedUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function submissionStatusLabel(status: string): string {
  switch (status) {
    case 'not_submitted': return 'Not Submitted';
    case 'submitted': return 'Submitted';
    case 'under_review': return 'Under Review';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    default: return status;
  }
}

export function submissionStatusTone(status: string): 'cyan' | 'amber' | 'lime' | 'rose' | 'blue' {
  switch (status) {
    case 'not_submitted': return 'cyan';
    case 'submitted': return 'blue';
    case 'under_review': return 'amber';
    case 'approved': return 'lime';
    case 'rejected': return 'rose';
    default: return 'cyan';
  }
}

export function campaignStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'scheduled': return 'Scheduled';
    case 'ended': return 'Ended';
    default: return status;
  }
}

export function campaignStatusTone(status: string): 'lime' | 'amber' | 'rose' {
  switch (status) {
    case 'active': return 'lime';
    case 'scheduled': return 'amber';
    case 'ended': return 'rose';
    default: return 'lime';
  }
}

export function rarityTone(rarity: string): 'cyan' | 'blue' | 'purple' | 'amber' {
  switch (rarity) {
    case 'common': return 'cyan';
    case 'rare': return 'blue';
    case 'epic': return 'purple';
    case 'legendary': return 'amber';
    default: return 'cyan';
  }
}

export function rarityLabel(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}
