/*
# W3OD Gateway: Events, Notifications & Support — RPC functions

## Purpose
Adds all SECURITY DEFINER RPC functions for the Events, Notifications, and
Support modules. Tables were created in 20260725190000_events_notifications_support_schema.

## New Functions
- Events: create_event, update_event, rsvp_event, cancel_rsvp, check_in_event,
  mark_attendance, reward_attendees, upload_event_photo, close_event,
  get_events, get_event_detail, get_my_events, get_event_attendees
- Notifications: get_notifications, mark_notification_read, delete_notification
- Support: create_support_ticket, update_ticket_status, assign_ticket,
  reply_to_ticket, get_my_tickets, get_ticket_detail, get_all_tickets

## Security
- All functions are SECURITY DEFINER and verify auth.uid() ownership.
- Admin-only functions check role IN ('admin','super_admin').
- reward_attendees creates transactions + updates wallet balance atomically.
- reply_to_ticket notifies the other party (admin → user, or user → admin).

## Important Notes
1. QR check-in validates the event's qr_code field against the provided code.
2. reward_attendees creates individual transactions for each checked-in attendee.
3. Idempotent: functions use OR REPLACE.
*/

-- ════════════════════════════════════════════════════════════════════════════
-- EVENTS — RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_event(
  p_title text, p_description text, p_banner_url text, p_event_date timestamptz,
  p_venue text, p_online_link text, p_max_capacity integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can create events.'); END IF;
  IF BTRIM(p_title) = '' OR BTRIM(p_description) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Title and description are required.'); END IF;
  INSERT INTO public.events (title, description, banner_url, event_date, venue, online_link, max_capacity, created_by)
  VALUES (BTRIM(p_title), p_description, p_banner_url, p_event_date, COALESCE(NULLIF(BTRIM(p_venue), ''), 'Online'), p_online_link, p_max_capacity, v_me)
  RETURNING id INTO v_id;
  PERFORM public.log_admin_action('create_event', NULL, 'event', jsonb_build_object('event_id', v_id, 'title', p_title));
  RETURN jsonb_build_object('success', true, 'event_id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_event(text, text, text, timestamptz, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_event(
  p_event_id uuid, p_title text, p_description text, p_banner_url text,
  p_event_date timestamptz, p_venue text, p_online_link text, p_max_capacity integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can update events.'); END IF;
  UPDATE public.events SET
    title = COALESCE(NULLIF(BTRIM(p_title), ''), title),
    description = COALESCE(NULLIF(BTRIM(p_description), ''), description),
    banner_url = COALESCE(p_banner_url, banner_url),
    event_date = COALESCE(p_event_date, event_date),
    venue = COALESCE(NULLIF(BTRIM(p_venue), ''), venue),
    online_link = COALESCE(p_online_link, online_link),
    max_capacity = COALESCE(p_max_capacity, max_capacity)
  WHERE id = p_event_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_event(uuid, text, text, text, timestamptz, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_event public.events; v_count int;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found.'); END IF;
  IF v_event.status = 'closed' THEN RETURN jsonb_build_object('success', false, 'error', 'Event is closed.'); END IF;
  -- Check capacity
  IF v_event.max_capacity IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.event_rsvps WHERE event_id = p_event_id AND status = 'going';
    IF v_count >= v_event.max_capacity THEN
      -- Check if user already RSVP'd (re-RSVP is OK)
      PERFORM 1 FROM public.event_rsvps WHERE event_id = p_event_id AND user_id = v_me AND status = 'going';
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event is at maximum capacity.');
      END IF;
    END IF;
  END IF;
  INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES (p_event_id, v_me, 'going')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'going';
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_rsvp(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  DELETE FROM public.event_rsvps WHERE event_id = p_event_id AND user_id = v_me;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_rsvp(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_in_event(p_event_id uuid, p_qr_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_event public.events; v_rsvp boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found.'); END IF;
  IF v_event.qr_code != p_qr_code THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid QR code.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.event_rsvps WHERE event_id = p_event_id AND user_id = v_me AND status = 'going') INTO v_rsvp;
  IF NOT v_rsvp THEN RETURN jsonb_build_object('success', false, 'error', 'You must RSVP before checking in.'); END IF;
  INSERT INTO public.event_checkins (event_id, user_id, method) VALUES (p_event_id, v_me, 'qr')
  ON CONFLICT (event_id, user_id) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_in_event(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_attendance(p_event_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can mark attendance.'); END IF;
  -- Ensure RSVP exists
  INSERT INTO public.event_rsvps (event_id, user_id, status) VALUES (p_event_id, p_user_id, 'going')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'going';
  INSERT INTO public.event_checkins (event_id, user_id, checked_in_by, method) VALUES (p_event_id, p_user_id, v_me, 'manual')
  ON CONFLICT (event_id, user_id) DO UPDATE SET checked_in_by = v_me, method = 'manual';
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_attendance(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reward_attendees(p_event_id uuid, p_w3od_amount numeric, p_xp_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_role text; v_event public.events;
  v_attendee record; v_ref text; v_receipt text; v_count int := 0;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can reward attendees.'); END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found.'); END IF;
  IF p_w3od_amount <= 0 AND p_xp_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Reward amount must be greater than zero.'); END IF;

  FOR v_attendee IN
    SELECT c.user_id, p.username, p.display_name FROM public.event_checkins c
    JOIN public.profiles p ON p.id = c.user_id WHERE c.event_id = p_event_id
  LOOP
    -- W3OD Balance reward
    IF p_w3od_amount > 0 THEN
      v_ref := 'EVT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      v_receipt := 'RCP-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      UPDATE public.wallets SET balance = balance + p_w3od_amount, lifetime_earned = lifetime_earned + p_w3od_amount WHERE user_id = v_attendee.user_id;
      INSERT INTO public.transactions (reference, receiver_id, amount, type, status, description)
      VALUES (v_ref, v_attendee.user_id, p_w3od_amount, 'reward', 'completed', 'Event reward: ' || v_event.title);
      INSERT INTO public.reward_receipts (user_id, campaign_id, w3od_amount, xp_amount, transaction_reference, receipt_number)
      VALUES (v_attendee.user_id, NULL, p_w3od_amount, p_xp_amount, v_ref, v_receipt);
    END IF;

    -- XP reward
    IF p_xp_amount > 0 THEN
      UPDATE public.profiles SET xp = xp + p_xp_amount WHERE id = v_attendee.user_id;
    END IF;

    -- Notify attendee
    PERFORM public.create_notification(
      v_attendee.user_id,
      'Event Reward Received',
      COALESCE(
        CASE WHEN p_w3od_amount > 0 AND p_xp_amount > 0 THEN 'You received ' || p_w3od_amount || ' W3OD and ' || p_xp_amount || ' XP for attending "' || v_event.title || '"'
             WHEN p_w3od_amount > 0 THEN 'You received ' || p_w3od_amount || ' W3OD for attending "' || v_event.title || '"'
             ELSE 'You received ' || p_xp_amount || ' XP for attending "' || v_event.title || '"'
        END, 'Event reward received'
      ),
      'campaign', 'lime', 'award',
      jsonb_build_object('event_id', p_event_id, 'w3od_amount', p_w3od_amount, 'xp_amount', p_xp_amount)
    );

    v_count := v_count + 1;
  END LOOP;

  PERFORM public.log_admin_action('reward_attendees', NULL, 'event', jsonb_build_object('event_id', p_event_id, 'count', v_count, 'w3od', p_w3od_amount, 'xp', p_xp_amount));
  RETURN jsonb_build_object('success', true, 'rewarded_count', v_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.reward_attendees(uuid, numeric, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.upload_event_photo(p_event_id uuid, p_photo_url text, p_caption text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can upload event photos.'); END IF;
  IF p_photo_url IS NULL OR BTRIM(p_photo_url) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Photo URL is required.'); END IF;
  INSERT INTO public.event_photos (event_id, photo_url, caption, uploaded_by)
  VALUES (p_event_id, p_photo_url, p_caption, v_me) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'photo_id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.upload_event_photo(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can close events.'); END IF;
  UPDATE public.events SET status = 'closed' WHERE id = p_event_id;
  PERFORM public.log_admin_action('close_event', NULL, 'event', jsonb_build_object('event_id', p_event_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_event(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_events(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'title', e.title, 'description', e.description, 'banner_url', e.banner_url,
      'event_date', e.event_date, 'venue', e.venue, 'online_link', e.online_link,
      'max_capacity', e.max_capacity, 'status', e.status, 'created_at', e.created_at,
      'rsvp_count', (SELECT count(*) FROM public.event_rsvps WHERE event_id = e.id AND status = 'going'),
      'checkin_count', (SELECT count(*) FROM public.event_checkins WHERE event_id = e.id),
      'my_rsvp', COALESCE((SELECT status FROM public.event_rsvps WHERE event_id = e.id AND user_id = v_me), null),
      'my_checkin', EXISTS(SELECT 1 FROM public.event_checkins WHERE event_id = e.id AND user_id = v_me)
    ) AS jsonb
    FROM public.events e
    WHERE (p_status IS NULL OR e.status = p_status)
    ORDER BY e.event_date DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_events(text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_detail(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_event record; v_role text; v_is_admin boolean;
  v_rsvps jsonb; v_checkins jsonb; v_photos jsonb; v_my_rsvp text; v_my_checkin boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Event not found.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  v_is_admin := v_role IN ('admin','super_admin');

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_rsvps FROM (
    SELECT jsonb_build_object('user_id', r.user_id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'status', r.status) AS jsonb
    FROM public.event_rsvps r JOIN public.profiles p ON p.id = r.user_id WHERE r.event_id = p_event_id AND r.status = 'going'
    ORDER BY r.created_at ASC
  ) sub;

  -- Only admin sees full checkin list
  IF v_is_admin THEN
    SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_checkins FROM (
      SELECT jsonb_build_object('user_id', c.user_id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'method', c.method, 'checked_in_at', c.created_at) AS jsonb
      FROM public.event_checkins c JOIN public.profiles p ON p.id = c.user_id WHERE c.event_id = p_event_id
      ORDER BY c.created_at ASC
    ) sub;
  ELSE
    v_checkins := '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_photos FROM (
    SELECT jsonb_build_object('id', ph.id, 'photo_url', ph.photo_url, 'caption', ph.caption, 'created_at', ph.created_at) AS jsonb
    FROM public.event_photos ph WHERE ph.event_id = p_event_id ORDER BY ph.created_at DESC
  ) sub;

  SELECT status INTO v_my_rsvp FROM public.event_rsvps WHERE event_id = p_event_id AND user_id = v_me;
  SELECT EXISTS(SELECT 1 FROM public.event_checkins WHERE event_id = p_event_id AND user_id = v_me) INTO v_my_checkin;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_event.id, 'title', v_event.title, 'description', v_event.description,
    'banner_url', v_event.banner_url, 'event_date', v_event.event_date, 'venue', v_event.venue,
    'online_link', v_event.online_link, 'max_capacity', v_event.max_capacity,
    'qr_code', CASE WHEN v_is_admin THEN v_event.qr_code ELSE null END,
    'status', v_event.status, 'created_at', v_event.created_at,
    'rsvp_count', (SELECT count(*) FROM public.event_rsvps WHERE event_id = p_event_id AND status = 'going'),
    'checkin_count', (SELECT count(*) FROM public.event_checkins WHERE event_id = p_event_id),
    'rsvps', v_rsvps, 'checkins', v_checkins, 'photos', v_photos,
    'my_rsvp', v_my_rsvp, 'my_checkin', v_my_checkin,
    'is_admin', v_is_admin
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_detail(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_events(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'title', e.title, 'description', e.description, 'banner_url', e.banner_url,
      'event_date', e.event_date, 'venue', e.venue, 'online_link', e.online_link,
      'status', e.status, 'my_rsvp', r.status, 'my_checkin', EXISTS(SELECT 1 FROM public.event_checkins WHERE event_id = e.id AND user_id = v_me)
    ) AS jsonb
    FROM public.event_rsvps r JOIN public.events e ON e.id = r.event_id
    WHERE r.user_id = v_me AND r.status = 'going'
    ORDER BY e.event_date DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_events(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'user_id', c.user_id, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'method', c.method, 'checked_in_at', c.created_at,
      'has_rsvp', EXISTS(SELECT 1 FROM public.event_rsvps WHERE event_id = p_event_id AND user_id = c.user_id AND status = 'going')
    ) AS jsonb
    FROM public.event_checkins c JOIN public.profiles p ON p.id = c.user_id WHERE c.event_id = p_event_id
    ORDER BY c.created_at ASC
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_attendees(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS — RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_notifications(p_category text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', n.id, 'title', n.title, 'body', n.body, 'type', n.type,
      'category', n.category, 'tone', n.tone, 'icon', n.icon, 'read', n.read,
      'metadata', n.metadata, 'created_at', n.created_at
    ) AS jsonb
    FROM public.notifications n
    WHERE n.user_id = v_me AND (p_category IS NULL OR n.category = p_category)
    ORDER BY n.created_at DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_notifications(text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.notifications SET read = true WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_notification(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.notifications WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_notification(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- SUPPORT — RPC FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_subject text, p_body text, p_category text, p_attachment_urls jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF BTRIM(p_subject) = '' OR BTRIM(p_body) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Subject and description are required.'); END IF;
  INSERT INTO public.support_tickets (user_id, subject, body, category, attachment_urls, status, priority)
  VALUES (v_me, BTRIM(p_subject), p_body, COALESCE(NULLIF(BTRIM(p_category), ''), 'other'), p_attachment_urls, 'open', 'normal')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'ticket_id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_ticket_status(p_ticket_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_owner uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can change ticket status.'); END IF;
  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Ticket not found.'); END IF;
  UPDATE public.support_tickets SET status = p_status, updated_at = now() WHERE id = p_ticket_id;
  PERFORM public.create_notification(v_owner, 'Ticket Status Updated',
    'Your support ticket status has been updated to: ' || p_status,
    'system', 'cyan', 'life-buoy', jsonb_build_object('ticket_id', p_ticket_id, 'status', p_status));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_ticket_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_ticket(p_ticket_id uuid, p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_owner uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can assign tickets.'); END IF;
  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Ticket not found.'); END IF;
  UPDATE public.support_tickets SET assigned_to = p_admin_id, status = 'in_progress', updated_at = now() WHERE id = p_ticket_id;
  PERFORM public.create_notification(v_owner, 'Ticket Assigned',
    'Your support ticket has been assigned to an admin and is now in progress.',
    'system', 'cyan', 'life-buoy', jsonb_build_object('ticket_id', p_ticket_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.assign_ticket(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reply_to_ticket(
  p_ticket_id uuid, p_body text, p_attachment_urls jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_role text; v_ticket record; v_is_admin boolean; v_other uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF BTRIM(p_body) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Reply body is required.'); END IF;
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Ticket not found.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  v_is_admin := v_role IN ('admin','super_admin');
  -- Validate access: owner or admin
  IF v_ticket.user_id != v_me AND NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized.'); END IF;

  INSERT INTO public.support_ticket_replies (ticket_id, author_id, body, is_admin_reply, attachment_urls)
  VALUES (p_ticket_id, v_me, p_body, v_is_admin, p_attachment_urls);

  -- Update ticket status
  IF v_is_admin THEN
    UPDATE public.support_tickets SET status = 'waiting_for_user', updated_at = now() WHERE id = p_ticket_id;
    v_other := v_ticket.user_id;
  ELSE
    UPDATE public.support_tickets SET status = 'in_progress', updated_at = now() WHERE id = p_ticket_id;
    v_other := v_ticket.assigned_to;
    IF v_other IS NULL THEN
      -- Notify all admins (just pick one — in practice, use a broadcast)
      SELECT id INTO v_other FROM public.profiles WHERE role IN ('admin','super_admin') ORDER BY created_at ASC LIMIT 1;
    END IF;
  END IF;

  -- Notify the other party
  IF v_other IS NOT NULL THEN
    PERFORM public.create_notification(v_other,
      CASE WHEN v_is_admin THEN 'Support Reply' ELSE 'Ticket Reply' END,
      CASE WHEN v_is_admin THEN 'Admin replied to your support ticket.' ELSE 'A member replied to a support ticket.' END,
      'system', 'cyan', 'life-buoy', jsonb_build_object('ticket_id', p_ticket_id));
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_tickets(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', t.id, 'subject', t.subject, 'body', t.body, 'status', t.status,
      'category', t.category, 'priority', t.priority, 'attachment_urls', t.attachment_urls,
      'created_at', t.created_at, 'updated_at', t.updated_at,
      'assigned_to', t.assigned_to,
      'reply_count', (SELECT count(*) FROM public.support_ticket_replies WHERE ticket_id = t.id)
    ) AS jsonb
    FROM public.support_tickets t WHERE t.user_id = v_me
    ORDER BY t.updated_at DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_tickets(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ticket_detail(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_role text; v_ticket record; v_is_admin boolean;
  v_replies jsonb;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Ticket not found.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  v_is_admin := v_role IN ('admin','super_admin');
  IF v_ticket.user_id != v_me AND NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized.'); END IF;

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_replies FROM (
    SELECT jsonb_build_object(
      'id', r.id, 'author_id', r.author_id, 'body', r.body,
      'is_admin_reply', r.is_admin_reply, 'attachment_urls', r.attachment_urls,
      'created_at', r.created_at, 'author_username', p.username, 'author_display_name', p.display_name,
      'author_avatar_url', p.avatar_url
    ) AS jsonb
    FROM public.support_ticket_replies r JOIN public.profiles p ON p.id = r.author_id
    WHERE r.ticket_id = p_ticket_id ORDER BY r.created_at ASC
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_ticket.id, 'subject', v_ticket.subject, 'body', v_ticket.body,
    'status', v_ticket.status, 'category', v_ticket.category, 'priority', v_ticket.priority,
    'attachment_urls', v_ticket.attachment_urls, 'created_at', v_ticket.created_at,
    'updated_at', v_ticket.updated_at, 'assigned_to', v_ticket.assigned_to,
    'is_admin', v_is_admin, 'replies', v_replies
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ticket_detail(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_all_tickets(
  p_status text DEFAULT NULL, p_category text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', t.id, 'subject', t.subject, 'body', t.body, 'status', t.status,
      'category', t.category, 'priority', t.priority, 'attachment_urls', t.attachment_urls,
      'created_at', t.created_at, 'updated_at', t.updated_at,
      'user_id', t.user_id, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'email', p.email,
      'assigned_to', t.assigned_to,
      'reply_count', (SELECT count(*) FROM public.support_ticket_replies WHERE ticket_id = t.id)
    ) AS jsonb
    FROM public.support_tickets t JOIN public.profiles p ON p.id = t.user_id
    WHERE (p_status IS NULL OR t.status = p_status) AND (p_category IS NULL OR t.category = p_category)
    ORDER BY t.updated_at DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_all_tickets(text, text, int, int) TO authenticated;
