import {
  SocialPost, PostComment, ReactionType,
  Friendship, Conversation, ChatMessage,
  NotificationItem, UserProfile
} from '../types/social';

const API_BASE = '/api';

export const socialApi = {
  // --- Posts ---
  async fetchPosts(skip = 0, limit = 20, userId?: number, cursorId?: number): Promise<SocialPost[]> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const url = new URL(`${origin}${API_BASE}/posts`);
    url.searchParams.set('skip', String(skip));
    url.searchParams.set('limit', String(limit));
    if (userId) url.searchParams.set('user_id', String(userId));
    if (cursorId) url.searchParams.set('cursor_id', String(cursorId));

    const res = await fetch(url.toString(), { credentials: 'include' });
    if (!res.ok) throw new Error('Không thể tải bài viết.');
    return res.json();
  },

  async createPost(content: string, mediaUrls: string[] = [], privacy = 'public'): Promise<SocialPost> {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, media_urls: mediaUrls, privacy })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể tạo bài viết.');
    }
    return res.json();
  },

  async deletePost(postId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể xóa bài viết.');
    }
  },

  async reactToPost(postId: number, reactionType: ReactionType): Promise<{ post_id: number; likes_count: number; user_reaction: ReactionType | null }> {
    const res = await fetch(`${API_BASE}/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reaction_type: reactionType })
    });
    if (!res.ok) throw new Error('Không thể bày tỏ cảm xúc.');
    return res.json();
  },

  async addComment(postId: number, content: string, parentId?: number, mediaUrl?: string): Promise<PostComment> {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, parent_id: parentId, media_url: mediaUrl })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể gửi bình luận.');
    }
    return res.json();
  },

  async deleteComment(commentId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/posts/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Không thể xóa bình luận.');
  },

  async uploadPostMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/posts/upload-media`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    if (!res.ok) throw new Error('Không thể tải ảnh lên.');
    const data = await res.json();
    return data.url;
  },

  // --- Friends ---
  async fetchFriends(userId?: number): Promise<UserProfile[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/friends/list`);
    if (userId) url.searchParams.set('user_id', String(userId));
    const res = await fetch(url.toString(), { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  },

  async fetchIncomingRequests(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/friends/requests`, { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  },

  async sendFriendRequest(friendId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/friends/request/${friendId}`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể gửi lời mời kết bạn.');
    }
    return res.json();
  },

  async acceptFriendRequest(requestId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/friends/accept/${requestId}`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Không thể chấp nhận kết bạn.');
    return res.json();
  },

  async declineFriendRequest(requestId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/friends/decline/${requestId}`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Không thể từ chối kết bạn.');
    return res.json();
  },

  // --- Messenger ---
  async fetchConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/conversations`, { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  },

  async getOrCreateDirectConversation(userId: number): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/direct/${userId}`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Không thể mở cuộc trò chuyện.');
    return res.json();
  },

  async createGroupConversation(title: string, participantIds: number[]): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/conversations/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, participant_ids: participantIds, is_group: true })
    });
    if (!res.ok) throw new Error('Không thể tạo nhóm chat.');
    return res.json();
  },

  async fetchMessages(conversationId: number, skip = 0, limit = 50, beforeId?: number): Promise<ChatMessage[]> {
    let endpoint = `${API_BASE}/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`;
    if (beforeId) {
      endpoint += `&before_id=${beforeId}`;
    }
    const res = await fetch(endpoint, {
      credentials: 'include'
    });
    if (!res.ok) return [];
    return res.json();
  },

  async sendMessage(
    conversationId: number,
    content?: string,
    mediaUrl?: string,
    messageType = 'text',
    replyToId?: number
  ): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        content,
        media_url: mediaUrl,
        message_type: messageType,
        reply_to_id: replyToId
      })
    });
    if (!res.ok) throw new Error('Không thể gửi tin nhắn.');
    return res.json();
  },

  async unsendMessage(messageId: number): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE}/messages/${messageId}/unsend`, {
      method: 'PUT',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Không thể thu hồi tin nhắn.');
    return res.json();
  },

  async reactToMessage(messageId: number, emoji: string): Promise<any> {
    const res = await fetch(`${API_BASE}/messages/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ emoji })
    });
    if (!res.ok) throw new Error('Không thể thả cảm xúc tin nhắn.');
    return res.json();
  },

  async uploadChatMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/conversations/upload-media`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    if (!res.ok) throw new Error('Không thể tải file đính kèm.');
    const data = await res.json();
    return data.url;
  },

  // --- Notifications ---
  async fetchNotifications(skip = 0, limit = 20): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE}/notifications?skip=${skip}&limit=${limit}`, {
      credentials: 'include'
    });
    if (!res.ok) return [];
    return res.json();
  },

  async markNotificationRead(notifId: number): Promise<void> {
    await fetch(`${API_BASE}/notifications/${notifId}/read`, {
      method: 'PUT',
      credentials: 'include'
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      credentials: 'include'
    });
  },

  async fetchUnreadNotifCount(): Promise<number> {
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.unread_count || 0;
    } catch {
      return 0;
    }
  },

  // --- Search Users ---
  async searchUsers(q: string): Promise<UserProfile[]> {
    if (!q || q.trim().length === 0) return [];
    const res = await fetch(`${API_BASE}/users?search=${encodeURIComponent(q)}`, { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  }
};
