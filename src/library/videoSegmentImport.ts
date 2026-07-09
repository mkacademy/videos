import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { resolveFfmpegLoadUrls } from '../components/mediaPrepper/ffmpegAssets';
import { MAX_IMAGE_WIDTH } from './imageCompression';
import { blobToBase64Payload, base64PayloadToBlob, isMp3File, FMP4_MEDIA_MIME, VIDEO_MP4_MIME } from './directoryTreeUtils';

type SegmentMediaKind = 'video' | 'audio';

function getSegmentMediaKind(file: File): SegmentMediaKind {
  return isMp3File(file) ? 'audio' : 'video';
}

function getWorkingFileName(kind: SegmentMediaKind): string {
  return kind === 'audio' ? 'working.mp3' : 'working.mp4';
}

function getChunkFilePattern(kind: SegmentMediaKind): RegExp {
  return kind === 'audio' ? /^chunk_\d+\.mp3$/ : /^chunk_\d+\.(mp4|m4s)$/;
}

function getFmp4ChunkFilePattern(): RegExp {
  return /^chunk_\d+\.m4s$/;
}

function getChunkOutputPattern(kind: SegmentMediaKind): string {
  return kind === 'audio' ? 'chunk_%03d.mp3' : 'chunk_%03d.mp4';
}

function getFmp4ChunkOutputPattern(): string {
  return 'chunk_%03d.m4s';
}

function getBlobMimeType(kind: SegmentMediaKind): string {
  return kind === 'audio' ? 'audio/mpeg' : VIDEO_MP4_MIME;
}
/** Soft target for each tutorial/pennant segment (~3 MB). Oversized segments are kept as-is. */
export const DEFAULT_TARGET_CHUNK_BYTES = 3 * 1024 * 1024;
export const VIDEO_CHUNK_SIZE_MB_OPTIONS = [3, 6, 9, 12] as const;
export type VideoChunkSizeMb = typeof VIDEO_CHUNK_SIZE_MB_OPTIONS[number];
export const DEFAULT_VIDEO_CHUNK_SIZE_MB: VideoChunkSizeMb = 3;

export const videoChunkSizeMbToBytes = (mb: number): number => mb * 1024 * 1024;

export type VideoImportSegment = {
  base64Payload: string;
  mimeType: string;
  startMs: number;
  endMs: number;
  byteSize: number;
  thumbnailDataUrl?: string;
  /** fMP4 initialization segment (ftyp + moov), set on the first segment only. */
  fmp4InitPayload?: string;
};

export type VideoSegmentImportStage = 'loading-ffmpeg' | 'preparing' | 'chunking';

export type VideoSegmentImportProgress = {
  stage: VideoSegmentImportStage;
  ratio: number;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Import cancelled.', 'AbortError');
  }
}

function toUint8Array(data: Uint8Array | string): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return data;
}

function getInputFileName(file: File): string {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
  return `input.${extension ?? 'mp4'}`;
}

function computeSegmentTime(durationSeconds: number, fileSizeBytes: number, targetBytes: number): number {
  if (durationSeconds > 0 && fileSizeBytes > 0) {
    const bytesPerSecond = fileSizeBytes / durationSeconds;
    return Math.max(0.5, targetBytes / bytesPerSecond);
  }
  return 10;
}

function parseHlsSegmentDurationsSeconds(m3u8Content: string): number[] {
  const durations: number[] = [];
  for (const line of m3u8Content.split('\n')) {
    const match = line.trim().match(/^#EXTINF:([\d.]+)/);
    if (match) {
      durations.push(Number.parseFloat(match[1]));
    }
  }
  return durations;
}

async function segmentWorkingFileToFmp4(
  ffmpeg: FFmpeg,
  totalDuration: number,
  workingFileSizeBytes: number,
  targetChunkBytes: number,
  signal?: AbortSignal,
  onProgress?: (progress: VideoSegmentImportProgress) => void,
): Promise<VideoImportSegment[]> {
  const workingFile = getWorkingFileName('video');
  const initName = 'init.mp4';
  const playlistName = 'playlist.m3u8';
  const segmentTime = computeSegmentTime(totalDuration, workingFileSizeBytes, targetChunkBytes);

  onProgress?.({ stage: 'chunking', ratio: 0 });

  await ffmpeg.exec([
    '-i', workingFile,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', String(segmentTime),
    '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', initName,
    '-hls_segment_filename', getFmp4ChunkOutputPattern(),
    '-hls_playlist_type', 'vod',
    playlistName,
  ], -1, { signal });

  const initBlob = await readChunkBlob(ffmpeg, initName, 'video', VIDEO_MP4_MIME);
  const initBase64Payload = await blobToBase64Payload(initBlob);
  const playlistRaw = await ffmpeg.readFile(playlistName);
  const playlistText = typeof playlistRaw === 'string'
    ? playlistRaw
    : new TextDecoder().decode(toUint8Array(playlistRaw));
  const segmentDurations = parseHlsSegmentDurationsSeconds(playlistText);

  const chunkNames = (await listChunkFiles(ffmpeg, 'video'))
    .filter((name) => getFmp4ChunkFilePattern().test(name));
  const workingBlob = await readChunkBlob(ffmpeg, workingFile, 'video');
  const segments: VideoImportSegment[] = [];
  let cursorMs = 0;

  for (let i = 0; i < chunkNames.length; i += 1) {
    throwIfAborted(signal);
    const chunkName = chunkNames[i];
    try {
      const blob = await readChunkBlob(ffmpeg, chunkName, 'video', FMP4_MEDIA_MIME);
      await ffmpeg.deleteFile(chunkName).catch(() => undefined);
      if (blob.size === 0) continue;

      const durationSec = segmentDurations[i] ?? 0;
      const durationMs = durationSec > 0
        ? Math.round(durationSec * 1000)
        : Math.max(0, Math.round((await probeBlobDuration(blob)) * 1000));
      const startMs = cursorMs;
      const endMs = durationMs > 0 ? cursorMs + durationMs : cursorMs;
      const thumbnailDataUrl = await extractThumbnailFromVideoBlob(
        workingBlob,
        startMs / 1000,
        signal,
      );
      const base64Payload = await blobToBase64Payload(blob);
      segments.push({
        base64Payload,
        mimeType: FMP4_MEDIA_MIME,
        startMs,
        endMs,
        byteSize: blob.size,
        ...(i === 0 ? { fmp4InitPayload: initBase64Payload } : {}),
        ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
      });
      cursorMs = endMs > startMs ? endMs : cursorMs;
    } catch (error) {
      console.warn(`Failed to process fMP4 segment ${chunkName}:`, error);
      await ffmpeg.deleteFile(chunkName).catch(() => undefined);
    }

    const ratio = totalDuration > 0
      ? Math.min(1, (cursorMs / 1000) / totalDuration)
      : Math.min(1, (i + 1) / Math.max(1, chunkNames.length));
    onProgress?.({ stage: 'chunking', ratio });
    await yieldToMain();
  }

  await ffmpeg.deleteFile(initName).catch(() => undefined);
  await ffmpeg.deleteFile(playlistName).catch(() => undefined);
  return segments;
}

async function readChunkBlob(
  ffmpeg: FFmpeg,
  name: string,
  kind: SegmentMediaKind,
  mime?: string,
): Promise<Blob> {
  const data = toUint8Array(await ffmpeg.readFile(name));
  return new Blob([new Uint8Array(data)], { type: mime ?? getBlobMimeType(kind) });
}

async function probeVideoBlobDuration(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;

  try {
    return await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => {
        resolve(Number.isFinite(video.duration) ? video.duration : 0);
      };
      video.onerror = () => reject(new Error('Failed to read chunk duration.'));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}

async function probeAudioBlobDuration(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';

  try {
    return await new Promise<number>((resolve, reject) => {
      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      audio.onerror = () => reject(new Error('Failed to read chunk duration.'));
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
    audio.removeAttribute('src');
    audio.load();
  }
}

async function probeBlobDuration(blob: Blob): Promise<number> {
  if (blob.type.startsWith('audio/')) {
    return probeAudioBlobDuration(blob);
  }
  return probeVideoBlobDuration(blob);
}

async function listChunkFiles(ffmpeg: FFmpeg, kind: SegmentMediaKind): Promise<string[]> {
  const pattern = getChunkFilePattern(kind);
  const entries = await ffmpeg.listDir('/');
  return entries
    .filter((entry) => !entry.isDir && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));
}

async function deleteChunkFiles(ffmpeg: FFmpeg, kind: SegmentMediaKind): Promise<void> {
  const names = await listChunkFiles(ffmpeg, kind);
  await Promise.all(names.map((name) => ffmpeg.deleteFile(name).catch(() => undefined)));
}

async function yieldToMain(): Promise<void> {
  await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
}

/** Capture a frame via HTML5 video + canvas (avoids extra ffmpeg.wasm memory per chunk). */
async function extractThumbnailFromVideoBlob(
  videoBlob: Blob,
  seekSeconds = 0,
  signal?: AbortSignal,
): Promise<string | undefined> {
  throwIfAborted(signal);

  const url = URL.createObjectURL(videoBlob);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Thumbnail load timeout')), 20_000);
      video.onloadeddata = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load video for thumbnail'));
      };
      video.src = url;
    });

    throwIfAborted(signal);

    const targetTime = Math.max(0, seekSeconds);
    if (Math.abs(video.currentTime - targetTime) > 0.01) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error('Seek failed'));
        video.currentTime = targetTime;
      });
    }

    const { videoWidth, videoHeight } = video;
    if (videoWidth <= 0 || videoHeight <= 0) return undefined;

    const scale = videoWidth > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / videoWidth : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl.startsWith('data:image/') ? dataUrl : undefined;
  } catch (error) {
    console.warn('Failed to extract video thumbnail:', error);
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}

function assembleFmp4PlayableBlob(initPayload: string, mediaBlob: Blob): Blob | null {
  const initBlob = base64PayloadToBlob(initPayload, VIDEO_MP4_MIME);
  if (!initBlob) return null;
  return new Blob([initBlob, mediaBlob], { type: VIDEO_MP4_MIME });
}

export async function extractChunkThumbnailFromBlob(
  chunkBlob: Blob,
  signal?: AbortSignal,
  fmp4InitPayload?: string | null,
  seekSeconds = 0,
): Promise<string | undefined> {
  const playableBlob = fmp4InitPayload
    ? assembleFmp4PlayableBlob(fmp4InitPayload, chunkBlob) ?? chunkBlob
    : chunkBlob;
  return extractThumbnailFromVideoBlob(playableBlob, seekSeconds, signal);
}

async function assignTimeRangesFromProbe(
  blobs: Blob[],
  startMs: number,
): Promise<{ blob: Blob; startMs: number; endMs: number }[]> {
  const results: { blob: Blob; startMs: number; endMs: number }[] = [];
  let cursor = startMs;

  for (const blob of blobs) {
    const durationSec = await probeBlobDuration(blob);
    const durationMs = Math.max(0, Math.round(durationSec * 1000));
    results.push({ blob, startMs: cursor, endMs: cursor + durationMs });
    cursor += durationMs;
  }

  return results;
}

async function blobsToSegments(
  blobsWithTime: { blob: Blob; startMs: number; endMs: number }[],
  kind: SegmentMediaKind,
  signal?: AbortSignal,
): Promise<VideoImportSegment[]> {
  const segments: VideoImportSegment[] = [];
  for (const { blob, startMs, endMs } of blobsWithTime) {
    throwIfAborted(signal);
    const thumbnailDataUrl = kind === 'video'
      ? await extractChunkThumbnailFromBlob(blob, signal)
      : undefined;
    const base64Payload = await blobToBase64Payload(blob);
    segments.push({
      base64Payload,
      mimeType: getBlobMimeType(kind),
      startMs,
      endMs,
      byteSize: blob.size,
      ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
    });
    await yieldToMain();
  }
  return segments;
}

async function segmentWorkingFile(
  ffmpeg: FFmpeg,
  totalDuration: number,
  workingFileSizeBytes: number,
  targetChunkBytes: number,
  kind: SegmentMediaKind,
  signal?: AbortSignal,
  onProgress?: (progress: VideoSegmentImportProgress) => void,
): Promise<VideoImportSegment[]> {
  const workingFile = getWorkingFileName(kind);
  const segmentTime = computeSegmentTime(
    totalDuration,
    workingFileSizeBytes,
    targetChunkBytes,
  );

  onProgress?.({ stage: 'chunking', ratio: 0 });

  if (kind === 'video') {
    return segmentWorkingFileToFmp4(
      ffmpeg,
      totalDuration,
      workingFileSizeBytes,
      targetChunkBytes,
      signal,
      onProgress,
    );
  }

  const segmentArgs = [
    '-i', workingFile,
    '-c', 'copy',
    '-f', 'segment',
    '-segment_time', String(segmentTime),
    '-reset_timestamps', '1',
    getChunkOutputPattern(kind),
  ];

  await ffmpeg.exec(segmentArgs, -1, { signal });

  const chunkNames = await listChunkFiles(ffmpeg, kind);
  const segments: VideoImportSegment[] = [];
  let cursorMs = 0;
  const duration = totalDuration;

  for (let i = 0; i < chunkNames.length; i += 1) {
    throwIfAborted(signal);

    const chunkName = chunkNames[i];
    try {
      const blob = await readChunkBlob(ffmpeg, chunkName, kind);
      await ffmpeg.deleteFile(chunkName).catch(() => undefined);

      if (blob.size > 0) {
        const ranged = await assignTimeRangesFromProbe([blob], cursorMs);
        const newSegments = await blobsToSegments(ranged, kind, signal);
        segments.push(...newSegments);
        cursorMs = ranged[ranged.length - 1]?.endMs ?? cursorMs;
      }
    } catch (error) {
      console.warn(`Failed to process segment ${chunkName}:`, error);
      await ffmpeg.deleteFile(chunkName).catch(() => undefined);
    }

    const ratio = duration > 0
      ? Math.min(1, (cursorMs / 1000) / duration)
      : Math.min(1, (i + 1) / Math.max(1, chunkNames.length));
    onProgress?.({ stage: 'chunking', ratio });
    await yieldToMain();
  }

  return segments;
}

async function prepareWorkingFile(
  ffmpeg: FFmpeg,
  inputName: string,
  kind: SegmentMediaKind,
  signal?: AbortSignal,
  onProgress?: (progress: VideoSegmentImportProgress) => void,
): Promise<void> {
  const workingFile = getWorkingFileName(kind);
  onProgress?.({ stage: 'preparing', ratio: 0.1 });

  if (kind === 'audio') {
    try {
      await ffmpeg.exec(['-i', inputName, '-c', 'copy', workingFile], -1, { signal });
    } catch {
      await ffmpeg.exec([
        '-i', inputName,
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        workingFile,
      ], -1, { signal });
    }
    onProgress?.({ stage: 'preparing', ratio: 1 });
    return;
  }

  const copyArgs = ['-i', inputName, '-c', 'copy', '-movflags', '+faststart', workingFile];
  try {
    await ffmpeg.exec(copyArgs, -1, { signal });
  } catch {
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      workingFile,
    ], -1, { signal });
  }
  onProgress?.({ stage: 'preparing', ratio: 1 });
}

export class VideoSegmentImporter {
  private ffmpeg: FFmpeg | null = null;

  private loaded = false;

  async load(signal?: AbortSignal, onProgress?: (progress: VideoSegmentImportProgress) => void): Promise<void> {
    throwIfAborted(signal);
    if (this.ffmpeg && this.loaded) return;

    onProgress?.({ stage: 'loading-ffmpeg', ratio: 0.1 });

    const ffmpeg = new FFmpeg();
    this.ffmpeg = ffmpeg;

    const loadUrls = await resolveFfmpegLoadUrls();
    throwIfAborted(signal);
    await ffmpeg.load(loadUrls, { signal });
    this.loaded = true;
    onProgress?.({ stage: 'loading-ffmpeg', ratio: 1 });
  }

  async segmentFile(
    file: File,
    probeDurationSeconds: number,
    signal?: AbortSignal,
    onProgress?: (progress: VideoSegmentImportProgress) => void,
    targetChunkBytes: number = DEFAULT_TARGET_CHUNK_BYTES,
  ): Promise<VideoImportSegment[]> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('Video segment importer is not loaded.');
    }

    const ffmpeg = this.ffmpeg;
    const inputName = getInputFileName(file);
    const kind = getSegmentMediaKind(file);
    const workingFile = getWorkingFileName(kind);

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file), { signal });
      await prepareWorkingFile(ffmpeg, inputName, kind, signal, onProgress);
      await ffmpeg.deleteFile(inputName).catch(() => undefined);
      await deleteChunkFiles(ffmpeg, kind);

      const segments = await segmentWorkingFile(
        ffmpeg,
        probeDurationSeconds,
        file.size,
        targetChunkBytes,
        kind,
        signal,
        onProgress,
      );

      if (segments.length === 0) {
        throw new Error(`No ${kind} segments were produced.`);
      }

      return segments;
    } finally {
      await Promise.all([
        ffmpeg.deleteFile(inputName).catch(() => undefined),
        ffmpeg.deleteFile(workingFile).catch(() => undefined),
        deleteChunkFiles(ffmpeg, kind),
      ]);
    }
  }

  async concatSegments(
    base64Chunks: readonly string[],
    signal?: AbortSignal,
    fmp4InitPayload?: string | null,
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('Video segment importer is not loaded.');
    }
    if (!fmp4InitPayload) {
      throw new Error('fMP4 init segment is required.');
    }

    const initBlob = base64PayloadToBlob(fmp4InitPayload);
    if (!initBlob) {
      throw new Error('Failed to decode fMP4 init segment.');
    }

    const segmentBlobs: Blob[] = [];
    for (let i = 0; i < base64Chunks.length; i += 1) {
      throwIfAborted(signal);
      const blob = base64PayloadToBlob(base64Chunks[i], FMP4_MEDIA_MIME);
      if (!blob) {
        throw new Error(`Failed to decode export segment ${i + 1}.`);
      }
      segmentBlobs.push(blob);
    }

    // fMP4 export is init (ftyp+moov) followed by media fragments (moof+mdat).
    // The concat demuxer cannot join these; byte-concatenate like in-app playback does.
    const fmp4Blob = new Blob([initBlob, ...segmentBlobs], { type: VIDEO_MP4_MIME });

    const ffmpeg = this.ffmpeg;
    const inputName = 'export_input.mp4';
    const outputName = 'export_output.mp4';

    try {
      await ffmpeg.writeFile(inputName, new Uint8Array(await fmp4Blob.arrayBuffer()), { signal });
      try {
        await ffmpeg.exec([
          '-i', inputName,
          '-c', 'copy',
          '-movflags', '+faststart',
          outputName,
        ], -1, { signal });
        return await readChunkBlob(ffmpeg, outputName, 'video');
      } catch {
        // Fall back to the byte-concatenated fMP4 if remux to progressive MP4 fails.
        return fmp4Blob;
      }
    } finally {
      await Promise.all([
        ffmpeg.deleteFile(inputName).catch(() => undefined),
        ffmpeg.deleteFile(outputName).catch(() => undefined),
      ]);
    }
  }

  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
    }
    this.ffmpeg = null;
    this.loaded = false;
  }
}
