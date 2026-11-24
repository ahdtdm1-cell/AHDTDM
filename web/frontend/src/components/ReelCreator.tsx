import React, { useState, useRef } from 'react';
import {
  Video, Upload, Globe, Users, Lock, Send, Loader2, X,
  Smile, ThumbsUp, Heart, Sparkles, Shield, Coffee, Angry
} from 'lucide-react';
import { socialApi } from '../services/socialApi';
import { User } from '../types/auth';
import { REACTIONS } from './ReactionPicker';
import { ReactionType } from '../types/social';

interface ReelCreatorProps {
  currentUser: User | null;
  onReelCreated?: (reel: any) => void;
  onOpenAuth: (mode: 'login') => void;
}

const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Công khai', icon: Globe, description: 'Mọi người có thể xem' },
  { value: 'friends', label: 'Bạn bè', icon: Users, description: 'Chỉ bạn bè của bạn' },
  { value: 'private', label: 'Chỉ mình tôi', icon: Lock, description: 'Chỉ bạn bạn thấy được' },
];

export const ReelCreator: React.FC<ReelCreatorProps> = ({
  currentUser,
  onReelCreated,
  onOpenAuth,
}) => {
  const [content, setContent] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<ReactionType>('like');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check authentication
  React.useEffect(() => {
    if (!currentUser) {
      onOpenAuth('login');
    }
  }, [currentUser]);

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Vui lòng chọn file video hợp lệ');
      return;
    }

    // Validate file size (max 100MB for now)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('Video không được vượt quá 100MB');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Autoplay preview
    setTimeout(() => {
      videoRef.current?.play().catch(() => {});
    }, 100);
  };

  const handleRemoveVideo = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setVideoFile(null);
    setPreviewUrl(null);
    setContent('');
  };

  const handleCreateReel = async () => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }

    if (!videoFile) {
      alert('Vui lòng chọn video cho reel');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('privacy', privacy);
      formData.append('file', videoFile);

      // Simulate progress (in real app, would use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + Math.random() * 30;
          return next < 100 ? next : 100;
        });
      }, 300);

      const res = await fetch('/api/reels', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Không thể tạo reel');
      }

      const newReel = await res.json();

      // Reset form
      setContent('');
      setVideoFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPrivacy('public');

      if (onReelCreated) {
        onReelCreated(newReel);
      }

      alert('Tạo reel thành công!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Có lỗi xảy ra khi tạo reel');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleReactionSelect = (type: ReactionType) => {
    setSelectedReaction(type);
    setShowReactionPicker(false);
    const reaction = REACTIONS.find(r => r.type === type);
    if (reaction) {
      setContent(content ? `${content}${content.includes('đang') ? ' ' : ' '} ${reaction.emoji} ` : '');
    }
  };

  const handlePrivacySelect = (value: 'public' | 'friends' | 'private') => {
    setPrivacy(value);
    setShowPrivacyMenu(false);
  };

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-white/10 p-6 text-center">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Cần đăng nhập để tạo reel</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-4">Bạn cần đăng nhập để tạo video reel mới.</p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors press-tactile cursor-pointer"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 mb-4">
      <h2 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Video className="w-5 h-5 text-pink-500" />
        Tạo Reel mới
      </h2>

      {/* Privacy Selector */}
      <div className="mb-4">
        <button
          onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
          className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
        >
          {(() => {
              const Icon = PRIVACY_OPTIONS.find(p => p.value === privacy)?.icon;
              return Icon ? <Icon className="w-5 h-5" /> : null;
            })()}
          <div className="flex-1 text-left">
            <div className="font-medium text-slate-900 dark:text-white">
              {PRIVACY_OPTIONS.find(p => p.value === privacy)?.label}
            </div>
            <div className="text-xs text-slate-400">
              {PRIVACY_OPTIONS.find(p => p.value === privacy)?.description}
            </div>
          </div>
          <X className="w-4 h-4 text-slate-400" />
        </button>

        {showPrivacyMenu && (
          <div className="absolute mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-10 animate-in fade-in zoom-in-95 duration-100">
            {PRIVACY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePrivacySelect(option.value as any)}
                className="w-full px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-3 cursor-pointer transition-colors"
              >
                <option.icon className="w-5 h-5" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-slate-400">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Chọn video (MP4, MOV, AVI - tối đa 100MB)
        </label>

        {previewUrl ? (
          <div className="relative group">
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              className="w-full rounded-xl aspect-video object-cover bg-slate-100 dark:bg-slate-800"
              onLoadedData={() => videoRef.current?.play().catch(() => {})}
            />
            <button
              onClick={handleRemoveVideo}
              className="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-slate-900/90 rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-900 transition-colors press-tactile cursor-pointer z-10"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-xl border-2 border-dashed border-slate-300/60 dark:border-slate-600/60 flex flex-col items-center justify-center gap-2 hover:from-slate-150 hover:to-slate-250 dark:hover:from-slate-750 dark:hover:to-slate-650 transition-all cursor-pointer press-tactile"
          >
            <Upload className="w-8 h-8 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Kéo thả video hoặc nhấn để chọn
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleVideoSelect}
          className="hidden"
          multiple={false}
        />
      </div>

      {/* Caption with Reaction */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Thêm mô tả (tùy chọn)
        </label>
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì?"
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer press-tactile"
              title="Thêm phản ứng nhanh"
            >
              {selectedReaction && REACTIONS.find(r => r.type === selectedReaction) ? (
                <span className="text-base">{REACTIONS.find(r => r.type === selectedReaction)!.emoji}</span>
              ) : (
                <Smile className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <span className="text-xs text-slate-400">
              {content.length}/2000
            </span>
          </div>
        </div>
      </div>

      {/* Reaction Picker */}
      {showReactionPicker && (
        <div className="absolute top-full left-0 mb-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/80 dark:border-white/10 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex flex-wrap gap-2 justify-center">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => handleReactionSelect(reaction.type)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <span className="text-2xl leading-none">{reaction.emoji}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {reaction.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleCreateReel}
          disabled={isSubmitting || !videoFile}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-pink-600 hover:to-pink-700 dark:hover:from-pink-700 dark:hover:to-pink-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed press-tactile cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tạo...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Tạo Reel</span>
            </>
          )}
        </button>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl h-2.5 overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </section>
  );
};