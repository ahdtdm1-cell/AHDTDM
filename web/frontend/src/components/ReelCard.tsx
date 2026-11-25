import React, { useState } from 'react';
import {
  ThumbsUp, MessageSquare, Share2, MoreHorizontal,
  Globe, Users as UsersIcon, Lock, Trash2, Loader2, Send
} from 'lucide-react';
import { ReelResponse, ReactionType, ReelComment } from '../types/social';
import { User } from '../types/auth';
import { ReactionPicker, REACTIONS } from './ReactionPicker';
import { socialApi } from '../services/socialApi';
import { cacheBustedVideoUrl } from '../utils/media';

interface ReelCardProps {
  reel: ReelResponse;
  currentUser: User | null;
  onReelDeleted: (reelId: number) => void;
  onOpenAuth: (mode: 'login') => void;
  onViewProfile?: (userId: number) => void;
  highlighted?: boolean;
}

export const ReelCard: React.FC<ReelCardProps> = ({
  reel,
  currentUser,
  onReelDeleted,
  onOpenAuth,
  onViewProfile,
  highlighted = false
}) => {
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(reel.user_reaction || null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(reel.comments_count);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const handleSelectReaction = async (type: ReactionType) => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    const previousReaction = userReaction;
    const previousCount = likesCount;

    if (userReaction === type) {
      setUserReaction(null);
      setLikesCount(Math.max(0, likesCount - 1));
    } else {
      setUserReaction(type);
      if (!userReaction) setLikesCount(likesCount + 1);
    }

    try {
      const res = await socialApi.reactToReel(reel.id, type);
      setUserReaction(res.user_reaction);
      setLikesCount(res.likes_count);
    } catch {
      setUserReaction(previousReaction);
      setLikesCount(previousCount);
    }
  };

  const handleToggleLike = () => {
    if (userReaction) {
      handleSelectReaction(userReaction);
    } else {
      handleSelectReaction('like');
    }
  };

  const handleDeleteReel = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    try {
      await socialApi.deleteReel(reel.id);
      onReelDeleted(reel.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const loadComments = async () => {
    const data = await socialApi.fetchReelComments(reel.id);
    setComments(data);
  };

  const handleShowComments = async () => {
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (!commentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await socialApi.addReelComment(reel.id, commentContent.trim());
      setComments((prev) => [newComment, ...prev]);
      setCommentsCount((prev) => prev + 1);
      setCommentContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await socialApi.deleteReelComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const currentReactionObj = REACTIONS.find((r) => r.type === userReaction);
  const isAuthor = currentUser && (currentUser.id === reel.author_id || currentUser.role === 'admin');

  // Autoplay video when visible (simplified)
  React.useEffect(() => {
    if (!showComments) return;
  }, [showComments]);

  return (
    <article
      id={`reel-${reel.id}`}
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border p-3.5 sm:p-4 flex flex-col gap-3 transition-all duration-300 ${
        highlighted
          ? 'border-blue-500 ring-2 ring-blue-500/40'
          : 'border-slate-200/80 dark:border-white/10'
      }`}
    >
      {/* Reel Header */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => onViewProfile && onViewProfile(reel.author_id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src={
              reel.author?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${reel.author?.username || reel.author_id}`
            }
            alt="Author"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
          />
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {reel.author?.display_name || reel.author?.username || 'Người dùng'}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <span>{new Date(reel.created_at).toLocaleDateString()}</span>
              <span>·</span>
              {reel.privacy === 'public' && <span title="Công khai" className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> Công khai</span>}
              {reel.privacy === 'friends' && <span title="Bạn bè" className="flex items-center gap-0.5"><UsersIcon className="w-3 h-3" /> Bạn bè</span>}
              {reel.privacy === 'private' && <span title="Chỉ mình tôi" className="flex items-center gap-0.5"><Lock className="w-3 h-3" /> Chỉ mình tôi</span>}
            </div>
          </div>
        </div>

        {/* Options Menu */}
        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 flex items-center justify-center transition-colors press-tactile cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={handleDeleteReel}
                  disabled={isDeleting}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-40"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa reel</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reel Content - Video */}
      {reel.content && (
        <div className="relative">
          <video
            src={cacheBustedVideoUrl(reel.content)}
            controls
            poster={reel.thumbnail_url || undefined}
            className="w-full rounded-2xl aspect-video object-cover bg-slate-100 dark:bg-slate-800"
          >
            Your browser does not support the video tag.
          </video>
          {/* Auto-expiration warning */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            Hết hạn: {new Date(reel.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 px-1">
        <div className="flex items-center gap-1.5">
          {likesCount > 0 && (
            <>
              <span className="flex items-center -space-x-1">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center">
                  👍
                </span>
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center">
                  ❤️
                </span>
              </span>
              <span>{likesCount}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {commentsCount > 0 && (
            <button
              onClick={handleShowComments}
              className="hover:underline cursor-pointer"
            >
              {commentsCount} bình luận
            </button>
          )}
          <span>{reel.views_count} lượt xem</span>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-1 flex items-center justify-around relative">
        {/* Like Button with Hover Reaction Picker */}
        <div
          className="relative flex-1"
          onMouseEnter={() => setShowReactionPicker(true)}
        >
          {showReactionPicker && (
            <ReactionPicker
              onSelectReaction={handleSelectReaction}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
          <button
            onClick={handleToggleLike}
            className={`w-full py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center gap-2 text-xs font-bold transition-colors duration-150 press-tactile cursor-pointer ${
              currentReactionObj
                ? currentReactionObj.color
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {currentReactionObj ? (
              <>
                <span className="text-base leading-none inline-block filter drop-shadow-xs">{currentReactionObj.emoji}</span>
                <span>{currentReactionObj.label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                <span>Thích</span>
              </>
            )}
          </button>
        </div>

        {/* Comment Button */}
        <button
          onClick={handleShowComments}
          className="flex-1 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors duration-150 press-tactile cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Bình luận</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href + `#reel-${reel.id}`);
            alert('Đã sao chép liên kết reel!');
          }}
          className="flex-1 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors duration-150 press-tactile cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Chia sẻ</span>
        </button>
      </div>

      {/* Expandable Comment Section */}
      {showComments && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-3">
          {/* Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <img
              src={
                currentUser?.avatar_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`
              }
              alt="User"
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
            />
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                placeholder={currentUser ? 'Viết bình luận...' : 'Đăng nhập để viết bình luận...'}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmittingComment}
                className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full px-4 py-2 pr-10 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-colors duration-150"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !commentContent.trim()}
                className="absolute right-2 text-blue-600 disabled:opacity-40 hover:text-blue-700 transition-colors press-tactile cursor-pointer"
              >
                {isSubmittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Chưa có bình luận nào.</p>
            ) : (
              comments.map((comment) => {
                const isCommentAuthor = currentUser && (currentUser.id === comment.author_id || currentUser.role === 'admin');
                return (
                  <div key={comment.id} className="flex gap-2.5 group">
                    <img
                      src={
                        comment.author?.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${comment.author?.username || comment.author_id}`
                      }
                      alt="Commenter"
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="inline-block bg-slate-100 dark:bg-slate-800/80 rounded-2xl px-3.5 py-2 max-w-[90%] border border-slate-200/50 dark:border-white/5">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {comment.author?.display_name || comment.author?.username || 'Người dùng'}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 break-words leading-relaxed">
                          {comment.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isCommentAuthor && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="hover:text-rose-500 transition-colors flex items-center gap-0.5 cursor-pointer opacity-70 sm:opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" /> Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </article>
  );
};