import {
  LARGE_FILE_WARNING_BYTES,
  MOBILE_MEMORY_WARNING_BYTES,
} from './types';
import type {
  AudioProbeResult,
  FormatAnalysis,
  MediaKind,
  ProcessingEstimate,
  ProbeResult,
  TimeWindow,
} from './types';
import type { MediaPlayerTab } from '../mediaPlayer/mediaPlayerUtils';

const TRANSCODE_FACTOR = 1.2;
const RESIZE_FACTOR = 0.5;
const COPY_FACTOR = 0.3;

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function getDeviceMultiplier(): number {
  if (isMobileDevice()) {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory <= 4) return 2.5;
    return 2;
  }
  return 1;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'unknown length';
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (minutes === 0) return `${remainder}s`;
  return `${minutes}m ${remainder}s`;
}

function formatTimeRange(lowSeconds: number, highSeconds: number): string {
  const low = Math.max(5, Math.round(lowSeconds));
  const high = Math.max(low + 5, Math.round(highSeconds));

  if (high < 60) {
    return `~${low}–${high} seconds`;
  }

  const lowMinutes = Math.ceil(low / 60);
  const highMinutes = Math.ceil(high / 60);
  return `~${lowMinutes}–${highMinutes} min`;
}

function buildOperations(
  format: FormatAnalysis,
  mediaKind: MediaKind,
  activeTab: MediaPlayerTab,
  timeWindow?: TimeWindow,
  targetWidths: readonly number[] = [],
): string[] {
  const operations: string[] = [];
  const importWithoutProcessing = (activeTab === 'course' || activeTab === 'quiz')
    && mediaKind === 'video'
    && !timeWindow
    && targetWidths.length === 0;

  if (timeWindow && timeWindow.endSeconds > timeWindow.startSeconds) {
    const trimDuration = timeWindow.endSeconds - timeWindow.startSeconds;
    operations.push(
      `Trim to ${formatDuration(timeWindow.startSeconds)} – ${formatDuration(timeWindow.endSeconds)} (${formatDuration(trimDuration)})`,
    );
  }

  if (format.needsTranscode && !importWithoutProcessing) {
    operations.push(`Convert ${format.detectedFormat} → ${format.targetFormat}`);
  }

  if (importWithoutProcessing) {
    operations.push('Import video without resizing or re-encoding');
  }

  if (mediaKind === 'audio' || activeTab === 'tutorial') {
    if (!format.needsTranscode && !timeWindow) {
      operations.push('No conversion needed — output will match the source');
    }
    operations.push('Import to tutorials as audio chunks');
    return operations;
  }

  if (activeTab === 'course') {
    if (targetWidths.length === 1) {
      operations.push(`Resize to ${targetWidths[0]}px width (aspect ratio preserved) — import to courses`);
    } else if (!importWithoutProcessing) {
      operations.push('Import video at original resolution to courses');
    }
    return operations;
  }

  if (targetWidths.length >= 2) {
    targetWidths.forEach((width) => {
      operations.push(`Generate ${width}px-wide output`);
    });
    operations.push(`Import ${targetWidths.length} videos into matched quiz`);
  } else if (targetWidths.length === 1) {
    operations.push('Select at least one more output width to import into a quiz');
  } else if (!importWithoutProcessing) {
    operations.push('Import video at original resolution to matched quiz');
  }

  return operations;
}

function buildRiskNote(fileSizeBytes: number): string | null {
  const notes: string[] = [];

  if (isMobileDevice()) {
    notes.push('Mobile devices have limited memory; processing may be slow or fail on large files.');
  }

  if (fileSizeBytes >= LARGE_FILE_WARNING_BYTES) {
    notes.push('This file is very large for in-browser processing and may crash the tab.');
  } else if (fileSizeBytes >= MOBILE_MEMORY_WARNING_BYTES && isMobileDevice()) {
    notes.push('Files over ~100 MB on mobile may cause the browser tab to crash.');
  }

  return notes.length > 0 ? notes.join(' ') : null;
}

export function estimateProcessing(
  probe: ProbeResult | AudioProbeResult,
  format: FormatAnalysis,
  ffmpegAlreadyLoaded: boolean,
  mediaKind: MediaKind,
  activeTab: MediaPlayerTab,
  timeWindow?: TimeWindow,
  targetWidths: readonly number[] = [],
): ProcessingEstimate {
  const fullDuration = probe.duration > 0 ? probe.duration : Math.max(30, probe.fileSizeBytes / (1024 * 1024));
  const trimDuration = timeWindow
    ? Math.max(0, Math.min(timeWindow.endSeconds, fullDuration) - Math.max(0, timeWindow.startSeconds))
    : fullDuration;
  const duration = trimDuration > 0 ? trimDuration : fullDuration;
  const deviceMultiplier = getDeviceMultiplier();
  const importWithoutProcessing = (activeTab === 'course' || activeTab === 'quiz')
    && mediaKind === 'video'
    && !timeWindow
    && targetWidths.length === 0;

  let baseSeconds = importWithoutProcessing
    ? duration * 0.2
    : duration * (format.needsTranscode ? TRANSCODE_FACTOR : COPY_FACTOR);
  const resizePasses = mediaKind === 'video' && activeTab !== 'tutorial' && !importWithoutProcessing
    ? targetWidths.length
    : 0;
  if (resizePasses > 0) {
    baseSeconds += duration * RESIZE_FACTOR * resizePasses;
  }
  const downloadSeconds = ffmpegAlreadyLoaded ? 0 : isMobileDevice() ? 30 : 18;

  const lowSeconds = (baseSeconds + downloadSeconds) * deviceMultiplier;
  const highSeconds = lowSeconds * 1.6;

  const operations = buildOperations(format, mediaKind, activeTab, timeWindow, targetWidths);

  const durationLabel = timeWindow && trimDuration > 0 && trimDuration < fullDuration - 0.5
    ? `${formatDuration(trimDuration)} selected segment`
    : formatDuration(probe.duration);

  return {
    downloadCost: ffmpegAlreadyLoaded
      ? 'Processor already loaded in this session'
      : '~31 MB processor download (one-time)',
    operations,
    estimatedTimeLabel: durationLabel === 'unknown length'
      ? formatTimeRange(lowSeconds, highSeconds)
      : `${formatTimeRange(lowSeconds, highSeconds)} for ${durationLabel}`,
    riskNote: buildRiskNote(probe.fileSizeBytes),
    lowSeconds,
    highSeconds,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
