import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Topbar } from '../components/Topbar';
import { PostCard } from '../components/PostCard';
import { FloatingChatWindow } from '../components/FloatingChatWindow';
import { CreatePostBox } from '../components/CreatePostBox';
import { SocialPost, ActiveChatWindow } from '../types/social';
import { User } from '../types/auth';

const mockUser: User = {
  id: 1,
  username: 'testuser',
  display_name: 'Test User',
  role: 'user',
  avatar_url: 'https://example.com/avatar.jpg',
  cover_url: null,
  bio: null,
  website_url: null,
  location: null,
  created_at: new Date().toISOString(),
  updated_at: null
};

const mockPost: SocialPost = {
  id: 101,
  author_id: 1,
  author: {
    id: 1,
    username: 'testuser',
    display_name: 'Test User',
    role: 'user',
    created_at: new Date().toISOString(),
    avatar_url: 'https://example.com/avatar.jpg'
  },
  content: 'Xin chào cộng đồng mạng xã hội SocialChat!',
  media_urls: null,
  privacy: 'public',
  created_at: new Date().toISOString(),
  likes_count: 5,
  comments_count: 2,
  shares_count: 0,
  is_pinned: false,
  user_reaction: 'like',
  reactions_breakdown: { like: 4, love: 1 }
};

describe('Social & Messenger Components', () => {
  describe('Topbar Component', () => {
    it('renders logo, navigation links, and theme toggle', () => {
      const handleSelectTab = vi.fn();
      const handleToggleTheme = vi.fn();

      render(
        <Topbar
          currentUser={mockUser}
          activeTab="feed"
          onSelectTab={handleSelectTab}
          onOpenAuth={vi.fn()}
          onLogout={vi.fn()}
          unreadNotifsCount={3}
          unreadMessagesCount={2}
          onOpenDirectChat={vi.fn()}
          isDark={true}
          onToggleTheme={handleToggleTheme}
        />
      );

      expect(screen.getByText('SocialChat')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Tìm kiếm bạn bè...')).toBeInTheDocument();
      expect(screen.getByTitle('Bảng tin')).toBeInTheDocument();
      expect(screen.getByTitle('Bạn bè')).toBeInTheDocument();
      expect(screen.getByTitle('Messenger')).toBeInTheDocument();

      const themeBtn = screen.getByTitle('Chuyển giao diện sáng');
      fireEvent.click(themeBtn);
      expect(handleToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('switches tabs on tab button click', () => {
      const handleSelectTab = vi.fn();

      render(
        <Topbar
          currentUser={mockUser}
          activeTab="feed"
          onSelectTab={handleSelectTab}
          onOpenAuth={vi.fn()}
          onLogout={vi.fn()}
          unreadNotifsCount={0}
          unreadMessagesCount={0}
          onOpenDirectChat={vi.fn()}
          isDark={false}
          onToggleTheme={vi.fn()}
        />
      );

      const friendsTab = screen.getByTitle('Bạn bè');
      fireEvent.click(friendsTab);
      expect(handleSelectTab).toHaveBeenCalledWith('friends');
    });
  });

  describe('PostCard Component', () => {
    it('renders post content, author details, and reaction stats', () => {
      render(
        <PostCard
          post={mockPost}
          currentUser={mockUser}
          onPostDeleted={vi.fn()}
          onOpenAuth={vi.fn()}
          onViewProfile={vi.fn()}
        />
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Xin chào cộng đồng mạng xã hội SocialChat!')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // total likes/reactions count
      expect(screen.getByText(/2 bình luận/i)).toBeInTheDocument();
    });

    it('allows toggling comments section', () => {
      render(
        <PostCard
          post={mockPost}
          currentUser={mockUser}
          onPostDeleted={vi.fn()}
          onOpenAuth={vi.fn()}
          onViewProfile={vi.fn()}
        />
      );

      const commentBtn = screen.getByText('Bình luận');
      fireEvent.click(commentBtn);
      expect(screen.getByPlaceholderText(/Viết bình luận/i)).toBeInTheDocument();
    });
  });

  describe('CreatePostBox Component', () => {
    it('renders prompt and allows opening full creation modal', () => {
      render(
        <CreatePostBox
          currentUser={mockUser}
          onPostCreated={vi.fn()}
          onOpenAuth={vi.fn()}
        />
      );

      expect(screen.getByText(/Test User ơi, bạn đang nghĩ gì thế\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Ảnh\/Video/i)).toBeInTheDocument();
    });
  });

  describe('FloatingChatWindow Component', () => {
    it('renders active chat window with contact name, input and action buttons', () => {
      const mockChat: ActiveChatWindow = {
        conversationId: 42,
        title: 'Alice Nguyen',
        recipientName: 'Alice Nguyen',
        avatarUrl: 'https://example.com/alice.jpg',
        recipientId: 99,
        isGroup: false,
        isMinimized: false
      };

      const handleClose = vi.fn();
      const handleMinimize = vi.fn();

      render(
        <FloatingChatWindow
          chat={mockChat}
          currentUser={mockUser}
          onClose={handleClose}
          onToggleMinimize={handleMinimize}
          onExpandToFullscreen={vi.fn()}
          onSendTyping={vi.fn()}
          isRecipientTyping={false}
        />
      );

      expect(screen.getByText('Alice Nguyen')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Aa...')).toBeInTheDocument();

      const closeBtn = screen.getByTitle('Đóng chat');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledWith(42);
    });
  });
});
