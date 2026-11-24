import React from 'react';
import { Bell, X } from 'lucide-react';
import { NotificationItem } from '../types/social';

interface NotificationToastProps {
  notification: NotificationItem;
  onClose: () => void;
  onClick: (notif: NotificationItem) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onClick
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-[60] w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-top-4 fade-in duration-200"
    >
      <div
        onClick={() => onClick(notification)}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="relative shrink-0">
          <img
            src={
              notification.actor?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${notification.actor_id}`
            }
            alt={notification.actor?.display_name || notification.actor?.username || 'Actor'}
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900">
            <Bell className="w-3 h-3" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Thông báo mới
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5">
            {notification.content}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Đóng thông báo"
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
