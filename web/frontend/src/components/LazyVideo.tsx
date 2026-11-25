import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { cacheBustedVideoUrl } from '../utils/media';

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
}

// Track the video that is currently playing so the feed never plays several at once.
const activeVideos = new Set<HTMLVideoElement>();

const pauseOtherVideos = (current: HTMLVideoElement | null) => {
  activeVideos.forEach((video) => {
    if (video !== current) video.pause();
  });
  activeVideos.clear();
  if (current) activeVideos.add(current);
};

/**
 * Video player that only mounts/downloads its source once it gets near the
 * viewport, so a feed full of videos stays light until the user scrolls to it.
 */
export const LazyVideo: React.FC<LazyVideoProps> = ({ src, poster, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) activeVideos.delete(video);
    };
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-black ${className || ''}`}>
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={cacheBustedVideoUrl(src)}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          onPlay={() => pauseOtherVideos(videoRef.current)}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <span className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
          </span>
        </div>
      )}
    </div>
  );
};
