import React from 'react';
import { ActiveChatWindow, ChatMessage } from '../types/social';
import { User } from '../types/auth';
import { FloatingChatWindow } from './FloatingChatWindow';
import { MessageSyncEvent } from './MessengerPage';

interface FloatingChatDockProps {
  activeChats: ActiveChatWindow[];
  currentUser: User | null;
  onClose: (convId: number) => void;
  onToggleMinimize: (convId: number) => void;
  onExpandToFullscreen: (convId: number) => void;
  onSendTyping: (convId: number, isTyping: boolean, participantIds: number[]) => void;
  incomingMessage?: ChatMessage | null;
  messageEvent?: MessageSyncEvent | null;
  onlineUserIds?: number[];
  isWsConnected?: boolean;
  typingMap: Record<number, boolean>;
}

export const FloatingChatDock: React.FC<FloatingChatDockProps> = ({
  activeChats,
  currentUser,
  onClose,
  onToggleMinimize,
  onExpandToFullscreen,
  onSendTyping,
  incomingMessage,
  messageEvent,
  onlineUserIds = [],
  isWsConnected = false,
  typingMap
}) => {
  if (activeChats.length === 0) return null;

  return (
    <div className="hidden sm:flex fixed bottom-0 right-4 z-40 items-end gap-3 pointer-events-auto">
      {activeChats.map((chat) => (
        <FloatingChatWindow
          key={chat.conversationId}
          chat={chat}
          currentUser={currentUser}
          onClose={onClose}
          onToggleMinimize={onToggleMinimize}
          onExpandToFullscreen={onExpandToFullscreen}
          onSendTyping={onSendTyping}
          incomingMessage={incomingMessage}
          messageEvent={messageEvent}
          isRecipientOnline={chat.recipientId ? onlineUserIds.includes(chat.recipientId) : false}
          isWsConnected={isWsConnected}
          isRecipientTyping={typingMap[chat.conversationId] || false}
        />
      ))}
    </div>
  );
};
