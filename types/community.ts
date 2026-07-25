// Community & Messaging module data shapes.

export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'pdf' | 'document' | 'zip' | 'link';
export type ReactionScope = 'dm' | 'group';

export interface MessageReaction {
  emoji: string;
  user_id: string;
  username: string | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: MessageType;
  media_url: string | null;
  reply_to: string | null;
  read_at: string | null;
  created_at: string;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  reactions: MessageReaction[];
}

export interface ConversationSummary {
  id: string;
  other_user_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  other_email_verified: boolean;
  other_kyc_status: string;
  updated_at: string;
  last_message_body: string | null;
  last_message_type: MessageType | null;
  last_message_sender_id: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  message_type: MessageType;
  media_url: string | null;
  reply_to: string | null;
  read_by: string[];
  created_at: string;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
  reactions: MessageReaction[];
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  member_count: number;
  updated_at: string;
  last_message_body: string | null;
  last_message_type: MessageType | null;
  last_message_sender_id: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  joined_at: string;
}

export interface AnnouncementPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  media_url: string | null;
  created_at: string;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  reactions: MessageReaction[];
}

export interface CommunityHubData {
  featured_members: FeaturedMember[];
  top_contributors: FeaturedMember[];
  top_xp_earners: FeaturedMember[];
  recent_activity: ActivityEntry[];
  announcements: AnnouncementPreview[];
}

export interface FeaturedMember {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  reputation?: number;
  xp?: number;
  contribution_count?: number;
}

export interface ActivityEntry {
  type: 'member_joined' | 'campaign_completed';
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  description: string;
}

export interface AnnouncementPreview {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface DirectoryMember {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  kyc_status: string;
  xp: number;
  reputation: number;
  bio: string | null;
  created_at: string;
}

export interface MemberPublicProfile {
  success: boolean;
  error?: string;
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  kyc_status: string;
  xp: number;
  level: number;
  rank: string;
  reputation: number;
  bio: string | null;
  social_links: Record<string, string> | null;
  badges: ProfileBadge[];
  is_founding_member: boolean;
  founding_badge_id: string | null;
  member_since: string;
  invite_number: number | null;
  events_attended: number;
  campaigns_completed: number;
  referrals: number;
}

export interface ProfileBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  awarded_at: string;
}

export interface TypingIndicator {
  id: string;
  user_id: string;
  scope: ReactionScope;
  scope_id: string;
  updated_at: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
  conversation_id?: string;
  group_id?: string;
  post_id?: string;
  action?: string;
  message?: ConversationMessage | GroupMessage;
}
