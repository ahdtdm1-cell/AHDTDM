import React from 'react';
import { ReactionType } from '../types/social';

interface ReactionPickerProps {
  onSelectReaction: (type: ReactionType) => void;
  onClose: () => void;
}

export const REACTIONS: { type: ReactionType; label: string; emoji: string; color: string }[] = [
  { type: 'like', label: 'Thích', emoji: '👍', color: 'text-blue-600' },
  { type: 'love', label: 'Yêu thích', emoji: '❤️', color: 'text-rose-500' },
  { type: 'care', label: 'Thương thương', emoji: '🥰', color: 'text-amber-500' },
  { type: 'haha', label: 'Haha', emoji: '😂', color: 'text-amber-500' },
  { type: 'wow', label: 'Wow', emoji: '😮', color: 'text-amber-500' },
  { type: 'sad', label: 'Buồn', emoji: '😢', color: 'text-amber-500' },
  { type: 'angry', label: 'Phẫn nộ', emoji: '😡', color: 'text-orange-600' }
];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelectReaction, onClose }) => {
  return (
    <div
      onMouseLeave={onClose}
      className="absolute bottom-full left-0 mb-2 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-full px-2.5 py-1.5 shadow-2xl border border-slate-200/80 dark:border-white/10 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          onClick={(e) => {
            e.stopPropagation();
            onSelectReaction(r.type);
            onClose();
          }}
          className="relative group p-1 transition-transform duration-120 ease-out rounded-full cursor-pointer hover:-translate-y-1 hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500"
          title={r.label}
        >
          <span className="text-2xl select-none inline-block filter drop-shadow-xs">{r.emoji}</span>
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-[10px] font-bold py-0.5 px-2 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
            {r.label}
          </span>
        </button>
      ))}
    </div>
  );
};
