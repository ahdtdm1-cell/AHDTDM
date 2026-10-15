import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { fetchUserProfile } from '../services/api';
import { User } from '../types/auth';
import { MapPin, Globe, Calendar, FileText, Users, User as UserIcon, ArrowLeft, Camera, Edit2, Key, X, Check, MessageCircle, UserPlus } from 'lucide-react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { socialApi } from '../services/socialApi';
import { SocialPost, UserProfile } from '../types/social';
import { PostCard } from './PostCard';

interface ProfilePageProps {
  userId?: number | null;
  onBack: () => void;
  onOpenDirectChat?: (friendId: number, friendName: string, avatarUrl?: string) => void;
  onOpenAuth?: (mode: 'login') => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId, onBack, onOpenDirectChat, onOpenAuth }) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Social feed on profile
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'friends'>('posts');
  const [userPosts, setUserPosts] = useState<SocialPost[]>([]);
  const [userFriends, setUserFriends] = useState<UserProfile[]>([]);
  const [friendReqSent, setFriendReqSent] = useState(false);

  // Edit states
  const currentUser = authService.getUser();
  const isOwner = profile && currentUser && profile.id === currentUser.id;

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '', website_url: '', location: '' });
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        let user;
        if (userId) {
          user = await fetchUserProfile(userId);
        } else {
          user = await authService.getMe();
        }
        setProfile(user);
        setEditForm({
          display_name: user.display_name || '',
          bio: user.bio || '',
          website_url: user.website_url || '',
          location: user.location || ''
        });
      } catch (err) {
        setError('Không thể tải thông tin hồ sơ');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (profile?.id) {
      socialApi.fetchPosts(0, 30, profile.id).then(setUserPosts).catch(() => {});
      socialApi.fetchFriends(profile.id).then(setUserFriends).catch(() => {});
    }
  }, [profile?.id]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const url = await authService.uploadCover(e.target.files[0]);
      setProfile(prev => prev ? { ...prev, cover_url: url } : null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh bìa lên');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      const url = await authService.uploadAvatar(e.target.files[0]);
      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh đại diện lên');
    }
  };

  const handleSaveInfo = async () => {
    try {
      const updatedUser = await authService.updateProfile(editForm);
      setProfile(updatedUser);
      setIsEditingInfo(false);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật hồ sơ');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const pw = passwordForm.new_password;
    if (pw.length < 8) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (!/[a-z]/.test(pw)) {
      setPasswordError('Mật khẩu mới phải chứa ít nhất 1 chữ cái viết thường.');
      return;
    }
    if (!/[A-Z]/.test(pw)) {
      setPasswordError('Mật khẩu mới phải chứa ít nhất 1 chữ cái viết hoa.');
      return;
    }
    if (!/[0-9]/.test(pw)) {
      setPasswordError('Mật khẩu mới phải chứa ít nhất 1 chữ số.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
      setPasswordError('Mật khẩu mới phải chứa ít nhất 1 ký tự đặc biệt.');
      return;
    }

    try {
      await authService.updatePassword(passwordForm.current_password, passwordForm.new_password);
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Lỗi đổi mật khẩu');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
        <span className="text-xs">Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <div className="p-6 bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg max-w-sm w-full">
          <p className="text-rose-500 font-semibold text-sm mb-4">{error || 'Không có dữ liệu hồ sơ'}</p>
          <button
            onClick={onBack}
            className="w-full py-2 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold press-tactile transition-all"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const displayName = profile.display_name || profile.username || 'User';

  return (
    <div className="flex flex-col min-h-screen pb-12 relative overflow-x-clip">
      {/* Top Header / Navigation Pill */}
      <div className="sticky top-0 z-20 apple-glass-nav border-b border-slate-200/80 dark:border-white/10 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all press-tactile cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold text-xs tracking-tight">Quay lại Bảng tin</span>
        </button>

        {isOwner && (
          <button 
            onClick={() => setIsChangingPassword(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-all press-tactile text-xs font-semibold cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Đổi mật khẩu</span>
          </button>
        )}
      </div>

      <div className="max-w-4xl w-full mx-auto relative z-0">
        {/* Cover Photo Area with smooth aspect ratio and rounded corners */}
        <div className="h-44 sm:h-60 md:h-72 w-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 sm:rounded-3xl shadow-lg relative group overflow-hidden border border-slate-200/60 dark:border-white/10 sm:mt-2">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          )}
          {isOwner && (
            <>
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all press-tactile cursor-pointer shadow-md backdrop-blur-md"
                title="Thay đổi ảnh bìa"
              >
                <Camera className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Avatar Area overlapping bottom edge */}
          <div className="absolute -bottom-12 sm:-bottom-16 left-6 sm:left-10 z-10 group/avatar">
            <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-white dark:ring-[#090B10] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xl relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${displayName}'s avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <UserIcon className="w-12 h-12 text-slate-400" />
              )}
              {isOwner && (
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity"
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            {isOwner && <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />}
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="mt-16 sm:mt-20 px-4 sm:px-8">
          {!isEditingInfo ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{displayName}</h1>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">@{profile.username}</p>
                </div>
                {isOwner ? (
                  <button 
                    onClick={() => setIsEditingInfo(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 rounded-xl transition-all font-semibold text-xs press-tactile cursor-pointer self-start sm:self-auto border border-slate-200/60 dark:border-white/5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh sửa thông tin
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {onOpenDirectChat && (
                      <button
                        onClick={() => onOpenDirectChat(profile.id, displayName, profile.avatar_url || undefined)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-semibold text-xs shadow-xs press-tactile cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Nhắn tin
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await socialApi.sendFriendRequest(profile.id);
                          setFriendReqSent(true);
                          alert('Đã gửi lời mời kết bạn!');
                        } catch (err: any) {
                          alert(err.message || 'Lỗi khi gửi lời mời.');
                        }
                      }}
                      disabled={friendReqSent}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 rounded-xl transition-all font-semibold text-xs cursor-pointer disabled:opacity-50 press-tactile border border-slate-200/60 dark:border-white/5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {friendReqSent ? 'Đã gửi lời mời' : 'Kết bạn'}
                    </button>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="mt-4 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-w-2xl text-sm leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-5 pt-4 border-t border-slate-200/70 dark:border-white/10">
                {profile.website_url && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs">
                      {profile.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                
                {profile.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tham gia: {memberSince}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 max-w-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Cập nhật thông tin</h3>
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">Tên hiển thị</label>
                  <input 
                    type="text" 
                    value={editForm.display_name} 
                    onChange={e => setEditForm(prev => ({...prev, display_name: e.target.value}))}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">Tiểu sử (Bio)</label>
                  <textarea 
                    value={editForm.bio} 
                    onChange={e => setEditForm(prev => ({...prev, bio: e.target.value}))}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 h-20 text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">Website</label>
                  <input 
                    type="url" 
                    value={editForm.website_url} 
                    onChange={e => setEditForm(prev => ({...prev, website_url: e.target.value}))}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600 dark:text-slate-400">Địa điểm</label>
                  <input 
                    type="text" 
                    value={editForm.location} 
                    onChange={e => setEditForm(prev => ({...prev, location: e.target.value}))}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2.5 pt-3">
                  <button onClick={handleSaveInfo} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-1.5 press-tactile transition-all shadow-xs cursor-pointer">
                    <Check className="w-3.5 h-3.5"/> Lưu thay đổi
                  </button>
                  <button onClick={() => setIsEditingInfo(false)} className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-semibold press-tactile transition-all cursor-pointer">
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tabs */}
          <div className="flex items-center gap-2 mt-8 p-1 bg-slate-200/60 dark:bg-white/5 rounded-2xl w-fit border border-slate-300/40 dark:border-white/5">
            <button
              onClick={() => setActiveProfileTab('posts')}
              className={`px-4 py-1.5 font-semibold text-xs rounded-xl transition-all cursor-pointer press-tactile ${
                activeProfileTab === 'posts'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bài viết ({userPosts.length})
            </button>
            <button
              onClick={() => setActiveProfileTab('friends')}
              className={`px-4 py-1.5 font-semibold text-xs rounded-xl transition-all cursor-pointer press-tactile ${
                activeProfileTab === 'friends'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bạn bè ({userFriends.length})
            </button>
          </div>

          {/* Tab content */}
          <div className="py-6">
            {activeProfileTab === 'posts' ? (
              <div className="flex flex-col gap-4 max-w-2xl">
                {userPosts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200/80 dark:border-white/10">
                    Chưa có bài viết nào được đăng.
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      onPostDeleted={(postId) =>
                        setUserPosts((prev) => prev.filter((p) => p.id !== postId))
                      }
                      onOpenAuth={onOpenAuth || (() => {})}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {userFriends.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-xs text-slate-400 bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200/80 dark:border-white/10">
                    Chưa có bạn bè nào.
                  </div>
                ) : (
                  userFriends.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-white dark:bg-[#0B0F17] rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center gap-3 shadow-xs hover:shadow-md transition-all"
                    >
                      <img
                        src={f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.username}`}
                        alt={f.username}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200/80 dark:border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                          {f.display_name || f.username}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate block">@{f.username}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B0F17] border border-slate-200/80 dark:border-white/10 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative">
            <button onClick={() => setIsChangingPassword(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer press-tactile">
              <X className="w-5 h-5"/>
            </button>
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400"/> Đổi mật khẩu
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && <div className="text-rose-500 text-xs bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{passwordError}</div>}
                {passwordSuccess && <div className="text-emerald-500 text-xs bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{passwordSuccess}</div>}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Mật khẩu hiện tại</label>
                  <input type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({...p, current_password: e.target.value}))} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs outline-hidden focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Mật khẩu mới (Tối thiểu 8 ký tự)</label>
                  <input type="password" required minLength={8} value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({...p, new_password: e.target.value}))} className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs outline-hidden focus:border-blue-500" />
                  <PasswordStrengthMeter password={passwordForm.new_password} />
                </div>
                <div className="pt-3 flex justify-end gap-2.5">
                  <button type="button" onClick={() => setIsChangingPassword(false)} className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold press-tactile cursor-pointer">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl press-tactile transition-all shadow-xs cursor-pointer">Cập nhật mật khẩu</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
