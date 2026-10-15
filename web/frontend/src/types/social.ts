export interface UserProfile {
  id: number;
  username: string;
  role: string;
  created_at: string;
  avatar_url?: string;
  cover_url?: string;
  display_name?: string;
  bio?: string;
  website_url?: string;
  location?: string;
  is_online?: boolean;
  last_seen?: string;
  updated_at?: string;
}

export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';

export interface PostComment {
  id: number;
  post_id: number;
  author_id: number;
  author?: UserProfile;
  parent_id?: number | null;
  content: string;
  media_url?: string | null;
  likes_count: number;
  created_at: string;
}

export interface SocialPost {
  id: number;
  author_id: number;
  author?: UserProfile;
  content: string;
  media_urls?: string | null; // JSON string array
  privacy: 'public' | 'friends' | 'private';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at?: string | null;
  user_reaction?: ReactionType | null;
  reactions_breakdown?: Record<string, number>;
  latest_comments?: PostComment[];
}

export interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at?: string;
  friend?: UserProfile;
  user?: UserProfile;
}

export interface ConversationParticipant {
  id: number;
  conversation_id: number;
  user_id: number;
  nickname?: string | null;
  role: 'admin' | 'member';
  last_read_message_id?: number | null;
  joined_at: string;
  user?: UserProfile;
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: string;
  user?: UserProfile;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: UserProfile;
  content?: string | null;
  message_type: 'text' | 'image' | 'file' | 'system';
  media_url?: string | null;
  reply_to_id?: number | null;
  is_unsent: boolean;
  created_at: string;
  reactions?: MessageReaction[];
}

export interface Conversation {
  id: number;
  is_group: boolean;
  title?: string | null;
  avatar_url?: string | null;
  last_message_text?: string | null;
  last_message_at: string;
  created_at: string;
  participants?: ConversationParticipant[];
  unread_count?: number;
}

export interface NotificationItem {
  id: number;
  recipient_id: number;
  actor_id: number;
  actor?: UserProfile;
  type: 'friend_request' | 'friend_accept' | 'post_reaction' | 'post_comment' | 'message';
  reference_id?: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ActiveChatWindow {
  conversationId: number;
  title: string;
  avatarUrl?: string;
  isMinimized: boolean;
  isGroup: boolean;
  recipientId?: number;
  recipientName?: string;
}
