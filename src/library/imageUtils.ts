import {
  audioMimePlaceholder,
  imageMimePlaceholder,
  placeholder,
  videoMimePlaceholder,
} from '../utils';

export type MediaMimeGroup = 'image' | 'audio' | 'video';

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

/** Image, audio, or video data-URL slot (payload or mime-only sentinel). */
export const getMediaMimeGroup = (url: string): MediaMimeGroup | null => {
  if (typeof url !== 'string') return null;
  if (url.startsWith('data:image')) return 'image';
  if (url.startsWith('data:audio')) return 'audio';
  if (url.startsWith('data:video')) return 'video';
  return null;
};

export const isMediaSlotValue = (url: string): boolean =>
  getMediaMimeGroup(url) !== null;

/** True when a media data-URL already has a non-empty base64 payload. */
export const hasMediaBase64Payload = (url: string): boolean => {
  if (!isMediaSlotValue(url)) return false;
  const comma = url.indexOf(',');
  if (comma === -1) return false;
  if (!url.slice(0, comma).includes(';base64')) return false;
  return url.slice(comma + 1).trim().length > 0;
};

/** Mime-only image/audio/video sentinel awaiting fetch (no base64 payload yet). */
export const isMimeOnlyMediaUrl = (url: string): boolean =>
  isMediaSlotValue(url) && !hasMediaBase64Payload(url);

/** @deprecated Prefer isMediaSlotValue — kept for image-only checks. */
export const isImageSlotValue = (url: string): boolean =>
  typeof url === 'string' && url.startsWith('data:image');

/**
 * Resolved <img> src for a media slot:
 * - valid image data URL → itself
 * - image mime-only → image group placeholder
 * - audio (any) → audio group placeholder
 * - video (any) → video group placeholder
 */
export const resolveMediaSlotSrc = (url: string): string => {
  const group = getMediaMimeGroup(url);
  if (group === 'image') {
    return isValidDataUrl(url) ? url : imageMimePlaceholder;
  }
  if (group === 'audio') {
    return audioMimePlaceholder;
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
