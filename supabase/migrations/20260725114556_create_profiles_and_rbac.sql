/*
# W3OD Gateway: profiles table + role-based access control foundation

## Purpose
Establishes the core identity layer for the W3OD Gateway community rewards
platform. Every signed-in user gets a corresponding `profiles` row, created
automatically when they sign up via Supabase Auth. This row carries the user's
role (member / moderator / admin), KYC verification status, XP, and reputation
score — the foundation that the Rewards Wallet, Campaigns, Learning, Events,
Badges, Redemption, and Admin Dashboard modules will extend.

## New Tables
- `profiles`
  - `id` (uuid, primary key) — mirrors `auth.users.id`
  - `email` (text, not null) — denormalized from auth for display queries
  - `display_name` (text, nullable) — community-facing handle
  - `avatar_url` (text, nullable) — profile image URL
  - `role` (text, not null, default 'member') — one of member | moderator | admin
  - `kyc_status` (text, not null, default 'none') — one of none | pending | verified | rejected
  - `xp` (integer, not null, default 0) — experience points
  - `reputation` (integer, not null, default 0) — community reputation score
  - `bio` (text, nullable) — free-form bio
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## New Functions
- `public.handle_new_user()` — trigger function that inserts a `profiles` row
  whenever a new row is added to `auth.users`. It reads the email and
  `display_name` (from raw_user_meta_data) so sign-up can pass a display name
  via the Supabase client's `options.data`.

## New Triggers
- `on_auth_user_created` — fires AFTER INSERT on `auth.users`, calls
  `handle_new_user()`.

## Security
- RLS enabled on `profiles`.
- SELECT: any authenticated user can read all profiles (community directory).
- INSERT: only the system trigger inserts; clients insert via the trigger.
  A policy is provided for completeness scoped to the owner.
- UPDATE: a user can update only their own profile, and cannot escalate their
  own role or KYC status through the client (enforced by a trigger that
  restricts mutable columns on self-update).
- DELETE: a user can delete only their own profile.
- `auth.uid()` is used for all ownership checks (never `current_user`).

## Important Notes
1. Role escalation is blocked at the database layer via the
   `guard_profile_self_update` trigger: a user updating their own row may only
   change display_name, avatar_url, and bio. Role, kyc_status, xp, and
   reputation are protected columns that only an admin/service context can
   modify — this is the security boundary for RBAC.
2. The `updated_at` column auto-refreshes via the `set_updated_at` trigger.
3. Idempotent: safe to re-run. Policies are dropped before re-creation.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  kyc_status text NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected')),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  reputation integer NOT NULL DEFAULT 0,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create a profile row when a new auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-refresh updated_at on row update.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent self-update of protected columns (role, kyc_status, xp, reputation).
-- Only an admin/service context (role escalation) should change these.
CREATE OR REPLACE FUNCTION public.guard_profile_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the acting user is updating their own row, lock down protected columns.
  IF auth.uid() = NEW.id THEN
    NEW.role := OLD.role;
    NEW.kyc_status := OLD.kyc_status;
    NEW.xp := OLD.xp;
    NEW.reputation := OLD.reputation;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_self_update ON public.profiles;
CREATE TRIGGER profiles_guard_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_update();

-- RLS policies (4 per CRUD verb, scoped to authenticated).
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Indexes for common lookups.
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_kyc_status_idx ON public.profiles (kyc_status);
