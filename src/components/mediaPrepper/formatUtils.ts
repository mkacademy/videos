import { MAX_VIDEO_WIDTH } from './types';
import type { FormatAnalysis, ProbeResult } from './types';

const WEB_MP4_CODEC = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';

const EXTENSION_LABELS: Record<string, string> = {
  mp4: 'MP4',
  m4v: 'M4V',
  mov: 'MOV',
  webm: 'WebM',
  mkv: 'MKV',
  avi: 'AVI',
  wmv: 'WMV',
  mpeg: 'MPEG',
  mpg: 'MPEG',
  ts: 'MPEG-TS',
  '3gp': '3GP',
};

const NON_WEB_MIME_PREFIXES = [
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/webm',
  'video/mpeg',
  'video/3gpp',
];

function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : '';
}

function formatLabelFromFile(file: File): string {
  const extension = getExtension(file.name);
  if (extension && EXTENSION_LABELS[extension]) {
    return EXTENSION_LABELS[extension];
  }
  if (file.type) {
    return file.type.replace('video/', '').toUpperCase() || 'Unknown';
  }
  return extension.toUpperCase() || 'Unknown';
}

function browserCanPlayH264Aac(): boolean {
  const video = document.createElement('video');
  const result = video.canPlayType(WEB_MP4_CODEC);
  return result === 'probably' || result === 'maybe';
}

function isLikelyWebMp4(file: File): boolean {
  const extension = getExtension(file.name);
  const mime = file.type.toLowerCase();

  if (mime === 'video/mp4' || mime === 'video/x-m4v' || extension === 'mp4' || extension === 'm4v') {
    return true;
  }

  return false;
}

function mimeNeedsTranscode(mime: string): boolean {
  if (!mime) return false;
  return NON_WEB_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export function analyzeFormat(file: File, probe: ProbeResult): FormatAnalysis {
  const detectedFormat = formatLabelFromFile(file);
  const needsResize = probe.width > MAX_VIDEO_WIDTH;
  const mime = file.type.toLowerCase();
  const extension = getExtension(file.name);
  const canPlayInBrowser = browserCanPlayH264Aac();

  const isWebMp4Container = isLikelyWebMp4(file);
  const hasNonWebMime = mimeNeedsTranscode(mime);
  const hasNonWebExtension = ['mov', 'webm', 'mkv', 'avi', 'wmv', 'mpeg', 'mpg', 'ts', '3gp'].includes(extension);

  const metadataReadable = probe.width > 0 && probe.height > 0;
  const isWebReady =
    metadataReadable &&
    isWebMp4Container &&
    !hasNonWebMime &&
    !hasNonWebExtension &&
    canPlayInBrowser;

  const needsTranscode = !isWebReady;

  return {
    isWebReady,
    needsTranscode,
    needsResize,
    detectedFormat,
    targetFormat: 'MP4 (H.264 + AAC)',
  };
}
