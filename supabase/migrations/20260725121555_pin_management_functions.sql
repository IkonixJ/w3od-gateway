/*
# W3OD Gateway: PIN management helper functions

## Purpose
Provides security-definer functions for setting and managing the transaction
PIN, since the guard_profile_self_update trigger blocks direct self-updates
of pin_hash, pin_failed_attempts, and pin_locked.

## New Functions
- `set_user_pin(p_user_id uuid, p_pin_hash text)` — sets the PIN hash for a user
  (only the user themselves can set their own PIN).
- `reset_pin_lock(p_user_id uuid)` — resets PIN failed attempts and unlocks.
- `increment_pin_failure(p_user_id uuid)` — increments PIN failure count,
  locks after 3 attempts.

## Security
- All functions are SECURITY DEFINER and verify auth.uid() matches the target
  user ID before making changes.
*/

CREATE OR REPLACE FUNCTION public.set_user_pin(p_user_id uuid, p_pin_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.profiles
  SET pin_hash = p_pin_hash, pin_failed_attempts = 0, pin_locked = false
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_pin_lock(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.profiles
  SET pin_failed_attempts = 0, pin_locked = false
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_pin_lock(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_pin_failure(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
  v_should_lock boolean;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT pin_failed_attempts INTO v_attempts FROM public.profiles WHERE id = p_user_id;
  v_attempts := COALESCE(v_attempts, 0) + 1;
  v_should_lock := v_attempts >= 3;

  UPDATE public.profiles
  SET pin_failed_attempts = v_attempts, pin_locked = v_should_lock
  WHERE id = p_user_id;

  RETURN v_should_lock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_pin_failure(uuid) TO authenticated;
