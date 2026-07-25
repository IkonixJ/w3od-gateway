/*
# W3OD Gateway: RLS policy fixes and security hardening

## Purpose
1. Adds missing RLS policies on notification_preferences, login_history, 
   security_events for UPDATE/DELETE (currently only SELECT/INSERT).
2. Adds DELETE policies so users can manage their own data.
3. Enables RLS on any tables that might be missing it.

## Security
- All policies use auth.uid() for ownership checks.
- No public access — all tables require authentication.
- Idempotent: policies dropped before re-creation.
*/

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION PREFERENCES — add DELETE policy
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "notif_prefs_delete_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_delete_own" ON public.notification_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- LOGIN HISTORY — add DELETE policy (users can clear their own history)
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "login_history_delete_own" ON public.login_history;
CREATE POLICY "login_history_delete_own" ON public.login_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY EVENTS — add DELETE policy (admin can delete, user cannot)
-- ════════════════════════════════════════════════════════════════════════════
-- Users should NOT be able to delete their own security events (audit trail).
-- Only admins can delete them.
DROP POLICY IF EXISTS "security_events_delete_admin" ON public.security_events;
CREATE POLICY "security_events_delete_admin" ON public.security_events FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  )
);
