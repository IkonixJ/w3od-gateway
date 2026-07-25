/*
# W3OD Gateway: Admin Dashboard schema (v3 — fixed aggregation syntax)
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended') THEN
    ALTER TABLE public.profiles ADD COLUMN suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'profiles' AND constraint_name = 'profiles_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('member', 'moderator', 'admin', 'super_admin'));
  END IF;
END $$;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_admin_idx ON public.audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON public.audit_logs (target_user_id);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- INVITE CODES
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invite_codes_code_idx ON public.invite_codes (code);
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invite_codes_select_admin" ON public.invite_codes;
CREATE POLICY "invite_codes_select_admin" ON public.invite_codes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'in_app' CHECK (type IN ('push', 'in_app', 'popup')),
  scheduled_at timestamptz,
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS announcements_sent_idx ON public.announcements (sent, scheduled_at);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_select_admin" ON public.announcements;
CREATE POLICY "announcements_select_admin" ON public.announcements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'responded', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_select_own_or_admin" ON public.support_tickets;
CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
DROP POLICY IF EXISTS "tickets_insert_own" ON public.support_tickets;
CREATE POLICY "tickets_insert_own" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER tickets_set_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUPPORT TICKET REPLIES
CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS replies_ticket_idx ON public.support_ticket_replies (ticket_id, created_at);
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "replies_select_own_or_admin" ON public.support_ticket_replies;
CREATE POLICY "replies_select_own_or_admin" ON public.support_ticket_replies FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = support_ticket_replies.ticket_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- ADMIN NOTES
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notes_user_idx ON public.admin_notes (user_id, created_at DESC);
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_notes_select_own_or_admin" ON public.admin_notes;
CREATE POLICY "admin_notes_select_own_or_admin" ON public.admin_notes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- ─── Helper functions ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_target_user_id uuid, p_target_type text, p_details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (admin_id, action, target_user_id, target_type, details)
  VALUES (auth.uid(), p_action, p_target_user_id, p_target_type, p_details);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role IN ('admin', 'super_admin');
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role = 'super_admin';
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ─── get_admin_dashboard_stats ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin boolean; v_total int; v_verified int; v_pkyc int; v_pred int;
  v_active int; v_rewards numeric; v_today int; v_tickets int; v_online int;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('error', 'Admin access required.'); END IF;
  SELECT count(*) INTO v_total FROM public.profiles;
  SELECT count(*) INTO v_verified FROM public.profiles WHERE kyc_status = 'verified';
  SELECT count(*) INTO v_pkyc FROM public.profiles WHERE kyc_status = 'pending';
  SELECT count(*) INTO v_pred FROM public.redemptions WHERE status = 'pending';
  SELECT count(*) INTO v_active FROM public.campaigns WHERE status = 'active';
  SELECT COALESCE(sum(amount), 0) INTO v_rewards FROM public.transactions WHERE type = 'reward' AND status = 'completed';
  SELECT count(*) INTO v_today FROM public.profiles WHERE created_at >= CURRENT_DATE;
  SELECT count(*) INTO v_tickets FROM public.support_tickets WHERE status = 'open';
  SELECT count(*) INTO v_online FROM public.profiles WHERE last_active_at > now() - interval '15 minutes';
  RETURN jsonb_build_object('total_members', v_total, 'verified_members', v_verified, 'pending_kyc', v_pkyc,
    'pending_redemptions', v_pred, 'active_campaigns', v_active, 'total_rewards', v_rewards,
    'today_members', v_today, 'open_tickets', v_tickets, 'online_members', v_online);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

-- ─── get_recent_activity ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_recent_activity(p_limit int DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
    SELECT jsonb_build_object('type', 'registration', 'user_id', p.id, 'username', p.username,
      'display_name', p.display_name, 'avatar_url', p.avatar_url, 'created_at', p.created_at,
      'description', COALESCE(p.display_name, p.username, 'A member') || ' joined W3OD Gateway') AS jsonb
    FROM public.profiles p ORDER BY p.created_at DESC LIMIT p_limit
  ) t), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_recent_activity(int) TO authenticated;

-- ─── search_members ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_members(p_query text, p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;
  IF BTRIM(p_query) = '' THEN
    RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
      SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name,
        'avatar_url', p.avatar_url, 'email', p.email, 'role', p.role, 'kyc_status', p.kyc_status,
        'suspended', p.suspended, 'xp', p.xp, 'created_at', p.created_at, 'last_active_at', p.last_active_at) AS jsonb
      FROM public.profiles p ORDER BY p.created_at DESC LIMIT p_limit
    ) t), '[]'::jsonb);
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
    SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name,
      'avatar_url', p.avatar_url, 'email', p.email, 'role', p.role, 'kyc_status', p.kyc_status,
      'suspended', p.suspended, 'xp', p.xp, 'created_at', p.created_at, 'last_active_at', p.last_active_at) AS jsonb
    FROM public.profiles p
    WHERE p.username ILIKE '%' || p_query || '%' OR p.display_name ILIKE '%' || p_query || '%' OR p.email ILIKE '%' || p_query || '%'
    ORDER BY p.created_at DESC LIMIT p_limit
  ) t), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_members(text, int) TO authenticated;

-- ─── get_member_detail ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_member_detail(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin boolean; v_profile record; v_wallet record; v_badges jsonb; v_parts jsonb; v_notes jsonb;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('error', 'Admin access required.'); END IF;
  SELECT id, email, display_name, username, full_name, phone, avatar_url, role, kyc_status, xp,
    reputation, bio, email_verified, suspended, login_locked_until, last_active_at, created_at
  INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Member not found.'); END IF;
  SELECT user_id, account_number, balance, pending_balance, lifetime_earned, lifetime_redeemed, created_at
  INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'icon', b.icon,
    'rarity', b.rarity, 'color', b.color, 'awarded_at', ub.awarded_at) ORDER BY ub.awarded_at DESC), '[]'::jsonb)
  INTO v_badges FROM public.user_badges ub JOIN public.badges b ON b.id = ub.badge_id WHERE ub.user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', cp.id, 'campaign_title', c.title,
    'submission_status', cp.submission_status, 'submitted_at', cp.submitted_at, 'reviewed_at', cp.reviewed_at)
    ORDER BY cp.created_at DESC), '[]'::jsonb)
  INTO v_parts FROM public.campaign_participations cp JOIN public.campaigns c ON c.id = cp.campaign_id WHERE cp.user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', an.id, 'note', an.note, 'admin_id', an.admin_id,
    'created_at', an.created_at) ORDER BY an.created_at DESC), '[]'::jsonb)
  INTO v_notes FROM public.admin_notes an WHERE an.user_id = p_user_id;
  RETURN jsonb_build_object('profile', row_to_json(v_profile), 'wallet', COALESCE(row_to_json(v_wallet), 'null'::jsonb),
    'badges', v_badges, 'participations', v_parts, 'notes', v_notes);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_detail(uuid) TO authenticated;

-- ─── suspend_member / reactivate_member ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.suspend_member(p_user_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean; v_role text;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF v_role IN ('admin', 'super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot suspend an admin.'); END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Member not found.'); END IF;
  UPDATE public.profiles SET suspended = true WHERE id = p_user_id;
  PERFORM public.log_admin_action('suspend_member', p_user_id, 'member', jsonb_build_object('reason', p_reason));
  PERFORM public.create_notification(p_user_id, 'Account Suspended', 'Your account has been suspended: ' || p_reason,
    'security', 'rose', 'security', jsonb_build_object('suspended', true));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.suspend_member(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_member(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  UPDATE public.profiles SET suspended = false WHERE id = p_user_id;
  PERFORM public.log_admin_action('reactivate_member', p_user_id, 'member', '{}'::jsonb);
  PERFORM public.create_notification(p_user_id, 'Account Reactivated', 'Your account has been reactivated. Welcome back!',
    'security', 'lime', 'security', jsonb_build_object('reactivated', true));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.reactivate_member(uuid) TO authenticated;

-- ─── add_admin_note ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_admin_note(p_user_id uuid, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  IF BTRIM(p_note) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Note cannot be empty.'); END IF;
  INSERT INTO public.admin_notes (user_id, admin_id, note) VALUES (p_user_id, auth.uid(), BTRIM(p_note));
  PERFORM public.log_admin_action('add_admin_note', p_user_id, 'member', jsonb_build_object('note', p_note));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.add_admin_note(uuid, text) TO authenticated;

-- ─── admin_credit_reward ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_credit_reward(p_user_id uuid, p_amount numeric, p_xp integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean; v_wallet public.wallets; v_ref text;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  IF p_amount < 0 OR p_xp < 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amounts cannot be negative.'); END IF;
  IF p_amount > 0 THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
    IF NOT FOUND THEN INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0) RETURNING * INTO v_wallet; END IF;
    UPDATE public.wallets SET balance = balance + p_amount WHERE user_id = p_user_id;
    v_ref := 'ADM' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    INSERT INTO public.transactions (sender_id, receiver_id, amount, type, status, description, reference)
    VALUES (NULL, p_user_id, p_amount, 'reward', 'completed', p_reason, v_ref);
  END IF;
  IF p_xp > 0 THEN UPDATE public.profiles SET xp = xp + p_xp WHERE id = p_user_id; END IF;
  PERFORM public.create_notification(p_user_id, 'Admin Reward Credited',
    'You received ' || p_amount::text || ' W3OD and ' || p_xp::text || ' XP: ' || p_reason,
    'reward', 'lime', 'reward', jsonb_build_object('amount', p_amount, 'xp', p_xp, 'reason', p_reason));
  PERFORM public.log_admin_action('credit_reward', p_user_id, 'member', jsonb_build_object('amount', p_amount, 'xp', p_xp, 'reason', p_reason));
  RETURN jsonb_build_object('success', true, 'reference', v_ref);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_credit_reward(uuid, numeric, integer, text) TO authenticated;

-- ─── admin_credit_multiple ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_credit_multiple(p_user_ids uuid[], p_amount numeric, p_xp integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    PERFORM public.admin_credit_reward(v_uid, p_amount, p_xp, p_reason);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_credit_multiple(uuid[], numeric, integer, text) TO authenticated;

-- ─── admin_credit_campaign_participants ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_credit_campaign_participants(p_campaign_id uuid, p_amount numeric, p_xp integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  FOREACH v_uid IN ARRAY ARRAY(
    SELECT user_id FROM public.campaign_participations WHERE campaign_id = p_campaign_id AND submission_status = 'approved'
  ) LOOP
    PERFORM public.admin_credit_reward(v_uid, p_amount, p_xp, p_reason);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_credit_campaign_participants(uuid, numeric, integer, text) TO authenticated;

-- ─── admin_review_redemption ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_review_redemption(p_redemption_id uuid, p_decision text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean; v_red public.redemptions;
BEGIN
  SELECT public.is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'paid') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid decision.'); END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR BTRIM(p_reason) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason required.'); END IF;
  SELECT * INTO v_red FROM public.redemptions WHERE id = p_redemption_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Redemption not found.'); END IF;
  UPDATE public.redemptions SET status = p_decision,
    processed_at = CASE WHEN p_decision IN ('approved', 'rejected', 'paid') THEN now() ELSE processed_at END
  WHERE id = p_redemption_id;
  PERFORM public.log_admin_action('review_redemption', v_red.user_id, 'redemption',
    jsonb_build_object('redemption_id', p_redemption_id, 'decision', p_decision, 'reason', p_reason));
  PERFORM public.create_notification(v_red.user_id,
    CASE WHEN p_decision = 'paid' THEN 'Payout Completed' WHEN p_decision = 'approved' THEN 'Redemption Approved' ELSE 'Redemption Rejected' END,
    CASE WHEN p_decision = 'paid' THEN 'Your redemption of ' || v_red.amount::text || ' W3OD has been paid out.'
         WHEN p_decision = 'approved' THEN 'Your redemption of ' || v_red.amount::text || ' W3OD has been approved for payout.'
         ELSE 'Your redemption was rejected: ' || p_reason END,
    'redemption', CASE WHEN p_decision = 'rejected' THEN 'rose' ELSE 'lime' END, 'reward',
    jsonb_build_object('redemption_id', p_redemption_id, 'decision', p_decision));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_redemption(uuid, text, text) TO authenticated;

-- ─── admin_bulk_approve_redemptions ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_bulk_approve_redemptions(p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  FOREACH v_id IN ARRAY p_ids LOOP
    PERFORM public.admin_review_redemption(v_id, 'approved', NULL);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_bulk_approve_redemptions(uuid[]) TO authenticated;

-- ─── admin_export_payout_list ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_export_payout_list()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
    SELECT jsonb_build_object('id', r.id, 'reference', r.reference, 'amount', r.amount,
      'account_name', r.account_name, 'account_number', r.account_number,
      'requested_at', r.requested_at, 'processing_date', r.processing_date,
      'username', p.username, 'display_name', p.display_name, 'email', p.email) AS jsonb
    FROM public.redemptions r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.status IN ('pending', 'approved') ORDER BY r.requested_at ASC
  ) t), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_export_payout_list() TO authenticated;

-- ─── Invite code RPCs ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_invite_code(p_max_uses int, p_expires_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_code text;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
  INSERT INTO public.invite_codes (code, created_by, max_uses, expires_at)
  VALUES (v_code, auth.uid(), p_max_uses, p_expires_at) RETURNING id INTO v_id;
  PERFORM public.log_admin_action('create_invite_code', NULL, 'invite_code', jsonb_build_object('code_id', v_id, 'code', v_code));
  RETURN jsonb_build_object('success', true, 'code', v_code, 'id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_invite_code(int, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.disable_invite_code(p_code_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  UPDATE public.invite_codes SET disabled = true WHERE id = p_code_id;
  PERFORM public.log_admin_action('disable_invite_code', NULL, 'invite_code', jsonb_build_object('code_id', p_code_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.disable_invite_code(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_invite_code(p_code_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  UPDATE public.invite_codes SET disabled = false WHERE id = p_code_id;
  PERFORM public.log_admin_action('reactivate_invite_code', NULL, 'invite_code', jsonb_build_object('code_id', p_code_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.reactivate_invite_code(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_invite_codes()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', c.id, 'code', c.code, 'max_uses', c.max_uses, 'used_count', c.used_count,
    'expires_at', c.expires_at, 'disabled', c.disabled, 'created_at', c.created_at,
    'created_by_username', p.username) ORDER BY c.created_at DESC)
  FROM public.invite_codes c LEFT JOIN public.profiles p ON p.id = c.created_by), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_invite_codes() TO authenticated;

-- ─── Announcement RPCs ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_announcement(p_title text, p_body text, p_type text, p_scheduled_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  IF p_type NOT IN ('push', 'in_app', 'popup') THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid type.'); END IF;
  INSERT INTO public.announcements (title, body, type, scheduled_at, created_by)
  VALUES (BTRIM(p_title), p_body, p_type, p_scheduled_at, auth.uid()) RETURNING id INTO v_id;
  PERFORM public.log_admin_action('create_announcement', NULL, 'announcement', jsonb_build_object('announcement_id', v_id, 'type', p_type));
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_announcement(text, text, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_announcements()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', a.id, 'title', a.title, 'body', a.body, 'type', a.type, 'scheduled_at', a.scheduled_at,
    'sent', a.sent, 'sent_at', a.sent_at, 'created_at', a.created_at) ORDER BY a.created_at DESC)
  FROM public.announcements a), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_announcements() TO authenticated;

CREATE OR REPLACE FUNCTION public.send_announcement(p_announcement_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ann public.announcements; v_uid uuid;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  SELECT * INTO v_ann FROM public.announcements WHERE id = p_announcement_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Announcement not found.'); END IF;
  FOR v_uid IN SELECT id FROM public.profiles WHERE suspended = false LOOP
    PERFORM public.create_notification(v_uid, v_ann.title, v_ann.body,
      'system', 'amber', 'campaign', jsonb_build_object('announcement_id', v_ann.id, 'type', v_ann.type));
  END LOOP;
  UPDATE public.announcements SET sent = true, sent_at = now() WHERE id = p_announcement_id;
  PERFORM public.log_admin_action('send_announcement', NULL, 'announcement', jsonb_build_object('announcement_id', p_announcement_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_announcement(uuid) TO authenticated;

-- ─── Support ticket RPCs ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_support_tickets(p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', t.id, 'subject', t.subject, 'body', t.body, 'status', t.status, 'priority', t.priority,
    'created_at', t.created_at, 'updated_at', t.updated_at, 'user_id', t.user_id,
    'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'email', p.email)
  ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, t.created_at DESC)
  FROM public.support_tickets t JOIN public.profiles p ON p.id = t.user_id
  WHERE p_status = 'all' OR t.status = p_status), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_support_tickets(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reply_support_ticket(p_ticket_id uuid, p_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ticket public.support_tickets; v_is_admin boolean;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Ticket not found.'); END IF;
  SELECT public.is_admin() INTO v_is_admin;
  IF v_ticket.user_id != auth.uid() AND NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized.'); END IF;
  IF BTRIM(p_body) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Reply cannot be empty.'); END IF;
  INSERT INTO public.support_ticket_replies (ticket_id, author_id, body, is_admin_reply)
  VALUES (p_ticket_id, auth.uid(), BTRIM(p_body), v_is_admin);
  UPDATE public.support_tickets SET status = CASE WHEN v_is_admin THEN 'responded' ELSE 'open' END, updated_at = now() WHERE id = p_ticket_id;
  IF v_is_admin THEN
    PERFORM public.create_notification(v_ticket.user_id, 'Support Reply',
      'Your support ticket "' || v_ticket.subject || '" has a new reply.',
      'system', 'cyan', 'security', jsonb_build_object('ticket_id', p_ticket_id));
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_support_ticket(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ticket public.support_tickets;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required.'); END IF;
  UPDATE public.support_tickets SET status = 'closed', updated_at = now() WHERE id = p_ticket_id;
  SELECT user_id INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id;
  PERFORM public.log_admin_action('close_ticket', v_ticket.user_id, 'support_ticket', jsonb_build_object('ticket_id', p_ticket_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_support_ticket(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ticket_replies(p_ticket_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.support_tickets WHERE id = p_ticket_id AND user_id = auth.uid()
  ) THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'id', r.id, 'author_id', r.author_id, 'body', r.body, 'is_admin_reply', r.is_admin_reply,
    'created_at', r.created_at, 'author_name', p.display_name, 'author_avatar', p.avatar_url)
  ORDER BY r.created_at ASC)
  FROM public.support_ticket_replies r JOIN public.profiles p ON p.id = r.author_id
  WHERE r.ticket_id = p_ticket_id), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ticket_replies(uuid) TO authenticated;

-- ─── get_audit_logs (super_admin only) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_audit_logs(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
    SELECT jsonb_build_object('id', a.id, 'action', a.action, 'target_user_id', a.target_user_id,
      'target_type', a.target_type, 'details', a.details, 'created_at', a.created_at,
      'admin_username', p.username, 'admin_display_name', p.display_name,
      'target_username', tp.username, 'target_display_name', tp.display_name) AS jsonb
    FROM public.audit_logs a
    LEFT JOIN public.profiles p ON p.id = a.admin_id
    LEFT JOIN public.profiles tp ON tp.id = a.target_user_id
    ORDER BY a.created_at DESC LIMIT p_limit OFFSET p_offset
  ) t), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(int, int) TO authenticated;

-- ─── get_analytics ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_analytics(p_metric text, p_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start date := CURRENT_DATE - p_days;
BEGIN
  IF NOT public.is_admin() THEN RETURN '[]'::jsonb; END IF;

  IF p_metric = 'member_growth' THEN
    RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d::date,
      'count', (SELECT count(*) FROM public.profiles WHERE created_at < d + 1)) ORDER BY d)
    FROM generate_series(v_start, CURRENT_DATE, '1 day'::interval) d), '[]'::jsonb);

  ELSIF p_metric = 'rewards' THEN
    RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d::date,
      'count', (SELECT count(*) FROM public.transactions WHERE type = 'reward' AND created_at >= d AND created_at < d + 1),
      'amount', COALESCE((SELECT sum(amount) FROM public.transactions WHERE type = 'reward' AND created_at >= d AND created_at < d + 1), 0)
    ) ORDER BY d) FROM generate_series(v_start, CURRENT_DATE, '1 day'::interval) d), '[]'::jsonb);

  ELSIF p_metric = 'campaign_participation' THEN
    RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
      SELECT jsonb_build_object('title', c.title, 'participants',
        (SELECT count(*) FROM public.campaign_participations WHERE campaign_id = c.id)) AS jsonb
      FROM public.campaigns c ORDER BY (SELECT count(*) FROM public.campaign_participations WHERE campaign_id = c.id) DESC LIMIT 10
    ) t), '[]'::jsonb);

  ELSIF p_metric = 'redemptions' THEN
    RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d::date,
      'count', (SELECT count(*) FROM public.redemptions WHERE requested_at >= d AND requested_at < d + 1),
      'amount', COALESCE((SELECT sum(amount) FROM public.redemptions WHERE requested_at >= d AND requested_at < d + 1), 0)
    ) ORDER BY d) FROM generate_series(v_start, CURRENT_DATE, '1 day'::interval) d), '[]'::jsonb);

  ELSIF p_metric = 'active_users' THEN
    RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d::date,
      'count', (SELECT count(*) FROM public.profiles WHERE last_active_at >= d AND last_active_at < d + 1)) ORDER BY d)
    FROM generate_series(v_start, CURRENT_DATE, '1 day'::interval) d), '[]'::jsonb);
  END IF;
  RETURN '[]'::jsonb;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_analytics(text, int) TO authenticated;
