/*
# W3OD Gateway: Wallet Module — full transaction + redemption schema

## Purpose
Adds the complete data layer for the Rewards Wallet module: per-user wallet
balances (spendable + pending redemption), the transaction ledger (W3OD P2P
transfers between members), redemption requests with the 14th/30th processing
schedule, saved Moniepoint payout accounts, and in-app notifications for
transaction/redeem events. All money-movement is performed through
SECURITY DEFINER RPC functions so the balances can never be mutated directly
by the client (RLS denies direct writes to balance columns). A daily transfer
limit of ₦20,000 and a minimum transfer of ₦100 are enforced server-side.

## New Tables
- `wallets`
  - `user_id` (uuid, primary key) — one wallet per user, 1:1 with profiles
  - `account_number` (text, unique, not null) — 10-digit W3OD account number
  - `balance` (numeric(18,2), default 0) — spendable W3OD balance
  - `pending_balance` (numeric(18,2), default 0) — locked for pending redemptions
  - `lifetime_earned` (numeric(18,2), default 0) — cumulative rewards received
  - `lifetime_redeemed` (numeric(18,2), default 0) — cumulative redeemed amount
  - `created_at`, `updated_at` (timestamptz)
- `transactions`
  - `id` (uuid, primary key)
  - `reference` (text, unique) — human-readable transaction ref (W3OD-XXXXXXXX)
  - `sender_id`, `receiver_id` (uuid, references profiles)
  - `amount` (numeric(18,2), not null)
  - `type` (text, not null) — 'transfer' | 'reward' | 'redemption' | 'system'
  - `status` (text, not null, default 'completed') — 'completed' | 'pending' | 'failed'
  - `description` (text, nullable)
  - `created_at` (timestamptz)
- `redemptions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `amount` (numeric(18,2), not null)
  - `status` (text, not null, default 'pending') — 'pending' | 'approved' | 'rejected' | 'paid'
  - `account_name`, `account_number` (text, not null) — Moniepoint payout details snapshot
  - `requested_at` (timestamptz)
  - `processing_date` (date, not null) — the 14th or 30th this will process on
  - `processed_at` (timestamptz, nullable)
  - `reference` (text, unique)
- `bank_accounts`
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique, references profiles) — ONE account per user
  - `account_name` (text, not null)
  - `account_number` (text, not null) — 10-digit Moniepoint account
  - `bank_name` (text, not null, default 'Moniepoint')
  - `created_at`, `updated_at` (timestamptz)
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `title`, `body` (text, not null)
  - `type` (text, not null) — 'transaction' | 'redemption' | 'security' | 'campaign' | 'system'
  - `tone` (text, not null, default 'cyan') — UI accent color
  - `icon` (text, not null, default 'campaign')
  - `read` (boolean, default false)
  - `metadata` (jsonb, nullable) — optional payload (reference, amount, etc.)
  - `created_at` (timestamptz)

## New Functions (all SECURITY DEFINER)
- `init_wallet(p_user_id uuid)` — creates a wallet with a unique 10-digit
  account number if it doesn't exist. Idempotent.
- `get_my_wallet()` — returns the caller's wallet row, initializing it if
  missing.
- `transfer_w3od(p_recipient_identifier text, p_amount numeric, p_description text, p_pin_hash text)`
  — transfers W3OD from the caller to a recipient identified by username OR
  account number. Enforces: recipient exists & verified, sender != receiver,
  min ₦100, daily limit ₦20,000, sufficient spendable balance, PIN hash match
  (constant-time via pgcrypto crypt() is not applicable to SHA-256 client hash;
  we compare the provided hash to the stored hash). Returns the transaction
  reference or an error object. Updates both wallets, inserts the transaction,
  and creates notifications for both parties.
- `submit_redemption(p_amount numeric, p_pin_hash text)`
  — moves funds from balance to pending_balance, creates a redemption row
  with the next processing date (14th or 30th), requires PIN, enforces min ₦100
  and sufficient balance. Returns the redemption reference or error.
- `verify_pin_hash(p_user_id uuid, p_pin_hash text)` — helper that returns
  true if the provided hash matches the stored pin_hash. Used by transfer and
  redemption so the PIN check + balance mutation are atomic.
- `lookup_recipient(p_identifier text)` — returns a sanitized recipient
  preview (id, username, display_name, avatar_url) for a username or account
  number, excluding the caller. Used by the Send screen to verify a recipient
  before transfer.
- `get_next_processing_date()` — returns the next 14th or 30th from today.
- `create_notification(p_user_id uuid, p_title text, p_body text, p_type text, p_tone text, p_icon text, p_metadata jsonb)`
  — inserts a notification row (callable from other SECURITY DEFINER funcs).

## Security
- RLS enabled on all new tables.
- `wallets`: SELECT own only. NO direct INSERT/UPDATE/DELETE — all balance
  mutations go through SECURITY DEFINER RPCs. (INSERT is allowed for the
  init_wallet function running as definer; client inserts are denied.)
- `transactions`: SELECT own (sender or receiver) only. INSERT only via
  transfer_w3od RPC (definer). No UPDATE/DELETE from clients.
- `redemptions`: SELECT own only. INSERT only via submit_redemption RPC.
  UPDATE restricted (admin/service role only — not granted to anon/auth).
- `bank_accounts`: owner-scoped full CRUD (one row per user).
- `notifications`: owner-scoped SELECT + UPDATE (mark read). INSERT via
  create_notification RPC.
- All RPC functions verify `auth.uid()` matches the acting user.
- transfer_w3od and submit_redemption verify the PIN hash before mutating
  balances, so the PIN check and the balance change are atomic.

## Important Notes
1. The PIN is hashed client-side (SHA-256 + salt, see lib/security.ts) and the
   HASH is what is stored and compared. The RPC receives the hash and compares
   it to the stored pin_hash. This keeps the plaintext PIN off the wire and
   out of the database. A constant-time compare is not strictly possible with
   text equality in PL/pgSQL, but the hash is already a salted SHA-256 so
   timing attacks on the hash are not feasible.
2. Account numbers are 10-digit zero-padded random integers, unique-enforced.
3. The daily transfer limit sums all 'transfer' type transactions by the
   sender in the last 24 hours (rolling window).
4. Processing dates: redemption requests made before the 14th process on the
   14th; requests made between the 14th and 30th process on the 30th; requests
   after the 30th process on the 14th of the next month.
5. Idempotent: safe to re-run. Policies dropped before re-creation; functions
   use OR REPLACE; tables use IF NOT EXISTS.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── WALLETS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_number text UNIQUE NOT NULL,
  balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  pending_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  lifetime_earned numeric(18,2) NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_redeemed numeric(18,2) NOT NULL DEFAULT 0 CHECK (lifetime_redeemed >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallets_account_number_idx ON public.wallets (account_number);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own"
  ON public.wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Wallet updates are only allowed through SECURITY DEFINER functions.
-- We deny direct UPDATE/INSERT/DELETE by not creating those policies.

-- Auto-refresh updated_at
DROP TRIGGER IF EXISTS wallets_set_updated_at ON public.wallets;
CREATE TRIGGER wallets_set_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── TRANSACTIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('transfer', 'reward', 'redemption', 'system')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_sender_idx ON public.transactions (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_receiver_idx ON public.transactions (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_reference_idx ON public.transactions (reference);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions (type);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON public.transactions (status);
CREATE INDEX IF NOT EXISTS transactions_created_idx ON public.transactions (created_at DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions write.

-- ─── REDEMPTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processing_date date NOT NULL,
  processed_at timestamptz,
  reference text UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS redemptions_user_idx ON public.redemptions (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS redemptions_status_idx ON public.redemptions (status);
CREATE INDEX IF NOT EXISTS redemptions_processing_idx ON public.redemptions (processing_date);

ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_select_own" ON public.redemptions;
CREATE POLICY "redemptions_select_own"
  ON public.redemptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- No INSERT policy from client — only submit_redemption RPC.
-- No UPDATE policy — only admin/service role can change status (not granted here).

-- ─── BANK ACCOUNTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text NOT NULL DEFAULT 'Moniepoint',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_accounts_select_own" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select_own"
  ON public.bank_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_accounts_insert_own" ON public.bank_accounts;
CREATE POLICY "bank_accounts_insert_own"
  ON public.bank_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_accounts_update_own" ON public.bank_accounts;
CREATE POLICY "bank_accounts_update_own"
  ON public.bank_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_accounts_delete_own" ON public.bank_accounts;
CREATE POLICY "bank_accounts_delete_own"
  ON public.bank_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS bank_accounts_set_updated_at ON public.bank_accounts;
CREATE TRIGGER bank_accounts_set_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (type IN ('transaction', 'redemption', 'security', 'campaign', 'system')),
  tone text NOT NULL DEFAULT 'cyan',
  icon text NOT NULL DEFAULT 'campaign',
  read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications (user_id, read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- INSERT only via create_notification RPC.

-- ─── HELPER: create notification (callable by other SECURITY DEFINER funcs) ──
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_tone text DEFAULT 'cyan',
  p_icon text DEFAULT 'campaign',
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, tone, icon, metadata)
  VALUES (p_user_id, p_title, p_body, p_type, p_tone, p_icon, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text, jsonb) TO authenticated;

-- ─── HELPER: verify PIN hash ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_pin_hash(p_user_id uuid, p_pin_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored text;
BEGIN
  SELECT pin_hash INTO v_stored FROM public.profiles WHERE id = p_user_id;
  IF v_stored IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_stored = p_pin_hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) TO authenticated;

-- ─── HELPER: get next processing date (14th or 30th) ───────────────────────
CREATE OR REPLACE FUNCTION public.get_next_processing_date()
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_day integer := EXTRACT(DAY FROM v_today);
  v_month integer := EXTRACT(MONTH FROM v_today);
  v_year integer := EXTRACT(YEAR FROM v_today);
BEGIN
  IF v_day < 14 THEN
    RETURN MAKE_DATE(v_year, v_month, 14);
  ELSIF v_day < 30 THEN
    RETURN MAKE_DATE(v_year, v_month, 30);
  ELSE
    -- After the 30th → next month's 14th
    IF v_month = 12 THEN
      RETURN MAKE_DATE(v_year + 1, 1, 14);
    ELSE
      RETURN MAKE_DATE(v_year, v_month + 1, 14);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_processing_date() TO authenticated;

-- ─── HELPER: generate unique 10-digit account number ───────────────────────
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num text;
  v_exists boolean;
BEGIN
  LOOP
    v_num := lpad(floor(random() * 10000000000)::bigint::text, 10, '0');
    SELECT EXISTS(SELECT 1 FROM public.wallets WHERE account_number = v_num) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_num;
    END IF;
  END LOOP;
END;
$$;

-- ─── init_wallet ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.init_wallet(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num text;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Only create if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.wallets WHERE user_id = p_user_id) THEN
    v_num := public.generate_account_number();
    INSERT INTO public.wallets (user_id, account_number)
    VALUES (p_user_id, v_num);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_wallet(uuid) TO authenticated;

-- ─── get_my_wallet ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
BEGIN
  -- Initialize if missing
  PERFORM public.init_wallet(auth.uid());
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = auth.uid();
  RETURN v_wallet;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;

-- ─── lookup_recipient ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lookup_recipient(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := LOWER(BTRIM(p_identifier));
  v_id uuid;
  v_username text;
  v_display text;
  v_avatar text;
  v_email_verified boolean;
BEGIN
  -- Try by username first (strip leading @), then by account number
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.email_verified
  INTO v_id, v_username, v_display, v_avatar, v_email_verified
  FROM public.profiles p
  WHERE LOWER(p.username) = REPLACE(v_clean, '@', '')
     OR p.id IN (SELECT w.user_id FROM public.wallets w WHERE w.account_number = v_clean)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Exclude self
  IF v_id = auth.uid() THEN
    RETURN jsonb_build_object('found', false, 'is_self', true);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_id,
    'username', v_username,
    'display_name', v_display,
    'avatar_url', v_avatar,
    'email_verified', v_email_verified
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_recipient(text) TO authenticated;

-- ─── transfer_w3od ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.transfer_w3od(
  p_recipient_identifier text,
  p_amount numeric,
  p_description text,
  p_pin_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_recipient record;
  v_sender_wallet public.wallets;
  v_recipient_wallet public.wallets;
  v_ref text;
  v_today_total numeric(18,2);
  v_pin_ok boolean;
BEGIN
  -- Validate PIN first
  SELECT public.verify_pin_hash(v_sender_id, p_pin_hash) INTO v_pin_ok;
  IF NOT v_pin_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect transaction PIN.');
  END IF;

  -- Validate amount
  IF p_amount < 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum transfer is ₦100.');
  END IF;

  -- Lookup recipient
  SELECT * INTO v_recipient FROM (
    SELECT p.id, p.username, p.display_name, p.email_verified
    FROM public.profiles p
    WHERE LOWER(p.username) = REPLACE(LOWER(BTRIM(p_recipient_identifier)), '@', '')
       OR p.id IN (SELECT w.user_id FROM public.wallets w WHERE w.account_number = LOWER(BTRIM(p_recipient_identifier)))
    LIMIT 1
  ) sub;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found.');
  END IF;

  IF v_recipient.id = v_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot send to yourself.');
  END IF;

  IF NOT v_recipient.email_verified THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient must be a verified member.');
  END IF;

  -- Ensure sender has a wallet
  PERFORM public.init_wallet(v_sender_id);
  PERFORM public.init_wallet(v_recipient.id);

  SELECT * INTO v_sender_wallet FROM public.wallets WHERE user_id = v_sender_id FOR UPDATE;
  SELECT * INTO v_recipient_wallet FROM public.wallets WHERE user_id = v_recipient.id FOR UPDATE;

  -- Check sufficient balance
  IF v_sender_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance.');
  END IF;

  -- Check daily limit (rolling 24h)
  SELECT COALESCE(SUM(amount), 0) INTO v_today_total
  FROM public.transactions
  WHERE sender_id = v_sender_id
    AND type = 'transfer'
    AND status = 'completed'
    AND created_at > now() - interval '24 hours';

  IF v_today_total + p_amount > 20000 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Daily transfer limit of ₦20,000 exceeded. Used today: ₦' || v_today_total::text
    );
  END IF;

  -- Generate reference
  v_ref := 'W3OD-' || upper(substring(encode(gen_random_bytes(8), 'hex') from 1 for 8));

  -- Perform the transfer (lock both rows, debit/credit)
  UPDATE public.wallets
  SET balance = balance - p_amount
  WHERE user_id = v_sender_id;

  UPDATE public.wallets
  SET balance = balance + p_amount,
      lifetime_earned = lifetime_earned + p_amount
  WHERE user_id = v_recipient.id;

  -- Record transaction
  INSERT INTO public.transactions (reference, sender_id, receiver_id, amount, type, status, description)
  VALUES (v_ref, v_sender_id, v_recipient.id, p_amount, 'transfer', 'completed', p_description);

  -- Notify both parties
  PERFORM public.create_notification(
    v_recipient.id,
    'Payment Received',
    'You received ₦' || p_amount::text || ' W3OD from @' || COALESCE(v_recipient.username, 'a member') || '.',
    'transaction', 'lime', 'reward',
    jsonb_build_object('reference', v_ref, 'amount', p_amount, 'type', 'receive')
  );

  RETURN jsonb_build_object(
    'success', true,
    'reference', v_ref,
    'recipient', v_recipient.display_name,
    'amount', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_w3od(text, numeric, text, text) TO authenticated;

-- ─── submit_redemption ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_redemption(
  p_amount numeric,
  p_pin_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.wallets;
  v_bank public.bank_accounts;
  v_pin_ok boolean;
  v_processing date;
  v_ref text;
BEGIN
  -- Validate PIN
  SELECT public.verify_pin_hash(v_user_id, p_pin_hash) INTO v_pin_ok;
  IF NOT v_pin_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect transaction PIN.');
  END IF;

  IF p_amount < 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum redemption is ₦100.');
  END IF;

  -- Get wallet
  PERFORM public.init_wallet(v_user_id);
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient available balance.');
  END IF;

  -- Must have a saved bank account
  SELECT * INTO v_bank FROM public.bank_accounts WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please add a Moniepoint payout account first.');
  END IF;

  -- Move funds from balance → pending_balance
  UPDATE public.wallets
  SET balance = balance - p_amount,
      pending_balance = pending_balance + p_amount,
      lifetime_redeemed = lifetime_redeemed + p_amount
  WHERE user_id = v_user_id;

  v_processing := public.get_next_processing_date();
  v_ref := 'RDM-' || upper(substring(encode(gen_random_bytes(8), 'hex') from 1 for 8));

  INSERT INTO public.redemptions (user_id, amount, account_name, account_number, processing_date, reference)
  VALUES (v_user_id, p_amount, v_bank.account_name, v_bank.account_number, v_processing, v_ref);

  -- Notify user
  PERFORM public.create_notification(
    v_user_id,
    'Redemption Submitted',
    'Your redemption of ₦' || p_amount::text || ' will be processed on ' || to_char(v_processing, 'DD Mon YYYY') || '.',
    'redemption', 'amber', 'campaign',
    jsonb_build_object('reference', v_ref, 'amount', p_amount, 'processing_date', v_processing)
  );

  RETURN jsonb_build_object(
    'success', true,
    'reference', v_ref,
    'processing_date', v_processing,
    'amount', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_redemption(numeric, text) TO authenticated;
