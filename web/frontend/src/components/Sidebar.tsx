import React, { useState } from 'react';
import { ChevronRight, X, Sun, Moon, LogIn, LogOut, ShieldCheck, UserCheck, User as UserIcon } from 'lucide-react';
import { ChatTopic } from '../types/chat';
import { User } from '../types/auth';
import { authService } from '../services/authService';
import ProfileEditForm from './ProfileEditForm';

interface SidebarProps {
  topics: ChatTopic[];
  activeTopicId: string;
  onSelectTopic: (topicId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onlineCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  user?: User | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onViewProfile?: (userId: number | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  topics,
  activeTopicId,
  onSelectTopic,
  isOpenMobile,
  onCloseMobile,
  onlineCount = 1,
  theme = 'dark',
  onToggleTheme,
  user,
  onOpenAuthModal,
  onLogout,
  onViewProfile,
}) => {
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          data-testid="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 top-14 bg-black/50 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed lg:static top-14 lg:top-0 bottom-0 lg:bottom-auto left-0 z-30 lg:z-auto w-80 max-w-[85vw] lg:w-80 lg:max-w-none h-[calc(100vh-3.5rem)] lg:h-full glass-sidebar flex flex-col transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-3.5 py-3 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            onClick={() => {
              if (user) onViewProfile?.(null);
            }}
          >
            <div className="relative shrink-0">
              {user && user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.display_name || user.username}'s avatar`}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 text-white font-bold text-sm shadow-xs">
                  {user ? (user.display_name?.charAt(0) || user.username?.charAt(0) || 'U').toUpperCase() : 'S'}
                </div>
              )}
              {(user && user.avatar_url) || (!user) ? (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              ) : null}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                {user ? (user.display_name || user.username || 'User') : 'Sobook'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {user ? (user.bio || '') : 'Cộng đồng kết nối & chia sẻ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer press-tactile flex items-center justify-center"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            )}

            {/* Profile Edit Button */}
            {user && (
              <button
                onClick={() => setIsProfileEditOpen(true)}
                title="Chỉnh sửa hồ sơ"
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Auth Profile Status Banner */}
        <div className="px-3 pt-2.5 pb-1">
          {user ? (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">{user.username}</span>
                    {user.role === 'admin' ? (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        Member
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Lưu tin nhắn vĩnh viễn</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block truncate">Tài khoản Sobook</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Đăng nhập để lưu tin nhắn</p>
                </div>
              </div>
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors press-tactile cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 inline mr-1" />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Section Title */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 light:text-slate-400">
            Danh Sách Trò Chuyện
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-900 light:bg-slate-100 border border-zinc-800/80 light:border-slate-200 text-zinc-400 light:text-slate-600 text-[10px] font-mono tabular-nums">
            {topics.length}
          </span>
        </div>

        {/* Topics List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1.5 py-1">
          {topics.map((topic) => {
            const isActive = topic.id === activeTopicId;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  onSelectTopic(topic.id);
                  onCloseMobile();
                }}
                className={`w-full p-2.5 rounded-xl flex items-start gap-2.5 transition-colors duration-150 text-left group cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/10 dark:bg-white/10 text-slate-900 dark:text-white font-medium border border-blue-600/20 dark:border-white/10'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              >
                {/* Avatar / Icon */}
                <div className="relative shrink-0 mt-0.5">
                  {topic.avatar.startsWith('http') ? (
                    <img
                      src={topic.avatar}
                      alt={topic.title}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 object-cover shadow-2xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-sm shadow-2xs">
                      {topic.avatar}
                    </div>
                  )}
                  {topic.is_online && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>

                {/* Topic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className={`text-xs font-semibold truncate tracking-tight ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {topic.title}
                    </h3>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-opacity duration-150 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                    }`}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {topic.subtitle}
                  </p>
                  <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                    {topic.last_message}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {/* Footer Info Badge */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/10">
          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">Đang truy cập:</span>
            </div>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {onlineCount} online
            </span>
          </div>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      {isProfileEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md mx-4">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa hồ sơ</h2>
                <button
                  onClick={() => setIsProfileEditOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <ProfileEditForm onClose={() => setIsProfileEditOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

