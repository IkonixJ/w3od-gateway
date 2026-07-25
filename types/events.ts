// Events module data shapes.

export type EventStatus = 'upcoming' | 'live' | 'completed' | 'closed';
export type RSVPStatus = 'going' | 'not_going';
export type CheckInMethod = 'qr' | 'manual';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  banner_url: string | null;
  event_date: string;
  venue: string;
  online_link: string | null;
  max_capacity: number | null;
  status: EventStatus;
  created_at: string;
  rsvp_count: number;
  checkin_count: number;
  my_rsvp: RSVPStatus | null;
  my_checkin: boolean;
}

export interface EventDetail {
  success: boolean;
  error?: string;
  id: string;
  title: string;
  description: string;
  banner_url: string | null;
  event_date: string;
  venue: string;
  online_link: string | null;
  max_capacity: number | null;
  qr_code: string | null;
  status: EventStatus;
  created_at: string;
  rsvp_count: number;
  checkin_count: number;
  rsvps: EventRSVP[];
  checkins: EventCheckIn[];
  photos: EventPhoto[];
  my_rsvp: RSVPStatus | null;
  my_checkin: boolean;
  is_admin: boolean;
}

export interface EventRSVP {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: RSVPStatus;
}

export interface EventCheckIn {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  method: CheckInMethod;
  checked_in_at: string;
  has_rsvp: boolean;
}

export interface EventPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export interface MyEvent {
  id: string;
  title: string;
  description: string;
  banner_url: string | null;
  event_date: string;
  venue: string;
  online_link: string | null;
  status: EventStatus;
  my_rsvp: RSVPStatus;
  my_checkin: boolean;
}

export interface EventOperationResult {
  success: boolean;
  error?: string;
  event_id?: string;
  photo_id?: string;
  rewarded_count?: number;
}
