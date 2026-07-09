import { useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type {
  FormatAnalysis,
  ProcessingProgress,
  ProcessStage,
  ProcessVideoOutput,
  ProcessVideoResult,
  TimeWindow,
} from './types';
import { logError, logStage } from './debugLog';
import { resolveFfmpegLoadUrls } from './ffmpegAssets';

const WORKING_FILE = 'working.mp4';
const STREAMABLE_MOVFLAGS = 'frag_keyframe+empty_moov+default_base_moof';

const STAGE_LABELS: Record<ProcessStage, string> = {
  'loading-ffmpeg': 'Loading video processor…',
  normalizing: 'Converting to web format…',
  resizing: 'Resizing video…',
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Processing cancelled.', 'AbortError');
  }
}

function isUserCancellation(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.message === 'called FFmpeg.terminate()') return true;
  return false;
}

async function readFileBlob(ffmpeg: FFmpeg, name: string): Promise<Blob> {
  const data = toUint8Array(await ffmpeg.readFile(name));
  return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
}

function getInputFileName(file: File): string {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
  return `input.${extension ?? 'mp4'}`;
}

function toUint8Array(data: Uint8Array | string): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return data;
}

function appendTrimArgs(args: string[], timeWindow?: TimeWindow): string[] {
  if (!timeWindow) return args;

  const start = Math.max(0, timeWindow.startSeconds);
  const end = Math.max(start, timeWindow.endSeconds);
  const duration = end - start;
  if (duration <= 0.05) return args;

  return ['-ss', String(start), '-t', String(duration), ...args];
}

function shouldApplyTrim(timeWindow?: TimeWindow): boolean {
  if (!timeWindow) return false;
  return timeWindow.endSeconds - timeWindow.startSeconds > 0.05;
}

function getWorkDurationSeconds(
  timeWindow: TimeWindow | undefined,
  sourceDurationSeconds: number,
): { startSeconds: number; workDurationSeconds: number; sourceDurationSeconds: number } {
  if (!shouldApplyTrim(timeWindow) || sourceDurationSeconds <= 0) {
    return {
      startSeconds: 0,
      workDurationSeconds: sourceDurationSeconds > 0 ? sourceDurationSeconds : 0,
      sourceDurationSeconds,
    };
  }

  const startSeconds = Math.max(0, timeWindow!.startSeconds);
  const endSeconds = Math.min(sourceDurationSeconds, Math.max(startSeconds, timeWindow!.endSeconds));
  const workDurationSeconds = Math.max(0, endSeconds - startSeconds);

  return {
    startSeconds,
    workDurationSeconds: workDurationSeconds > 0 ? workDurationSeconds : sourceDurationSeconds,
    sourceDurationSeconds,
  };
}

function computeStageProgress(
  timeUs: number,
  fallbackProgress: number,
  startSeconds: number,
  workDurationSeconds: number,
  sourceDurationSeconds: number,
): number {
  if (workDurationSeconds > 0 && timeUs > 0) {
    return Math.min(1, Math.max(0, (timeUs / 1_000_000) / workDurationSeconds));
  }

  if (
    workDurationSeconds > 0
    && sourceDurationSeconds > 0
    && Number.isFinite(fallbackProgress)
    && fallbackProgress >= 0
    && fallbackProgress <= 1
  ) {
    const absoluteSeconds = fallbackProgress * sourceDurationSeconds;
    if (startSeconds > 0 || workDurationSeconds < sourceDurationSeconds - 0.05) {
      return Math.min(1, Math.max(0, (absoluteSeconds - startSeconds) / workDurationSeconds));
    }
    return fallbackProgress;
  }

  if (Number.isFinite(fallbackProgress)) {
    return Math.min(1, Math.max(0, fallbackProgress));
  }

  return 0;
}

async function trySalvageWorkingFile(ffmpeg: FFmpeg, fileName = WORKING_FILE): Promise<Blob | null> {
  try {
    const data = toUint8Array(await ffmpeg.readFile(fileName));
    if (data.byteLength === 0) return null;
    return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
  } catch {
    return null;
  }
}

function buildOutputResult(outputs: ProcessVideoOutput[], cancelled: boolean, stage?: ProcessStage): ProcessVideoResult {
  return {
    outputBlob: outputs[0]?.blob ?? null,
    outputs,
    cancelled,
    ...(stage ? { cancelledDuringStage: stage } : {}),
  };
}

export function useVideoProcessor() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadedRef = useRef(false);
  const processingCancelledRef = useRef(false);
  const activeStageRef = useRef<ProcessStage>('loading-ffmpeg');
  const progressContextRef = useRef({
    startSeconds: 0,
    workDurationSeconds: 0,
    sourceDurationSeconds: 0,
  });

  const reportProgress = useCallback(
    (
      onProgress: ((progress: ProcessingProgress) => void) | undefined,
      stage: ProcessStage,
      ratio: number,
      signal?: AbortSignal,
    ) => {
      if (signal?.aborted) return;
      onProgress?.({
        stage,
        stageLabel: STAGE_LABELS[stage],
        ratio: Math.min(1, Math.max(0, ratio)),
      });
    },
    [],
  );

  const ensureFfmpeg = useCallback(
    async (
      signal: AbortSignal | undefined,
      onProgress: ((progress: ProcessingProgress) => void) | undefined,
    ): Promise<FFmpeg> => {
      throwIfAborted(signal);

      if (ffmpegRef.current && loadedRef.current) {
        return ffmpegRef.current;
      }

      reportProgress(onProgress, 'loading-ffmpeg', 0.1, signal);

      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;
      ffmpeg.on('log', ({ type, message }) => {
        if (processingCancelledRef.current) return;
        logStage('ffmpeg', `${type}: ${message}`);
      });
      ffmpeg.on('progress', ({ progress, time }) => {
        if (ffmpegRef.current !== ffmpeg || signal?.aborted || processingCancelledRef.current) return;
        const { startSeconds, workDurationSeconds, sourceDurationSeconds } = progressContextRef.current;
        const ratio = computeStageProgress(
          time,
          progress,
          startSeconds,
          workDurationSeconds,
          sourceDurationSeconds,
        );
        reportProgress(onProgress, activeStageRef.current, ratio, signal);
      });

      const loadUrls = await resolveFfmpegLoadUrls();
      logStage('loading-ffmpeg', 'Resolved load URLs', loadUrls);
      throwIfAborted(signal);

      await ffmpeg.load(loadUrls, { signal });
      logStage('loading-ffmpeg', 'FFmpeg loaded successfully');
      throwIfAborted(signal);

      loadedRef.current = true;
      reportProgress(onProgress, 'loading-ffmpeg', 1, signal);
      return ffmpeg;
    },
    [reportProgress],
  );

  const cleanupFfmpegFiles = useCallback(async (ffmpeg: FFmpeg, extraNames: string[] = []) => {
    const names = new Set([WORKING_FILE, ...extraNames]);
    await Promise.all([...names].map((name) => ffmpeg.deleteFile(name).catch(() => undefined)));
  }, []);

  const cancel = useCallback((): void => {
    processingCancelledRef.current = true;
  }, []);

  const terminateFfmpeg = useCallback((): void => {
    const ffmpeg = ffmpegRef.current;
    if (ffmpeg) {
      ffmpeg.terminate();
    }
    ffmpegRef.current = null;
    loadedRef.current = false;
  }, []);

  const resolveCancelledResult = useCallback(async (ffmpeg: FFmpeg | null): Promise<ProcessVideoResult> => {
    const stage = activeStageRef.current;
    const outputs: ProcessVideoOutput[] = [];

    if (ffmpeg && (stage === 'resizing' || stage === 'normalizing')) {
      const salvaged = await trySalvageWorkingFile(ffmpeg);
      if (salvaged) {
        outputs.push({ blob: salvaged, label: 'partial' });
        logStage('process', 'Salvaged partial working file', { sizeBytes: salvaged.size, stage });
      }
    }

    logStage('process', 'Cancelled', { stage, outputSize: outputs[0]?.blob.size });
    return buildOutputResult(outputs, true, stage);
  }, []);

  const runTranscode = useCallback(async (
    ffmpeg: FFmpeg,
    inputName: string,
    outputName: string,
    timeWindow: TimeWindow | undefined,
    scaleFilter: string | undefined,
    signal: AbortSignal | undefined,
    onProgress: ((progress: ProcessingProgress) => void) | undefined,
  ) => {
    const stage: ProcessStage = scaleFilter ? 'resizing' : 'normalizing';
    activeStageRef.current = stage;
    reportProgress(onProgress, stage, 0.1, signal);

    const args = appendTrimArgs(['-i', inputName], shouldApplyTrim(timeWindow) ? timeWindow : undefined);
    if (scaleFilter) {
      args.push('-vf', scaleFilter);
    }
    args.push(
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', `+${STREAMABLE_MOVFLAGS}`,
      outputName,
    );

    logStage(stage, 'Running ffmpeg', { args });
    await ffmpeg.exec(args, -1, { signal });
    throwIfAborted(signal);
    reportProgress(onProgress, stage, 1, signal);
  }, [reportProgress]);

function buildWidthScaleFilter(width: number): string {
  return `scale=${width}:-2`;
}

  const buildWorkingFile = useCallback(
    async (
      ffmpeg: FFmpeg,
      inputName: string,
      format: FormatAnalysis,
      timeWindow: TimeWindow | undefined,
      targetWidths: readonly number[],
      signal: AbortSignal | undefined,
      onProgress: ((progress: ProcessingProgress) => void) | undefined,
    ) => {
      const needsTranscode = format.needsTranscode;
      const applyTrim = shouldApplyTrim(timeWindow);
      const singleWidth = targetWidths.length === 1 ? targetWidths[0] : undefined;

      if (needsTranscode || applyTrim || singleWidth !== undefined) {
        const scaleFilter = singleWidth !== undefined ? buildWidthScaleFilter(singleWidth) : undefined;
        await runTranscode(ffmpeg, inputName, WORKING_FILE, timeWindow, scaleFilter, signal, onProgress);
        return;
      }

      activeStageRef.current = 'normalizing';
      reportProgress(onProgress, 'normalizing', 0.1, signal);
      const copyArgs = appendTrimArgs(
        ['-i', inputName, '-c', 'copy', '-movflags', `+${STREAMABLE_MOVFLAGS}`, WORKING_FILE],
        applyTrim ? timeWindow : undefined,
      );
      try {
        logStage('normalizing', 'Trying stream copy', { args: copyArgs });
        await ffmpeg.exec(copyArgs, -1, { signal });
      } catch (copyError) {
        if (isUserCancellation(copyError, signal)) throw copyError;
        logError('normalizing', copyError, { args: copyArgs, fallback: 'transcode' });
        await runTranscode(ffmpeg, inputName, WORKING_FILE, timeWindow, undefined, signal, onProgress);
      }
      throwIfAborted(signal);
      reportProgress(onProgress, 'normalizing', 1, signal);
    },
    [reportProgress, runTranscode],
  );

  const processVideo = useCallback(
    async (
      file: File,
      format: FormatAnalysis,
      options?: {
        signal?: AbortSignal;
        timeWindow?: TimeWindow;
        sourceDurationSeconds?: number;
        targetWidths?: number[];
        onProgress?: (progress: ProcessingProgress) => void;
        onOutputReady?: (blob: Blob) => void;
      },
    ): Promise<ProcessVideoResult> => {
      const {
        signal,
        timeWindow,
        sourceDurationSeconds = 0,
        targetWidths = [],
        onProgress,
        onOutputReady,
      } = options ?? {};
      const inputName = getInputFileName(file);
      const sortedWidths = [...targetWidths].sort((a, b) => b - a);
      let ffmpeg: FFmpeg | null = null;
      processingCancelledRef.current = false;
      progressContextRef.current = getWorkDurationSeconds(timeWindow, sourceDurationSeconds);

      logStage('process', 'Starting', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        inputName,
        format,
        targetWidths: sortedWidths,
      });

      try {
        ffmpeg = await ensureFfmpeg(signal, onProgress);
        throwIfAborted(signal);

        const tempOutputNames: string[] = [];

        try {
          logStage('process', 'Writing input file to ffmpeg FS');
          await ffmpeg.writeFile(inputName, await fetchFile(file), { signal });
          throwIfAborted(signal);

          await buildWorkingFile(ffmpeg, inputName, format, timeWindow, sortedWidths, signal, onProgress);
          await ffmpeg.deleteFile(inputName).catch(() => undefined);

          const outputs: ProcessVideoOutput[] = [];

          if (sortedWidths.length <= 1) {
            const outputBlob = await readFileBlob(ffmpeg, WORKING_FILE);
            const label = sortedWidths.length === 1 ? `${sortedWidths[0]}w` : 'prepared';
            outputs.push({
              blob: outputBlob,
              label,
              ...(sortedWidths.length === 1 ? { width: sortedWidths[0] } : {}),
            });
            onOutputReady?.(outputBlob);
          } else {
            for (let i = 0; i < sortedWidths.length; i += 1) {
              const width = sortedWidths[i];
              const outputName = `output_${width}.mp4`;
              tempOutputNames.push(outputName);
              activeStageRef.current = 'resizing';
              reportProgress(onProgress, 'resizing', i / sortedWidths.length, signal);
              await runTranscode(
                ffmpeg,
                WORKING_FILE,
                outputName,
                undefined,
                buildWidthScaleFilter(width),
                signal,
                (progress) => {
                  const overallRatio = (i + progress.ratio) / sortedWidths.length;
                  reportProgress(onProgress, 'resizing', overallRatio, signal);
                },
              );
              const blob = await readFileBlob(ffmpeg, outputName);
              outputs.push({ blob, label: `${width}w`, width });
              onOutputReady?.(blob);
            }
          }

          logStage('process', 'Completed', { outputCount: outputs.length });
          return buildOutputResult(outputs, false);
        } catch (error) {
          if (isUserCancellation(error, signal)) {
            return await resolveCancelledResult(ffmpeg);
          }
          throw error;
        } finally {
          if (ffmpeg && ffmpegRef.current) {
            await cleanupFfmpegFiles(ffmpeg, [inputName, ...tempOutputNames]).catch(() => undefined);
          }
          if (processingCancelledRef.current) {
            terminateFfmpeg();
          }
        }
      } catch (error) {
        if (isUserCancellation(error, signal)) {
          return await resolveCancelledResult(ffmpeg);
        }
        logError('process', error, {
          fileName: file.name,
          fileSize: file.size,
          format,
        });
        throw error;
      }
    },
    [
      buildWorkingFile,
      cleanupFfmpegFiles,
      ensureFfmpeg,
      reportProgress,
      resolveCancelledResult,
      runTranscode,
      terminateFfmpeg,
    ],
  );

  return {
    processVideo,
    cancel,
    terminateFfmpeg,
    isFfmpegLoaded: () => loadedRef.current,
  };
}
