export const MAX_VIDEO_WIDTH = 720;
export const LARGE_FILE_WARNING_BYTES = 200 * 1024 * 1024;
export const MOBILE_MEMORY_WARNING_BYTES = 100 * 1024 * 1024;

export const VIDEO_WIDTH_OPTIONS = [1080, 720, 480, 360] as const;
export type VideoWidthOption = typeof VIDEO_WIDTH_OPTIONS[number];
/** @deprecated Use VIDEO_WIDTH_OPTIONS */
export const VIDEO_SIZE_OPTIONS = VIDEO_WIDTH_OPTIONS;
export type VideoSizeOption = VideoWidthOption;

export type ImportDestination = 'tutorial' | 'course' | 'quiz';
export type MediaKind = 'audio' | 'video';

export interface AudioProbeResult {
  duration: number;
  fileSizeBytes: number;
  probeUrl: string;
}

export interface AudioFileSelectionContext {
  file: File;
  probe: AudioProbeResult;
  format: FormatAnalysis;
  estimate: ProcessingEstimate;
}

export type UiState =
  | 'idle'
  | 'probing'
  | 'awaiting-confirmation'
  | 'loading-ffmpeg'
  | 'processing'
  | 'importing'
  | 'done'
  | 'error'
  | 'cancelled';

export type ProcessStage =
  | 'loading-ffmpeg'
  | 'normalizing'
  | 'resizing';

export interface ProbeResult {
  width: number;
  height: number;
  duration: number;
  fileSizeBytes: number;
  probeUrl: string;
}

export interface FormatAnalysis {
  isWebReady: boolean;
  needsTranscode: boolean;
  needsResize: boolean;
  detectedFormat: string;
  targetFormat: string;
}

export interface ProcessingEstimate {
  downloadCost: string;
  operations: string[];
  estimatedTimeLabel: string;
  riskNote: string | null;
  lowSeconds: number;
  highSeconds: number;
}

export interface ProcessingProgress {
  stage: ProcessStage;
  stageLabel: string;
  ratio: number;
}

export interface TimeWindow {
  startSeconds: number;
  endSeconds: number;
}

export interface ProcessVideoOutput {
  blob: Blob;
  label: string;
  width?: number;
}

export interface ProcessVideoResult {
  outputBlob: Blob | null;
  outputs: ProcessVideoOutput[];
  cancelled: boolean;
  cancelledDuringStage?: ProcessStage;
}

export interface MatchedQuiz {
  id: number;
  title: string;
}

export interface FileSelectionContext {
  file: File;
  probe: ProbeResult;
  format: FormatAnalysis;
  estimate: ProcessingEstimate;
  matchedQuiz?: MatchedQuiz;
}
