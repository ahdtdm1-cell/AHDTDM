import React, { useState } from 'react';
import { Plus, X, Heart } from 'lucide-react';
import { User } from '../types/auth';
import { UserProfile } from '../types/social';

interface StoriesBarProps {
  currentUser: User | null;
  friends: UserProfile[];
}

interface StoryCardItem {
  id: string;
  isCreate: boolean;
  name: string;
  avatar: string;
  bg?: string;
  bgImage?: string;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ currentUser, friends }) => {
  const [activeStory, setActiveStory] = useState<StoryCardItem | null>(null);

  const storyCards: StoryCardItem[] = [
    {
      id: 'create',
      isCreate: true,
      name: 'Tạo tin',
      avatar: currentUser?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`,
      bg: 'bg-slate-100 dark:bg-slate-800'
    },
    ...friends.slice(0, 6).map((f, i) => ({
      id: String(f.id),
      isCreate: false,
      name: f.display_name || f.username,
      avatar: f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.username}`,
      bgImage: [
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80'
      ][i % 6]
    }))
  ];

  return (
    <>
      <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 scrollbar-none select-none snap-x snap-mandatory">
        {storyCards.map((story) => (
          <div
            key={story.id}
            onClick={() => {
              if (!story.isCreate) setActiveStory(story);
            }}
            className="relative w-24 sm:w-28 h-36 sm:h-44 rounded-2xl overflow-hidden shrink-0 cursor-pointer group shadow-2xs border border-slate-200/80 dark:border-white/10 transition-all duration-200 press-bounce snap-start"
          >
            {story.isCreate ? (
              <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
                <div className="h-24 sm:h-28 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img
                    src={story.avatar}
                    alt={story.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="relative flex-1 flex flex-col items-center justify-end pb-2 pt-3 px-1">
                  <div className="absolute -top-3.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 text-center">
                    {story.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                <img
                  src={story.bgImage}
                  alt={story.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-95 group-hover:brightness-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
                <div className="absolute top-2 left-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-blue-500 overflow-hidden shadow-md">
                  <img src={story.avatar} alt={story.name} className="w-full h-full object-cover" />
                </div>
                <span className="absolute bottom-2 left-2 right-2 text-[11px] sm:text-xs font-semibold text-white drop-shadow-md truncate">
                  {story.name}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {activeStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="relative w-full max-w-sm h-[560px] max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-950 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Progress & Info Bar */}
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 flex flex-col gap-2">
              <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                <div className="bg-white h-full w-2/3 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <img
                    src={activeStory.avatar}
                    alt={activeStory.name}
                    className="w-8 h-8 rounded-full border border-white/40 object-cover"
                  />
                  <div>
                    <span className="text-xs font-bold block">{activeStory.name}</span>
                    <span className="text-[10px] text-white/70">3 giờ trước</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveStory(null)}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors text-white cursor-pointer"
                  title="Đóng tin"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Story Image */}
            <img
              src={activeStory.bgImage}
              alt={activeStory.name}
              className="w-full h-full object-cover"
            />

            {/* Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 flex items-center gap-2">
              <input
                type="text"
                placeholder={`Trả lời ${activeStory.name}...`}
                className="flex-1 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 text-xs text-white placeholder-white/70 outline-hidden border border-white/20 focus:border-white"
              />
              <button
                className="w-9 h-9 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center transition-colors press-bounce cursor-pointer"
                title="Thả tim"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
