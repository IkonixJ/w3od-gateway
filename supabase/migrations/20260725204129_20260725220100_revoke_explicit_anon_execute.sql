/*
# Security Advisor Hardening — Part 2: revoke explicit anon grants

## Purpose
The previous migration revoked EXECUTE FROM PUBLIC on the flagged SECURITY
DEFINER functions, but earlier migrations had also granted EXECUTE explicitly
TO anon on many of them. An explicit grant survives a PUBLIC revoke, so anon
could still call admin/user RPC functions. This migration revokes those
explicit anon grants on every function that should NOT be reachable before
sign-in.

## Changes
- REVOKE EXECUTE ... FROM anon on all non-pre-auth SECURITY DEFINER functions.
- The pre-auth helpers (create_otp, verify_otp, consume_invite_code,
  is_username_taken, get_login_lock_status, increment_login_failures,
  reset_login_failures, refund_invite_code) keep their anon grant.

## Important Notes
1. Idempotent: REVOKE is a no-op if the grant does not exist.
2. No data or schema objects are touched — only function execution grants.
*/

REVOKE EXECUTE ON FUNCTION public.add_admin_note(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_group_member(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_bulk_approve_redemptions(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_campaign_participants(uuid, numeric, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_multiple(uuid[], numeric, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_credit_reward(uuid, numeric, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_export_payout_list() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_pending_deletions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_restore_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_redemption(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_ticket(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_rsvp(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_email(text, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_transaction_pin(text, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_username(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_in_event(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_typing(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_event(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.close_support_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_announcement(text, text, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_announcement_post(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_campaign(text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_event(text, text, text, timestamptz, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_group(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_invite_code(integer, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_notification(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.disable_invite_code(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.end_campaign(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_account_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_campaigns() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_tickets(text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_analytics(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_announcement_posts(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_announcements() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_campaign_participations(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_community_hub() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_conversation_messages(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_deletion_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_event_attendees(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_event_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_events(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_group_info(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_group_messages(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invite_codes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_kyc_status_history(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_login_history(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_member_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_member_public_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_campaigns() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_events(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_groups() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_reward_receipts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_tickets(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_wallet() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_notification_preferences() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_notifications(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_kyc_submissions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_recent_activity(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_security_events(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_support_tickets(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ticket_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ticket_replies(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_notification_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_badges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_profile_self_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_pin_failure(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.init_wallet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_campaign(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_password_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_recipient(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_attendance(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_email_verified(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_transaction_sender(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reactivate_invite_code(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reactivate_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rename_trusted_device(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reply_to_ticket(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion(boolean, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_pin_lock(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_campaign_submission(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_kyc(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_badge(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_attendees(uuid, numeric, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rsvp_event(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_member_directory(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_members(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_announcement(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_group_message(uuid, text, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_message(uuid, text, text, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_biometric_enabled(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_typing(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_user_pin(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sign_out_all_devices(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_campaign_proof(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_kyc(text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_redemption(numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.suspend_member(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_announcement_reaction(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_group_message_reaction(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_w3od(text, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_campaign(uuid, text, text, text, text, numeric, integer, boolean, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_event(uuid, text, text, text, timestamptz, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_last_active(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_notification_preferences(boolean, boolean, boolean, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_ticket_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upload_event_photo(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM anon;
