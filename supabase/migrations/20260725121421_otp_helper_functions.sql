/*
# W3OD Gateway: OTP creation helper function

## Purpose
Provides a security-definer function that generates a 6-digit OTP, hashes it
using pgcrypto's crypt(), stores it in the email_otps table, and returns the
plaintext code so the edge function can send it via email.

## New Functions
- `create_otp(p_email text, p_purpose text)` — generates, hashes, stores OTP,
  returns the plaintext code. SECURITY DEFINER so anon can call it.

## Security
- SECURITY DEFINER bypasses RLS on email_otps for the insert.
- The plaintext code is only returned to the caller (edge function), never
  stored in plaintext.
*/

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_otp(p_email text, p_purpose text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_hash text;
BEGIN
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_hash := crypt(v_code, gen_salt('bf'));

  INSERT INTO public.email_otps (email, code_hash, purpose, expires_at)
  VALUES (LOWER(p_email), v_hash, p_purpose, now() + interval '10 minutes');

  RETURN v_code;
END;
$$;

-- Allow anon to call it (for signup/login/reset flows before auth)
GRANT EXECUTE ON FUNCTION public.create_otp(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_otp(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_verified(text) TO authenticated;
