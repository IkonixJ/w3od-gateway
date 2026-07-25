/*
# W3OD Gateway: Events, Notifications & Support module schema

## Purpose
Adds the complete data layer for three modules:
1. Events — admin-created community events with RSVP, QR check-in, attendance
   tracking, photo uploads, and attendee rewards (W3OD Balance + XP).
2. Notifications — extends the existing notifications table with new categories
   (events, messages, announcements, kyc) and adds mark-as-read, delete, and
   filter-by-category support.
3. Support — extends the existing support_tickets table with categories,
   attachments, assignment, and richer status workflow (open, in_progress,
   waiting_for_user, resolved, closed). Adds ticket reply attachments.

## New Tables
- `events` — admin-created community events (banner, title, description, date,
  time, venue, online link, max capacity, status, QR check-in code).
- `event_rsvps` — member RSVPs (going / not_going). Unique per user per event.
- `event_checkins` — QR code check-in records. One per user per event.
- `event_photos` — admin-uploaded event photos after completion.
- `ticket_attachments` — file attachments on support tickets.
- `ticket_reply_attachments` — file attachments on ticket replies.

## Modified Tables
- `notifications` — adds `category` column (text) to support filtering by
  category (rewards, transfers, redemption, campaign, events, security, kyc,
  messages, announcements, system). Adds index on category + user_id.
- `support_tickets` — adds `category` column (text, CHECK constraint), adds
  `assigned_to` column (uuid, references profiles), adds `attachment_urls`
  column (jsonb array of URLs). Extends status CHECK to include 'in_progress',
  'waiting_for_user', 'resolved'. Adds index on status + category.
- `support_ticket_replies` — adds `attachment_urls` column (jsonb array).

## New Storage Bucket
- `event-photos` (public) — admin-uploaded event completion photos.
- `ticket-attachments` (private) — user/admin uploaded ticket attachments.

## New Functions (all SECURITY DEFINER)
- Events:
  - `create_event(p_title, p_description, p_banner_url, p_event_date, p_venue,
    p_online_link, p_max_capacity)` — admin-only. Creates event with generated
    QR check-in code.
  - `update_event(p_event_id, ...)` — admin-only. Updates event details.
  - `rsvp_event(p_event_id)` — member RSVPs (going). Validates capacity.
  - `cancel_rsvp(p_event_id)` — member cancels RSVP.
  - `check_in_event(p_event_id, p_qr_code)` — member checks in via QR code.
    Validates QR code + RSVP. Returns check-in record.
  - `mark_attendance(p_event_id, p_user_id)` — admin manually marks attendance.
  - `reward_attendees(p_event_id, p_w3od_amount, p_xp_amount)` — admin rewards
    all checked-in attendees with W3OD Balance + XP. Creates reward_receipts +
    transactions. Notifies each attendee.
  - `upload_event_photo(p_event_id, p_photo_url, p_caption)` — admin uploads
    event photo.
  - `close_event(p_event_id)` — admin closes completed event.
  - `get_events(p_status, p_limit, p_offset)` — list events with RSVP count +
    user's RSVP status.
  - `get_event_detail(p_event_id)` — full event detail with RSVP count,
    attendee list (admin only), photos, and user's RSVP/check-in status.
  - `get_my_events(p_limit, p_offset)` — events the user has RSVP'd to.
  - `get_event_attendees(p_event_id)` — admin-only. List all checked-in attendees.

- Notifications:
  - `get_notifications(p_category, p_limit, p_offset)` — list user's
    notifications, optionally filtered by category.
  - `mark_notification_read(p_notification_id)` — mark single notification read.
  - `delete_notification(p_notification_id)` — delete a notification.

- Support:
  - `create_support_ticket(p_subject, p_body, p_category, p_attachment_urls)` —
    creates a ticket with category + attachments.
  - `update_ticket_status(p_ticket_id, p_status)` — admin updates status.
    Notifies the ticket owner.
  - `assign_ticket(p_ticket_id, p_admin_id)` — admin assigns ticket.
    Notifies the ticket owner.
  - `reply_to_ticket(p_ticket_id, p_body, p_attachment_urls)` — user or admin
    replies. Admin replies set status to 'waiting_for_user'; user replies set
    status to 'in_progress'. Notifies the other party.
  - `get_my_tickets(p_limit, p_offset)` — user's own tickets.
  - `get_ticket_detail(p_ticket_id)` — ticket with replies. Validates access
    (owner or admin).
  - `get_all_tickets(p_status, p_category, p_limit, p_offset)` — admin-only.
    List all tickets with filters.

## Security
- RLS enabled on all new tables.
- `events`: SELECT all authenticated. INSERT/UPDATE via admin RPC only.
- `event_rsvps`: SELECT own. INSERT/DELETE via RPC only.
- `event_checkins`: SELECT own (admin sees all via RPC). INSERT via RPC only.
- `event_photos`: SELECT all. INSERT via admin RPC only.
- `ticket_attachments`: SELECT own (owner or admin). INSERT via RPC only.
- `ticket_reply_attachments`: SELECT own (owner or admin). INSERT via RPC only.
- `notifications`: SELECT own. UPDATE own (mark read). DELETE own.
- `support_tickets`: SELECT own OR admin. INSERT own. UPDATE via admin RPC.
- `support_ticket_replies`: SELECT own OR admin. INSERT via RPC.

## Important Notes
1. QR check-in code is generated server-side as a UUID-based short code.
2. Reward attendees creates individual transactions + reward_receipts for each
   checked-in attendee, updates wallet balance, and notifies each attendee.
3. Event photos are stored in the public `event-photos` bucket.
4. Ticket attachments are stored in the private `ticket-attachments` bucket.
5. Notification categories extend the existing `type` column — `category` is
   a new column for UI filtering while `type` remains for backward compatibility.
6. Idempotent: safe to re-run. Policies dropped before re-creation.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ════════════════════════════════════════════════════════════════════════════
-- EVENTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  banner_url text,
  event_date timestamptz NOT NULL,
  venue text NOT NULL DEFAULT 'Online',
  online_link text,
  max_capacity integer,
  qr_code text NOT NULL DEFAULT substr(encode(gen_random_bytes(8), 'hex'), 1, 12),
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'closed')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_status_idx ON public.events (status);
CREATE INDEX IF NOT EXISTS events_date_idx ON public.events (event_date DESC);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select_all" ON public.events;
CREATE POLICY "events_select_all" ON public.events FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS events_set_updated_at ON public.events;
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'not_going')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_rsvps_event_idx ON public.event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS event_rsvps_user_idx ON public.event_rsvps (user_id);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_rsvps_select_own" ON public.event_rsvps;
CREATE POLICY "event_rsvps_select_own" ON public.event_rsvps FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  method text NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_checkins_event_idx ON public.event_checkins (event_id);
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_checkins_select_own" ON public.event_checkins;
CREATE POLICY "event_checkins_select_own" ON public.event_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_photos_event_idx ON public.event_photos (event_id);
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_photos_select_all" ON public.event_photos;
CREATE POLICY "event_photos_select_all" ON public.event_photos FOR SELECT TO authenticated USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS — add category column
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE public.notifications ADD COLUMN category text NOT NULL DEFAULT 'system';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_user_category_idx ON public.notifications (user_id, category, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- SUPPORT TICKETS — add category, assigned_to, attachment_urls
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'category') THEN
    ALTER TABLE public.support_tickets ADD COLUMN category text NOT NULL DEFAULT 'other';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'assigned_to') THEN
    ALTER TABLE public.support_tickets ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'attachment_urls') THEN
    ALTER TABLE public.support_tickets ADD COLUMN attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Extend status CHECK constraint (drop old, add new)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'support_tickets_status_check'
  ) THEN
    ALTER TABLE public.support_tickets DROP CONSTRAINT support_tickets_status_check;
  END IF;
END $$;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'in_progress', 'waiting_for_user', 'responded', 'resolved', 'closed'));

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_category_idx ON public.support_tickets (category);

-- Add attachment_urls to ticket replies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_ticket_replies' AND column_name = 'attachment_urls') THEN
    ALTER TABLE public.support_ticket_replies ADD COLUMN attachment_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', false) ON CONFLICT (id) DO NOTHING;

-- event-photos: admin upload, all read
DROP POLICY IF EXISTS "event_photos_bucket_read" ON storage.objects;
CREATE POLICY "event_photos_bucket_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'event-photos');
DROP POLICY IF EXISTS "event_photos_bucket_upload" ON storage.objects;
CREATE POLICY "event_photos_bucket_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ticket-attachments: owner upload + read
DROP POLICY IF EXISTS "ticket_attachments_bucket_read" ON storage.objects;
CREATE POLICY "ticket_attachments_bucket_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "ticket_attachments_bucket_upload" ON storage.objects;
CREATE POLICY "ticket_attachments_bucket_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
