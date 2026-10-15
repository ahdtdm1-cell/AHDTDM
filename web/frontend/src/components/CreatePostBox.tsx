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
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3.5 shadow-xs border border-slate-200/80 dark:border-slate-700/70">
        <div className="flex items-center gap-3">
          <img
            src={
              currentUser?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`
            }
            alt="User"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <button
            onClick={handleOpenModal}
            className="flex-1 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 text-sm font-normal py-2.5 px-4 rounded-full text-left transition-colors cursor-pointer"
          >
            {currentUser
              ? `${currentUser.display_name || currentUser.username} ơi, bạn đang nghĩ gì thế?`
              : 'Đăng nhập để chia sẻ suy nghĩ của bạn...'}
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700/50 mt-3 pt-2 flex items-center justify-around">
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ImageIcon className="w-5 h-5 text-emerald-500" />
            <span>Ảnh/Video</span>
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Smile className="w-5 h-5 text-amber-500" />
            <span>Cảm xúc/Hoạt động</span>
          </button>
        </div>
      </div>

      {/* Post Composer Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="w-8" />
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 text-center">
                Tạo bài viết
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              {/* User info & Privacy selector */}
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentUser?.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`
                  }
                  alt="User"
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {currentUser?.display_name || currentUser?.username}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <select
                      value={privacy}
                      onChange={(e: any) => setPrivacy(e.target.value)}
                      className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md px-2 py-0.5 outline-hidden border border-slate-200 dark:border-slate-600 cursor-pointer"
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
                className="w-full bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden resize-none text-base font-normal"
              />

              {/* Uploaded media previews */}
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-700">
                      <img src={url} alt="Media" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveMedia(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
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
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors text-slate-500 dark:text-slate-400 text-xs font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Đang tải ảnh lên...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-emerald-500" />
                    <span>Thêm ảnh hoặc kéo thả vào đây</span>
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || (!content.trim() && mediaUrls.length === 0)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
