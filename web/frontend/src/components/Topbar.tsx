import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Bell, Search, Home, Users, BookOpen,
  LogOut, User as UserIcon, Moon, Sun, Check, MessageSquare
} from 'lucide-react';
import { User } from '../types/auth';
import { NotificationItem, Conversation, UserProfile } from '../types/social';
import { socialApi } from '../services/socialApi';

interface TopbarProps {
  currentUser: User | null;
  activeTab: 'feed' | 'friends' | 'messenger' | 'guestbook' | 'profile';
  onSelectTab: (tab: 'feed' | 'friends' | 'messenger' | 'guestbook' | 'profile') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  onOpenDirectChat: (friendId: number, friendName: string, avatarUrl?: string) => void;
  onViewProfile?: (userId: number) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenAuth,
  onLogout,
  unreadNotifsCount,
  unreadMessagesCount,
  onOpenDirectChat,
  onViewProfile,
  isDark,
  onToggleTheme
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMessengerDropdown, setShowMessengerDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const messengerRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (messengerRef.current && !messengerRef.current.contains(e.target as Node)) {
        setShowMessengerDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when opened
  const handleToggleNotifs = async () => {
    setShowNotifDropdown((prev) => !prev);
    setShowMessengerDropdown(false);
    setShowUserDropdown(false);
    if (!showNotifDropdown) {
      const data = await socialApi.fetchNotifications(0, 15);
      setNotifications(data);
    }
  };

  // Fetch conversations when messenger popover opened
  const handleToggleMessenger = async () => {
    setShowMessengerDropdown((prev) => !prev);
    setShowNotifDropdown(false);
    setShowUserDropdown(false);
    if (!showMessengerDropdown) {
      const data = await socialApi.fetchConversations();
      setConversations(data);
    }
  };

  // Handle live search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        setIsSearching(true);
        try {
          const results = await socialApi.searchUsers(searchQuery);
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-40 h-14 bg-white/85 dark:bg-[#090B10]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-4 flex items-center justify-between transition-colors">
      {/* Left: Brand & Search */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => onSelectTab('feed')}
          className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white hover:opacity-90 transition-opacity press-tactile shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </div>
          <span className="hidden sm:inline font-bold">Sobook</span>
        </button>

        {/* Search bar */}
        <div ref={searchRef} className="relative ml-1 sm:ml-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-full px-3 py-1.5 w-36 xs:w-44 sm:w-56 md:w-64 border border-transparent focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-950 transition-colors duration-150">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm bạn bè..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs sm:text-sm w-full outline-hidden text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-11 left-0 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mọi người
              </div>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    if (onViewProfile) onViewProfile(user.id);
                  }}
                  className="px-3 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                      alt={user.username}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    {user.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {user.display_name || user.username}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Main Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1 h-full">
        <button
          onClick={() => onSelectTab('feed')}
          title="Bảng tin"
          className={`h-full px-6 sm:px-7 flex items-center justify-center relative transition-colors duration-150 press-tactile ${
            activeTab === 'feed'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-white/5 rounded-xl my-1'
          }`}
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          {activeTab === 'feed' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('friends')}
          title="Bạn bè"
          className={`h-full px-6 sm:px-7 flex items-center justify-center relative transition-colors duration-150 press-tactile ${
            activeTab === 'friends'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-white/5 rounded-xl my-1'
          }`}
        >
          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          {activeTab === 'friends' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('messenger')}
          title="Messenger Toàn màn hình"
          className={`h-full px-6 sm:px-7 flex items-center justify-center relative transition-colors duration-150 press-tactile ${
            activeTab === 'messenger'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-white/5 rounded-xl my-1'
          }`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </div>
          {activeTab === 'messenger' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('guestbook')}
          title="Sổ Lưu Bút Portfolio"
          className={`h-full px-6 sm:px-7 flex items-center justify-center relative transition-colors duration-150 press-tactile ${
            activeTab === 'guestbook'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-white/5 rounded-xl my-1'
          }`}
        >
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          {activeTab === 'guestbook' && (
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
        </button>
      </nav>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors press-tactile cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {currentUser ? (
          <>
            {/* Messenger Popover Button */}
            <div ref={messengerRef} className="relative">
              <button
                onClick={handleToggleMessenger}
                title="Messenger"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors relative press-tactile cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Messenger Dropdown */}
              {showMessengerDropdown && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Đoạn chat</h3>
                    <button
                      onClick={() => {
                        setShowMessengerDropdown(false);
                        onSelectTab('messenger');
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Xem tất cả trong Messenger
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {conversations.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        Chưa có cuộc trò chuyện nào. Hãy bắt đầu nhắn tin với bạn bè!
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => {
                            setShowMessengerDropdown(false);
                            onSelectTab('messenger');
                          }}
                          className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors press-tactile"
                        >
                          <img
                            src={conv.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`}
                            alt={conv.title || 'Chat'}
                            className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                {conv.title || 'Cuộc trò chuyện'}
                              </span>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {conv.last_message_text || 'Bắt đầu cuộc trò chuyện'}
                            </p>
                          </div>
                          {(conv.unread_count || 0) > 0 && (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Popover Button */}
            <div ref={notifRef} className="relative">
              <button
                onClick={handleToggleNotifs}
                title="Thông báo"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors relative press-tactile cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Thông báo</h3>
                    <button
                      onClick={async () => {
                        await socialApi.markAllNotificationsRead();
                        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc tất cả
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        Bạn không có thông báo mới nào.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            if (!notif.is_read) {
                              await socialApi.markNotificationRead(notif.id);
                              setNotifications((prev) =>
                                prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
                              );
                            }
                            if (notif.type === 'friend_request') {
                              onSelectTab('friends');
                              setShowNotifDropdown(false);
                            }
                          }}
                          className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors press-tactile ${
                            !notif.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <img
                            src={
                              notif.actor?.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${notif.actor_id}`
                            }
                            alt="Actor"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">
                              {notif.content}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {!notif.is_read && (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar / Menu */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-blue-500 focus:border-blue-500 transition-colors duration-150 press-tactile cursor-pointer"
              >
                <img
                  src={
                    currentUser.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`
                  }
                  alt={currentUser.username}
                  className="w-full h-full object-cover"
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSelectTab('profile');
                    }}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer border-b border-slate-100 dark:border-slate-700/60"
                  >
                    <img
                      src={
                        currentUser.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`
                      }
                      alt={currentUser.username}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {currentUser.display_name || currentUser.username}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Xem trang cá nhân</div>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSelectTab('friends');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-slate-400" /> Bạn bè
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSelectTab('guestbook');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-slate-400" /> Sổ lưu bút Portfolio
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer mt-1 border-t border-slate-100 dark:border-slate-700/60"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-xs cursor-pointer"
            >
              Đăng ký
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
