/*
# Security Advisor Hardening

## Purpose
Addresses findings reported by the Supabase Security Advisor:

1. Function `public.set_updated_at` has a role-mutable search_path.
2. Three INSERT policies (`email_otps_insert_any`, `login_attempts_insert_any`,
   `login_history_insert_any`) use `WITH CHECK (true)`, bypassing RLS.
3. Public buckets `avatars` and `event-photos` have broad SELECT policies on
   `storage.objects` that allow listing every file in the bucket.
4. Many SECURITY DEFINER functions are executable by `anon` (and some admin
   functions by all `authenticated`), exposing privileged RPC endpoints.

## Changes

### 1. set_updated_at — pinned search_path
- Recreated with `SET search_path = public, pg_temp` so a role cannot redirect
  unqualified resolution via a mutable search_path. Body unchanged.

### 2. INSERT policies tightened
- `email_otps_insert_any`: keep `TO anon, authenticated` (OTP requests happen
  before sign-in) but add a WITH CHECK that requires a valid email + purpose.
- `login_attempts_insert_any`: owned rows must match auth.uid(); anonymous
  failed-attempt rows (user_id NULL, success false) still allowed.
- `login_history_insert_any`: same ownership pattern.

### 3. Public bucket listing removed
- `avatars_read_public` and `event_photos_bucket_read` dropped. Public bucket
  objects remain readable via their public URL; folder-scoped owner policies
  remain for authenticated upload/read. Stops bucket-wide listing.

### 4. SECURITY DEFINER function execution locked down
- REVOKE EXECUTE FROM PUBLIC + GRANT TO authenticated on every flagged
  function, except a small set of pre-auth helpers that stay anon-callable
  (create_otp, verify_otp, consume_invite_code, is_username_taken,
  get_login_lock_status, increment_login_failures, reset_login_failures,
  refund_invite_code). Admin functions keep authenticated-only since they
  have internal role='admin' checks and the admin UI calls them post-sign-in.

## Important Notes
1. No tables, columns, or data dropped/renamed. Only policies, grants, one fn.
2. Idempotent: policies dropped before re-creation; grants REVOKE + GRANT.
3. Frontend login/OTP/invite flows continue to work (pre-auth helpers stay anon).
*/

-- ─── 1. set_updated_at pinned search_path ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── 2a. email_otps INSERT policy ──────────────────────────────────────────
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_otps_insert_any" ON public.email_otps;
CREATE POLICY "email_otps_insert_any"
  ON public.email_otps FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND purpose IN ('signup', 'login', 'reset')
  );

-- ─── 2b. login_attempts INSERT policy ──────────────────────────────────────
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_attempts_insert_any" ON public.login_attempts;
CREATE POLICY "login_attempts_insert_any"
  ON public.login_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (user_id IS NULL AND success = false)
  );

-- ─── 2c. login_history INSERT policy ───────────────────────────────────────
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_history_insert_any" ON public.login_history;
CREATE POLICY "login_history_insert_any"
  ON public.login_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR (user_id IS NULL AND success = false)
  );

-- ─── 3. Remove broad public-bucket SELECT policies ─────────────────────────
DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;
DROP POLICY IF EXISTS "event_photos_bucket_read" ON storage.objects;

-- ─── 4. Revoke anon execute on SECURITY DEFINER functions ──────────────────
REVOKE EXECUTE ON FUNCTION public.add_admin_note(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_admin_note(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.add_group_member(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_group_member(uuid, uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_bulk_approve_redemptions(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bulk_approve_redemptions(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_credit_campaign_participants(uuid, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_credit_campaign_participants(uuid, numeric, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_credit_multiple(uuid[], numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_credit_multiple(uuid[], numeric, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_credit_reward(uuid, numeric, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_credit_reward(uuid, numeric, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_export_payout_list() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_export_payout_list() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_pending_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_deletions() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_restore_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_account(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_review_redemption(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_redemption(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_ticket(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_ticket(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_rsvp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_rsvp(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.change_email(text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_email(text, boolean, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.change_transaction_pin(text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_transaction_pin(text, boolean, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.change_username(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_username(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_in_event(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_event(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.clear_typing(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_typing(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.close_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_event(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.close_support_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_support_ticket(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_announcement(text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_announcement(text, text, text, timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_announcement_post(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_announcement_post(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_campaign(text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_campaign(text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_event(text, text, text, timestamptz, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_event(text, text, text, timestamptz, text, text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_group(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_invite_code(integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invite_code(integer, timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_notification(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.disable_invite_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_invite_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.end_campaign(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_campaign(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_account_number() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_all_campaigns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_campaigns() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_all_tickets(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_tickets(text, text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_analytics(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics(text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_announcement_posts(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_announcement_posts(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_announcements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_announcements() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_campaign_participations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_participations(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_community_hub() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_hub() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_conversation_messages(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_deletion_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deletion_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_event_attendees(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_attendees(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_event_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_detail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_events(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_events(text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_group_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_info(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_group_messages(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_messages(uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_invite_codes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_codes() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_kyc_status_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_kyc_status_history(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_login_history(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_login_history(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_member_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_detail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_member_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_public_profile(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_badges() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_badges() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_campaigns() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_campaigns() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_events(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_events(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_groups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_groups() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_reward_receipts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_reward_receipts() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_tickets(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_tickets(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_wallet() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_notification_preferences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_preferences() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_notifications(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notifications(text, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_pending_kyc_submissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_kyc_submissions() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_recent_activity(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_activity(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_security_events(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_events(integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_support_tickets(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_support_tickets(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_ticket_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_detail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_ticket_replies(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_replies(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_unread_notification_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_badges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_badges(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.guard_profile_self_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_profile_self_update() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_pin_failure(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_pin_failure(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.init_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.init_wallet(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.join_campaign(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_campaign(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, uuid, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_password_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_password_change() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.lookup_recipient(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_recipient(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_attendance(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_attendance(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_email_verified(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_email_verified(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_transaction_sender(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_transaction_sender(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reactivate_invite_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivate_invite_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reactivate_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivate_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rename_trusted_device(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_trusted_device(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion(boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(boolean, boolean, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reset_pin_lock(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_pin_lock(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_campaign_submission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_campaign_submission(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_kyc(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_kyc(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revoke_badge(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_badge(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reward_attendees(uuid, numeric, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reward_attendees(uuid, numeric, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rsvp_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_member_directory(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_member_directory(text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_members(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_members(text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_announcement(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_announcement(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_group_message(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_group_message(uuid, text, text, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_message(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text, text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_biometric_enabled(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_biometric_enabled(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_typing(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_typing(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_user_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_pin(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sign_out_all_devices(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_out_all_devices(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_campaign_proof(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_campaign_proof(uuid, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_kyc(text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc(text, text, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_redemption(numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_redemption(numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.suspend_member(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suspend_member(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.toggle_announcement_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_announcement_reaction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.toggle_group_message_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_group_message_reaction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.transfer_w3od(text, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_w3od(text, numeric, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_campaign(uuid, text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_campaign(uuid, text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_event(uuid, text, text, text, timestamptz, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_event(uuid, text, text, text, timestamptz, text, text, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_last_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_last_active(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_ticket_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_ticket_status(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.upload_event_photo(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upload_event_photo(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) TO authenticated;

-- ─── Pre-auth helpers: keep anon callable (intentional) ────────────────────
GRANT EXECUTE ON FUNCTION public.create_otp(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_otp(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_login_lock_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_login_failures(text) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_login_failures(text) TO anon;
GRANT EXECUTE ON FUNCTION public.refund_invite_code(text) TO anon;
