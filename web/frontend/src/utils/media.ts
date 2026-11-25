const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|ogv|mov|m4v|3gp)(\?.*)?$/i;

/** Determine whether a stored media URL points to a video file. */
export const isVideoMediaUrl = (url: string) => VIDEO_URL_PATTERN.test(url);
