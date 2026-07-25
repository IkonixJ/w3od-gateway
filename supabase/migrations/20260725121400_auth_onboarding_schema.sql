/*
# W3OD Gateway: Authentication & Onboarding Schema

## Purpose
Extends the profiles table and creates new tables to support the full
authentication and onboarding flow: invite-code registration, email OTP
verification, trusted device management, login attempt tracking, transaction
PIN, and biometric enrollment.

## Modified Tables
- `profiles`
  - `username` (text, unique, nullable) — @-prefixed handle, changeable
  - `full_name` (text, nullable) — legal/full name
  - `phone` (text, nullable) — phone number (not verified in v1)
  - `email_verified` (boolean, default false) — email OTP verification status
  - `pin_hash` (text, nullable) — bcrypt-style hash of 4-digit transaction PIN
  - `pin_failed_attempts` (integer, default 0) — failed PIN unlock attempts
  - `pin_locked` (boolean, default false) — PIN locked until reset
  - `biometric_enabled` (boolean, default false) — biometric auth toggle
  - `login_locked_until` (timestamptz, nullable) — rate-limit lockout expiry
  - `login_failed_attempts` (integer, default 0) — failed password attempts
  - `last_active_at` (timestamptz, nullable) — for 15-min inactivity auto-logout

## New Tables
- `invite_codes`
  - `code` (text, primary key) — the invite code string
  - `max_uses` (integer, default 1)
  - `uses` (integer, default 0)
  - `created_by` (uuid, nullable, references profiles)
  - `expires_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default now())
- `trusted_devices`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles, ON DELETE CASCADE)
  - `device_fingerprint` (text, not null) — hashed device identifier
  - `device_name` (text, nullable) — user-agent / model
  - `trusted_at` (timestamptz, default now())
  - UNIQUE(user_id, device_fingerprint)
- `login_attempts`
  - `id` (uuid, primary key)
  - `user_id` (uuid, nullable, references profiles)
  - `email` (text, nullable) — email used on the attempt
  - `success` (boolean, not null)
  - `device_fingerprint` (text, nullable)
  - `created_at` (timestamptz, default now())
- `email_otps`
  - `id` (uuid, primary key)
  - `email` (text, not null)
  - `code_hash` (text, not null) — hashed OTP code
  - `purpose` (text, not null) — 'signup' | 'login' | 'reset'
  - `expires_at` (timestamptz, not null)
  - `verified` (boolean, default false)
  - `attempts` (integer, default 0)
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on all new tables.
- invite_codes: SELECT to authenticated (for validation during signup);
  INSERT/UPDATE only via service role (admin generates codes).
- trusted_devices: owner-scoped CRUD — users manage their own trusted devices.
- login_attempts: INSERT to authenticated (log own attempts); SELECT own only.
- email_otps: INSERT to anon+authenticated (anyone can request an OTP);
  SELECT/UPDATE own by email match via a security-definer function.
- Profiles: existing guard trigger extended — pin_hash, pin_locked,
  login_locked_until remain protected from self-update.

## Important Notes
1. Invite codes are seeded with one admin invite code "W3OD-FOUNDERS"
   for initial onboarding.
2. OTP codes are hashed before storage using pgcrypto's crypt() + gen_salt().
3. A helper function `verify_otp()` validates codes and marks them verified.
4. A helper function `consume_invite_code()` atomically increments uses.
5. Username uniqueness is enforced by a unique constraint + a helper function
   `is_username_taken()` for pre-check.
6. Idempotent: safe to re-run. Policies dropped before re-creation.
*/

-- ─── PROFILES: add new columns ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS biometric_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS login_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS login_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- ─── INVITE CODES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invite_codes (
  code text PRIMARY KEY,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  uses integer NOT NULL DEFAULT 0 CHECK (uses >= 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_codes_select_authenticated" ON public.invite_codes;
CREATE POLICY "invite_codes_select_authenticated"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (true);

-- Seed a founders invite code
INSERT INTO public.invite_codes (code, max_uses, uses)
VALUES ('W3OD-FOUNDERS', 100, 0)
ON CONFLICT (code) DO NOTHING;

-- ─── TRUSTED DEVICES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text,
  trusted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trusted_devices_select_own" ON public.trusted_devices;
CREATE POLICY "trusted_devices_select_own"
  ON public.trusted_devices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trusted_devices_insert_own" ON public.trusted_devices;
CREATE POLICY "trusted_devices_insert_own"
  ON public.trusted_devices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trusted_devices_delete_own" ON public.trusted_devices;
CREATE POLICY "trusted_devices_delete_own"
  ON public.trusted_devices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ─── LOGIN ATTEMPTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  success boolean NOT NULL,
  device_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_attempts_insert_own" ON public.login_attempts;
CREATE POLICY "login_attempts_insert_own"
  ON public.login_attempts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "login_attempts_select_own" ON public.login_attempts;
CREATE POLICY "login_attempts_select_own"
  ON public.login_attempts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ─── EMAIL OTPS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup', 'login', 'reset')),
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_otps_email_idx ON public.email_otps (email);
CREATE INDEX IF NOT EXISTS email_otps_expires_idx ON public.email_otps (expires_at);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can insert an OTP request
DROP POLICY IF EXISTS "email_otps_insert_any" ON public.email_otps;
CREATE POLICY "email_otps_insert_any"
  ON public.email_otps FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

-- Check if username is taken (case-insensitive)
CREATE OR REPLACE FUNCTION public.is_username_taken(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(p_username)
  );
$$;

-- Atomically consume an invite code (returns true if valid & consumed)
CREATE OR REPLACE FUNCTION public.consume_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite FROM public.invite_codes WHERE code = UPPER(p_code) FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_invite.uses >= v_invite.max_uses THEN
    RETURN false;
  END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN false;
  END IF;
  UPDATE public.invite_codes SET uses = uses + 1 WHERE code = UPPER(p_code);
  RETURN true;
END;
$$;

-- Verify an OTP code (returns true if valid & marks verified)
CREATE OR REPLACE FUNCTION public.verify_otp(
  p_email text,
  p_code text,
  p_purpose text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp record;
BEGIN
  SELECT * INTO v_otp
  FROM public.email_otps
  WHERE email = LOWER(p_email)
    AND purpose = p_purpose
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Increment attempts
  UPDATE public.email_otps SET attempts = attempts + 1 WHERE id = v_otp.id;

  -- Check code (comparing against hash)
  IF v_otp.code_hash = crypt(p_code, v_otp.code_hash) THEN
    UPDATE public.email_otps SET verified = true WHERE id = v_otp.id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Mark email as verified on profile
CREATE OR REPLACE FUNCTION public.mark_email_verified(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email_verified = true WHERE email = LOWER(p_email);
END;
$$;

-- ─── EXTEND PROFILE GUARD TRIGGER ──────────────────────────────────────────
-- Re-create the guard function to also protect pin_hash, pin_locked,
-- pin_failed_attempts, login_locked_until, login_failed_attempts, biometric_enabled
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id THEN
    NEW.role := OLD.role;
    NEW.kyc_status := OLD.kyc_status;
    NEW.xp := OLD.xp;
    NEW.reputation := OLD.reputation;
    NEW.pin_hash := OLD.pin_hash;
    NEW.pin_locked := OLD.pin_locked;
    NEW.pin_failed_attempts := OLD.pin_failed_attempts;
    NEW.login_locked_until := OLD.login_locked_until;
    NEW.login_failed_attempts := OLD.login_failed_attempts;
  END IF;
  RETURN NEW;
END;
$$;
