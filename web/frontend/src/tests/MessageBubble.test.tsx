import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { MessageBubble } from '../components/MessageBubble';
import { ChatMessage } from '../types/chat';

describe('MessageBubble Component', () => {
  it('renders author message correctly with markdown bold', () => {
    const message: ChatMessage = {
      id: 'm1',
      sender: 'Admin',
      is_author: true,
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=admin',
      content: '👋 Xin chào! Chào mừng đến với **Sobook**',
      timestamp: '10:00 AM',
      type: 'text',
    };

    render(<MessageBubble message={message} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Sobook')).toBeInTheDocument();
  });

  it('renders guest message with color avatar', () => {
    const message: ChatMessage = {
      id: 5,
      sender: 'Thành viên Ghé Thăm',
      is_author: false,
      avatar: '',
      avatar_color: '#10B981',
      content: 'Mạng xã hội Sobook quá đẹp!',
      timestamp: '10:05 AM',
      type: 'guestbook',
      likes_count: 2,
    };

    render(<MessageBubble message={message} />);
    expect(screen.getByText('Thành viên Ghé Thăm')).toBeInTheDocument();
    expect(screen.getByText('Mạng xã hội Sobook quá đẹp!')).toBeInTheDocument();
  });
});
