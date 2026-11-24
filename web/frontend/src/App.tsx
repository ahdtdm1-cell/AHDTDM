import React, { useState, useEffect, useCallback } from 'react';
import { PlayCircle } from 'lucide-react';
import { Topbar } from './components/Topbar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { StoriesBar } from './components/StoriesBar';
import { CreatePostBox } from './components/CreatePostBox';
import { PostCard } from './components/PostCard';
import { ReelCard } from './components/ReelCard';
import { ReelCreator } from './components/ReelCreator';
import { FloatingChatDock } from './components/FloatingChatDock';
import { MessengerPage } from './components/MessengerPage';
import { FriendsTab } from './components/FriendsTab';
import ProfilePage from './components/ProfilePage';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NotificationToast } from './components/NotificationToast';

// Keep legacy portfolio guestbook components for the "Lưu bút" tab
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { EditMessageModal } from './components/EditMessageModal';

import { User } from './types/auth';
import { authService } from './services/authService';
import {
  SocialPost, UserProfile, ActiveChatWindow,
  ChatMessage, NotificationItem, ReelResponse
} from './types/social';
import { socialApi } from './services/socialApi';
import { useWebSocket } from './hooks/useWebSocket';
import { useNotifications } from './hooks/useNotifications';

// Legacy services for guestbook tab
import { ChatTopic, ChatMessage as LegacyChatMessage } from './types/chat';
import {
  fetchTopics, fetchTopicMessages, fetchGuestbookMessages,
  postGuestbookMessage, likeGuestbookMessage, getOrCreateUserToken
} from './services/api';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('portfolio_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
    localStorage.setItem('portfolio_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    async function verifyAuth() {
      const user = await authService.getMe();
      setCurrentUser(user);
    }
    verifyAuth();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    window.location.reload();
  };

  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'messenger' | 'guestbook' | 'profile'>('feed');
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [messengerConvId, setMessengerConvId] = useState<number | null>(null);

  // Social feed state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [reels, setReels] = useState<ReelResponse[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [highlightReelId, setHighlightReelId] = useState<number | null>(null);
  const [reelToDelete, setReelToDelete] = useState<number | null>(null);
  const [showReelCreator, setShowReelCreator] = useState(false);

  // Messenger Floating Chat Docks state
  const [activeChats, setActiveChats] = useState<ActiveChatWindow[]>([]);
  const [incomingWsMessage, setIncomingWsMessage] = useState<ChatMessage | null>(null);
  const [typingMap, setTypingMap] = useState<Record<number, boolean>>({});

  // Notifications & Unread badge
  const {
    notifications,
    unreadCount: unreadNotifsCount,
    isLoading: notificationsLoading,
    hasMore: hasMoreNotifications,
    unreadOnly: notificationsUnreadOnly,
    loadNotifications,
    loadMore: loadMoreNotifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
    remove: deleteNotification,
    clearRead: clearReadNotifications,
    handleIncoming: handleIncomingNotification
  } = useNotifications(currentUser);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [highlightPostId, setHighlightPostId] = useState<number | null>(null);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);

  // Load feed posts and friends
  const loadFeed = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const data = await socialApi.fetchPosts(0, 15);
      setPosts(data);
      setHasMorePosts(data.length >= 15);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMorePosts || posts.length === 0) return;
    setIsLoadingMore(true);
    try {
      const lastPostId = posts[posts.length - 1].id;
      const olderPosts = await socialApi.fetchPosts(0, 15, undefined, lastPostId);
      if (olderPosts.length < 15) {
        setHasMorePosts(false);
      }
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newUniquePosts = olderPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newUniquePosts];
      });
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMorePosts, posts]);

  const loadFriends = useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await socialApi.fetchFriends();
      setFriends(list);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser]);

  const loadReels = useCallback(async () => {
    setIsLoadingReels(true);
    try {
      const data = await socialApi.fetchReels(0, 10);
      setReels(data);
      setHasMoreReels(data.length >= 10);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReels(false);
    }
  }, []);

  const loadMoreReels = useCallback(async () => {
    if (isLoadingReels || !hasMoreReels || reels.length === 0) return;
    try {
      const lastReelId = reels[reels.length - 1].id;
      const olderReels = await socialApi.fetchReels(0, 10, lastReelId);
      if (olderReels.length < 10) {
        setHasMoreReels(false);
      }
      setReels((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newUniqueReels = olderReels.filter((r) => !existingIds.has(r.id));
        return [...prev, ...newUniqueReels];
      });
    } catch (err) {
      console.error('Failed to load more reels:', err);
    }
  }, [isLoadingReels, hasMoreReels, reels]);

  useEffect(() => {
    loadFeed();
    loadFriends();
    loadReels();
    if (currentUser) {
      socialApi.fetchConversations().then((convs) => {
        const unreadTotal = convs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
        setUnreadMessagesCount(unreadTotal);
      }).catch(() => {});
    }
  }, [loadFeed, loadFriends, loadReels, currentUser]);

  const openPostFromNotification = useCallback(async (postId: number) => {
    setActiveTab('feed');
    setHighlightPostId(postId);

    if (!posts.some((p) => p.id === postId)) {
      const post = await socialApi.fetchPost(postId).catch(() => null);
      if (post) {
        setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
      }
    }

    window.setTimeout(() => {
      document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    window.setTimeout(() => {
      setHighlightPostId((current) => (current === postId ? null : current));
    }, 4000);
  }, [posts]);

  const handleNotificationNavigate = useCallback((notif: NotificationItem) => {
    switch (notif.type) {
      case 'friend_request':
      case 'friend_accept':
        setActiveTab('friends');
        break;
      case 'message':
        if (notif.reference_id) {
          setMessengerConvId(notif.reference_id);
          setActiveTab('messenger');
        }
        break;
      case 'post_reaction':
      case 'post_comment':
        if (notif.reference_id) {
          void openPostFromNotification(notif.reference_id);
        }
        break;
      default:
        break;
    }
  }, [openPostFromNotification]);

  useEffect(() => {
    if (!toastNotification) return;
    const timer = window.setTimeout(() => setToastNotification(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastNotification]);

  // Realtime WebSocket Handlers
  const { isConnected, onlineUserIds, sendEvent, sendTyping } = useWebSocket({
    onChatMessage: (msg) => {
      setIncomingWsMessage(msg);
      const isOwnMessage = msg.sender_id === currentUser?.id;
      const isOpenConversation = activeTab === 'messenger' && messengerConvId === msg.conversation_id;
      if (!isOwnMessage && !isOpenConversation) {
        setUnreadMessagesCount((prev) => prev + 1);
      }
    },
    onPresenceUpdate: () => {
      loadFriends();
    },
    onNotification: (notif) => {
      const item = handleIncomingNotification(notif);
      if (item) setToastNotification(item);
    },
    onTypingIndicator: (data) => {
      setTypingMap((prev) => ({
        ...prev,
        [data.conversation_id]: data.is_typing
      }));
    },
    onNewPost: (newPost) => {
      // Refresh feed
      loadFeed();
    }
  });

  // Launch or Open Direct Chat Window (Messenger Dock)
  const handleOpenDirectChat = async (friendId: number, friendName: string, avatarUrl?: string) => {
    if (!currentUser) {
      handleOpenAuth('login');
      return;
    }
    try {
      const conv = await socialApi.getOrCreateDirectConversation(friendId);
      setActiveChats((prev) => {
        const existing = prev.find((c) => c.conversationId === conv.id);
        if (existing) {
          return prev.map((c) =>
            c.conversationId === conv.id ? { ...c, isMinimized: false } : c
          );
        }
        return [
          ...prev,
          {
            conversationId: conv.id,
            title: friendName,
            avatarUrl: avatarUrl,
            isMinimized: false,
            isGroup: false,
            recipientId: friendId
          }
        ];
      });
    } catch (err) {
      console.error('Lỗi khi mở cuộc trò chuyện:', err);
    }
  };

  const handleCloseChat = (convId: number) => {
    setActiveChats((prev) => prev.filter((c) => c.conversationId !== convId));
  };

  const handleToggleMinimizeChat = (convId: number) => {
    setActiveChats((prev) =>
      prev.map((c) =>
        c.conversationId === convId ? { ...c, isMinimized: !c.isMinimized } : c
      )
    );
  };

  const handleExpandToFullscreen = (convId: number) => {
    handleCloseChat(convId);
    setMessengerConvId(convId);
    setActiveTab('messenger');
  };

  const handleViewProfile = (userId: number | null) => {
    if (userId) {
      setSelectedProfileId(userId);
      setActiveTab('profile');
    }
  };

  const handleNewReel = (newReel: ReelResponse) => {
    setReels((prev) => [newReel, ...prev]);
  };

  const handleReelDeleted = (reelId: number) => {
    setReels((prev) => prev.filter((r) => r.id !== reelId));
    if (highlightReelId === reelId) setHighlightReelId(null);
  };

  // --- Legacy Guestbook Tab State ---
  const [legacyTopics, setLegacyTopics] = useState<ChatTopic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string>('guestbook');
  const [legacyMessages, setLegacyMessages] = useState<LegacyChatMessage[]>([]);
  const [isLegacyTyping] = useState<boolean>(false);
  const [isSendingGuestbook, setIsSendingGuestbook] = useState<boolean>(false);
  const [editingMessage, setEditingMessage] = useState<LegacyChatMessage | null>(null);
  const [isGuestbookMobileOpen, setIsGuestbookMobileOpen] = useState<boolean>(false);

  const loadGuestbookEntries = useCallback(async () => {
    try {
      const entries = await fetchGuestbookMessages();
      const mapped: LegacyChatMessage[] = entries.map((entry) => ({
        id: entry.id,
        sender: entry.author_name,
        is_author: currentUser ? entry.user_id === currentUser.id : false,
        avatar: '',
        avatar_color: entry.avatar_color,
        content: entry.content,
        timestamp: new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'guestbook',
        likes_count: entry.likes_count,
        user_token: entry.user_token,
        image: entry.image,
        user_id: entry.user_id,
        is_edited: entry.is_edited,
        edited_at: entry.edited_at,
        expires_at: entry.expires_at,
      }));
      setLegacyMessages(mapped);
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'guestbook') {
      fetchTopics().then(setLegacyTopics).catch(() => {});
      loadGuestbookEntries();
    }
  }, [activeTab, loadGuestbookEntries]);

  return (
    <div
      data-testid="app-container"
      data-theme={theme}
      className="min-h-screen bg-slate-100 dark:bg-[#07090E] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200"
    >
      {/* 1. Global Navigation Topbar */}
      <Topbar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'profile') setSelectedProfileId(currentUser?.id || null);
          setActiveTab(tab);
        }}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        unreadNotifsCount={unreadNotifsCount}
        unreadMessagesCount={unreadMessagesCount}
        onOpenDirectChat={handleOpenDirectChat}
        onViewProfile={handleViewProfile}
        isDark={theme === 'dark'}
        onToggleTheme={handleToggleTheme}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        hasMoreNotifications={hasMoreNotifications}
        notificationsUnreadOnly={notificationsUnreadOnly}
        onLoadNotifications={loadNotifications}
        onLoadMoreNotifications={loadMoreNotifications}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllNotificationsRead={markAllNotificationsRead}
        onDeleteNotification={deleteNotification}
        onClearReadNotifications={clearReadNotifications}
        onNotificationNavigate={handleNotificationNavigate}
      />

      {/* 2. Main Page Content */}
      <div className={`flex-1 flex justify-center w-full ${
        activeTab === 'messenger' || activeTab === 'guestbook' ? 'pb-0' : 'pb-20 md:pb-6'
      }`}>
        {/* TAB 1: BẢNG TIN (SOCIAL FEED) */}
        {activeTab === 'feed' && (
          <div className="flex justify-between w-full max-w-7xl">
            {/* Left Column: Navigation & Shortcuts */}
            <LeftSidebar
              currentUser={currentUser}
              activeTab={activeTab}
              onSelectTab={(tab) => {
                if (tab === 'profile') setSelectedProfileId(currentUser?.id || null);
                setActiveTab(tab);
              }}
              onOpenAuth={handleOpenAuth}
            />

            {/* Center Column: Stories, Reels, Create Post, Social Feed */}
            <main className="flex-1 max-w-2xl px-4 py-4 flex flex-col gap-4">
              <StoriesBar currentUser={currentUser} friends={friends} />

              {/* Reel Create Button */}
              {currentUser && (
                <button
                  onClick={() => setShowReelCreator(true)}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-pink-50 dark:bg-pink-900/30 border-2 border-dashed border-pink-200 dark:border-pink-700 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-all press-tactile cursor-pointer"
                >
                  <PlayCircle className="w-6 h-6 text-pink-600" />
                  <span className="font-medium text-pink-700 dark:text-pink-300">Tạo Reel mới</span>
                </button>
              )}

              {/* Reel Creator (only shown when open) */}
              <ReelCreator
                currentUser={currentUser}
                onReelCreated={handleNewReel}
                onOpenAuth={handleOpenAuth}
                isOpen={showReelCreator}
                onClose={() => setShowReelCreator(false)}
              />

              <CreatePostBox
                currentUser={currentUser}
                onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
                onOpenAuth={handleOpenAuth}
              />

              {/* Feed Stream */}
              <div className="flex flex-col gap-4">
                {isLoadingFeed ? (
                  <div className="p-12 text-center text-sm text-slate-400">
                    Đang tải bảng tin...
                  </div>
                ) : posts.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ trạng thái!
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      highlighted={highlightPostId === post.id}
                      onPostDeleted={(postId) =>
                        setPosts((prev) => prev.filter((p) => p.id !== postId))
                      }
                      onOpenAuth={handleOpenAuth}
                      onViewProfile={handleViewProfile}
                    />
                  ))
                )}

                {/* Reels Section */}
                {reels.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reels của bạn</h3>
                      <span className="text-xs text-slate-400">{reels.length} video</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {isLoadingReels ? (
                        <div className="p-8 text-center text-sm text-slate-400">
                          Đang tải reels...
                        </div>
                      ) : reels.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400">
                          Chưa có reel nào. Hãy tạo reel đầu tiên!
                        </div>
                      ) : (
                        reels.map((reel) => (
                          <ReelCard
                            key={reel.id}
                            reel={reel}
                            currentUser={currentUser}
                            highlighted={highlightReelId === reel.id}
                            onReelDeleted={handleReelDeleted}
                            onOpenAuth={handleOpenAuth}
                            onViewProfile={handleViewProfile}
                          />
                        ))
                      )}

                      {/* Load More Reels */}
                      {!isLoadingReels && reels.length > 0 && hasMoreReels && (
                        <div className="py-3 text-center">
                          <button
                            onClick={loadMoreReels}
                            disabled={isLoadingReels}
                            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition disabled:opacity-50"
                          >
                            Tải thêm reels
                          </button>
                        </div>
                      )}
                      {!hasMoreReels && reels.length > 0 && (
                        <div className="py-3 text-center text-xs text-slate-400">
                          Đã xem hết các reels.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Infinite Scroll / Load More Trigger */}
                {!isLoadingFeed && posts.length > 0 && hasMorePosts && (
                  <div className="py-4 text-center">
                    <button
                      onClick={loadMorePosts}
                      disabled={isLoadingMore}
                      className="px-6 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition disabled:opacity-50"
                    >
                      {isLoadingMore ? 'Đang tải thêm bài viết...' : 'Tải thêm bài viết cũ hơn'}
                    </button>
                  </div>
                )}
                {!hasMorePosts && posts.length > 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Bạn đã xem hết các bài viết mới nhất.
                  </div>
                )}
              </div>
            </main>

            {/* Right Column: Online Contacts */}
            <RightSidebar
              friends={friends}
              onlineUserIds={onlineUserIds}
              onOpenDirectChat={handleOpenDirectChat}
            />
          </div>
        )}

        {/* TAB 2: BẠN BÈ (FRIENDS) */}
        {activeTab === 'friends' && (
          <FriendsTab
            currentUser={currentUser}
            onOpenDirectChat={handleOpenDirectChat}
            onViewProfile={handleViewProfile}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* TAB 3: MESSENGER (FULLSCREEN MESSENGER WORKSPACE) */}
        {activeTab === 'messenger' && (
          <MessengerPage
            currentUser={currentUser}
            selectedConversationId={messengerConvId}
            onSelectConversation={(id) => setMessengerConvId(id)}
            incomingMessage={incomingWsMessage}
            onSendTyping={sendTyping}
            typingMap={typingMap}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* TAB 4: SỔ LƯU BÚT PORTFOLIO (LEGACY GUESTBOOK) */}
        {activeTab === 'guestbook' && (
          <div className="flex-1 max-w-6xl flex h-[calc(100vh-3.5rem)] overflow-hidden">
            <Sidebar
              topics={legacyTopics}
              activeTopicId={activeTopicId}
              onSelectTopic={(id) => {
                setActiveTopicId(id);
                loadGuestbookEntries();
              }}
              onlineCount={onlineUserIds.length || 1}
              isOpenMobile={isGuestbookMobileOpen}
              onCloseMobile={() => setIsGuestbookMobileOpen(false)}
              user={currentUser}
              onOpenAuthModal={() => handleOpenAuth('login')}
              onLogout={handleLogout}
              onViewProfile={handleViewProfile}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
            <main className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-[#07090E] border-l border-slate-200 dark:border-slate-800">
              <ChatWindow
                topic={legacyTopics.find((t) => t.id === activeTopicId) || null}
                messages={legacyMessages}
                isTyping={isLegacyTyping}
                onOpenMobileSidebar={() => setIsGuestbookMobileOpen(true)}
                onSendGuestbookMessage={async (name: string, content: string, color: string, image: string | null) => {
                  setIsSendingGuestbook(true);
                  try {
                    const token = getOrCreateUserToken();
                    const authorName = currentUser?.display_name || currentUser?.username || name || 'Thành viên Sobook';
                    await postGuestbookMessage({
                      author_name: authorName,
                      content,
                      avatar_color: color || '#2563EB',
                      user_token: token,
                      image: image || undefined,
                    });
                    await loadGuestbookEntries();
                  } finally {
                    setIsSendingGuestbook(false);
                  }
                }}
                onLikeGuestbookMessage={async (id: number) => {
                  const updated = await likeGuestbookMessage(id);
                  setLegacyMessages((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, likes_count: updated.likes_count } : m))
                  );
                }}
                onEditGuestbookMessage={(m: LegacyChatMessage) => setEditingMessage(m)}
                isSendingGuestbook={isSendingGuestbook}
                currentUser={currentUser}
                onViewProfile={handleViewProfile}
              />
            </main>
          </div>
        )}

        {/* TAB 5: TRANG CÁ NHÂN (PROFILE PAGE) */}
        {activeTab === 'profile' && (
          <div className="flex-1 w-full max-w-4xl py-4 px-2">
            <ProfilePage
              userId={selectedProfileId}
              onBack={() => setActiveTab('feed')}
              onOpenDirectChat={handleOpenDirectChat}
              onOpenAuth={handleOpenAuth}
            />
          </div>
        )}
      </div>

      {/* 3. Floating Messenger Chat Docks (Bottom Right) */}
      <FloatingChatDock
        activeChats={activeChats}
        currentUser={currentUser}
        onClose={handleCloseChat}
        onToggleMinimize={handleToggleMinimizeChat}
        onExpandToFullscreen={handleExpandToFullscreen}
        onSendTyping={sendTyping}
        incomingMessage={incomingWsMessage}
        typingMap={typingMap}
      />

      {/* Realtime notification toast */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
          onClick={(notif) => {
            setToastNotification(null);
            handleNotificationNavigate(notif);
          }}
        />
      )}

      {/* 4. Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          const user = authService.getUser();
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          loadFeed();
          loadFriends();
        }}
      />

      {/* 5. Legacy Edit Message Modal */}
      {editingMessage && (
        <EditMessageModal
          isOpen={true}
          onClose={() => setEditingMessage(null)}
          message={editingMessage}
          onSuccess={() => {
            setEditingMessage(null);
            loadGuestbookEntries();
          }}
        />
      )}

      {/* 6. Mobile Bottom Floating Navigation Bar (Mobile only) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'profile') setSelectedProfileId(currentUser?.id || null);
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotifsCount={unreadNotifsCount}
        onQuickPost={() => {
          if (!currentUser) {
            handleOpenAuth('login');
          } else {
            setActiveTab('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenAuth={handleOpenAuth}
      />
    </div>
  );
};

export default App;
