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
  const [isSearching, setIsSearching] = useState(false);

  const filteredFriends = friends.filter((f) => {
    const name = f.display_name || f.username;
    return name.toLowerCase().includes(filterQuery.toLowerCase());
  });

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-3 p-3 select-none h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
      {/* Glanceable Daily Connect Card */}
      <div className="p-3.5 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Gift className="w-3.5 h-3.5" />
          </div>
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Sinh nhật & Sự kiện
          </h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hôm nay là cơ hội tuyệt vời để kết nối và gửi lời chào đến những người bạn!
        </p>
      </div>

      <div className="border-t border-slate-200/80 dark:border-white/10" />

      {/* Người liên hệ Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Người liên hệ ({friends.length})
        </h3>
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors press-tactile cursor-pointer ${
              isSearching ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title="Tìm kiếm bạn bè"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Search Input */}
      {isSearching && (
        <div className="px-1 animate-in fade-in duration-150">
          <input
            type="text"
            placeholder="Lọc bạn bè..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-hidden focus:border-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Friends online list */}
      <div className="flex flex-col gap-0.5">
        {filteredFriends.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-slate-400">
            {filterQuery ? 'Không tìm thấy người liên hệ phù hợp.' : 'Chưa có người liên hệ nào.'}
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
                className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors press-tactile group"
              >
                <div className="relative shrink-0">
                  <img
                    src={
                      friend.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${friend.username}`
                    }
                    alt={friend.username}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-[#090B10]" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {friend.display_name || friend.username}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
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
