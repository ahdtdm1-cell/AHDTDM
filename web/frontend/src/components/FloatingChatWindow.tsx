import React, { useState, useEffect, useRef } from 'react';
import {
  X, Minus, Maximize2, Send, Image as ImageIcon,
  Smile, MoreVertical, Loader2, Undo2
} from 'lucide-react';
import { ChatMessage, ActiveChatWindow } from '../types/social';
import { User } from '../types/auth';
import { socialApi } from '../services/socialApi';

interface FloatingChatWindowProps {
  chat: ActiveChatWindow;
  currentUser: User | null;
  onClose: (convId: number) => void;
  onToggleMinimize: (convId: number) => void;
  onExpandToFullscreen: (convId: number) => void;
  onSendTyping: (convId: number, isTyping: boolean, participantIds: number[]) => void;
  incomingMessage?: ChatMessage | null;
  isRecipientTyping?: boolean;
}

export const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({
  chat,
  currentUser,
  onClose,
  onToggleMinimize,
  onExpandToFullscreen,
  onSendTyping,
  incomingMessage,
  isRecipientTyping
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Load message history
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await socialApi.fetchMessages(chat.conversationId, 0, 40);
        if (isMounted) setMessages(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [chat.conversationId]);

  // Handle incoming realtime message
  useEffect(() => {
    if (incomingMessage && incomingMessage.conversation_id === chat.conversationId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incomingMessage.id)) return prev;
        return [...prev, incomingMessage];
      });
    }
  }, [incomingMessage, chat.conversationId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (!chat.isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isRecipientTyping, chat.isMinimized]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping(chat.conversationId, true, chat.recipientId ? [chat.recipientId] : []);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(chat.conversationId, false, chat.recipientId ? [chat.recipientId] : []);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const sent = await socialApi.sendMessage(chat.conversationId, text);
      setMessages((prev) => [...prev, sent]);
      onSendTyping(chat.conversationId, false, chat.recipientId ? [chat.recipientId] : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const mediaUrl = await socialApi.uploadChatMedia(file);
      const sent = await socialApi.sendMessage(chat.conversationId, undefined, mediaUrl, 'image');
      setMessages((prev) => [...prev, sent]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUnsend = async (msgId: number) => {
    try {
      const updated = await socialApi.unsendMessage(msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = async (msgId: number, emoji: string) => {
    try {
      await socialApi.reactToMessage(msgId, emoji);
      // Refresh messages
      const data = await socialApi.fetchMessages(chat.conversationId, 0, 40);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`w-80 bg-white/95 dark:bg-[#0C1017]/95 backdrop-blur-xl rounded-t-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden transition-all duration-200 ${
        chat.isMinimized ? 'h-11' : 'h-104'
      }`}
    >
      {/* Header */}
      <div
        onClick={() => onToggleMinimize(chat.conversationId)}
        className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <img
              src={chat.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.conversationId}`}
              alt={chat.title || chat.recipientName || 'Chat'}
              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white dark:ring-[#0C1017]" />
          </div>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate tracking-tight">
            {chat.title || chat.recipientName || 'Trò chuyện'}
          </span>
        </div>

        <div className="flex items-center gap-0.5 text-slate-400">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpandToFullscreen(chat.conversationId);
            }}
            title="Mở toàn màn hình"
            className="w-6 h-6 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 flex items-center justify-center transition-colors press-tactile cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMinimize(chat.conversationId);
            }}
            title="Thu nhỏ"
            className="w-6 h-6 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 flex items-center justify-center transition-colors press-tactile cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(chat.conversationId);
            }}
            title="Đóng chat"
            className="w-6 h-6 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/20 flex items-center justify-center hover:text-rose-500 transition-colors press-tactile cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body & Messages */}
      {!chat.isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <p>Hãy gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = currentUser && m.sender_id === currentUser.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex items-end gap-1.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && (
                        <img
                          src={
                            m.sender?.avatar_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${m.sender_id}`
                          }
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover shrink-0 mb-0.5"
                        />
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 text-xs break-words shadow-2xs relative ${
                          m.is_unsent
                            ? 'bg-slate-200/80 dark:bg-white/10 text-slate-400 italic'
                            : isMe
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-white dark:bg-white/10 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-white/10 rounded-bl-xs'
                        }`}
                      >
                        {m.media_url && !m.is_unsent && (
                          <div className="rounded-xl overflow-hidden mb-1 max-w-[200px]">
                            <img src={m.media_url} alt="Attachment" className="w-full object-cover" />
                          </div>
                        )}
                        {m.content && <p>{m.content}</p>}

                        {/* Reaction badges */}
                        {m.reactions && m.reactions.length > 0 && (
                          <div className="absolute -bottom-2 right-1 bg-white dark:bg-[#0C1017] rounded-full px-1.5 py-0.2 shadow-xs border border-slate-200 dark:border-white/10 text-[10px] flex items-center gap-0.5">
                            {m.reactions.map((r) => r.emoji).join('')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick message actions on hover */}
                    {!m.is_unsent && (
                      <div
                        className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-0.5 px-1 text-[10px] text-slate-400 transition-opacity ${
                          isMe ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={() => handleReact(m.id, '❤️')}
                          title="Thả tim"
                          className="hover:scale-120 transition-transform cursor-pointer"
                        >
                          ❤️
                        </button>
                        <button
                          onClick={() => handleReact(m.id, '👍')}
                          title="Thích"
                          className="hover:scale-120 transition-transform cursor-pointer"
                        >
                          👍
                        </button>
                        {isMe && (
                          <button
                            onClick={() => handleUnsend(m.id)}
                            title="Thu hồi tin nhắn"
                            className="hover:text-rose-500 transition-colors cursor-pointer ml-1"
                          >
                            <Undo2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {isRecipientTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                <span>Đối phương đang soạn tin nhắn...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input toolbar */}
          <form
            onSubmit={handleSendMessage}
            className="p-2 border-t border-slate-100 dark:border-white/10 bg-white/90 dark:bg-[#0C1017]/90 flex items-center gap-1.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Đính kèm ảnh"
              className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors press-tactile cursor-pointer shrink-0"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <ImageIcon className="w-4 h-4 text-emerald-500" />
              )}
            </button>

            <input
              type="text"
              placeholder="Aa..."
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 bg-slate-100/80 dark:bg-white/5 rounded-full px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-[#090B10] transition-all"
            />

            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="w-7 h-7 rounded-full text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center disabled:opacity-40 transition-all press-tactile cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
