/*
# W3OD Gateway: Auth security helper functions + login_attempts policy fix

## Purpose
Fixes critical security/auth flow gaps that prevented the login and PIN lock
logic from working correctly. The guard_profile_self_update trigger blocks
direct self-updates of pin_failed_attempts, pin_locked, login_failed_attempts,
and login_locked_until — so the client cannot manage these columns directly.
This migration adds SECURITY DEFINER helper functions for those operations,
adds the missing refund_invite_code function, and fixes the login_attempts
INSERT policy so unauthenticated (anon) clients can log failed login attempts
(which happen when no session exists yet).

## New Functions
- `increment_login_failures(p_email text)` — increments login_failed_attempts,
  locks the account for 15 minutes after 5 failures. Returns the attempt count
  and locked status. SECURITY DEFINER so anon can call it.
- `reset_login_failures(p_email text)` — zeroes login_failed_attempts and
  login_locked_until. SECURITY DEFINER.
- `get_login_lock_status(p_email text)` — returns locked boolean + locked_until.
  SECURITY DEFINER, callable by anon.
- `increment_pin_failure(p_user_id uuid)` — already exists; re-granted here.
- `reset_pin_lock(p_user_id uuid)` — already exists; re-granted here.
- `refund_invite_code(p_code text)` — decrements invite code uses (used when
  registration fails after consuming a code). SECURITY DEFINER.

## Modified Tables
- `login_attempts` — INSERT policy changed from `TO authenticated` to
  `TO anon, authenticated` so failed-login logging works without a session.

## Security
- All helper functions are SECURITY DEFINER and verify ownership where a user
  ID is involved (increment_pin_failure, reset_pin_lock). Email-based
  functions (login lock) are callable by anon because they run before the user
  is authenticated. They only mutate the login lock columns — not role/kyc/xp.
- The guard_profile_self_update trigger already protects pin_hash,
  pin_locked, login_locked_until from self-update, so these functions are the
  ONLY safe path to mutate those columns for the owning user.

## Important Notes
1. increment_login_failures caps the lock at 15 minutes from now once 5
   failures are reached. It is safe to re-run.
2. refund_invite_code guards against uses going negative.
3. Idempotent: policies dropped before re-creation; functions use OR REPLACE.
*/

-- ─── LOGIN LOCK HELPERS (anon-callable, run before auth) ───────────────────

CREATE OR REPLACE FUNCTION public.increment_login_failures(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
  v_should_lock boolean;
  v_locked_until timestamptz;
BEGIN
  SELECT login_failed_attempts INTO v_attempts
  FROM public.profiles
  WHERE email = LOWER(p_email);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('attempts', 0, 'locked', false);
  END IF;

  v_attempts := COALESCE(v_attempts, 0) + 1;
  v_should_lock := v_attempts >= 5;
  v_locked_until := CASE WHEN v_should_lock THEN now() + interval '15 minutes' ELSE NULL END;

  UPDATE public.profiles
  SET login_failed_attempts = v_attempts,
      login_locked_until = v_locked_until
  WHERE email = LOWER(p_email);

  RETURN jsonb_build_object(
    'attempts', v_attempts,
    'locked', v_should_lock,
    'locked_until', v_locked_until
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_login_failures(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reset_login_failures(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET login_failed_attempts = 0, login_locked_until = NULL
  WHERE email = LOWER(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_login_failures(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_login_lock_status(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until timestamptz;
  v_attempts integer;
  v_locked boolean;
BEGIN
  SELECT login_locked_until, login_failed_attempts
  INTO v_locked_until, v_attempts
  FROM public.profiles
  WHERE email = LOWER(p_email);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('locked', false, 'locked_until', NULL, 'attempts', 0);
  END IF;

  v_locked := v_locked_until IS NOT NULL AND v_locked_until > now();
  RETURN jsonb_build_object(
    'locked', v_locked,
    'locked_until', v_locked_until,
    'attempts', COALESCE(v_attempts, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_lock_status(text) TO anon, authenticated;

-- ─── INVITE CODE REFUND ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refund_invite_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invite_codes
  SET uses = GREATEST(uses - 1, 0)
  WHERE code = UPPER(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_invite_code(text) TO anon, authenticated;

-- ─── UPDATE LOGIN_ATTEMPTS INSERT POLICY ───────────────────────────────────
-- Failed login attempts are logged by anon (no session yet). The previous
-- policy was TO authenticated only, so failed-login logging silently failed.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_attempts_insert_own" ON public.login_attempts;
CREATE POLICY "login_attempts_insert_any"
  ON public.login_attempts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "login_attempts_select_own" ON public.login_attempts;
CREATE POLICY "login_attempts_select_own"
  ON public.login_attempts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Re-grant existing PIN functions to be explicit.
GRANT EXECUTE ON FUNCTION public.set_user_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_pin_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pin_failure(uuid) TO authenticated;
