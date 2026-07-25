/*
# W3OD Gateway: KYC Verification + Profile Management schema

## Purpose
Adds the complete data layer for KYC (Know Your Customer) verification and
extended profile management. Members submit their NIN, full legal name, and
date of birth for identity verification. Transaction features (wallet send &
redemption) remain disabled until KYC is approved by an admin. Admins review
submitted KYC records, approve or reject with a reason, and every status
transition is recorded in a history table for audit. A Supabase Storage bucket
for profile pictures is also created.

## New Tables
- `kyc_submissions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique, references profiles) — one active KYC per user
  - `nin` (text, not null) — National Identification Number (11 digits)
  - `full_name` (text, not null) — legal full name as on NIN
  - `date_of_birth` (date, not null)
  - `status` (text, not null, default 'none') — none | pending | approved | rejected
  - `rejection_reason` (text, nullable) — set when rejected
  - `submitted_at` (timestamptz, default now())
  - `reviewed_at` (timestamptz, nullable)
  - `reviewed_by` (uuid, nullable, references profiles) — the admin who reviewed
  - `created_at`, `updated_at` (timestamptz)
- `kyc_status_history`
  - `id` (uuid, primary key)
  - `kyc_id` (uuid, references kyc_submissions, ON DELETE CASCADE)
  - `from_status` (text, not null)
  - `to_status` (text, not null)
  - `reason` (text, nullable) — rejection reason or approval note
  - `changed_by` (uuid, nullable, references profiles) — admin id (null for self-submission)
  - `changed_at` (timestamptz, default now)

## Modified Tables
- `profiles`
  - `bio` (text, nullable) — already in original schema, reused for profile bio
  - `avatar_url` (text, nullable) — already exists; now backed by Storage bucket

## New Storage Bucket
- `avatars` — public-read bucket for profile pictures. Files stored at
  `avatars/<user_id>/<timestamp>.<ext>`. Public read so avatars render without
  signed URLs; writes restricted to the owner via storage policies.

## New Functions (all SECURITY DEFINER)
- `submit_kyc(p_nin text, p_full_name text, p_date_of_birth date)` — creates or
  updates the caller's KYC submission, sets status to 'pending', records a
  'none → pending' history entry. Validates NIN format (11 digits) and DOB
  (must be 18+ and not future). Returns {success, error}.
- `review_kyc(p_kyc_id uuid, p_decision text, p_reason text)` — admin-only.
  Sets status to 'approved' or 'rejected', sets rejection_reason, reviewed_at,
  reviewed_by. When approved, also updates profiles.kyc_status to 'verified'.
  When rejected, sets profiles.kyc_status to 'rejected'. Records a history
  entry. Verifies caller role is admin. Returns {success, error}.
- `get_kyc_status_history(p_kyc_id uuid)` — returns the history rows for a KYC
  submission. Owner can read their own; admins can read any.
- `get_pending_kyc_submissions()` — admin-only. Returns all pending KYC
  submissions joined with profile data (username, display_name, avatar_url,
  email) for the admin review queue.

## Security
- RLS enabled on all new tables.
- `kyc_submissions`: SELECT own only (members see their own KYC). Admins see
  all via the get_pending_kyc_submissions SECURITY DEFINER function. UPDATE
  is denied to clients — only the submit_kyc (self) and review_kyc (admin)
  RPCs mutate status. INSERT only via submit_kyc RPC.
- `kyc_status_history`: SELECT own (via kyc_id ownership check). INSERT only
  via the SECURITY DEFINER functions.
- Storage policies on `avatars` bucket: owner can upload/update/delete their
  own folder; anyone can read (public avatars).

## Important Notes
1. NIN is stored as provided (11 digits). In production this would be
   encrypted at rest, but for this platform the RLS + SECURITY DEFINER
   pattern keeps it away from other members.
2. The minimum age of 18 is enforced server-side in submit_kyc.
3. When an admin approves KYC, profiles.kyc_status is updated to 'verified'
   inside the same RPC call — the wallet module checks kyc_status ===
   'verified' to enable transactions.
4. Status history records every transition (none→pending, pending→approved,
   approved→rejected, rejected→pending on resubmit) for full audit trail.
5. Idempotent: safe to re-run. Policies dropped before re-creation; functions
   use OR REPLACE; tables use IF NOT EXISTS.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── KYC SUBMISSIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nin text NOT NULL,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'pending', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx ON public.kyc_submissions (status);
CREATE INDEX IF NOT EXISTS kyc_submissions_user_idx ON public.kyc_submissions (user_id);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_submissions_select_own" ON public.kyc_submissions;
CREATE POLICY "kyc_submissions_select_own"
  ON public.kyc_submissions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE policies — only SECURITY DEFINER RPCs write.

DROP TRIGGER IF EXISTS kyc_submissions_set_updated_at ON public.kyc_submissions;
CREATE TRIGGER kyc_submissions_set_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── KYC STATUS HISTORY ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_id uuid NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  reason text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_status_history_kyc_idx ON public.kyc_status_history (kyc_id, changed_at DESC);

ALTER TABLE public.kyc_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_status_history_select_own" ON public.kyc_status_history;
CREATE POLICY "kyc_status_history_select_own"
  ON public.kyc_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kyc_submissions k
      WHERE k.id = kyc_status_history.kyc_id AND k.user_id = auth.uid()
    )
  );

-- No direct INSERT policy — only SECURITY DEFINER RPCs write history.

-- ─── STORAGE BUCKET: avatars ───────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Owner can upload to their own folder
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can update their own files
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can delete their own files
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for avatars
DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;
CREATE POLICY "avatars_read_public"
  ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');

-- ─── submit_kyc ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_kyc(
  p_nin text,
  p_full_name text,
  p_date_of_birth date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.kyc_submissions;
  v_nin_clean text;
  v_age integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  v_nin_clean := BTRIM(p_nin);

  -- Validate NIN: 11 digits
  IF v_nin_clean !~ '^\d{11}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NIN must be exactly 11 digits.');
  END IF;

  -- Validate full name
  IF LENGTH(BTRIM(p_full_name)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full name must be at least 3 characters.');
  END IF;

  -- Validate DOB: must be 18+ and not in the future
  IF p_date_of_birth >= CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Date of birth cannot be today or in the future.');
  END IF;
  v_age := EXTRACT(YEAR FROM age(CURRENT_DATE, p_date_of_birth));
  IF v_age < 18 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be at least 18 years old.');
  END IF;

  -- Check existing submission
  SELECT * INTO v_existing FROM public.kyc_submissions WHERE user_id = v_user_id;

  IF FOUND THEN
    -- Resubmission (e.g. after rejection)
    INSERT INTO public.kyc_status_history (kyc_id, from_status, to_status, reason, changed_by)
    VALUES (v_existing.id, v_existing.status, 'pending', NULL, v_user_id);

    UPDATE public.kyc_submissions
    SET nin = v_nin_clean,
        full_name = BTRIM(p_full_name),
        date_of_birth = p_date_of_birth,
        status = 'pending',
        rejection_reason = NULL,
        submitted_at = now(),
        reviewed_at = NULL,
        reviewed_by = NULL
    WHERE user_id = v_user_id;
  ELSE
    -- New submission
    INSERT INTO public.kyc_submissions (user_id, nin, full_name, date_of_birth, status)
    VALUES (v_user_id, v_nin_clean, BTRIM(p_full_name), p_date_of_birth, 'pending')
    RETURNING id INTO v_existing;

    INSERT INTO public.kyc_status_history (kyc_id, from_status, to_status, changed_by)
    VALUES (v_existing.id, 'none', 'pending', v_user_id);
  END IF;

  -- Update profile kyc_status to pending
  UPDATE public.profiles SET kyc_status = 'pending' WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'kyc_id', v_existing.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_kyc(text, text, date) TO authenticated;

-- ─── review_kyc (admin-only) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.review_kyc(
  p_kyc_id uuid,
  p_decision text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_role text;
  v_kyc public.kyc_submissions;
  v_new_status text;
BEGIN
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.');
  END IF;

  -- Verify admin role
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can review KYC.');
  END IF;

  -- Validate decision
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision must be approved or rejected.');
  END IF;

  IF p_decision = 'rejected' AND (p_reason IS NULL OR BTRIM(p_reason) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'A rejection reason is required.');
  END IF;

  SELECT * INTO v_kyc FROM public.kyc_submissions WHERE id = p_kyc_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'KYC submission not found.');
  END IF;

  v_new_status := p_decision;

  -- Record history
  INSERT INTO public.kyc_status_history (kyc_id, from_status, to_status, reason, changed_by)
  VALUES (v_kyc.id, v_kyc.status, v_new_status, p_reason, v_admin_id);

  -- Update submission
  UPDATE public.kyc_submissions
  SET status = v_new_status,
      rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason ELSE NULL END,
      reviewed_at = now(),
      reviewed_by = v_admin_id
  WHERE id = p_kyc_id;

  -- Update profile kyc_status
  UPDATE public.profiles
  SET kyc_status = CASE WHEN p_decision = 'approved' THEN 'verified' ELSE 'rejected' END
  WHERE id = v_kyc.user_id;

  -- Notify the user
  PERFORM public.create_notification(
    v_kyc.user_id,
    CASE WHEN p_decision = 'approved' THEN 'KYC Approved' ELSE 'KYC Update Required' END,
    CASE WHEN p_decision = 'approved'
         THEN 'Your identity has been verified. Wallet transactions are now enabled.'
         ELSE 'Your KYC submission was rejected: ' || p_reason END,
    'security',
    CASE WHEN p_decision = 'approved' THEN 'lime' ELSE 'rose' END,
    'security',
    jsonb_build_object('kyc_id', v_kyc.id, 'decision', p_decision)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_kyc(uuid, text, text) TO authenticated;

-- ─── get_pending_kyc_submissions (admin-only) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pending_kyc_submissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
BEGIN
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = auth.uid();
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', k.id,
    'user_id', k.user_id,
    'nin', k.nin,
    'full_name', k.full_name,
    'date_of_birth', k.date_of_birth,
    'status', k.status,
    'rejection_reason', k.rejection_reason,
    'submitted_at', k.submitted_at,
    'reviewed_at', k.reviewed_at,
    'reviewed_by', k.reviewed_by,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'email', p.email
  ) ORDER BY k.submitted_at DESC), '[]'::jsonb)
  INTO v_admin_role
  FROM public.kyc_submissions k
  JOIN public.profiles p ON p.id = k.user_id
  WHERE k.status IN ('pending', 'approved', 'rejected');

  RETURN v_admin_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_kyc_submissions() TO authenticated;

-- ─── get_kyc_status_history (own or admin) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_kyc_status_history(p_kyc_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_kyc_user uuid;
  v_is_admin boolean;
BEGIN
  SELECT user_id INTO v_kyc_user FROM public.kyc_submissions WHERE id = p_kyc_id;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = v_caller;

  IF v_kyc_user != v_caller AND NOT COALESCE(v_is_admin, false) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', h.id,
      'from_status', h.from_status,
      'to_status', h.to_status,
      'reason', h.reason,
      'changed_by', h.changed_by,
      'changed_at', h.changed_at
    ) ORDER BY h.changed_at DESC)
    FROM public.kyc_status_history h
    WHERE h.kyc_id = p_kyc_id
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kyc_status_history(uuid) TO authenticated;
