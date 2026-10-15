import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatTopic } from '../types/chat';

describe('Sidebar Component', () => {
  const mockTopics: ChatTopic[] = [
    {
      id: 'about',
      title: '👤 Giới thiệu Sobook',
      subtitle: 'Thông tin hệ thống',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=sobook',
      type: 'portfolio',
      unread: 0,
      is_online: true,
      last_message: 'Hi',
    },
    {
      id: 'guestbook',
      title: '💬 Public Guestbook',
      subtitle: 'Sổ lưu bút',
      avatar: '👥',
      type: 'guestbook',
      unread: 0,
      is_online: true,
      last_message: 'Welcome',
    },
  ];

  it('renders author profile and topic list', () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        topics={mockTopics}
        activeTopicId="about"
        onSelectTopic={onSelect}
        isOpenMobile={false}
        onCloseMobile={() => {}}
      />
    );

    expect(screen.getByText('Sobook')).toBeInTheDocument();
    expect(screen.getByText('👤 Giới thiệu Sobook')).toBeInTheDocument();
    expect(screen.getByText('💬 Public Guestbook')).toBeInTheDocument();
  });

  it('calls onSelectTopic when a topic button is clicked', () => {
    const onSelect = vi.fn();
    render(
      <Sidebar
        topics={mockTopics}
        activeTopicId="about"
        onSelectTopic={onSelect}
        isOpenMobile={false}
        onCloseMobile={() => {}}
      />
    );

    fireEvent.click(screen.getByText('💬 Public Guestbook'));
    expect(onSelect).toHaveBeenCalledWith('guestbook');
  });
});
