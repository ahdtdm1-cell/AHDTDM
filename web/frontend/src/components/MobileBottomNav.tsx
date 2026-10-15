import React from 'react';
import { Home, Users, MessageCircle, BookOpen, Plus } from 'lucide-react';
import { User } from '../types/auth';

interface MobileBottomNavProps {
  activeTab: 'feed' | 'friends' | 'messenger' | 'guestbook' | 'profile';
  onSelectTab: (tab: 'feed' | 'friends' | 'messenger' | 'guestbook' | 'profile') => void;
  currentUser: User | null;
  unreadMessagesCount: number;
  unreadNotifsCount?: number;
  onQuickPost?: () => void;
  onOpenAuth: (mode: 'login') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  unreadMessagesCount,
  onQuickPost,
  onOpenAuth
}) => {
  return (
    <nav
      aria-label="Điều hướng di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe pt-2 bg-white/85 dark:bg-[#090B10]/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 shadow-lg select-none transition-colors"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-12">
        {/* Feed Tab */}
        <button
          onClick={() => onSelectTab('feed')}
          className={`flex flex-col items-center justify-center relative w-12 h-11 rounded-xl transition-all press-tactile ${
            activeTab === 'feed'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Bảng tin"
          aria-label="Bảng tin"
        >
          <Home className={`w-5 h-5 transition-transform ${activeTab === 'feed' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Bảng tin</span>
          {activeTab === 'feed' && (
            <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        {/* Friends Tab */}
        <button
          onClick={() => onSelectTab('friends')}
          className={`flex flex-col items-center justify-center relative w-12 h-11 rounded-xl transition-all press-tactile ${
            activeTab === 'friends'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Bạn bè"
          aria-label="Bạn bè"
        >
          <Users className={`w-5 h-5 transition-transform ${activeTab === 'friends' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Bạn bè</span>
          {activeTab === 'friends' && (
            <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        {/* Quick Create Post Action Button (Center Pill) */}
        <button
          onClick={() => {
            if (!currentUser) {
              onOpenAuth('login');
            } else if (onQuickPost) {
              onQuickPost();
            } else {
              onSelectTab('feed');
            }
          }}
          className="flex items-center justify-center w-10 h-10 -mt-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/30 press-bounce focus:outline-hidden"
          title="Đăng bài mới"
          aria-label="Đăng bài mới"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Messenger Tab */}
        <button
          onClick={() => onSelectTab('messenger')}
          className={`flex flex-col items-center justify-center relative w-12 h-11 rounded-xl transition-all press-tactile ${
            activeTab === 'messenger'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title="Messenger"
          aria-label="Messenger"
        >
          <div className="relative">
            <MessageCircle className={`w-5 h-5 transition-transform ${activeTab === 'messenger' ? 'scale-110' : ''}`} />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-[14px] px-1 flex items-center justify-center shadow-xs animate-pulse">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Nhắn tin</span>
          {activeTab === 'messenger' && (
            <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
          )}
        </button>

        {/* Guestbook or Profile Tab */}
        <button
          onClick={() => {
            if (currentUser) {
              onSelectTab('profile');
            } else {
              onSelectTab('guestbook');
            }
          }}
          className={`flex flex-col items-center justify-center relative w-12 h-11 rounded-xl transition-all press-tactile ${
            activeTab === 'profile' || activeTab === 'guestbook'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
          title={currentUser ? 'Cá nhân' : 'Lưu bút'}
          aria-label={currentUser ? 'Cá nhân' : 'Lưu bút'}
        >
          {currentUser ? (
            <img
              src={currentUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`}
              alt={currentUser.username}
              className={`w-5 h-5 rounded-full object-cover border ${
                activeTab === 'profile' ? 'border-blue-600 dark:border-blue-400 scale-110' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
          ) : (
            <BookOpen className={`w-5 h-5 transition-transform ${activeTab === 'guestbook' ? 'scale-110' : ''}`} />
          )}
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[48px]">
            {currentUser ? 'Tôi' : 'Lưu bút'}
          </span>
          {(activeTab === 'profile' || activeTab === 'guestbook') && (
            <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
          )}
        </button>
      </div>
    </nav>
  );
};
