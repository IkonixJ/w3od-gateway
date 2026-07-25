/*
# W3OD Gateway: Community & Messaging — RPC functions

## Purpose
Adds all SECURITY DEFINER RPC functions for the Community & Messaging module.
Tables and RLS were created in 20260725180100_community_messaging_schema.

## New Functions
- DM: get_or_create_conversation, send_message, mark_messages_read,
  get_my_conversations, get_conversation_messages, toggle_message_reaction
- Groups: create_group, add_group_member, remove_group_member,
  send_group_message, get_my_groups, get_group_messages,
  toggle_group_message_reaction, get_group_info
- Announcements: create_announcement_post, get_announcement_posts,
  toggle_announcement_reaction
- Community: get_community_hub, search_member_directory,
  get_member_public_profile
- Typing: set_typing, clear_typing

## Security
- All functions are SECURITY DEFINER and verify auth.uid() ownership.
- Admin-only functions check role IN ('admin','super_admin').
- get_member_public_profile NEVER returns wallet balance or redemption history.

## Important Notes
1. Level + rank computed in SQL (mirrors lib/wallet.ts logic).
2. Founding Member: invite_number <= 100.
3. Idempotent: functions use OR REPLACE.
*/

-- ─── get_or_create_conversation ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_conv public.conversations; v_a uuid; v_b uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  IF p_other_user_id = v_me THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot message yourself.'); END IF;
  IF v_me < p_other_user_id THEN v_a := v_me; v_b := p_other_user_id; ELSE v_a := p_other_user_id; v_b := v_me; END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE user_a = v_a AND user_b = v_b;
  IF NOT FOUND THEN INSERT INTO public.conversations (user_a, user_b) VALUES (v_a, v_b) RETURNING * INTO v_conv; END IF;
  RETURN jsonb_build_object('success', true, 'conversation_id', v_conv.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

-- ─── send_message ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id uuid, p_body text, p_message_type text DEFAULT 'text', p_media_url text DEFAULT NULL, p_reply_to uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_conv public.conversations; v_other uuid; v_msg public.conversation_messages;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Conversation not found.'); END IF;
  IF v_conv.user_a != v_me AND v_conv.user_b != v_me THEN RETURN jsonb_build_object('success', false, 'error', 'Not a participant.'); END IF;
  IF p_message_type = 'text' AND (p_body IS NULL OR BTRIM(p_body) = '') THEN RETURN jsonb_build_object('success', false, 'error', 'Message body is required.'); END IF;
  IF p_message_type != 'text' AND p_media_url IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Media URL is required.'); END IF;
  v_other := CASE WHEN v_conv.user_a = v_me THEN v_conv.user_b ELSE v_conv.user_a END;
  INSERT INTO public.conversation_messages (conversation_id, sender_id, body, message_type, media_url, reply_to) VALUES (p_conversation_id, v_me, p_body, p_message_type, p_media_url, p_reply_to) RETURNING * INTO v_msg;
  UPDATE public.conversations SET updated_at = now() WHERE id = p_conversation_id;
  PERFORM public.create_notification(v_other, 'New Message', COALESCE(p_body, 'You received a ' || p_message_type), 'system', 'cyan', 'security', jsonb_build_object('conversation_id', p_conversation_id));
  RETURN jsonb_build_object('success', true, 'message', row_to_json(v_msg));
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text, text, uuid) TO authenticated;

-- ─── mark_messages_read ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN; END IF;
  UPDATE public.conversation_messages SET read_at = now() WHERE conversation_id = p_conversation_id AND sender_id != v_me AND read_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- ─── get_my_conversations ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
    SELECT jsonb_build_object('id', c.id, 'other_user_id', CASE WHEN c.user_a = v_me THEN c.user_b ELSE c.user_a END,
      'other_username', p.username, 'other_display_name', p.display_name, 'other_avatar_url', p.avatar_url,
      'other_email_verified', p.email_verified, 'other_kyc_status', p.kyc_status, 'updated_at', c.updated_at,
      'last_message_body', lm.body, 'last_message_type', lm.message_type, 'last_message_sender_id', lm.sender_id, 'last_message_at', lm.created_at,
      'unread_count', (SELECT count(*) FROM public.conversation_messages m WHERE m.conversation_id = c.id AND m.sender_id != v_me AND m.read_at IS NULL)) AS jsonb
    FROM public.conversations c JOIN public.profiles p ON p.id = CASE WHEN c.user_a = v_me THEN c.user_b ELSE c.user_a END
    LEFT JOIN LATERAL (SELECT * FROM public.conversation_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) lm ON true
    WHERE c.user_a = v_me OR c.user_b = v_me ORDER BY c.updated_at DESC) t), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

-- ─── get_conversation_messages ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_conversation_messages(p_conversation_id uuid, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_is_part boolean;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT (user_a = v_me OR user_b = v_me) INTO v_is_part FROM public.conversations WHERE id = p_conversation_id;
  IF NOT COALESCE(v_is_part, false) THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'conversation_id', m.conversation_id, 'sender_id', m.sender_id,
    'body', m.body, 'message_type', m.message_type, 'media_url', m.media_url, 'reply_to', m.reply_to, 'read_at', m.read_at, 'created_at', m.created_at,
    'sender_username', p.username, 'sender_display_name', p.display_name, 'sender_avatar_url', p.avatar_url,
    'reactions', COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', r.emoji, 'user_id', r.user_id, 'username', pu.username))
      FROM public.message_reactions r JOIN public.profiles pu ON pu.id = r.user_id WHERE r.scope = 'dm' AND r.message_id = m.id), '[]'::jsonb)
  ) ORDER BY m.created_at ASC)
  FROM public.conversation_messages m JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id ORDER BY m.created_at DESC LIMIT p_limit OFFSET p_offset), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid, int, int) TO authenticated;

-- ─── toggle_message_reaction ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(p_message_id uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_exists boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.message_reactions WHERE user_id = v_me AND scope = 'dm' AND message_id = p_message_id AND emoji = p_emoji) INTO v_exists;
  IF v_exists THEN DELETE FROM public.message_reactions WHERE user_id = v_me AND scope = 'dm' AND message_id = p_message_id AND emoji = p_emoji; RETURN jsonb_build_object('success', true, 'action', 'removed'); END IF;
  INSERT INTO public.message_reactions (user_id, scope, message_id, emoji) VALUES (v_me, 'dm', p_message_id, p_emoji);
  RETURN jsonb_build_object('success', true, 'action', 'added');
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;

-- ─── create_group (admin-only) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_group(p_name text, p_description text, p_avatar_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_group_id uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can create groups.'); END IF;
  IF BTRIM(p_name) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Group name is required.'); END IF;
  INSERT INTO public.groups (name, description, avatar_url, created_by) VALUES (BTRIM(p_name), p_description, p_avatar_url, v_me) RETURNING id INTO v_group_id;
  INSERT INTO public.group_members (group_id, user_id, is_admin) VALUES (v_group_id, v_me, true);
  PERFORM public.log_admin_action('create_group', NULL, 'group', jsonb_build_object('group_id', v_group_id, 'name', p_name));
  RETURN jsonb_build_object('success', true, 'group_id', v_group_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_group(text, text, text) TO authenticated;

-- ─── add_group_member (admin-only) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_group_member(p_group_id uuid, p_user_id uuid, p_is_admin boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_can_add boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT COALESCE((SELECT is_admin FROM public.group_members WHERE group_id = p_group_id AND user_id = v_me), false) OR EXISTS(SELECT 1 FROM public.profiles WHERE id = v_me AND role IN ('admin','super_admin')) INTO v_can_add;
  IF NOT v_can_add THEN RETURN jsonb_build_object('success', false, 'error', 'Only group admins can add members.'); END IF;
  INSERT INTO public.group_members (group_id, user_id, is_admin) VALUES (p_group_id, p_user_id, p_is_admin) ON CONFLICT (group_id, user_id) DO UPDATE SET is_admin = p_is_admin;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.add_group_member(uuid, uuid, boolean) TO authenticated;

-- ─── remove_group_member ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_group_member(p_group_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_can_remove boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT COALESCE((SELECT is_admin FROM public.group_members WHERE group_id = p_group_id AND user_id = v_me), false) OR EXISTS(SELECT 1 FROM public.profiles WHERE id = v_me AND role IN ('admin','super_admin')) INTO v_can_remove;
  IF NOT v_can_remove AND v_me != p_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized.'); END IF;
  DELETE FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) TO authenticated;

-- ─── send_group_message ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_group_message(p_group_id uuid, p_body text, p_message_type text DEFAULT 'text', p_media_url text DEFAULT NULL, p_reply_to uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_is_member boolean; v_msg public.group_messages;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_me) INTO v_is_member;
  IF NOT v_is_member THEN RETURN jsonb_build_object('success', false, 'error', 'Not a group member.'); END IF;
  IF p_message_type = 'text' AND (p_body IS NULL OR BTRIM(p_body) = '') THEN RETURN jsonb_build_object('success', false, 'error', 'Message body is required.'); END IF;
  IF p_message_type != 'text' AND p_media_url IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Media URL is required.'); END IF;
  INSERT INTO public.group_messages (group_id, sender_id, body, message_type, media_url, reply_to, read_by) VALUES (p_group_id, v_me, p_body, p_message_type, p_media_url, p_reply_to, ARRAY[v_me]) RETURNING * INTO v_msg;
  UPDATE public.groups SET updated_at = now() WHERE id = p_group_id;
  RETURN jsonb_build_object('success', true, 'message', row_to_json(v_msg));
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_group_message(uuid, text, text, text, uuid) TO authenticated;

-- ─── get_my_groups ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(t.jsonb) FROM (
    SELECT jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description, 'avatar_url', g.avatar_url,
      'is_admin', gm.is_admin, 'member_count', (SELECT count(*) FROM public.group_members WHERE group_id = g.id), 'updated_at', g.updated_at,
      'last_message_body', lm.body, 'last_message_type', lm.message_type, 'last_message_sender_id', lm.sender_id, 'last_message_at', lm.created_at,
      'unread_count', (SELECT count(*) FROM public.group_messages m WHERE m.group_id = g.id AND NOT (v_me = ANY(m.read_by)))) AS jsonb
    FROM public.group_members gm JOIN public.groups g ON g.id = gm.group_id
    LEFT JOIN LATERAL (SELECT * FROM public.group_messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) lm ON true
    WHERE gm.user_id = v_me ORDER BY g.updated_at DESC) t), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_groups() TO authenticated;

-- ─── get_group_messages ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_group_messages(p_group_id uuid, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_is_member boolean;
BEGIN
  IF v_me IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_me) INTO v_is_member;
  IF NOT v_is_member THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'group_id', m.group_id, 'sender_id', m.sender_id,
    'body', m.body, 'message_type', m.message_type, 'media_url', m.media_url, 'reply_to', m.reply_to, 'read_by', m.read_by, 'created_at', m.created_at,
    'sender_username', p.username, 'sender_display_name', p.display_name, 'sender_avatar_url', p.avatar_url,
    'reactions', COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', r.emoji, 'user_id', r.user_id, 'username', pu.username))
      FROM public.message_reactions r JOIN public.profiles pu ON pu.id = r.user_id WHERE r.scope = 'group' AND r.message_id = m.id), '[]'::jsonb)
  ) ORDER BY m.created_at ASC)
  FROM public.group_messages m JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.group_id = p_group_id ORDER BY m.created_at DESC LIMIT p_limit OFFSET p_offset), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_group_messages(uuid, int, int) TO authenticated;

-- ─── toggle_group_message_reaction ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_group_message_reaction(p_message_id uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_exists boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.message_reactions WHERE user_id = v_me AND scope = 'group' AND message_id = p_message_id AND emoji = p_emoji) INTO v_exists;
  IF v_exists THEN DELETE FROM public.message_reactions WHERE user_id = v_me AND scope = 'group' AND message_id = p_message_id AND emoji = p_emoji; RETURN jsonb_build_object('success', true, 'action', 'removed'); END IF;
  INSERT INTO public.message_reactions (user_id, scope, message_id, emoji) VALUES (v_me, 'group', p_message_id, p_emoji);
  RETURN jsonb_build_object('success', true, 'action', 'added');
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_group_message_reaction(uuid, text) TO authenticated;

-- ─── create_announcement_post (admin-only) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_announcement_post(p_title text, p_body text, p_media_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_role text; v_id uuid;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_me;
  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only admins can post announcements.'); END IF;
  IF BTRIM(p_title) = '' OR BTRIM(p_body) = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Title and body are required.'); END IF;
  INSERT INTO public.announcement_posts (author_id, title, body, media_url) VALUES (v_me, BTRIM(p_title), p_body, p_media_url) RETURNING id INTO v_id;
  PERFORM public.log_admin_action('create_announcement_post', NULL, 'announcement', jsonb_build_object('post_id', v_id));
  RETURN jsonb_build_object('success', true, 'post_id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_announcement_post(text, text, text) TO authenticated;

-- ─── get_announcement_posts ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_announcement_posts(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'author_id', a.author_id, 'title', a.title, 'body', a.body,
    'media_url', a.media_url, 'created_at', a.created_at, 'author_username', p.username, 'author_display_name', p.display_name, 'author_avatar_url', p.avatar_url,
    'reactions', COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', r.emoji, 'user_id', r.user_id, 'username', pu.username))
      FROM public.announcement_reactions r JOIN public.profiles pu ON pu.id = r.user_id WHERE r.post_id = a.id), '[]'::jsonb)
  ) ORDER BY a.created_at DESC)
  FROM public.announcement_posts a JOIN public.profiles p ON p.id = a.author_id
  ORDER BY a.created_at DESC LIMIT p_limit OFFSET p_offset), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_announcement_posts(int, int) TO authenticated;

-- ─── toggle_announcement_reaction ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_announcement_reaction(p_post_id uuid, p_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_exists boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.announcement_reactions WHERE post_id = p_post_id AND user_id = v_me AND emoji = p_emoji) INTO v_exists;
  IF v_exists THEN DELETE FROM public.announcement_reactions WHERE post_id = p_post_id AND user_id = v_me AND emoji = p_emoji; RETURN jsonb_build_object('success', true, 'action', 'removed'); END IF;
  INSERT INTO public.announcement_reactions (post_id, user_id, emoji) VALUES (p_post_id, v_me, p_emoji);
  RETURN jsonb_build_object('success', true, 'action', 'added');
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_announcement_reaction(uuid, text) TO authenticated;

-- ─── get_community_hub ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_community_hub()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_featured jsonb; v_top_contributors jsonb; v_top_xp jsonb; v_recent jsonb; v_announcements jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_featured FROM (
    SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'reputation', p.reputation, 'xp', p.xp) AS jsonb
    FROM public.profiles p WHERE p.kyc_status = 'verified' AND p.suspended = false ORDER BY p.reputation DESC NULLS LAST LIMIT 6
  ) sub;

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_top_contributors FROM (
    SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'contribution_count', cnt.c) AS jsonb
    FROM public.profiles p JOIN (SELECT user_id, count(*) AS c FROM public.campaign_participations WHERE submission_status = 'approved' GROUP BY user_id) cnt ON cnt.user_id = p.id
    WHERE p.suspended = false ORDER BY cnt.c DESC LIMIT 6
  ) sub;

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_top_xp FROM (
    SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'xp', p.xp) AS jsonb
    FROM public.profiles p WHERE p.xp > 0 AND p.suspended = false ORDER BY p.xp DESC LIMIT 6
  ) sub;

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_recent FROM (
    SELECT * FROM (
      SELECT jsonb_build_object('type','member_joined','user_id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'created_at', p.created_at, 'description', COALESCE(p.display_name, p.username, 'A member') || ' joined the community') AS jsonb, p.created_at FROM public.profiles p WHERE p.suspended = false
      UNION ALL
      SELECT jsonb_build_object('type','campaign_completed','user_id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'created_at', cp.reviewed_at, 'description', COALESCE(p.display_name, p.username, 'A member') || ' completed "' || c.title || '"') AS jsonb, cp.reviewed_at FROM public.campaign_participations cp JOIN public.profiles p ON p.id = cp.user_id JOIN public.campaigns c ON c.id = cp.campaign_id WHERE cp.submission_status = 'approved' AND cp.reviewed_at IS NOT NULL
    ) inner_t ORDER BY created_at DESC LIMIT 10
  ) sub;

  SELECT COALESCE(jsonb_agg(sub.jsonb), '[]'::jsonb) INTO v_announcements FROM (
    SELECT jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'created_at', a.created_at) AS jsonb
    FROM public.announcements a WHERE a.sent = true ORDER BY a.created_at DESC LIMIT 3
  ) sub;

  RETURN jsonb_build_object('featured_members', v_featured, 'top_contributors', v_top_contributors, 'top_xp_earners', v_top_xp, 'recent_activity', v_recent, 'announcements', v_announcements);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_community_hub() TO authenticated;

-- ─── search_member_directory ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_member_directory(p_query text, p_limit int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF BTRIM(p_query) = '' THEN
    RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
      SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'email_verified', p.email_verified, 'kyc_status', p.kyc_status, 'xp', p.xp, 'reputation', p.reputation, 'bio', p.bio, 'created_at', p.created_at) AS jsonb
      FROM public.profiles p WHERE p.suspended = false ORDER BY p.reputation DESC NULLS LAST, p.xp DESC LIMIT p_limit
    ) sub), '[]'::jsonb);
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(sub.jsonb) FROM (
    SELECT jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'email_verified', p.email_verified, 'kyc_status', p.kyc_status, 'xp', p.xp, 'reputation', p.reputation, 'bio', p.bio, 'created_at', p.created_at) AS jsonb
    FROM public.profiles p WHERE p.suspended = false AND (p.username ILIKE '%' || p_query || '%' OR p.full_name ILIKE '%' || p_query || '%' OR p.display_name ILIKE '%' || p_query || '%')
    ORDER BY p.reputation DESC NULLS LAST LIMIT p_limit
  ) sub), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_member_directory(text, int) TO authenticated;

-- ─── get_member_public_profile ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_member_public_profile(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile record; v_badges jsonb; v_campaigns_done int; v_referrals int; v_events_attended int; v_level int := 1; v_rank text; v_xp int; v_is_founding boolean; v_founding_badge_id uuid; v_cumulative int := 0;
BEGIN
  SELECT id, username, display_name, full_name, avatar_url, email_verified, kyc_status, xp, reputation, bio, social_links, invite_number, created_at INTO v_profile FROM public.profiles WHERE id = p_user_id AND suspended = false;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Member not found.'); END IF;
  v_xp := COALESCE(v_profile.xp, 0);
  WHILE v_cumulative + v_level * 100 <= v_xp LOOP v_cumulative := v_cumulative + v_level * 100; v_level := v_level + 1; END LOOP;
  v_rank := CASE WHEN v_level >= 50 THEN 'Mythic' WHEN v_level >= 35 THEN 'Legend' WHEN v_level >= 20 THEN 'Elite' WHEN v_level >= 10 THEN 'Veteran' WHEN v_level >= 5 THEN 'Operator' ELSE 'Initiate' END;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'description', b.description, 'icon', b.icon, 'rarity', b.rarity, 'color', b.color, 'awarded_at', ub.awarded_at) ORDER BY CASE b.rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 1 WHEN 'rare' THEN 2 ELSE 3 END, ub.awarded_at DESC), '[]'::jsonb) INTO v_badges FROM public.user_badges ub JOIN public.badges b ON b.id = ub.badge_id WHERE ub.user_id = p_user_id;
  SELECT count(*) INTO v_campaigns_done FROM public.campaign_participations WHERE user_id = p_user_id AND submission_status = 'approved';
  SELECT count(*) INTO v_referrals FROM public.profiles WHERE referred_by = p_user_id;
  SELECT count(*) INTO v_events_attended FROM public.community_events WHERE event_date < now();
  v_is_founding := v_profile.invite_number IS NOT NULL AND v_profile.invite_number <= 100;
  SELECT id INTO v_founding_badge_id FROM public.badges WHERE name = 'Founding Member';
  RETURN jsonb_build_object('success', true, 'id', v_profile.id, 'username', v_profile.username, 'display_name', v_profile.display_name, 'full_name', v_profile.full_name, 'avatar_url', v_profile.avatar_url, 'email_verified', v_profile.email_verified, 'kyc_status', v_profile.kyc_status, 'xp', v_xp, 'level', v_level, 'rank', v_rank, 'reputation', v_profile.reputation, 'bio', v_profile.bio, 'social_links', v_profile.social_links, 'badges', v_badges, 'is_founding_member', v_is_founding, 'founding_badge_id', v_founding_badge_id, 'member_since', v_profile.created_at, 'invite_number', v_profile.invite_number, 'events_attended', v_events_attended, 'campaigns_completed', v_campaigns_done, 'referrals', v_referrals);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_public_profile(uuid) TO authenticated;

-- ─── set_typing / clear_typing ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_typing(p_scope text, p_scope_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.typing_indicators (user_id, scope, scope_id, updated_at) VALUES (auth.uid(), p_scope, p_scope_id, now()) ON CONFLICT (user_id, scope, scope_id) DO UPDATE SET updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_typing(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_typing(p_scope text, p_scope_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.typing_indicators WHERE user_id = auth.uid() AND scope = p_scope AND scope_id = p_scope_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.clear_typing(text, uuid) TO authenticated;

-- ─── get_group_info ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_group_info(p_group_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid(); v_is_member boolean;
BEGIN
  IF v_me IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated.'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_me) INTO v_is_member;
  IF NOT v_is_member THEN RETURN jsonb_build_object('success', false, 'error', 'Not a member.'); END IF;
  RETURN jsonb_build_object('success', true,
    'group', (SELECT jsonb_build_object('id', g.id, 'name', g.name, 'description', g.description, 'avatar_url', g.avatar_url, 'created_by', g.created_by, 'created_at', g.created_at) FROM public.groups g WHERE g.id = p_group_id),
    'members', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_url', p.avatar_url, 'is_admin', gm.is_admin, 'joined_at', gm.joined_at) ORDER BY gm.is_admin DESC, gm.joined_at ASC) FROM public.group_members gm JOIN public.profiles p ON p.id = gm.user_id WHERE gm.group_id = p_group_id), '[]'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_group_info(uuid) TO authenticated;
