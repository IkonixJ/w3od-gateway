/*
# W3OD Gateway: Profile settings helper functions

## Purpose
Adds SECURITY DEFINER functions for the user-managed settings that the
guard_profile_self_update trigger blocks from direct client self-update:
biometric_enabled and username. These power the Settings screen toggles and
the "change username" flow. Also adds an explicit update_last_active helper.

## New Functions
- `set_biometric_enabled(p_user_id uuid, p_enabled boolean)` — toggles
  biometric auth. Only the owner can change their own setting.
- `change_username(p_user_id uuid, p_username text)` — updates the username
  after validating uniqueness and format. Returns true on success, false if
  the username is taken.
- `update_last_active(p_user_id uuid)` — sets last_active_at to now().

## Security
- All functions are SECURITY DEFINER and verify auth.uid() == p_user_id.
- change_username is case-insensitive uniqueness checked server-side so the
  client cannot race-condition a duplicate.
- biometric_enabled is in the guard's protected list, so this function is the
  only path for the user to toggle it.

## Important Notes
1. change_username enforces the 3-20 alphanumeric/underscore format server-side
   as defense in depth (client also validates).
2. Idempotent: functions use OR REPLACE.
*/

CREATE OR REPLACE FUNCTION public.set_biometric_enabled(p_user_id uuid, p_enabled boolean)
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
  SET biometric_enabled = p_enabled
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_biometric_enabled(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_username(p_user_id uuid, p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text;
  v_taken boolean;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_clean := LOWER(BTRIM(p_username));
  IF v_clean !~ '^[a-z0-9_]{3,20}$' THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = v_clean AND id != p_user_id
  ) INTO v_taken;

  IF v_taken THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET username = v_clean, display_name = v_clean
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_username(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_last_active(p_user_id uuid)
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
  SET last_active_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_last_active(uuid) TO authenticated;
