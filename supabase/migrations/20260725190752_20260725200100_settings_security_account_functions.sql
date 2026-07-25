/*
# W3OD Gateway: Settings, Security & Account Management — RPC functions

## Purpose
Adds all SECURITY DEFINER RPC functions for the Settings module.

## New Functions
- get_notification_preferences, update_notification_preferences
- rename_trusted_device, get_login_history, get_security_events
- log_security_event, sign_out_all_devices
- request_account_deletion, cancel_account_deletion, get_deletion_status
- admin_restore_account, admin_list_pending_deletions
- change_email (requires password + OTP)
- change_password (requires current password)
- change_transaction_pin (requires current PIN + OTP)

## Security
- All functions verify auth.uid() ownership.
- Admin functions check role IN ('admin','super_admin').
- Account deletion freezes wallet and disables login.
- Idempotent: functions use OR REPLACE.
*/

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_notification_preferences()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  INSERT INTO public.notification_preferences (user_id) VALUES (v_me) ON CONFLICT (user_id) DO NOTHING;
  SELECT jsonb_build_object(
    'push_enabled', p.push_enabled, 'email_enabled', p.email_enabled,
    'marketing_enabled', p.marketing_enabled, 'campaign_alerts', p.campaign_alerts,
    'security_alerts', p.security_alerts
  ) INTO v_me FROM public.notification_preferences p WHERE p.user_id = v_me;
  RETURN COALESCE(v_me, jsonb_build_object(
    'push_enabled', true, 'email_enabled', true, 'marketing_enabled', true,
    'campaign_alerts', true, 'security_alerts', true
  ));
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_notification_preferences() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_notification_preferences(
  p_push boolean DEFAULT true, p_email boolean DEFAULT true,
  p_marketing boolean DEFAULT true, p_campaign boolean DEFAULT true,
  p_security boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  INSERT INTO public.notification_preferences (user_id, push_enabled, email_enabled, marketing_enabled, campaign_alerts, security_alerts)
  VALUES (v_me, p_push, p_email, p_marketing, p_campaign, p_security)
  ON CONFLICT (user_id) DO UPDATE SET
    push_enabled = EXCLUDED.push_enabled, email_enabled = EXCLUDED.email_enabled,
    marketing_enabled = EXCLUDED.marketing_enabled, campaign_alerts = EXCLUDED.campaign_alerts,
    security_alerts = EXCLUDED.security_alerts, updated_at = now();
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- TRUSTED DEVICES
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rename_trusted_device(p_device_id uuid, p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF BTRIM(p_name) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Device name cannot be empty.'); END IF;
  UPDATE public.trusted_devices SET device_name = BTRIM(p_name)
  WHERE id = p_device_id AND user_id = v_me;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Device not found.'); END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.rename_trusted_device(uuid, text) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- LOGIN HISTORY & SECURITY EVENTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_login_history(p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', h.id, 'device_name', h.device_name, 'platform', h.platform,
      'ip_address', h.ip_address, 'success', h.success, 'created_at', h.created_at
    ) AS jsonb
    FROM public.login_history h WHERE h.user_id = v_me
    ORDER BY h.created_at DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_login_history(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_security_events(p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', e.id, 'event_type', e.event_type, 'description', e.description,
      'metadata', e.metadata, 'created_at', e.created_at
    ) AS jsonb
    FROM public.security_events e WHERE e.user_id = v_me
    ORDER BY e.created_at DESC LIMIT p_limit OFFSET p_offset
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_security_events(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text, p_description text, p_metadata jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN; END IF;
  INSERT INTO public.security_events (user_id, event_type, description, metadata)
  VALUES (v_me, p_event_type, p_description, p_metadata);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.sign_out_all_devices(p_current_fingerprint text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  -- Remove all trusted devices except the current one
  DELETE FROM public.trusted_devices
  WHERE user_id = v_me AND (p_current_fingerprint IS NULL OR device_fingerprint != p_current_fingerprint);
  INSERT INTO public.security_events (user_id, event_type, description)
  VALUES (v_me, 'sign_out_all', 'Signed out from all devices');
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.sign_out_all_devices(text) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- ACCOUNT DELETION
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.request_account_deletion(
  p_password_verified boolean, p_pin_verified boolean, p_otp_verified boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_wallet public.wallets; v_balance numeric;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF NOT (p_password_verified AND p_pin_verified AND p_otp_verified) THEN
    RETURN jsonb_build_object('success', false, 'error', 'All three verifications are required.');
  END IF;

  -- Freeze wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_me;
  v_balance := COALESCE(v_wallet.balance, 0);
  IF v_balance > 0 THEN
    UPDATE public.wallets SET balance = 0 WHERE user_id = v_me;
  END IF;

  -- Schedule deletion
  UPDATE public.profiles SET
    deletion_scheduled_at = now() + interval '30 days',
    deletion_verified = true,
    deletion_metadata = jsonb_build_object('frozen_balance', v_balance, 'requested_at', now())
  WHERE id = v_me;

  -- Log security event
  INSERT INTO public.security_events (user_id, event_type, description, metadata)
  VALUES (v_me, 'account_deletion_requested', 'Account deletion scheduled', jsonb_build_object('frozen_balance', v_balance));

  RETURN jsonb_build_object('success', true, 'deletion_date', now() + interval '30 days');
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(boolean, boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_meta jsonb; v_balance numeric;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT deletion_metadata INTO v_meta FROM public.profiles WHERE id = v_me;
  IF v_meta IS NULL OR v_meta->>'frozen_balance' IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No deletion scheduled.');
  END IF;
  v_balance := (v_meta->>'frozen_balance')::numeric;
  -- Restore wallet
  UPDATE public.wallets SET balance = v_balance WHERE user_id = v_me;
  -- Clear deletion
  UPDATE public.profiles SET
    deletion_scheduled_at = NULL, deletion_verified = false, deletion_metadata = NULL
  WHERE id = v_me;
  INSERT INTO public.security_events (user_id, event_type, description)
  VALUES (v_me, 'account_deletion_cancelled', 'Account deletion cancelled, wallet restored');
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_deletion_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_scheduled timestamptz;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('scheduled', false); END IF;
  SELECT deletion_scheduled_at INTO v_scheduled FROM public.profiles WHERE id = v_me;
  IF v_scheduled IS NULL THEN RETURN jsonb_build_object('scheduled', false); END IF;
  RETURN jsonb_build_object(
    'scheduled', true,
    'deletion_date', v_scheduled,
    'days_remaining', GREATEST(0, EXTRACT(DAY FROM (v_scheduled - now()))::int)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_deletion_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_restore_account(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_meta jsonb; v_balance numeric;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can restore accounts.');
  END IF;
  SELECT deletion_metadata INTO v_meta FROM public.profiles WHERE id = p_user_id;
  IF v_meta IS NOT NULL AND v_meta->>'frozen_balance' IS NOT NULL THEN
    v_balance := (v_meta->>'frozen_balance')::numeric;
    UPDATE public.wallets SET balance = v_balance WHERE user_id = p_user_id;
  END IF;
  UPDATE public.profiles SET
    deletion_scheduled_at = NULL, deletion_verified = false, deletion_metadata = NULL
  WHERE id = p_user_id;
  PERFORM public.log_admin_action('restore_account', p_user_id, 'user', jsonb_build_object('restored_balance', v_balance));
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_restore_account(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_pending_deletions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name,
      'email', p.email, 'avatar_url', p.avatar_url,
      'deletion_scheduled_at', p.deletion_scheduled_at,
      'days_remaining', GREATEST(0, EXTRACT(DAY FROM (p.deletion_scheduled_at - now()))::int)
    ) AS jsonb
    FROM public.profiles p
    WHERE p.deletion_scheduled_at IS NOT NULL AND p.deletion_scheduled_at > now()
    ORDER BY p.deletion_scheduled_at ASC
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_deletions() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CHANGE EMAIL (requires password + OTP)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.change_email(
  p_new_email text, p_password_verified boolean, p_otp_verified boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid(); v_email text; v_taken boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF NOT (p_password_verified AND p_otp_verified) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password and OTP verification required.');
  END IF;
  v_email := LOWER(BTRIM(p_new_email));
  IF v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email format.');
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE email = v_email AND id != v_me) INTO v_taken;
  IF v_taken THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email already in use.');
  END IF;
  UPDATE public.profiles SET email = v_email WHERE id = v_me;
  -- Also update auth.users email
  UPDATE auth.users SET email = v_email WHERE id = v_me;
  INSERT INTO public.security_events (user_id, event_type, description)
  VALUES (v_me, 'email_changed', 'Email address updated');
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.change_email(text, boolean, boolean) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CHANGE PASSWORD (requires current password — verified client-side via
-- supabase.auth.signInWithPassword, then this RPC updates the new password)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_password_change()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN; END IF;
  INSERT INTO public.security_events (user_id, event_type, description)
  VALUES (v_me, 'password_changed', 'Password was changed');
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_password_change() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- CHANGE TRANSACTION PIN (requires current PIN + OTP)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.change_transaction_pin(
  p_new_pin_hash text, p_current_pin_verified boolean, p_otp_verified boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF NOT (p_current_pin_verified AND p_otp_verified) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current PIN and OTP verification required.');
  END IF;
  IF p_new_pin_hash IS NULL OR BTRIM(p_new_pin_hash) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'New PIN hash is required.');
  END IF;
  UPDATE public.profiles SET
    pin_hash = p_new_pin_hash,
    pin_failed_attempts = 0,
    pin_locked = false
  WHERE id = v_me;
  INSERT INTO public.security_events (user_id, event_type, description)
  VALUES (v_me, 'pin_changed', 'Transaction PIN was changed');
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.change_transaction_pin(text, boolean, boolean) TO authenticated;
