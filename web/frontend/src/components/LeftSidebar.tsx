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
    <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-1 p-3 select-none h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      {/* User profile shortcut or Sign in banner */}
      {currentUser ? (
        <div
          onClick={() => onSelectTab('profile')}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
        >
          <img
            src={
              currentUser.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`
            }
            alt={currentUser.username}
            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div className="min-w-0">
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 block truncate">
              {currentUser.display_name || currentUser.username}
            </span>
            <span className="text-xs text-slate-400 capitalize">{currentUser.role || 'Thành viên'}</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-blue-100 dark:border-slate-700 mb-2">
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
            Đăng nhập để kết bạn, đăng bài viết và trò chuyện cùng mọi người.
          </p>
          <button
            onClick={() => onOpenAuth('login')}
            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Navigation Shortcuts */}
      <button
        onClick={() => onSelectTab('feed')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
          activeTab === 'feed'
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Home className="w-5 h-5" />
        </div>
        Bảng tin
      </button>

      <button
        onClick={() => onSelectTab('friends')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
          activeTab === 'friends'
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        Bạn bè
      </button>

      <button
        onClick={() => onSelectTab('messenger')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
          activeTab === 'messenger'
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        Messenger
      </button>

      <button
        onClick={() => onSelectTab('guestbook')}
        className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
          activeTab === 'guestbook'
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <BookOpen className="w-5 h-5" />
        </div>
        Sổ lưu bút Portfolio
      </button>

      <div className="border-t border-slate-200 dark:border-slate-800 my-2" />

      {/* Decorative shortcuts */}
      <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
          <Bookmark className="w-4 h-4" />
        </div>
        Đã lưu
      </div>

      <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
        Kỷ niệm
      </div>

      <div className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
        Bảo mật & Quyền riêng tư
      </div>

      {/* Small footer */}
      <div className="mt-auto pt-4 text-[11px] text-slate-400 leading-relaxed px-2">
        <p>Quyền riêng tư · Điều khoản · Quảng cáo · Cookies · Johnyyd © 2026</p>
      </div>
    </aside>
  );
};
