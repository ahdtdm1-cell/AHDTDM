const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|ogv|mov|m4v|3gp)(\?.*)?$/i;

/** Determine whether a stored media URL points to a video file. */
export const isVideoMediaUrl = (url: string) => VIDEO_URL_PATTERN.test(url);

/**
 * Uploads are proxied through Vercel's rewrite. Bump this version to force a
 * fresh CDN cache entry for videos if an old partial (206) response ever gets
 * stuck in front of them again.
 */
const VIDEO_CACHE_VERSION = '2';

export const cacheBustedVideoUrl = (url: string) => {
  if (!url.startsWith('/uploads/')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${VIDEO_CACHE_VERSION}`;
};
