import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Smile, Globe, Users as UsersIcon, Lock, X, Loader2 } from 'lucide-react';
import { User } from '../types/auth';
import { socialApi } from '../services/socialApi';
import { SocialPost } from '../types/social';

interface CreatePostBoxProps {
  currentUser: User | null;
  onPostCreated: (post: SocialPost) => void;
  onOpenAuth: (mode: 'login') => void;
}

export const CreatePostBox: React.FC<CreatePostBoxProps> = ({
  currentUser,
  onPostCreated,
  onOpenAuth
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    setIsOpenModal(true);
    setErrorMsg('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await socialApi.uploadPostMedia(file);
        setMediaUrls((prev) => [...prev, url]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaUrls.length === 0) {
      setErrorMsg('Vui lòng nhập nội dung bài viết hoặc đính kèm ảnh.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const newPost = await socialApi.createPost(content, mediaUrls, privacy);
      onPostCreated(newPost);
      setContent('');
      setMediaUrls([]);
      setIsOpenModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi đăng bài viết.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Feed Widget Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 shadow-2xs border border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3">
          <img
            src={
              currentUser?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`
            }
            alt="User"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
          />
          <button
            onClick={handleOpenModal}
            className="flex-1 bg-slate-100 hover:bg-slate-200/70 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-normal py-2.5 px-4 rounded-full text-left transition-all press-tactile cursor-pointer"
          >
            {currentUser
              ? `${currentUser.display_name || currentUser.username} ơi, bạn đang nghĩ gì thế?`
              : 'Đăng nhập để chia sẻ suy nghĩ của bạn...'}
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-white/5 mt-3 pt-2 flex items-center justify-around">
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors press-tactile cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            <span>Ảnh/Video</span>
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors press-tactile cursor-pointer"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <span>Cảm xúc/Hoạt động</span>
          </button>
        </div>
      </div>

      {/* Post Composer Modal (Apple sheet style) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="w-8" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white text-center">
                Tạo bài viết
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors press-tactile cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3.5">
              {/* User info & Privacy selector */}
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentUser?.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`
                  }
                  alt="User"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {currentUser?.display_name || currentUser?.username}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <select
                      value={privacy}
                      onChange={(e: any) => setPrivacy(e.target.value)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg px-2 py-1 outline-hidden border border-slate-200/80 dark:border-white/10 cursor-pointer"
                    >
                      <option value="public">🌐 Công khai</option>
                      <option value="friends">👥 Bạn bè</option>
                      <option value="private">🔒 Chỉ mình tôi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`${currentUser?.display_name || currentUser?.username} ơi, bạn đang nghĩ gì thế?`}
                rows={4}
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-hidden resize-none text-base font-normal leading-relaxed"
                autoFocus
              />

              {/* Uploaded media previews */}
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10">
                      <img src={url} alt="Media" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveMedia(i)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors press-bounce"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload trigger box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-4 flex items-center justify-center gap-2.5 cursor-pointer transition-colors text-slate-500 dark:text-slate-400 text-xs font-semibold press-tactile"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Đang tải ảnh lên an toàn...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-emerald-500" />
                    <span>Thêm hình ảnh cho bài viết</span>
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3.5 pb-safe border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || (!content.trim() && mediaUrls.length === 0)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm press-bounce cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đăng bài...</span>
                  </>
                ) : (
                  <span>Đăng bài</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
