import { FFmpeg } from '@ffmpeg/ffmpeg';
import { resolveFfmpegLoadUrls } from './ffmpegAssets';
import { base64PayloadToBlob, FMP4_MEDIA_MIME, VIDEO_MP4_MIME } from './directoryTreeUtils';

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Export cancelled.', 'AbortError');
  }
}

function toUint8Array(data: Uint8Array | string): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return data;
}

async function readOutputBlob(ffmpeg: FFmpeg, name: string): Promise<Blob> {
  const data = toUint8Array(await ffmpeg.readFile(name));
  return new Blob([new Uint8Array(data)], { type: VIDEO_MP4_MIME });
}

/** FFmpeg helper for reassembling fMP4 chunk payloads into a playable MP4. */
export class VideoSegmentUtils {
  private ffmpeg: FFmpeg | null = null;

  private loaded = false;

  async load(signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    if (this.ffmpeg && this.loaded) return;

    const ffmpeg = new FFmpeg();
    this.ffmpeg = ffmpeg;

    const loadUrls = await resolveFfmpegLoadUrls();
    throwIfAborted(signal);
    await ffmpeg.load(loadUrls, { signal });
    this.loaded = true;
  }

  async concatSegments(
    base64Chunks: readonly string[],
    signal?: AbortSignal,
    fmp4InitPayload?: string | null,
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('Video segment utils are not loaded.');
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
        return await readOutputBlob(ffmpeg, outputName);
      } catch {
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
