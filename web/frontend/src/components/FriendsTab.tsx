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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Users className="w-12 h-12 text-blue-600 mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Kết nối với bạn bè trên SocialChat
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-4">
          Đăng nhập để xem danh sách bạn bè, gửi lời mời kết bạn và cùng nhau trò chuyện.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full text-sm shadow-md transition-colors"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto p-4 flex flex-col gap-6">
      {/* Header & Filter Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Bạn bè
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý danh sách kết nối và lời mời kết bạn của bạn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả bạn bè ({friends.length})
          </button>
          <button
            onClick={() => setActiveFilter('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer relative ${
              activeFilter === 'requests'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Lời mời kết bạn ({incomingRequests.length})
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. Incoming Requests Section */}
      {(activeFilter === 'requests' || (activeFilter === 'all' && incomingRequests.length > 0)) && (
        <section className="flex flex-col gap-3">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <span>Lời mời kết bạn ({incomingRequests.length})</span>
          </h3>

          {incomingRequests.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              Không có lời mời kết bạn nào đang chờ.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        req.sender?.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${req.sender?.username || req.user_id}`
                      }
                      alt="Sender"
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {req.sender?.display_name || req.sender?.username}
                      </h4>
                      <span className="text-xs text-slate-400">@{req.sender?.username}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      onClick={() => handleAccept(req.id, req.sender)}
                      className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Chấp nhận
                    </button>
                    <button
                      onClick={() => handleDecline(req.id)}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>Tất cả bạn bè ({friends.length})</span>
          </h3>

          {friends.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              Bạn chưa có người bạn nào. Hãy tìm kiếm người dùng và gửi lời mời kết bạn!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow"
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
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      {f.is_online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {f.display_name || f.username}
                      </h4>
                      <span className="text-xs text-slate-400 block truncate">
                        {f.bio || `@${f.username}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      onClick={() =>
                        onOpenDirectChat(
                          f.id,
                          f.display_name || f.username,
                          f.avatar_url
                        )
                      }
                      className="flex-1 py-1.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Nhắn tin
                    </button>
                    <button
                      onClick={() => onViewProfile && onViewProfile(f.id)}
                      className="py-1.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
