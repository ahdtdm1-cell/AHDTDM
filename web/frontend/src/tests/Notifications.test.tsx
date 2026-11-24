import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Topbar } from '../components/Topbar';
import { NotificationItem } from '../types/social';
import { User } from '../types/auth';
import { formatRelativeTime } from '../utils/time';

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

const notification: NotificationItem = {
  id: 42,
  recipient_id: 1,
  actor_id: 2,
  actor: {
    id: 2,
    username: 'alice',
    display_name: 'Alice',
    role: 'user',
    created_at: new Date().toISOString(),
    avatar_url: 'https://example.com/alice.jpg'
  },
  type: 'post_comment',
  reference_id: 101,
  content: 'Alice đã bình luận bài viết của bạn.',
  is_read: false,
  created_at: new Date().toISOString()
};

function renderTopbar(overrides: Partial<React.ComponentProps<typeof Topbar>> = {}) {
  const props: React.ComponentProps<typeof Topbar> = {
    currentUser: mockUser,
    activeTab: 'feed',
    onSelectTab: vi.fn(),
    onOpenAuth: vi.fn(),
    onLogout: vi.fn(),
    unreadNotifsCount: 1,
    unreadMessagesCount: 0,
    onOpenDirectChat: vi.fn(),
    isDark: false,
    onToggleTheme: vi.fn(),
    notifications: [notification],
    onLoadNotifications: vi.fn(),
    onMarkNotificationRead: vi.fn(),
    onNotificationNavigate: vi.fn(),
    ...overrides
  };
  return { props, ...render(<Topbar {...props} />) };
}

describe('Notification dropdown', () => {
  it('shows the unread badge and loads notifications when opened', async () => {
    const { props } = renderTopbar();

    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Thông báo'));

    await waitFor(() => expect(props.onLoadNotifications).toHaveBeenCalledWith(true));
    expect(await screen.findByText(notification.content)).toBeInTheDocument();
  });

  it('toggles the unread-only filter', async () => {
    const onLoadNotifications = vi.fn();
    renderTopbar({ onLoadNotifications });

    fireEvent.click(screen.getByTitle('Thông báo'));
    await waitFor(() => expect(onLoadNotifications).toHaveBeenCalledWith(true));

    fireEvent.click(screen.getByTitle('Chỉ hiện thông báo chưa đọc'));
    expect(onLoadNotifications).toHaveBeenLastCalledWith(true, true);
  });

  it('marks a notification read and navigates on click', async () => {
    const { props } = renderTopbar();

    fireEvent.click(screen.getByTitle('Thông báo'));
    fireEvent.click(await screen.findByText(notification.content));

    await waitFor(() => expect(props.onMarkNotificationRead).toHaveBeenCalledWith(42));
    expect(props.onNotificationNavigate).toHaveBeenCalledWith(notification);
  });

  it('deletes a notification without navigating', async () => {
    const onDeleteNotification = vi.fn();
    const { props } = renderTopbar({ onDeleteNotification });

    fireEvent.click(screen.getByTitle('Thông báo'));
    const deleteButton = await screen.findByTitle('Xóa thông báo');
    fireEvent.click(deleteButton);

    expect(onDeleteNotification).toHaveBeenCalledWith(42);
    expect(props.onNotificationNavigate).not.toHaveBeenCalled();
  });

  it('hides the badge when there are no unread notifications', () => {
    renderTopbar({ unreadNotifsCount: 0, notifications: [{ ...notification, is_read: true }] });
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});

describe('formatRelativeTime', () => {
  it('formats recent UTC timestamps without a timezone suffix', () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      .toISOString()
      .replace('Z', '');
    expect(formatRelativeTime(twoMinutesAgo)).toBe('2 phút trước');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
});
