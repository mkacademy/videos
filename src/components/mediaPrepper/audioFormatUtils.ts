import { isMp3File } from '../../library/directoryTreeUtils';
import type { AudioProbeResult, FormatAnalysis } from './types';

const AUDIO_EXTENSION_LABELS: Record<string, string> = {
  mp3: 'MP3',
  wav: 'WAV',
  m4a: 'M4A',
  aac: 'AAC',
  ogg: 'OGG',
  flac: 'FLAC',
  wma: 'WMA',
  aiff: 'AIFF',
  aif: 'AIFF',
  opus: 'Opus',
  webm: 'WebM Audio',
};

const VALID_AUDIO_EXTENSION_PATTERN = /\.(mp3|wav|m4a|aac|ogg|flac|wma|aiff|aif|opus|webm)$/i;

export function isValidAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true;
  return VALID_AUDIO_EXTENSION_PATTERN.test(file.name);
}

function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : '';
}

function formatLabelFromFile(file: File): string {
  const extension = getExtension(file.name);
  if (extension && AUDIO_EXTENSION_LABELS[extension]) {
    return AUDIO_EXTENSION_LABELS[extension];
  }
  if (file.type) {
    return file.type.replace('audio/', '').toUpperCase() || 'Unknown';
  }
  return extension.toUpperCase() || 'Unknown';
}

export function analyzeAudioFormat(file: File, _probe: AudioProbeResult): FormatAnalysis {
  const detectedFormat = formatLabelFromFile(file);
  const isWebReady = isMp3File(file);

  return {
    isWebReady,
    needsTranscode: !isWebReady,
    needsResize: false,
    detectedFormat,
    targetFormat: 'MP3',
  };
}
