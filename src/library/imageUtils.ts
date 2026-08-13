import {
  audioMimePlaceholder,
  imageMimePlaceholder,
  initMimePlaceholder,
  markdownMimePlaceholder,
  placeholder,
  textMimePlaceholder,
  videoMimePlaceholder,
} from '../utils';

export type MediaMimeGroup = 'image' | 'audio' | 'video' | 'init';

export const isValidDataUrl = (url: string): boolean => {
  if (!url.startsWith('data:image')) return false;
  try {
    const parts = url.split(',');
    if (parts.length !== 2) return false;
    const header = parts[0];
    if (!header.includes('data:image/') || !header.includes(';base64')) return false;
    const data = parts[1];
    if (!data || data.trim().length === 0) return false;
    return true;
  } catch {
    return false;
  }
};

/** Image, audio, video fragment, or init data-URL slot (payload or mime-only sentinel). */
export const getMediaMimeGroup = (url: string): MediaMimeGroup | null => {
  if (typeof url !== 'string') return null;
  if (url.startsWith('data:image')) return 'image';
  if (url.startsWith('data:audio')) return 'audio';
  // Init covers/parts use data:video/mp4; media fragments use data:video/iso.segment or bare data:video.
  if (url.startsWith('data:video/mp4')) return 'init';
  if (url.startsWith('data:video')) return 'video';
  return null;
};

export const isMediaSlotValue = (url: string): boolean =>
  getMediaMimeGroup(url) !== null;

const hasBase64Payload = (url: string): boolean => {
  const comma = url.indexOf(',');
  if (comma === -1) return false;
  if (!url.slice(0, comma).includes(';base64')) return false;
  return url.slice(comma + 1).trim().length > 0;
};

export const isMarkdownDataUrl = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('data:text/markdown');

export const isPlainTextDataUrl = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('data:text/plain');

/** Bare markdown miss sentinel — never re-queued (`data:text`). */
export const isPermanentMarkdownSlotSentinel = (url: string): boolean =>
  typeof url === 'string' && url.trim() === 'data:text';

/** Markdown slot (typed mime, payload, or permanent bare sentinel). */
export const isMarkdownSlotValue = (url: string): boolean =>
  isMarkdownDataUrl(url) || isPermanentMarkdownSlotSentinel(url);

/** Plain text slot (`data:text/plain`, with or without base64 payload). */
export const isPlainTextSlotValue = (url: string): boolean =>
  isPlainTextDataUrl(url);

/** True when a media or markdown data-URL already has a non-empty base64 payload. */
export const hasMediaBase64Payload = (url: string): boolean => {
  if (isMarkdownDataUrl(url) || isPlainTextDataUrl(url)) return hasBase64Payload(url);
  if (!isMediaSlotValue(url)) return false;
  return hasBase64Payload(url);
};

/** Bare UI sentinels — never fetched by image hydration (`data:image`, `data:audio`, `data:video`, `data:text`). */
export const isPermanentMediaSlotSentinel = (url: string): boolean => {
  const trimmed = url.trim();
  return trimmed === 'data:image'
    || trimmed === 'data:audio'
    || trimmed === 'data:video'
    || trimmed === 'data:text';
};

/**
 * Collapse a typed mime-only slot to a permanent bare sentinel.
 * image → `data:image`; audio → `data:audio`; video/init → `data:video`;
 * markdown → `data:text`.
 */
export const toPermanentMediaSlotSentinel = (
  url: string,
): 'data:image' | 'data:audio' | 'data:video' | 'data:text' | null => {
  if (isMarkdownDataUrl(url)) return 'data:text';
  const group = getMediaMimeGroup(url);
  if (group === 'image') return 'data:image';
  if (group === 'audio') return 'data:audio';
  if (group === 'video' || group === 'init') return 'data:video';
  return null;
};

/** Mime-only image/audio/video/markdown sentinel awaiting fetch (no base64 payload yet). */
export const isMimeOnlyMediaUrl = (url: string): boolean => {
  if (typeof url !== 'string') return false;
  // Permanent UI sentinels — never re-queued by image hydration.
  if (isPermanentMediaSlotSentinel(url)) return false;
  if (isMarkdownDataUrl(url) || isPlainTextDataUrl(url)) return !hasMediaBase64Payload(url);
  return isMediaSlotValue(url) && !hasMediaBase64Payload(url);
};

/** @deprecated Prefer isMediaSlotValue — kept for image-only checks. */
export const isImageSlotValue = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('data:image');

/**
 * Resolved <img> src for a media slot:
 * - valid image data URL → itself
 * - image mime-only / bare `data:image` → image group placeholder
 * - audio (any) / bare `data:audio` → audio group placeholder
 * - video/mp4 (init segment) → init placeholder
 * - `data:video` / other video (fragments) → video group placeholder
 * - `data:text/markdown` / bare `data:text` → markdown placeholder
 * - `data:text/plain` → plain text placeholder
 */
export const resolveMediaSlotSrc = (url: string): string => {
  if (isPlainTextSlotValue(url)) {
    return textMimePlaceholder;
  }
  if (isMarkdownSlotValue(url)) {
    return markdownMimePlaceholder;
  }
  const group = getMediaMimeGroup(url);
  if (group === 'image') {
    return isValidDataUrl(url) ? url : imageMimePlaceholder;
  }
  if (group === 'audio') {
    return audioMimePlaceholder;
  }
  if (group === 'init') {
    return initMimePlaceholder;
  }
  if (group === 'video') {
    return videoMimePlaceholder;
  }
  return placeholder;
};

/** @deprecated Prefer resolveMediaSlotSrc */
export const resolveImageSlotSrc = resolveMediaSlotSrc;

/** @deprecated Prefer isMediaSlotValue */
export const isImageDataUrlOrPlaceholder = isMediaSlotValue;
