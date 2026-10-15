import React, { useState } from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { PostComment } from '../types/social';
import { User } from '../types/auth';
import { socialApi } from '../services/socialApi';

interface CommentSectionProps {
  postId: number;
  comments: PostComment[];
  currentUser: User | null;
  onCommentAdded: (comment: PostComment) => void;
  onCommentDeleted: (commentId: number) => void;
  onOpenAuth: (mode: 'login') => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  comments,
  currentUser,
  onCommentAdded,
  onCommentDeleted,
  onOpenAuth
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const newComment = await socialApi.addComment(postId, content.trim());
      onCommentAdded(newComment);
      setContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await socialApi.deleteComment(commentId);
      onCommentDeleted(commentId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-3">
      {/* Input box */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <img
          src={
            currentUser?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`
          }
          alt="User"
          className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
        />
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            placeholder={
              currentUser ? 'Viết bình luận...' : 'Đăng nhập để viết bình luận...'
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full px-4 py-2 pr-10 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-hidden border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="absolute right-2 text-blue-600 disabled:opacity-40 hover:text-blue-700 transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="flex flex-col gap-2.5">
        {comments.map((comment) => {
          const isAuthor = currentUser && (currentUser.id === comment.author_id || currentUser.role === 'admin');
          return (
            <div key={comment.id} className="flex gap-2.5 group">
              <img
                src={
                  comment.author?.avatar_url ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${comment.author?.username || comment.author_id}`
                }
                alt="Commenter"
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <div className="inline-block bg-slate-100 dark:bg-slate-700/60 rounded-2xl px-3.5 py-2 max-w-[90%]">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                    {comment.author?.display_name || comment.author?.username || 'Người dùng'}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 break-words">
                    {comment.content}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-2 mt-0.5 text-[10px] text-slate-400">
                  <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isAuthor && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="hover:text-rose-500 transition-colors flex items-center gap-0.5 cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
