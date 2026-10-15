import React, { useState } from 'react';
import {
  ThumbsUp, MessageSquare, Share2, MoreHorizontal,
  Globe, Users as UsersIcon, Lock, Trash2
} from 'lucide-react';
import { SocialPost, ReactionType, PostComment } from '../types/social';
import { User } from '../types/auth';
import { ReactionPicker, REACTIONS } from './ReactionPicker';
import { CommentSection } from './CommentSection';
import { socialApi } from '../services/socialApi';

interface PostCardProps {
  post: SocialPost;
  currentUser: User | null;
  onPostDeleted: (postId: number) => void;
  onOpenAuth: (mode: 'login') => void;
  onViewProfile?: (userId: number) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPostDeleted,
  onOpenAuth,
  onViewProfile
}) => {
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(post.user_reaction || null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>(post.latest_comments || []);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showMenu, setShowMenu] = useState(false);

  // Parse media_urls
  let mediaList: string[] = [];
  if (post.media_urls) {
    try {
      mediaList = JSON.parse(post.media_urls);
    } catch {
      mediaList = [post.media_urls];
    }
  }

  const handleSelectReaction = async (type: ReactionType) => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    // Optimistic UI update
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
      const res = await socialApi.reactToPost(post.id, type);
      setUserReaction(res.user_reaction);
      setLikesCount(res.likes_count);
    } catch {
      // Revert on failure
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

  const handleDeletePost = async () => {
    try {
      await socialApi.deletePost(post.id);
      onPostDeleted(post.id);
    } catch (err) {
      console.error(err);
    }
  };

  // Find active reaction visual
  const currentReactionObj = REACTIONS.find((r) => r.type === userReaction);

  const isAuthor = currentUser && (currentUser.id === post.author_id || currentUser.role === 'admin');

  return (
    <article className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/70 p-4 flex flex-col gap-3 transition-colors">
      {/* Post Header */}
      <div className="flex items-center justify-between">
        <div
          onClick={() => onViewProfile && onViewProfile(post.author_id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img
            src={
              post.author?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.username || post.author_id}`
            }
            alt="Author"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {post.author?.display_name || post.author?.username || 'Người dùng'}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span>·</span>
              {post.privacy === 'public' && <span title="Công khai"><Globe className="w-3 h-3" /></span>}
              {post.privacy === 'friends' && <span title="Bạn bè"><UsersIcon className="w-3 h-3" /></span>}
              {post.privacy === 'private' && <span title="Chỉ mình tôi"><Lock className="w-3 h-3" /></span>}
            </div>
          </div>
        </div>

        {/* Options Menu */}
        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-20">
                <button
                  onClick={handleDeletePost}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa bài viết
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      {post.content && (
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media Gallery Grid */}
      {mediaList.length > 0 && (
        <div
          className={`grid gap-1.5 rounded-2xl overflow-hidden mt-1 ${
            mediaList.length === 1
              ? 'grid-cols-1'
              : mediaList.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {mediaList.map((url, i) => (
            <div key={i} className="relative aspect-square sm:aspect-auto sm:h-64 bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <img
                src={url}
                alt="Post Media"
                className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
              />
            </div>
          ))}
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
              onClick={() => setShowComments((prev) => !prev)}
              className="hover:underline cursor-pointer"
            >
              {commentsCount} bình luận
            </button>
          )}
          {post.shares_count > 0 && <span>{post.shares_count} lượt chia sẻ</span>}
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="border-t border-slate-100 dark:border-slate-700/60 pt-1 flex items-center justify-around relative">
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
            className={`w-full py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center justify-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${
              currentReactionObj
                ? currentReactionObj.color
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {currentReactionObj ? (
              <>
                <span className="text-base leading-none">{currentReactionObj.emoji}</span>
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
          onClick={() => setShowComments((prev) => !prev)}
          className="flex-1 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Bình luận</span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Đã sao chép liên kết bài viết!');
          }}
          className="flex-1 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Chia sẻ</span>
        </button>
      </div>

      {/* Expandable Comment Section */}
      {showComments && (
        <CommentSection
          postId={post.id}
          comments={comments}
          currentUser={currentUser}
          onCommentAdded={(newComment) => {
            setComments((prev) => [...prev, newComment]);
            setCommentsCount((prev) => prev + 1);
          }}
          onCommentDeleted={(commentId) => {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setCommentsCount((prev) => Math.max(0, prev - 1));
          }}
          onOpenAuth={onOpenAuth}
        />
      )}
    </article>
  );
};
