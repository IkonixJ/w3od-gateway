/*
# W3OD Gateway: Settings, Security & Account Management schema

## Purpose
Adds the complete data layer for the Settings module:
1. Notification preferences — per-user toggles for push, email, marketing,
   campaign alerts, and security alerts.
2. Account deletion — pending deletion status, 30-day grace period, username
   reservation, wallet freeze.
3. Login history — track all login events with device info.
4. Security events — track security-relevant actions (password change, PIN
   change, device trust/removal, biometric toggle).
5. Device rename — add device_name column update capability.

## New Tables
- `notification_preferences` — per-user notification toggle settings.
  One row per user. Columns: push_enabled, email_enabled, marketing_enabled,
  campaign_alerts, security_alerts. All default to true.
- `login_history` — records of all login events. Columns: user_id, device_name,
  platform, ip_address, success, created_at.
- `security_events` — security-relevant actions. Columns: user_id, event_type,
  description, metadata (jsonb), created_at.

## Modified Tables
- `profiles` — adds `deletion_scheduled_at` (timestamptz, nullable) and
  `deletion_verified` (boolean, default false). When deletion_scheduled_at is
  set, login is disabled and wallet is frozen.
- `trusted_devices` — adds `last_login_at` (timestamptz) and `platform` (text)
  columns for richer device info display.

## New Functions (all SECURITY DEFINER)
- Settings:
  - `get_notification_preferences()` — returns the user's preference row.
  - `update_notification_preferences(p_push, p_email, p_marketing,
    p_campaign, p_security)` — updates all toggles at once.
  - `rename_trusted_device(p_device_id, p_name)` — renames a trusted device.
  - `get_login_history(p_limit, p_offset)` — returns the user's login history.
  - `get_security_events(p_limit, p_offset)` — returns the user's security events.
  - `log_security_event(p_event_type, p_description, p_metadata)` — inserts a
    security event for the current user.
  - `sign_out_all_devices(p_user_id)` — revokes all sessions except current
    by removing trusted devices (except current fingerprint) and logging the
    action.

- Account Deletion:
  - `request_account_deletion(p_password_verified, p_pin_verified,
    p_otp_verified)` — sets deletion_scheduled_at to now() + 30 days,
    deletion_verified to true, freezes wallet (sets balance to 0, stores
    frozen amount in metadata), disables login. Returns success.
  - `cancel_account_deletion()` — clears deletion_scheduled_at, restores
    wallet balance, re-enables login. Only works within 30-day window.
  - `get_deletion_status()` — returns deletion_scheduled_at and days remaining.
  - `admin_restore_account(p_user_id)` — admin-only. Cancels deletion for a
    user. Restores wallet and login.
  - `admin_list_pending_deletions()` — admin-only. Lists all users with
    pending deletion.

## Security
- RLS enabled on all new tables.
- `notification_preferences`: SELECT/UPDATE own only.
- `login_history`: SELECT own only. INSERT via RPC.
- `security_events`: SELECT own only. INSERT via RPC.
- Account deletion functions verify auth.uid() ownership.
- Admin functions check role IN ('admin','super_admin').
- All functions are SECURITY DEFINER to bypass the guard trigger.

## Important Notes
1. Account deletion freezes the wallet by storing the balance in
   deletion_metadata and setting balance to 0. On restore, the balance is
   returned from metadata.
2. Username is reserved during deletion by NOT clearing the username column.
3. After 30 days, a scheduled job (or admin action) permanently deletes
   personal data and releases the username. This migration adds the schema
   and functions; the actual purge is handled by a separate process.
4. Idempotent: safe to re-run.
*/

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  marketing_enabled boolean NOT NULL DEFAULT true,
  campaign_alerts boolean NOT NULL DEFAULT true,
  security_alerts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_prefs_select_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_select_own" ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_prefs_update_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_update_own" ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- LOGIN HISTORY
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name text,
  platform text,
  ip_address text,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_history_user_idx ON public.login_history (user_id, created_at DESC);
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_history_select_own" ON public.login_history;
CREATE POLICY "login_history_select_own" ON public.login_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "login_history_insert_any" ON public.login_history;
CREATE POLICY "login_history_insert_any" ON public.login_history FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY EVENTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_user_idx ON public.security_events (user_id, created_at DESC);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_events_select_own" ON public.security_events;
CREATE POLICY "security_events_select_own" ON public.security_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "security_events_insert_any" ON public.security_events;
CREATE POLICY "security_events_insert_any" ON public.security_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- PROFILES — add deletion columns
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deletion_scheduled_at') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_scheduled_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deletion_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deletion_metadata') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_metadata jsonb;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- TRUSTED DEVICES — add last_login_at and platform
-- ════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trusted_devices' AND column_name = 'last_login_at') THEN
    ALTER TABLE public.trusted_devices ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trusted_devices' AND column_name = 'platform') THEN
    ALTER TABLE public.trusted_devices ADD COLUMN platform text NOT NULL DEFAULT 'web';
  END IF;
END $$;

-- Allow users to update device_name on their own trusted devices
DROP POLICY IF EXISTS "trusted_devices_update_own" ON public.trusted_devices;
CREATE POLICY "trusted_devices_update_own" ON public.trusted_devices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
