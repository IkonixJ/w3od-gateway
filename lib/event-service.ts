import { supabase } from '@/lib/supabase';
import type {
  CommunityEvent,
  EventDetail,
  EventOperationResult,
  MyEvent,
} from '@/types/events';

// ─── Event CRUD ─────────────────────────────────────────────────────────────

export async function getEvents(
  status?: string,
  limit = 50,
  offset = 0
): Promise<CommunityEvent[]> {
  const { data, error } = await supabase.rpc('get_events', {
    p_status: status ?? null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as CommunityEvent[];
}

export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  const { data, error } = await supabase.rpc('get_event_detail', {
    p_event_id: eventId,
  });
  if (error || !data) return null;
  return data as EventDetail;
}

export async function getMyEvents(limit = 50, offset = 0): Promise<MyEvent[]> {
  const { data, error } = await supabase.rpc('get_my_events', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error || !data) return [];
  return data as MyEvent[];
}

export async function getEventAttendees(eventId: string): Promise<EventDetail['checkins']> {
  const { data, error } = await supabase.rpc('get_event_attendees', {
    p_event_id: eventId,
  });
  if (error || !data) return [];
  return data as EventDetail['checkins'];
}

// ─── Admin: Create / Update / Close ──────────────────────────────────────────

export async function createEvent(
  title: string,
  description: string,
  bannerUrl: string | null,
  eventDate: string,
  venue: string,
  onlineLink: string | null,
  maxCapacity: number | null
): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('create_event', {
    p_title: title,
    p_description: description,
    p_banner_url: bannerUrl,
    p_event_date: eventDate,
    p_venue: venue,
    p_online_link: onlineLink,
    p_max_capacity: maxCapacity,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function updateEvent(
  eventId: string,
  title: string,
  description: string,
  bannerUrl: string | null,
  eventDate: string,
  venue: string,
  onlineLink: string | null,
  maxCapacity: number | null
): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('update_event', {
    p_event_id: eventId,
    p_title: title,
    p_description: description,
    p_banner_url: bannerUrl,
    p_event_date: eventDate,
    p_venue: venue,
    p_online_link: onlineLink,
    p_max_capacity: maxCapacity,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function closeEvent(eventId: string): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('close_event', {
    p_event_id: eventId,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Member: RSVP / Cancel / Check-in ───────────────────────────────────────

export async function rsvpEvent(eventId: string): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('rsvp_event', {
    p_event_id: eventId,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function cancelRsvp(eventId: string): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('cancel_rsvp', {
    p_event_id: eventId,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function checkInEvent(
  eventId: string,
  qrCode: string
): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('check_in_event', {
    p_event_id: eventId,
    p_qr_code: qrCode,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Admin: Attendance / Rewards / Photos ────────────────────────────────────

export async function markAttendance(
  eventId: string,
  userId: string
): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('mark_attendance', {
    p_event_id: eventId,
    p_user_id: userId,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function rewardAttendees(
  eventId: string,
  w3odAmount: number,
  xpAmount: number
): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('reward_attendees', {
    p_event_id: eventId,
    p_w3od_amount: w3odAmount,
    p_xp_amount: xpAmount,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

export async function uploadEventPhoto(
  eventId: string,
  photoUrl: string,
  caption: string | null = null
): Promise<EventOperationResult> {
  const { data, error } = await supabase.rpc('upload_event_photo', {
    p_event_id: eventId,
    p_photo_url: photoUrl,
    p_caption: caption,
  });
  if (error) return { success: false, error: error.message };
  return (data as EventOperationResult) ?? { success: false, error: 'Failed.' };
}

// ─── Photo Upload to Storage ─────────────────────────────────────────────────

export async function uploadEventPhotoFile(
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
      .from('event-photos')
      .upload(path, blob, { contentType: mimeType, upsert: false });
    if (uploadError) return { url: null, error: uploadError.message };
    const { data: publicData } = supabase.storage.from('event-photos').getPublicUrl(path);
    return { url: publicData.publicUrl, error: null };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' };
  }
}

// ─── Real-time ───────────────────────────────────────────────────────────────

export function subscribeToEvents(callback: () => void) {
  const channel = supabase
    .channel('events-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_rsvps' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_checkins' },
      () => callback()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_photos' },
      () => callback()
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function isEventPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function isEventLive(iso: string): boolean {
  const now = Date.now();
  const eventTime = new Date(iso).getTime();
  return eventTime <= now && eventTime > now - 4 * 60 * 60 * 1000; // within 4 hours
}
