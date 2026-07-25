/*
# W3OD Gateway: Campaigns, Rewards, XP, Badges & Leaderboard schema

## Purpose
Adds the complete data layer for the campaigns and gamification module.
Admins create campaigns with W3OD + XP rewards. Members join campaigns,
upload proof, and admins review submissions — on approval, W3OD balance,
XP, a transaction record, a notification, and a reward receipt are all
generated atomically. Badges system lets admins award achievement badges.
Leaderboard RPCs rank members by XP, contributions, earnings, and referrals
across weekly/monthly/all-time windows — wallet balances never exposed.

## New Tables
- campaigns, campaign_participations, badges, user_badges, reward_receipts
## Modified Tables
- profiles — adds referred_by uuid column for referrers leaderboard
## New Storage Bucket
- campaign-proof (private) — owner + admin scoped
## New Functions (all SECURITY DEFINER)
- create_campaign, update_campaign, end_campaign (admin)
- join_campaign, submit_campaign_proof (member)
- review_campaign_submission (admin, atomic reward crediting)
- get_my_campaigns, get_all_campaigns, get_campaign_participations
- get_my_badges, get_user_badges, award_badge, revoke_badge
- get_leaderboard(category, period)
- get_my_reward_receipts
## Security
- RLS on all tables. Campaigns + badges SELECT-all. Participations,
  user_badges, reward_receipts SELECT-own. All writes via RPCs.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add referred_by to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referred_by uuid;
  END IF;
END $$;

-- ─── CAMPAIGNS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  instructions text NOT NULL,
  banner_url text,
  reward_amount numeric NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  proof_required boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'ended')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns (status);
CREATE INDEX IF NOT EXISTS campaigns_dates_idx ON public.campaigns (start_date, end_date);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns_select_all" ON public.campaigns;
CREATE POLICY "campaigns_select_all" ON public.campaigns FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS campaigns_set_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── CAMPAIGN PARTICIPATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proof_type text,
  proof_url text,
  proof_note text,
  submission_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (submission_status IN ('not_submitted', 'submitted', 'under_review', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reward_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);
CREATE INDEX IF NOT EXISTS participations_campaign_idx ON public.campaign_participations (campaign_id);
CREATE INDEX IF NOT EXISTS participations_user_idx ON public.campaign_participations (user_id);
CREATE INDEX IF NOT EXISTS participations_status_idx ON public.campaign_participations (submission_status);
ALTER TABLE public.campaign_participations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participations_select_own" ON public.campaign_participations;
CREATE POLICY "participations_select_own" ON public.campaign_participations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS participations_set_updated_at ON public.campaign_participations;
CREATE TRIGGER participations_set_updated_at BEFORE UPDATE ON public.campaign_participations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── BADGES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  color text NOT NULL DEFAULT '#00F0FF',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT TO authenticated USING (true);
INSERT INTO public.badges (name, description, icon, rarity, color) VALUES
  ('Founding Member', 'Joined during the founding phase of W3OD Gateway', 'crown', 'legendary', '#FFB800'),
  ('Early Adopter', 'One of the first 100 members to join the platform', 'rocket', 'rare', '#00F0FF'),
  ('Campaign Champion', 'Completed 10+ campaigns successfully', 'trophy', 'epic', '#B6FF00'),
  ('Top Contributor', 'Recognized for outstanding community contributions', 'heart', 'epic', '#FF00E5'),
  ('Mentor', 'Guided new members and shared knowledge', 'graduation-cap', 'rare', '#1E90FF'),
  ('Volunteer', 'Volunteered time for community initiatives', 'hand-heart', 'common', '#00FF9C'),
  ('Speaker', 'Spoke at a W3OD community event', 'mic', 'rare', '#8A2BE2'),
  ('Trainer', 'Led a training session for the community', 'presentation', 'rare', '#FFB800'),
  ('Designer', 'Contributed design work to the platform', 'palette', 'rare', '#FF00E5'),
  ('Developer', 'Contributed code to the platform', 'code', 'rare', '#00F0FF'),
  ('Community Builder', 'Helped grow and strengthen the community', 'users', 'epic', '#B6FF00')
ON CONFLICT (name) DO NOTHING;

-- ─── USER BADGES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges (user_id);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
CREATE POLICY "user_badges_select_own" ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ─── REWARD RECEIPTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reward_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  participation_id uuid REFERENCES public.campaign_participations(id) ON DELETE SET NULL,
  w3od_amount numeric NOT NULL DEFAULT 0,
  xp_amount integer NOT NULL DEFAULT 0,
  transaction_reference text,
  receipt_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reward_receipts_user_idx ON public.reward_receipts (user_id, created_at DESC);
ALTER TABLE public.reward_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reward_receipts_select_own" ON public.reward_receipts;
CREATE POLICY "reward_receipts_select_own" ON public.reward_receipts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ─── STORAGE BUCKET: campaign-proof ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-proof', 'campaign-proof', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "proof_upload_own" ON storage.objects;
CREATE POLICY "proof_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "proof_read_own" ON storage.objects;
CREATE POLICY "proof_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "proof_read_admin" ON storage.objects;
CREATE POLICY "proof_read_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-proof' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));
DROP POLICY IF EXISTS "proof_delete_own" ON storage.objects;
CREATE POLICY "proof_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-proof' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─── create_campaign (admin-only) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_campaign(
  p_title text, p_description text, p_instructions text, p_banner_url text,
  p_reward_amount numeric, p_xp_reward integer, p_proof_required boolean,
  p_start_date timestamptz, p_end_date timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_role text;
  v_status text := 'active';
  v_campaign_id uuid;
BEGIN
  IF v_admin_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can create campaigns.');
  END IF;
  IF BTRIM(p_title) = '' OR BTRIM(p_description) = '' OR BTRIM(p_instructions) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title, description, and instructions are required.');
  END IF;
  IF p_reward_amount < 0 OR p_xp_reward < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rewards cannot be negative.');
  END IF;
  IF p_start_date IS NOT NULL AND p_start_date > now() THEN v_status := 'scheduled'; END IF;
  IF p_end_date IS NOT NULL AND p_end_date < now() THEN v_status := 'ended'; END IF;
  INSERT INTO public.campaigns (title, description, instructions, banner_url, reward_amount,
    xp_reward, proof_required, start_date, end_date, status, created_by)
  VALUES (BTRIM(p_title), p_description, p_instructions, p_banner_url, p_reward_amount,
    p_xp_reward, p_proof_required, p_start_date, p_end_date, v_status, v_admin_id)
  RETURNING id INTO v_campaign_id;
  RETURN jsonb_build_object('success', true, 'campaign_id', v_campaign_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_campaign(text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) TO authenticated;

-- ─── update_campaign (admin-only) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_campaign(
  p_campaign_id uuid, p_title text, p_description text, p_instructions text,
  p_banner_url text, p_reward_amount numeric, p_xp_reward integer,
  p_proof_required boolean, p_start_date timestamptz, p_end_date timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can update campaigns.');
  END IF;
  UPDATE public.campaigns SET title = BTRIM(p_title), description = p_description,
    instructions = p_instructions, banner_url = p_banner_url, reward_amount = p_reward_amount,
    xp_reward = p_xp_reward, proof_required = p_proof_required, start_date = p_start_date,
    end_date = p_end_date WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Campaign not found.'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_campaign(uuid, text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) TO authenticated;

-- ─── end_campaign (admin-only) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.end_campaign(p_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can end campaigns.');
  END IF;
  UPDATE public.campaigns SET status = 'ended' WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Campaign not found.'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.end_campaign(uuid) TO authenticated;

-- ─── join_campaign ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_campaign(p_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_campaign public.campaigns;
  v_existing public.campaign_participations;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Campaign not found.'); END IF;
  IF v_campaign.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This campaign is not currently active.');
  END IF;
  SELECT * INTO v_existing FROM public.campaign_participations
  WHERE campaign_id = p_campaign_id AND user_id = v_user_id;
  IF FOUND THEN RETURN jsonb_build_object('success', true, 'already_joined', true); END IF;
  INSERT INTO public.campaign_participations (campaign_id, user_id) VALUES (p_campaign_id, v_user_id);
  RETURN jsonb_build_object('success', true, 'already_joined', false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_campaign(uuid) TO authenticated;

-- ─── submit_campaign_proof ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_campaign_proof(
  p_participation_id uuid, p_proof_type text, p_proof_url text, p_proof_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_part public.campaign_participations;
BEGIN
  SELECT * INTO v_part FROM public.campaign_participations
  WHERE id = p_participation_id AND user_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Participation not found.'); END IF;
  IF v_part.submission_status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This submission has already been approved.');
  END IF;
  IF p_proof_type IS NULL OR p_proof_url IS NULL OR BTRIM(p_proof_url) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proof type and URL are required.');
  END IF;
  UPDATE public.campaign_participations
  SET proof_type = p_proof_type, proof_url = BTRIM(p_proof_url), proof_note = p_proof_note,
      submission_status = 'submitted', submitted_at = now(), rejection_reason = NULL
  WHERE id = p_participation_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_campaign_proof(uuid, text, text, text) TO authenticated;

-- ─── review_campaign_submission (admin-only, atomic reward crediting) ────
CREATE OR REPLACE FUNCTION public.review_campaign_submission(
  p_participation_id uuid, p_decision text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_role text;
  v_part public.campaign_participations;
  v_campaign public.campaigns;
  v_wallet public.wallets;
  v_reference text;
  v_receipt_no text;
BEGIN
  IF v_admin_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can review submissions.');
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision must be approved or rejected.');
  END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR BTRIM(p_reason) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'A rejection reason is required.');
  END IF;
  SELECT * INTO v_part FROM public.campaign_participations WHERE id = p_participation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Submission not found.'); END IF;
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_part.campaign_id;

  IF p_decision = 'approved' THEN
    IF v_campaign.reward_amount > 0 THEN
      SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_part.user_id;
      IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, balance) VALUES (v_part.user_id, 0) RETURNING * INTO v_wallet;
      END IF;
      UPDATE public.wallets SET balance = balance + v_campaign.reward_amount WHERE user_id = v_part.user_id;
      v_reference := 'RWD' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      INSERT INTO public.transactions (sender_id, receiver_id, amount, type, status, description, reference)
      VALUES (NULL, v_part.user_id, v_campaign.reward_amount, 'reward', 'completed',
        'Campaign reward: ' || v_campaign.title, v_reference);
    END IF;
    IF v_campaign.xp_reward > 0 THEN
      UPDATE public.profiles SET xp = xp + v_campaign.xp_reward, reputation = reputation + 1
      WHERE id = v_part.user_id;
    END IF;
    v_receipt_no := 'RCPT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    INSERT INTO public.reward_receipts (user_id, campaign_id, participation_id, w3od_amount,
      xp_amount, transaction_reference, receipt_number)
    VALUES (v_part.user_id, v_part.campaign_id, v_part.id, v_campaign.reward_amount,
      v_campaign.xp_reward, v_reference, v_receipt_no);
    UPDATE public.campaign_participations
    SET submission_status = 'approved', reviewed_at = now(), reviewed_by = v_admin_id, reward_credited = true
    WHERE id = p_participation_id;
    PERFORM public.create_notification(v_part.user_id, 'Campaign Reward Earned!',
      'You earned ' || v_campaign.reward_amount::text || ' W3OD and ' || v_campaign.xp_reward::text || ' XP from ' || v_campaign.title,
      'reward', 'lime', 'reward',
      jsonb_build_object('campaign_id', v_campaign.id, 'w3od', v_campaign.reward_amount, 'xp', v_campaign.xp_reward, 'receipt', v_receipt_no));
  ELSE
    UPDATE public.campaign_participations
    SET submission_status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = v_admin_id
    WHERE id = p_participation_id;
    PERFORM public.create_notification(v_part.user_id, 'Campaign Submission Rejected',
      'Your submission for ' || v_campaign.title || ' was rejected: ' || p_reason,
      'campaign', 'rose', 'campaign',
      jsonb_build_object('campaign_id', v_campaign.id, 'reason', p_reason));
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_campaign_submission(uuid, text, text) TO authenticated;

-- ─── get_my_campaigns ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_campaigns()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'title', c.title, 'description', c.description, 'instructions', c.instructions,
      'banner_url', c.banner_url, 'reward_amount', c.reward_amount, 'xp_reward', c.xp_reward,
      'proof_required', c.proof_required, 'start_date', c.start_date, 'end_date', c.end_date,
      'status', c.status, 'created_at', c.created_at, 'participation_id', p.id,
      'submission_status', p.submission_status, 'proof_type', p.proof_type, 'proof_url', p.proof_url,
      'proof_note', p.proof_note, 'rejection_reason', p.rejection_reason, 'submitted_at', p.submitted_at,
      'reviewed_at', p.reviewed_at, 'reward_credited', p.reward_credited
    ) ORDER BY c.created_at DESC)
    FROM public.campaigns c
    LEFT JOIN public.campaign_participations p ON p.campaign_id = c.id AND p.user_id = auth.uid()
    WHERE c.status IN ('active', 'scheduled') OR (p.id IS NOT NULL AND p.submission_status NOT IN ('rejected'))
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_campaigns() TO authenticated;

-- ─── get_campaign_participations (admin-only) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_campaign_participations(p_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'user_id', p.user_id, 'submission_status', p.submission_status,
      'proof_type', p.proof_type, 'proof_url', p.proof_url, 'proof_note', p.proof_note,
      'rejection_reason', p.rejection_reason, 'submitted_at', p.submitted_at,
      'reviewed_at', p.reviewed_at, 'reward_credited', p.reward_credited,
      'username', pr.username, 'display_name', pr.display_name, 'avatar_url', pr.avatar_url, 'email', pr.email
    ) ORDER BY p.submitted_at DESC NULLS LAST)
    FROM public.campaign_participations p
    JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.campaign_id = p_campaign_id
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_participations(uuid) TO authenticated;

-- ─── get_all_campaigns (admin-only) ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_all_campaigns()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'title', c.title, 'description', c.description, 'instructions', c.instructions,
      'banner_url', c.banner_url, 'reward_amount', c.reward_amount, 'xp_reward', c.xp_reward,
      'proof_required', c.proof_required, 'start_date', c.start_date, 'end_date', c.end_date,
      'status', c.status, 'created_at', c.created_at,
      'participant_count', (SELECT count(*) FROM public.campaign_participations WHERE campaign_id = c.id)
    ) ORDER BY c.created_at DESC)
    FROM public.campaigns c
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_all_campaigns() TO authenticated;

-- ─── get_my_badges ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_badges()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', b.id, 'name', b.name, 'description', b.description, 'icon', b.icon,
      'rarity', b.rarity, 'color', b.color, 'awarded_at', ub.awarded_at
    ) ORDER BY CASE b.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 ELSE 3 END, ub.awarded_at DESC)
    FROM public.user_badges ub JOIN public.badges b ON b.id = ub.badge_id
    WHERE ub.user_id = auth.uid()
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_badges() TO authenticated;

-- ─── get_user_badges ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_badges(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() != p_user_id AND NOT COALESCE(v_is_admin, false) THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', b.id, 'name', b.name, 'description', b.description, 'icon', b.icon,
      'rarity', b.rarity, 'color', b.color, 'awarded_at', ub.awarded_at
    ) ORDER BY ub.awarded_at DESC)
    FROM public.user_badges ub JOIN public.badges b ON b.id = ub.badge_id
    WHERE ub.user_id = p_user_id
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_badges(uuid) TO authenticated;

-- ─── award_badge (admin-only) ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_badge(p_user_id uuid, p_badge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text; v_badge_name text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can award badges.');
  END IF;
  SELECT name INTO v_badge_name FROM public.badges WHERE id = p_badge_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Badge not found.'); END IF;
  INSERT INTO public.user_badges (user_id, badge_id, awarded_by) VALUES (p_user_id, p_badge_id, auth.uid())
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  PERFORM public.create_notification(p_user_id, 'Badge Earned!',
    'You received the ' || v_badge_name || ' badge.', 'reward', 'amber', 'reward',
    jsonb_build_object('badge_id', p_badge_id));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, uuid) TO authenticated;

-- ─── revoke_badge (admin-only) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_badge(p_user_id uuid, p_badge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_role text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can revoke badges.');
  END IF;
  DELETE FROM public.user_badges WHERE user_id = p_user_id AND badge_id = p_badge_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.revoke_badge(uuid, uuid) TO authenticated;

-- ─── get_leaderboard ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_category text, p_period text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start date;
BEGIN
  IF p_period = 'weekly' THEN v_start := CURRENT_DATE - 7;
  ELSIF p_period = 'monthly' THEN v_start := date_trunc('month', CURRENT_DATE)::date;
  ELSE v_start := '1970-01-01'::date; END IF;

  IF p_category = 'xp' THEN
    RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
      SELECT jsonb_build_object('user_id', p.id, 'username', p.username, 'display_name', p.display_name,
        'avatar_url', p.avatar_url, 'xp', p.xp) AS jsonb
      FROM public.profiles p WHERE p.xp > 0 ORDER BY p.xp DESC LIMIT 100
    ) t), '[]'::jsonb);

  ELSIF p_category = 'contributions' THEN
    RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
      SELECT jsonb_build_object('user_id', p.id, 'username', p.username, 'display_name', p.display_name,
        'avatar_url', p.avatar_url, 'count', cnt.approved_count) AS jsonb
      FROM public.profiles p
      JOIN (SELECT user_id, count(*) AS approved_count FROM public.campaign_participations
            WHERE submission_status = 'approved' AND reviewed_at >= v_start::timestamptz GROUP BY user_id) cnt
        ON cnt.user_id = p.id
      ORDER BY cnt.approved_count DESC LIMIT 100
    ) t), '[]'::jsonb);

  ELSIF p_category = 'earnings' THEN
    RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
      SELECT jsonb_build_object('user_id', p.id, 'username', p.username, 'display_name', p.display_name,
        'avatar_url', p.avatar_url, 'total', earnings.total_earned) AS jsonb
      FROM public.profiles p
      JOIN (SELECT receiver_id, sum(amount) AS total_earned FROM public.transactions
            WHERE type = 'reward' AND status = 'completed' AND created_at >= v_start::timestamptz
            GROUP BY receiver_id) earnings ON earnings.receiver_id = p.id
      ORDER BY earnings.total_earned DESC LIMIT 100
    ) t), '[]'::jsonb);

  ELSIF p_category = 'referrers' THEN
    RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
      SELECT jsonb_build_object('user_id', p.id, 'username', p.username, 'display_name', p.display_name,
        'avatar_url', p.avatar_url, 'count', ref.referral_count) AS jsonb
      FROM public.profiles p
      JOIN (SELECT referred_by, count(*) AS referral_count FROM public.profiles
            WHERE referred_by IS NOT NULL AND created_at >= v_start::timestamptz GROUP BY referred_by) ref
        ON ref.referred_by = p.id
      ORDER BY ref.referral_count DESC LIMIT 100
    ) t), '[]'::jsonb);
  END IF;
  RETURN '[]'::jsonb;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text) TO authenticated;

-- ─── get_my_reward_receipts ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_reward_receipts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'campaign_id', r.campaign_id, 'w3od_amount', r.w3od_amount,
      'xp_amount', r.xp_amount, 'transaction_reference', r.transaction_reference,
      'receipt_number', r.receipt_number, 'created_at', r.created_at, 'campaign_title', c.title
    ) ORDER BY r.created_at DESC)
    FROM public.reward_receipts r LEFT JOIN public.campaigns c ON c.id = r.campaign_id
    WHERE r.user_id = auth.uid()
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_reward_receipts() TO authenticated;
