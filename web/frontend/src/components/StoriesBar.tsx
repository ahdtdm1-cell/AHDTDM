import React from 'react';
import { Plus } from 'lucide-react';
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
  const storyCards: StoryCardItem[] = [
    {
      id: 'create',
      isCreate: true,
      name: 'Tạo tin',
      avatar: currentUser?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username || 'user'}`,
      bg: 'bg-slate-100 dark:bg-slate-800'
    },
    ...friends.slice(0, 5).map((f, i) => ({
      id: String(f.id),
      isCreate: false,
      name: f.display_name || f.username,
      avatar: f.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.username}`,
      bgImage: [
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80'
      ][i % 5]
    }))
  ];

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none select-none">
      {storyCards.map((story) => (
        <div
          key={story.id}
          className="relative w-28 sm:w-32 h-44 sm:h-48 rounded-2xl overflow-hidden shrink-0 cursor-pointer group shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          {story.isCreate ? (
            <div className="w-full h-full flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="h-32 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                <img
                  src={story.avatar}
                  alt={story.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="relative flex-1 flex flex-col items-center justify-end pb-2 pt-4 px-1">
                <div className="absolute -top-4 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 text-center">
                  {story.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <img
                src={story.bgImage}
                alt={story.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-90 group-hover:brightness-100"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
              <div className="absolute top-2.5 left-2.5 w-9 h-9 rounded-full border-2 border-blue-500 overflow-hidden shadow-md">
                <img src={story.avatar} alt={story.name} className="w-full h-full object-cover" />
              </div>
              <span className="absolute bottom-2.5 left-2.5 right-2.5 text-xs font-semibold text-white drop-shadow-md truncate">
                {story.name}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
