import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Send, Image as ImageIcon, Smile,
  Phone, Video, Info, MoreVertical, Undo2, Loader2,
  Users as UsersIcon, Check, CheckCheck, ArrowLeft
} from 'lucide-react';
import { Conversation, ChatMessage } from '../types/social';
import { User } from '../types/auth';
import { socialApi } from '../services/socialApi';

interface MessengerPageProps {
  currentUser: User | null;
  selectedConversationId?: number | null;
  onSelectConversation: (convId: number) => void;
  incomingMessage?: ChatMessage | null;
  onSendTyping: (convId: number, isTyping: boolean, participantIds: number[]) => void;
  typingMap: Record<number, boolean>;
  onOpenAuth: (mode: 'login') => void;
}

export const MessengerPage: React.FC<MessengerPageProps> = ({
  currentUser,
  selectedConversationId,
  onSelectConversation,
  incomingMessage,
  onSendTyping,
  typingMap,
  onOpenAuth
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(selectedConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  // Sync prop changes
  useEffect(() => {
    if (selectedConversationId) {
      setActiveConvId(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Load conversations list
  useEffect(() => {
    async function loadConvs() {
      if (!currentUser) return;
      const data = await socialApi.fetchConversations();
      setConversations(data);
      if (!activeConvId && data.length > 0) {
        setActiveConvId(data[0].id);
      }
    }
    loadConvs();
  }, [currentUser]);

  // Load messages when activeConvId changes
  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!activeConvId) return;
      setIsLoadingMessages(true);
      try {
        const msgs = await socialApi.fetchMessages(activeConvId, 0, 50);
        if (isMounted) setMessages(msgs);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [activeConvId]);

  // Handle incoming realtime message
  useEffect(() => {
    if (incomingMessage) {
      if (incomingMessage.conversation_id === activeConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMessage.id)) return prev;
          return [...prev, incomingMessage];
        });
      }
      // Update snippet in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === incomingMessage.conversation_id
            ? {
                ...c,
                last_message_text: incomingMessage.content || '[Hình ảnh]',
                last_message_at: incomingMessage.created_at
              }
            : c
        )
      );
    }
  }, [incomingMessage, activeConvId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMap]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConvId) return;
    onSendTyping(activeConvId, true, []);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onSendTyping(activeConvId, false, []);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const sent = await socialApi.sendMessage(activeConvId, text);
      setMessages((prev) => [...prev, sent]);
      onSendTyping(activeConvId, false, []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    setIsUploading(true);
    try {
      const mediaUrl = await socialApi.uploadChatMedia(file);
      const sent = await socialApi.sendMessage(activeConvId, undefined, mediaUrl, 'image');
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
    if (!activeConvId) return;
    try {
      await socialApi.reactToMessage(msgId, emoji);
      const data = await socialApi.fetchMessages(activeConvId, 0, 50);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const title = c.title || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Chào mừng đến với Messenger
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-4">
          Đăng nhập để trò chuyện thời gian thực, gửi hình ảnh, biểu tượng cảm xúc và kết nối cùng bạn bè.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full text-sm shadow-md transition-colors"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-[calc(100vh-3.5rem)] overflow-hidden bg-white dark:bg-slate-950 border-x border-slate-200/80 dark:border-white/10">
      {/* 1. Left Column: Conversations List */}
      <div className={`border-r border-slate-200/80 dark:border-white/10 flex flex-col shrink-0 transition-colors duration-150 ${
        activeConvId ? 'hidden md:flex w-80 lg:w-96' : 'w-full md:w-80 lg:w-96 flex'
      }`}>
        <div className="p-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Đoạn chat</h2>
          <button
            onClick={() => setShowNewGroupModal(true)}
            title="Tạo nhóm mới"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors press-tactile cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-full px-3 py-1.5 border border-transparent focus-within:border-blue-500 transition-colors duration-150">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm trên Messenger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs sm:text-sm w-full outline-hidden text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Không tìm thấy đoạn chat nào.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    onSelectConversation(conv.id);
                  }}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors press-tactile ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={
                        conv.avatar_url ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`
                      }
                      alt={conv.title || 'Chat'}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-white/10"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {conv.title || 'Cuộc trò chuyện'}
                      </h4>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(conv.last_message_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {conv.last_message_text || 'Bắt đầu cuộc trò chuyện'}
                    </p>
                  </div>
                  {(conv.unread_count || 0) > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Column: Active Chat Window */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-950 min-w-0 ${
        activeConvId ? 'flex' : 'hidden md:flex'
      }`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-3 sm:px-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button to list */}
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 press-tactile"
                  title="Quay lại danh sách"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={
                      activeConversation.avatar_url ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.id}`
                    }
                    alt={activeConversation.title || 'Chat'}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {activeConversation.title || 'Cuộc trò chuyện'}
                  </h3>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Đang hoạt động
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-blue-600">
                <button
                  onClick={() => alert('Đang kết nối cuộc gọi thoại...')}
                  title="Bắt đầu gọi thoại"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors press-tactile cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => alert('Đang kết nối video call...')}
                  title="Bắt đầu gọi video"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors press-tactile cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDetails((prev) => !prev)}
                  title="Thông tin đoạn chat"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors press-tactile cursor-pointer text-slate-500"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-sm">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
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
                      <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                        {!isMe && (
                          <img
                            src={
                              m.sender?.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${m.sender_id}`
                            }
                            alt="Avatar"
                            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                          />
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm break-words shadow-2xs relative ${
                            m.is_unsent
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 italic'
                              : isMe
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          {m.media_url && !m.is_unsent && (
                            <div className="rounded-xl overflow-hidden mb-1.5 max-w-xs">
                              <img src={m.media_url} alt="Attachment" className="w-full object-cover" />
                            </div>
                          )}
                          {m.content && <p>{m.content}</p>}

                          {/* Reaction badge */}
                          {m.reactions && m.reactions.length > 0 && (
                            <div className="absolute -bottom-2 right-2 bg-white dark:bg-slate-800 rounded-full px-2 py-0.5 shadow-sm border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-0.5">
                              {m.reactions.map((r) => r.emoji).join('')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover action bar */}
                      {!m.is_unsent && (
                        <div
                          className={`opacity-0 group-hover:opacity-100 flex items-center gap-1.5 mt-1 px-1 text-xs text-slate-400 transition-opacity ${
                            isMe ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <button
                            onClick={() => handleReact(m.id, '❤️')}
                            className="hover:scale-120 transition-transform cursor-pointer"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleReact(m.id, '👍')}
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
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {Boolean(activeConvId && typingMap[activeConvId]) && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                  <span>Đối phương đang soạn tin nhắn...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
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
                className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-emerald-500" />
                )}
              </button>

              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-colors duration-150"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <h3 className="text-base font-bold text-slate-600 dark:text-slate-300 mb-1">
              Chọn một đoạn chat hoặc bắt đầu cuộc trò chuyện mới
            </h3>
            <p className="text-xs">Duyệt qua danh sách bên trái để mở tin nhắn.</p>
          </div>
        )}
      </div>

      {/* 3. Right Column: Conversation Details */}
      {showDetails && activeConversation && (
        <div className="w-72 border-l border-slate-200 dark:border-slate-800 hidden xl:flex flex-col p-4 bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <img
              src={
                activeConversation.avatar_url ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.id}`
              }
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 mb-2"
            />
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
              {activeConversation.title || 'Cuộc trò chuyện'}
            </h4>
            <span className="text-xs text-slate-400 mt-0.5">
              {activeConversation.is_group ? 'Nhóm chat' : 'Tin nhắn riêng tư'}
            </span>
          </div>

          {/* Participants list */}
          {activeConversation.participants && activeConversation.participants.length > 0 && (
            <div className="py-4">
              <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
                Thành viên ({activeConversation.participants.length})
              </h5>
              <div className="flex flex-col gap-2">
                {activeConversation.participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <img
                      src={
                        p.user?.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${p.user?.username || p.user_id}`
                      }
                      alt="User"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block truncate">
                        {p.user?.display_name || p.user?.username}
                      </span>
                      {p.role === 'admin' && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          Quản trị viên
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
