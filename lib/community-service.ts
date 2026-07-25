import { supabase } from '@/lib/supabase';
import type {
  CommunityHubData,
  DirectoryMember,
  MemberPublicProfile,
  OperationResult,
} from '@/types/community';

// ─── Community Hub ──────────────────────────────────────────────────────────

export async function getCommunityHub(): Promise<CommunityHubData | null> {
  const { data, error } = await supabase.rpc('get_community_hub');
  if (error || !data) return null;
  return data as CommunityHubData;
}

// ─── Member Directory ──────────────────────────────────────────────────────

export async function searchMemberDirectory(
  query: string,
  limit = 30
): Promise<DirectoryMember[]> {
  const { data, error } = await supabase.rpc('search_member_directory', {
    p_query: query,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as DirectoryMember[];
}

// ─── Member Public Profile ──────────────────────────────────────────────────

export async function getMemberPublicProfile(
  userId: string
): Promise<MemberPublicProfile | null> {
  const { data, error } = await supabase.rpc('get_member_public_profile', {
    p_user_id: userId,
  });
  if (error || !data) return null;
  return data as MemberPublicProfile;
}

// ─── Announcement Channel ───────────────────────────────────────────────────

export async function getAnnouncementPosts(
  limit = 50,
  offset = 0
): Promise<AnnouncementPost[]> {
  const { data, error } = await supabase.rpc('get_announcement_posts', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as AnnouncementPost[];
}

export async function createAnnouncementPost(
  title: string,
  body: string,
  mediaUrl: string | null = null
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('create_announcement_post', {
    p_title: title,
    p_body: body,
    p_media_url: mediaUrl,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function toggleAnnouncementReaction(
  postId: string,
  emoji: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('toggle_announcement_reaction', {
    p_post_id: postId,
    p_emoji: emoji,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Typing Indicators ──────────────────────────────────────────────────────

export async function setTyping(scope: 'dm' | 'group', scopeId: string): Promise<void> {
  await supabase.rpc('set_typing', { p_scope: scope, p_scope_id: scopeId });
}

export async function clearTyping(scope: 'dm' | 'group', scopeId: string): Promise<void> {
  await supabase.rpc('clear_typing', { p_scope: scope, p_scope_id: scopeId });
}

export function subscribeToTyping(
  scope: 'dm' | 'group',
  scopeId: string,
  callback: (userId: string) => void
) {
  const channel = supabase
    .channel(`typing:${scope}:${scopeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `scope=eq.${scope}`,
      },
      (payload) => {
        const row = payload.new as { scope_id: string; user_id: string; updated_at: string };
        if (row.scope_id === scopeId) {
          // Only show typing within last 5 seconds
          const age = Date.now() - new Date(row.updated_at).getTime();
          if (age < 5000) callback(row.user_id);
        }
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Chat Media Upload ──────────────────────────────────────────────────────

export async function uploadChatMedia(
  userId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<{ url: string | null; error: string | null }> {
  const path = `${userId}/${Date.now()}-${fileName}`;
  try {
    let blob: Blob;
    const resp = await fetch(fileUri);
    blob = await resp.blob();
    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(path, blob, { contentType: mimeType, upsert: false });
    if (uploadError) return { url: null, error: uploadError.message };
    const { data: signedData, error: signedError } = await supabase.storage
      .from('chat-media')
      .createSignedUrl(path, 3600);
    if (signedError || !signedData) return { url: null, error: 'Could not generate file URL.' };
    return { url: signedData.signedUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(/[ _-]+/)
    .filter(Boolean)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Re-export the AnnouncementPost type here so callers don't need a separate import
import type { AnnouncementPost } from '@/types/community';
