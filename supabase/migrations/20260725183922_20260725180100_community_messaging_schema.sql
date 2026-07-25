/*
# W3OD Gateway: Community & Messaging — schema (tables, RLS, storage)

## Purpose
Creates all tables, indexes, RLS policies, and the chat-media storage bucket
for the Community & Messaging module. RPC functions are in a follow-up
migration so a function syntax error cannot roll back the schema.

## New Tables
- conversations (1:1 DMs), conversation_messages, message_reactions
- groups, group_members, group_messages
- announcement_posts, announcement_reactions
- typing_indicators, community_events

## Modified Tables
- profiles: adds invite_number (int, unique) + social_links (jsonb)

## New Storage Bucket
- chat-media (private) — owner-scoped upload/read/delete

## Security
- RLS on all tables. Conversations/messages: participant-scoped SELECT.
  Groups/group_members: SELECT all. Group messages: member-scoped SELECT.
  Announcement posts/reactions: SELECT all. Typing: SELECT all.
  Community events: SELECT all. All writes via SECURITY DEFINER RPCs (next migration).

## Important Notes
1. Idempotent: safe to re-run. Policies dropped before re-creation.
2. Real-time subscriptions will target conversation_messages, group_messages,
   announcement_posts, and typing_indicators.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── PROFILES: add invite_number + social_links ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'invite_number') THEN
    ALTER TABLE public.profiles ADD COLUMN invite_number integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'social_links') THEN
    ALTER TABLE public.profiles ADD COLUMN social_links jsonb;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_number_idx ON public.profiles (invite_number) WHERE invite_number IS NOT NULL;

-- ─── CONVERSATIONS (1:1 DMs) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a != user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON public.conversations (user_a);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON public.conversations (user_b);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;
CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── CONVERSATION MESSAGES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','video','voice','pdf','document','zip','link')),
  media_url text,
  reply_to uuid REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conv_messages_conv_idx ON public.conversation_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS conv_messages_sender_idx ON public.conversation_messages (sender_id);
CREATE INDEX IF NOT EXISTS conv_messages_read_idx ON public.conversation_messages (conversation_id, read_at);
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_messages_select_participant" ON public.conversation_messages;
CREATE POLICY "conv_messages_select_participant" ON public.conversation_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_messages.conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

-- ─── MESSAGE REACTIONS (DM + group) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('dm','group')),
  message_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, message_id, emoji)
);
CREATE INDEX IF NOT EXISTS message_reactions_msg_idx ON public.message_reactions (scope, message_id);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_reactions_select_all" ON public.message_reactions;
CREATE POLICY "message_reactions_select_all" ON public.message_reactions FOR SELECT TO authenticated USING (true);

-- ─── GROUPS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON public.groups (created_by);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
CREATE POLICY "groups_select_all" ON public.groups FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS groups_set_updated_at ON public.groups;
CREATE TRIGGER groups_set_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── GROUP MEMBERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_group_idx ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON public.group_members (user_id);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_select_all" ON public.group_members;
CREATE POLICY "group_members_select_all" ON public.group_members FOR SELECT TO authenticated USING (true);

-- ─── GROUP MESSAGES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','video','voice','pdf','document','zip','link')),
  media_url text,
  reply_to uuid REFERENCES public.group_messages(id) ON DELETE SET NULL,
  read_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_messages_group_idx ON public.group_messages (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS group_messages_sender_idx ON public.group_messages (sender_id);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_messages_select_member" ON public.group_messages;
CREATE POLICY "group_messages_select_member" ON public.group_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

-- ─── ANNOUNCEMENT POSTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS announcement_posts_created_idx ON public.announcement_posts (created_at DESC);
ALTER TABLE public.announcement_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcement_posts_select_all" ON public.announcement_posts;
CREATE POLICY "announcement_posts_select_all" ON public.announcement_posts FOR SELECT TO authenticated USING (true);

-- ─── ANNOUNCEMENT REACTIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.announcement_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS announcement_reactions_post_idx ON public.announcement_reactions (post_id);
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcement_reactions_select_all" ON public.announcement_reactions;
CREATE POLICY "announcement_reactions_select_all" ON public.announcement_reactions FOR SELECT TO authenticated USING (true);

-- ─── TYPING INDICATORS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('dm','group')),
  scope_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, scope_id)
);
CREATE INDEX IF NOT EXISTS typing_scope_idx ON public.typing_indicators (scope, scope_id);
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "typing_select_all" ON public.typing_indicators;
CREATE POLICY "typing_select_all" ON public.typing_indicators FOR SELECT TO authenticated USING (true);

-- ─── COMMUNITY EVENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_events_date_idx ON public.community_events (event_date DESC);
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_events_select_all" ON public.community_events;
CREATE POLICY "community_events_select_all" ON public.community_events FOR SELECT TO authenticated USING (true);

-- ─── STORAGE BUCKET: chat-media ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_media_upload_own" ON storage.objects;
CREATE POLICY "chat_media_upload_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_media_read_own" ON storage.objects;
CREATE POLICY "chat_media_read_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat_media_delete_own" ON storage.objects;
CREATE POLICY "chat_media_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
