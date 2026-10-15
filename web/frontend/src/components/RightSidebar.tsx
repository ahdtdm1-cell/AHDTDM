import React, { useState } from 'react';
import { Search, MoreHorizontal, Gift } from 'lucide-react';
import { UserProfile } from '../types/social';

interface RightSidebarProps {
  friends: UserProfile[];
  onlineUserIds: number[];
  onOpenDirectChat: (friendId: number, friendName: string, avatarUrl?: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  friends,
  onlineUserIds,
  onOpenDirectChat
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredFriends = friends.filter((f) => {
    const name = f.display_name || f.username;
    return name.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-4 p-3 select-none h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      {/* Sinh nhật / Sự kiện Widget */}
      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Gift className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Sinh nhật & Sự kiện
          </h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Hôm nay là ngày kết nối tuyệt vời! Hãy gửi lời chào đến những người bạn của bạn.
        </p>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800" />

      {/* Người liên hệ Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-sm text-slate-600 dark:text-slate-400">Người liên hệ</h3>
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => {}}
            className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Friends online list */}
      <div className="flex flex-col gap-0.5">
        {filteredFriends.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-slate-400">
            Chưa có người liên hệ nào. Hãy thêm bạn bè để bắt đầu trò chuyện!
          </div>
        ) : (
          filteredFriends.map((friend) => {
            const isOnline = onlineUserIds.includes(friend.id) || friend.is_online;
            return (
              <div
                key={friend.id}
                onClick={() =>
                  onOpenDirectChat(
                    friend.id,
                    friend.display_name || friend.username,
                    friend.avatar_url
                  )
                }
                className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
              >
                <div className="relative">
                  <img
                    src={
                      friend.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${friend.username}`
                    }
                    alt={friend.username}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-200 block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {friend.display_name || friend.username}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isOnline ? 'Đang hoạt động' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
