import React, { useState, useEffect } from 'react';
import { UserCheck, UserPlus, MessageCircle, X, Check, Users } from 'lucide-react';
import { UserProfile } from '../types/social';
import { User } from '../types/auth';
import { socialApi } from '../services/socialApi';

interface FriendsTabProps {
  currentUser: User | null;
  onOpenDirectChat: (friendId: number, friendName: string, avatarUrl?: string) => void;
  onViewProfile?: (userId: number) => void;
  onOpenAuth: (mode: 'login') => void;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({
  currentUser,
  onOpenDirectChat,
  onViewProfile,
  onOpenAuth
}) => {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'requests'>('all');

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        const [fList, reqList] = await Promise.all([
          socialApi.fetchFriends(),
          socialApi.fetchIncomingRequests()
        ]);
        setFriends(fList);
        setIncomingRequests(reqList);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, [currentUser]);

  const handleAccept = async (requestId: number, friend: UserProfile) => {
    try {
      await socialApi.acceptFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setFriends((prev) => [...prev, friend]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecline = async (requestId: number) => {
    try {
      await socialApi.declineFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto min-h-[60vh]">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 ring-8 ring-blue-500/5">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
          Kết nối với bạn bè trên Sobook
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          Đăng nhập để xem danh sách bạn bè, gửi lời mời kết bạn và cùng nhau trò chuyện theo thời gian thực.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full text-sm shadow-md shadow-blue-500/20 press-tactile transition-all cursor-pointer"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Header & Segmented Pill Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-white/10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Bạn bè
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý mạng lưới bạn bè và lời mời kết bạn của bạn
          </p>
        </div>

        {/* Apple Segmented Switcher */}
        <div className="bg-slate-200/60 dark:bg-white/5 p-1 rounded-2xl flex items-center gap-1 self-start sm:self-auto border border-slate-300/40 dark:border-white/5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer press-tactile ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả bạn bè ({friends.length})
          </button>
          <button
            onClick={() => setActiveFilter('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer press-tactile flex items-center gap-1.5 ${
              activeFilter === 'requests'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Lời mời kết bạn</span>
            {incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Incoming Requests Section */}
      {(activeFilter === 'requests' || (activeFilter === 'all' && incomingRequests.length > 0)) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Lời mời kết bạn ({incomingRequests.length})
            </h3>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/70 dark:border-white/10">
              Không có lời mời kết bạn nào đang chờ.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/70 dark:border-white/10 p-4 flex flex-col gap-3.5 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        req.sender?.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${req.sender?.username || req.user_id}`
                      }
                      alt="Sender"
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200/80 dark:border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {req.sender?.display_name || req.sender?.username}
                      </h4>
                      <span className="text-xs text-slate-400">@{req.sender?.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() => handleAccept(req.id, req.sender)}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-tactile shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Chấp nhận
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-tactile cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. All Friends Grid */}
      {(activeFilter === 'all' || activeFilter === 'requests') && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Tất cả bạn bè ({friends.length})
            </h3>
          </div>

          {friends.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/70 dark:border-white/10">
              Bạn chưa có người bạn nào. Hãy tìm kiếm người dùng và gửi lời mời kết bạn!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/70 dark:border-white/10 p-4 flex flex-col gap-3.5 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div
                    onClick={() => onViewProfile && onViewProfile(f.id)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="relative">
                      <img
                        src={
                          f.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${f.username}`
                        }
                        alt={f.username}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200/80 dark:border-white/10"
                      />
                      {f.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0B0F17] shadow-xs animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {f.display_name || f.username}
                      </h4>
                      <span className="text-xs text-slate-400 block truncate">
                        {f.bio || `@${f.username}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={() =>
                        onOpenDirectChat(
                          f.id,
                          f.display_name || f.username,
                          f.avatar_url
                        )
                      }
                      className="flex-1 py-1.5 px-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all press-tactile cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Nhắn tin
                    </button>
                    <button
                      onClick={() => onViewProfile && onViewProfile(f.id)}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all press-tactile cursor-pointer"
                    >
                      Trang cá nhân
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
