import { supabase } from '@/lib/supabase';
import type {
  SupportTicket,
  TicketDetail,
  TicketOperationResult,
  TicketStatus,
  SupportCategory,
} from '@/types/support';

// ─── Member: Create / List ──────────────────────────────────────────────────

export async function createSupportTicket(
  subject: string,
  body: string,
  category: SupportCategory,
  attachmentUrls: string[] = []
): Promise<TicketOperationResult> {
  const { data, error } = await supabase.rpc('create_support_ticket', {
    p_subject: subject,
    p_body: body,
    p_category: category,
    p_attachment_urls: JSON.stringify(attachmentUrls),
  });
  if (error) return { success: false, error: error.message };
  return (data as TicketOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function getMyTickets(limit = 50, offset = 0): Promise<SupportTicket[]> {
  const { data, error } = await supabase.rpc('get_my_tickets', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as SupportTicket[];
}

export async function getTicketDetail(ticketId: string): Promise<TicketDetail | null> {
  const { data, error } = await supabase.rpc('get_ticket_detail', {
    p_ticket_id: ticketId,
  });
  if (error || !data) return null;
  return data as TicketDetail;
}

// ─── Reply ──────────────────────────────────────────────────────────────────

export async function replyToTicket(
  ticketId: string,
  body: string,
  attachmentUrls: string[] = []
): Promise<TicketOperationResult> {
  const { data, error } = await supabase.rpc('reply_to_ticket', {
    p_ticket_id: ticketId,
    p_body: body,
    p_attachment_urls: JSON.stringify(attachmentUrls),
  });
  if (error) return { success: false, error: error.message };
  return (data as TicketOperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Admin: List / Status / Assign ──────────────────────────────────────────

export async function getAllTickets(
  status?: TicketStatus | null,
  category?: SupportCategory | null,
  limit = 50,
  offset = 0
): Promise<SupportTicket[]> {
  const { data, error } = await supabase.rpc('get_all_tickets', {
    p_status: status ?? null,
    p_category: category ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as SupportTicket[];
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus
): Promise<TicketOperationResult> {
  const { data, error } = await supabase.rpc('update_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
  });
  if (error) return { success: false, error: error.message };
  return (data as TicketOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function assignTicket(
  ticketId: string,
  adminId: string
): Promise<TicketOperationResult> {
  const { data, error } = await supabase.rpc('assign_ticket', {
    p_ticket_id: ticketId,
    p_admin_id: adminId,
  });
  if (error) return { success: false, error: error.message };
  return (data as TicketOperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Attachment Upload ──────────────────────────────────────────────────────

export async function uploadTicketAttachment(
  userId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<{ url: string | null; error: string | null }> {
  const path = `${userId}/${Date.now()}-${fileName}`;
  try {
    const resp = await fetch(fileUri);
    const blob = await resp.blob();
    const { error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(path, blob, { contentType: mimeType, upsert: false });
    if (uploadError) return { url: null, error: uploadError.message };
    const { data: signedData, error: signedError } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(path, 3600);
    if (signedError || !signedData) return { url: null, error: 'Could not generate file URL.' };
    return { url: signedData.signedUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

// ─── Real-time ───────────────────────────────────────────────────────────────

export function subscribeToTicketReplies(ticketId: string, callback: () => void) {
  const channel = supabase
    .channel(`ticket:${ticketId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_ticket_replies', filter: `ticket_id=eq.${ticketId}` },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` },
      () => callback()
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function subscribeToAllTickets(callback: () => void) {
  const channel = supabase
    .channel('tickets-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_tickets' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_ticket_replies' },
      () => callback()
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTicketTime(iso: string): string {
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
