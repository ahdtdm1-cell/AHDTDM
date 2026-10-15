import React from 'react';
import { Home, Users, MessageCircle, BookOpen, Bookmark, Clock, UserCheck, Shield } from 'lucide-react';
import { User } from '../types/auth';

interface LeftSidebarProps {
  currentUser: User | null;
  activeTab: string;
  onSelectTab: (tab: 'feed' | 'friends' | 'messenger' | 'guestbook' | 'profile') => void;
  onOpenAuth: (mode: 'login') => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenAuth
}) => {
  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-1.5 p-3 select-none h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      {/* User profile shortcut or Sign in banner */}
      {currentUser ? (
        <div
          onClick={() => onSelectTab('profile')}
          className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors duration-150 press-tactile"
        >
          <img
            src={
              currentUser.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`
            }
            alt={currentUser.username}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
          />
          <div className="min-w-0">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block truncate">
              {currentUser.display_name || currentUser.username}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{currentUser.role || 'Thành viên'}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 mb-2 shadow-xs">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            Đăng nhập để kết bạn, chia sẻ khoảnh khắc và trò chuyện cùng mọi người.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors press-tactile cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Navigation Shortcuts */}
      <button
        onClick={() => onSelectTab('feed')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 press-tactile cursor-pointer text-left ${
          activeTab === 'feed'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          activeTab === 'feed' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
        }`}>
          <Home className="w-4 h-4" />
        </div>
        Bảng tin
      </button>

      <button
        onClick={() => onSelectTab('friends')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 press-tactile cursor-pointer text-left ${
          activeTab === 'friends'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          activeTab === 'friends' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
        }`}>
          <Users className="w-4 h-4" />
        </div>
        Bạn bè
      </button>

      <button
        onClick={() => onSelectTab('messenger')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 press-tactile cursor-pointer text-left ${
          activeTab === 'messenger'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          activeTab === 'messenger' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
        }`}>
          <MessageCircle className="w-4 h-4" />
        </div>
        Messenger
      </button>

      <button
        onClick={() => onSelectTab('guestbook')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 press-tactile cursor-pointer text-left ${
          activeTab === 'guestbook'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          activeTab === 'guestbook' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
        }`}>
          <BookOpen className="w-4 h-4" />
        </div>
        Sổ lưu bút
      </button>

      <div className="border-t border-slate-200/80 dark:border-white/10 my-2" />

      {/* Shortcuts */}
      <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors press-tactile">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <Bookmark className="w-4 h-4" />
        </div>
        Đã lưu
      </div>

      <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors press-tactile">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
        Kỷ niệm
      </div>

      <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors press-tactile">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        Bảo mật & Quyền riêng tư
      </div>

      {/* Small footer */}
      <div className="mt-auto pt-4 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed px-2">
        <p>Quyền riêng tư · Điều khoản · Trợ giúp · Sobook © 2026</p>
      </div>
    </aside>
  );
};
