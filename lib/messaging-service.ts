import { supabase } from '@/lib/supabase';
import type {
  ConversationMessage,
  ConversationSummary,
  GroupInfo,
  GroupMember,
  GroupMessage,
  GroupSummary,
  OperationResult,
  MessageType,
} from '@/types/community';

// ─── Direct Messaging ───────────────────────────────────────────────────────

export async function getOrCreateConversation(
  otherUserId: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_other_user_id: otherUserId,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function sendMessage(
  conversationId: string,
  body: string,
  messageType: MessageType = 'text',
  mediaUrl: string | null = null,
  replyTo: string | null = null
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
    p_message_type: messageType,
    p_media_url: mediaUrl,
    p_reply_to: replyTo,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId });
}

export async function getMyConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('get_my_conversations');
  if (error || !data) return [];
  return data as ConversationSummary[];
}

export async function getConversationMessages(
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase.rpc('get_conversation_messages', {
    p_conversation_id: conversationId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as ConversationMessage[];
}

export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('toggle_message_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

// ─── Group Chat ─────────────────────────────────────────────────────────────

export async function createGroup(
  name: string,
  description: string,
  avatarUrl: string | null = null
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_description: description,
    p_avatar_url: avatarUrl,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function addGroupMember(
  groupId: string,
  userId: string,
  isAdmin = false
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('add_group_member', {
    p_group_id: groupId,
    p_user_id: userId,
    p_is_admin: isAdmin,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

export async function removeGroupMember(
  groupId: string,
  userId: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('remove_group_member', {
    p_group_id: groupId,
    p_user_id: userId,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

export async function sendGroupMessage(
  groupId: string,
  body: string,
  messageType: MessageType = 'text',
  mediaUrl: string | null = null,
  replyTo: string | null = null
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('send_group_message', {
    p_group_id: groupId,
    p_body: body,
    p_message_type: messageType,
    p_media_url: mediaUrl,
    p_reply_to: replyTo,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false, error: 'Failed.' };
}

export async function getMyGroups(): Promise<GroupSummary[]> {
  const { data, error } = await supabase.rpc('get_my_groups');
  if (error || !data) return [];
  return data as GroupSummary[];
}

export async function getGroupMessages(
  groupId: string,
  limit = 50,
  offset = 0
): Promise<GroupMessage[]> {
  const { data, error } = await supabase.rpc('get_group_messages', {
    p_group_id: groupId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as GroupMessage[];
}

export async function toggleGroupMessageReaction(
  messageId: string,
  emoji: string
): Promise<OperationResult> {
  const { data, error } = await supabase.rpc('toggle_group_message_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  });
  if (error) return { success: false, error: error.message };
  return (data as OperationResult) ?? { success: false };
}

export async function getGroupInfo(
  groupId: string
): Promise<{ success: boolean; group?: GroupInfo; members?: GroupMember[]; error?: string }> {
  const { data, error } = await supabase.rpc('get_group_info', {
    p_group_id: groupId,
  });
  if (error || !data) return { success: false, error: error?.message ?? 'Failed.' };
  const result = data as { success: boolean; group: GroupInfo; members: GroupMember[]; error?: string };
  return result;
}

// ─── Real-time subscriptions ─────────────────────────────────────────────────

export function subscribeToConversationMessages(
  conversationId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `scope=eq.dm`,
      },
      () => callback()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToGroupMessages(
  groupId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(`group:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `scope=eq.group`,
      },
      () => callback()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAnnouncementPosts(callback: () => void) {
  const channel = supabase
    .channel('announcements')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'announcement_posts',
      },
      () => callback()
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'announcement_reactions',
      },
      () => callback()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
