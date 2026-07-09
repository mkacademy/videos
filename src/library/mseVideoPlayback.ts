import { base64PayloadToBlob, normalizeBase64Payload } from './directoryTreeUtils';
import type { PlaylistChunk } from './videoChunkPlayback';
import { getChunkPartPayloadSignature, getPlaylistFmp4InitPayload, chunkCanAcceptMoreAppends } from './videoChunkPlayback';

/** Media kept behind the playhead before SourceBuffer eviction. */
export const MSE_KEEP_BACK_BUFFER_SEC = 30;
const MSE_EVICT_MIN_INTERVAL_MS = 5000;

const CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'stsd']);

type BoxHeader = {
  type: string;
  offset: number;
  size: number;
  contentStart: number;
};

function readUint32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24)
    | (data[offset + 1] << 16)
    | (data[offset + 2] << 8)
    | data[offset + 3]
  ) >>> 0;
}

function parseBoxHeader(data: Uint8Array, offset: number, end: number): BoxHeader | null {
  if (offset + 8 > end) return null;
  let size = readUint32(data, offset);
  const type = String.fromCharCode(
    data[offset + 4],
    data[offset + 5],
    data[offset + 6],
    data[offset + 7],
  );
  let headerSize = 8;

  if (size === 1) {
    if (offset + 16 > end) return null;
    const high = readUint32(data, offset + 8);
    const low = readUint32(data, offset + 12);
    size = high * 2 ** 32 + low;
    headerSize = 16;
  } else if (size === 0) {
    size = end - offset;
  }

  if (size < headerSize || offset + size > end) return null;

  return {
    type,
    offset,
    size,
    contentStart: offset + headerSize,
  };
}

function forEachBox(
  data: Uint8Array,
  start: number,
  end: number,
  visit: (box: BoxHeader) => void,
): void {
  let offset = start;
  while (offset + 8 <= end) {
    const box = parseBoxHeader(data, offset, end);
    if (!box) break;
    visit(box);
    if (CONTAINER_BOXES.has(box.type)) {
      forEachBox(data, box.contentStart, box.offset + box.size, visit);
    }
    offset = box.offset + box.size;
  }
}

function readFourCc(data: Uint8Array, offset: number): string {
  return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
}

function parseCodecStringsFromInit(initBytes: Uint8Array): string[] {
  const codecs: string[] = [];

  forEachBox(initBytes, 0, initBytes.length, (box) => {
    if (box.type !== 'stsd' || box.size < 16) return;
    const entryCount = readUint32(initBytes, box.contentStart + 4);
    if (entryCount < 1) return;

    let entryOffset = box.contentStart + 8;
    const entryEnd = box.offset + box.size;
    while (entryOffset + 8 <= entryEnd) {
      const entrySize = readUint32(initBytes, entryOffset);
      if (entrySize < 8) break;
      const entryType = readFourCc(initBytes, entryOffset + 4);
      const entryContent = entryOffset + 8;

      if (entryType === 'avc1' || entryType === 'avc3') {
        if (entryContent + 78 <= entryOffset + entrySize) {
          const profile = initBytes[entryContent + 11].toString(16).padStart(2, '0');
          const compat = initBytes[entryContent + 12].toString(16).padStart(2, '0');
          const level = initBytes[entryContent + 13].toString(16).padStart(2, '0');
          codecs.push(`avc1.${profile}${compat}${level}`);
        }
      } else if (entryType === 'mp4a') {
        codecs.push('mp4a.40.2');
      } else if (entryType === 'encv' || entryType === 'enca') {
        if (entryContent + 12 <= entryOffset + entrySize) {
          const original = readFourCc(initBytes, entryContent + 8);
          if (original === 'avc1' || original === 'avc3') {
            codecs.push('avc1.4d0028');
          } else if (original === 'mp4a') {
            codecs.push('mp4a.40.2');
          }
        }
      }

      entryOffset += entrySize;
    }
  });

  return codecs;
}

const FALLBACK_MIME_TYPES = [
  'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
  'video/mp4; codecs="avc1.4d0028, mp4a.40.2"',
  'video/mp4; codecs="avc1.640028, mp4a.40.2"',
];

type MediaSourceConstructor = {
  new(): MediaSource;
  isTypeSupported(type: string): boolean;
};

type MediaSourceConfig = {
  mimeType: string;
  MediaSourceClass: MediaSourceConstructor;
  usesManagedMediaSource: boolean;
};

function getManagedMediaSourceConstructor(): MediaSourceConstructor | null {
  const ctor = (globalThis as typeof globalThis & { ManagedMediaSource?: MediaSourceConstructor })
    .ManagedMediaSource;
  return ctor ?? null;
}

function getStandardMediaSourceConstructor(): MediaSourceConstructor | null {
  return typeof MediaSource !== 'undefined' ? MediaSource : null;
}

function buildCandidateMimeTypes(initBytes: Uint8Array): string[] {
  const candidateMimeTypes: string[] = [];
  const codecs = parseCodecStringsFromInit(initBytes);
  if (codecs.length > 0) {
    candidateMimeTypes.push(`video/mp4; codecs="${codecs.join(', ')}"`);
  }
  candidateMimeTypes.push(...FALLBACK_MIME_TYPES);
  return candidateMimeTypes;
}

function resolveMediaSourceConfigFromBytes(initBytes: Uint8Array): MediaSourceConfig | null {
  const candidateMimeTypes = buildCandidateMimeTypes(initBytes);

  const managed = getManagedMediaSourceConstructor();
  if (managed) {
    const mimeType = candidateMimeTypes.find((type) => managed.isTypeSupported(type));
    if (mimeType) {
      return { mimeType, MediaSourceClass: managed, usesManagedMediaSource: true };
    }
  }

  const standard = getStandardMediaSourceConstructor();
  if (standard) {
    const mimeType = candidateMimeTypes.find((type) => standard.isTypeSupported(type));
    if (mimeType) {
      return { mimeType, MediaSourceClass: standard, usesManagedMediaSource: false };
    }
  }

  return null;
}

export async function resolveMseMimeType(initPayload: string): Promise<string | null> {
  const bytes = await base64PayloadToBytes(initPayload);
  if (!bytes) return null;
  return resolveMseMimeTypeFromBytes(bytes);
}

export function resolveMseMimeTypeFromBytes(initBytes: Uint8Array): string | null {
  return resolveMediaSourceConfigFromBytes(initBytes)?.mimeType ?? null;
}

export function base64PayloadToBytesSync(payload: string): Uint8Array | null {
  try {
    const normalized = normalizeBase64Payload(payload);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function base64PayloadToBytes(payload: string): Promise<Uint8Array | null> {
  const blob = base64PayloadToBlob(payload);
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

function parseVideoDisplaySizeFromInit(initBytes: Uint8Array): { width: number; height: number } | null {
  let result: { width: number; height: number } | null = null;

  forEachBox(initBytes, 0, initBytes.length, (box) => {
    if (box.type !== 'tkhd') return;

    const content = box.contentStart;
    const version = initBytes[content];
    let widthOffset: number;
    let heightOffset: number;

    if (version === 0) {
      widthOffset = content + 76;
      heightOffset = content + 80;
    } else if (version === 1) {
      widthOffset = content + 88;
      heightOffset = content + 92;
    } else {
      return;
    }

    if (heightOffset + 4 > initBytes.length) return;

    const width = readUint32(initBytes, widthOffset) / 65536;
    const height = readUint32(initBytes, heightOffset) / 65536;
    if (width > 0 && height > 0) {
      result = { width, height };
    }
  });

  return result;
}

export function getVideoAspectRatioFromInitPayload(initPayload: string): number | null {
  const bytes = base64PayloadToBytesSync(initPayload);
  if (!bytes) return null;
  const size = parseVideoDisplaySizeFromInit(bytes);
  if (!size) return null;
  return size.width / size.height;
}

export function isMediaSourceSupported(): boolean {
  return getManagedMediaSourceConstructor() !== null
    || getStandardMediaSourceConstructor() !== null;
}

export function waitForSourceBufferIdle(sourceBuffer: SourceBuffer): Promise<void> {
  if (!sourceBuffer.updating) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onUpdateEnd = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      resolve();
    };
    sourceBuffer.addEventListener('updateend', onUpdateEnd);
  });
}

export async function removeSourceBufferRange(
  sourceBuffer: SourceBuffer,
  video: HTMLVideoElement,
  startSec: number,
  endSec: number,
): Promise<void> {
  if (endSec <= startSec) return;
  if (describeMediaElementError(video)) return;

  await waitForSourceBufferIdle(sourceBuffer);
  try {
    sourceBuffer.remove(startSec, endSec);
  } catch {
    return;
  }
  await waitForSourceBufferIdle(sourceBuffer);
}

export async function appendBytesToSourceBuffer(
  sourceBuffer: SourceBuffer,
  video: HTMLVideoElement,
  bytes: Uint8Array,
): Promise<void> {
  const existingError = describeMediaElementError(video);
  if (existingError) {
    throw new Error(`video is in an error state (${existingError})`);
  }

  await waitForSourceBufferIdle(sourceBuffer);
  // Copy so the underlying ArrayBuffer cannot be detached before updateend.
  try {
    sourceBuffer.appendBuffer(bytes.slice());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SourceBuffer append failed';
    throw new Error(message);
  }
  await waitForSourceBufferIdle(sourceBuffer);

  const decodeError = describeMediaElementError(video);
  if (decodeError) {
    throw new Error(`segment caused ${decodeError}`);
  }
}

export function getBufferedEndSeconds(video: HTMLVideoElement): number {
  const ranges = video.buffered;
  if (ranges.length === 0) return 0;
  return ranges.end(ranges.length - 1);
}

/** Whether `timeSec` sits inside a currently buffered range. */
export function isPlaybackTimeBuffered(video: HTMLVideoElement, timeSec: number): boolean {
  if (timeSec < 0 || !Number.isFinite(timeSec)) return false;
  const ranges = video.buffered;
  for (let i = 0; i < ranges.length; i += 1) {
    if (timeSec >= ranges.start(i) && timeSec < ranges.end(i) - 0.05) {
      return true;
    }
  }
  return false;
}

const MEDIA_ERROR_LABELS: Record<number, string> = {
  1: 'fetch aborted',
  2: 'network error',
  3: 'decode error',
  4: 'format not supported',
};

export function describeMediaElementError(video: HTMLVideoElement): string | null {
  const { error } = video;
  if (!error) return null;
  const label = MEDIA_ERROR_LABELS[error.code] ?? `media error ${error.code}`;
  return error.message ? `${label} (${error.message})` : label;
}

export function hasMediaElementError(video: HTMLVideoElement): boolean {
  return video.error !== null;
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}

export class MseChunkPlayerController {
  private mediaSource: MediaSource | null = null;

  private mediaSourceUrl: string | null = null;

  private sourceBuffer: SourceBuffer | null = null;

  private appendedThroughIndex = -1;

  private initAppended = false;

  private streamEnded = false;

  private destroyed = false;

  private appendGeneration = 0;

  private openingMediaSource: Promise<SourceBuffer | null> | null = null;

  private appendChain: Promise<void> = Promise.resolve();

  /** Number of split parts appended per chunk list index. */
  private readonly appendedPartCountByChunk = new Map<number, number>();

  private readonly chunkPartSignatures: string[] = [];

  private evictedMediaBeforeSec = 0;

  private lastEvictMs = 0;

  /** iOS ManagedMediaSource only accepts appends while startstreaming is active. */
  private usesManagedMediaSource = false;

  private streamingActive = true;

  private streamingResume: (() => void) | null = null;

  constructor(
    private readonly video: HTMLVideoElement,
    private chunks: readonly PlaylistChunk[],
    private readonly onError?: (message: string) => void,
  ) {
    this.chunkPartSignatures = chunks.map(getChunkPartPayloadSignature);
  }

  getAppendedThroughIndex(): number {
    return this.appendedThroughIndex;
  }

  getAppendedPartCount(chunkListIndex: number): number {
    return this.appendedPartCountByChunk.get(chunkListIndex) ?? 0;
  }

  isMediaSourceOpen(): boolean {
    return this.mediaSource?.readyState === 'open' && !hasMediaElementError(this.video);
  }

  isStreamEnded(): boolean {
    return this.streamEnded;
  }

  /** Keeps chunk payloads in sync when parts arrive while the player is open. */
  updateChunks(chunks: readonly PlaylistChunk[]): number {
    let earliestChangedAppendedIndex = -1;
    for (let index = 0; index < chunks.length; index += 1) {
      const nextSignature = getChunkPartPayloadSignature(chunks[index]!);
      const prevSignature = this.chunkPartSignatures[index] ?? '';
      if (nextSignature === prevSignature) continue;

      const appendedParts = this.appendedPartCountByChunk.get(index) ?? 0;
      const prevParts = (this.chunks[index]?.partPayloads ?? []).map(
        (part) => normalizeBase64Payload(part),
      );
      const nextParts = (chunks[index]?.partPayloads ?? []).map(
        (part) => normalizeBase64Payload(part),
      );
      let appendedRegionChanged = false;
      for (let partIndex = 0; partIndex < appendedParts; partIndex += 1) {
        if (prevParts[partIndex] !== nextParts[partIndex]) {
          appendedRegionChanged = true;
          break;
        }
      }

      if (appendedRegionChanged && index <= this.appendedThroughIndex) {
        earliestChangedAppendedIndex = earliestChangedAppendedIndex < 0
          ? index
          : Math.min(earliestChangedAppendedIndex, index);
        this.appendedPartCountByChunk.delete(index);
        if (index <= this.appendedThroughIndex) {
          this.appendedThroughIndex = index - 1;
        }
      }

      this.chunkPartSignatures[index] = nextSignature;
    }
    this.chunks = chunks;
    return earliestChangedAppendedIndex;
  }

  private reportError(message: string): void {
    if (this.destroyed) return;
    this.onError?.(message);
  }

  private attachManagedStreamingListeners(mediaSource: MediaSource): void {
    this.streamingActive = false;
    mediaSource.addEventListener('startstreaming', () => {
      this.streamingActive = true;
      this.streamingResume?.();
      this.streamingResume = null;
    });
    mediaSource.addEventListener('endstreaming', () => {
      this.streamingActive = false;
    });
  }

  private waitForStreamingAllowed(): Promise<void> {
    if (!this.usesManagedMediaSource || this.streamingActive || this.destroyed) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.streamingResume = resolve;
    });
  }

  private async appendBytes(sourceBuffer: SourceBuffer, bytes: Uint8Array): Promise<void> {
    await this.waitForStreamingAllowed();
    await appendBytesToSourceBuffer(sourceBuffer, this.video, bytes);
  }

  private isAppendStale(generation: number): boolean {
    return this.destroyed || generation !== this.appendGeneration;
  }

  private get initPayload(): string | null {
    return getPlaylistFmp4InitPayload(this.chunks);
  }

  private async appendChunkParts(
    chunkListIndex: number,
    sourceBuffer: SourceBuffer,
    generation: number,
  ): Promise<boolean> {
    if (this.isAppendStale(generation)) return false;

    const chunk = this.chunks[chunkListIndex];
    if (!chunk) return false;

    const alreadyAppendedParts = this.appendedPartCountByChunk.get(chunkListIndex) ?? 0;
    for (let partIndex = alreadyAppendedParts; partIndex < chunk.partPayloads.length; partIndex += 1) {
      if (this.isAppendStale(generation)) return false;

      const normalized = normalizeBase64Payload(chunk.partPayloads[partIndex] ?? '');
      if (!normalized) break;

      const bytes = base64PayloadToBytesSync(normalized);
      if (!bytes) {
        this.reportError(`Failed to decode chunk ${chunk.index}/${chunk.total} part ${partIndex + 1}`);
        return false;
      }

      try {
        await this.appendBytes(sourceBuffer, bytes);
      } catch (error) {
        if (this.isAppendStale(generation)) return false;
        const mediaErr = describeMediaElementError(this.video);
        const detail = mediaErr ?? (error instanceof Error ? error.message : 'append failed');
        this.reportError(`Failed to buffer chunk ${chunk.index}/${chunk.total} part ${partIndex + 1}: ${detail}`);
        return false;
      }

      if (this.isAppendStale(generation)) return false;

      this.appendedPartCountByChunk.set(chunkListIndex, partIndex + 1);
    }

    const appendedParts = this.appendedPartCountByChunk.get(chunkListIndex) ?? 0;
    if (appendedParts < chunk.expectedPartCount) return false;

    this.appendedThroughIndex = Math.max(this.appendedThroughIndex, chunkListIndex);
    return true;
  }

  private async openSourceBuffer(): Promise<SourceBuffer | null> {
    if (this.sourceBuffer) return this.sourceBuffer;
    if (this.openingMediaSource) return this.openingMediaSource;

    const initPayload = this.initPayload;
    if (!initPayload) {
      this.reportError('Missing fMP4 initialization segment.');
      return null;
    }

    this.openingMediaSource = (async () => {
      const initBytes = await base64PayloadToBytes(initPayload);
      if (this.destroyed) return null;
      if (!initBytes) {
        this.reportError('Failed to decode fMP4 initialization segment.');
        return null;
      }

      const config = resolveMediaSourceConfigFromBytes(initBytes);
      if (!config) {
        this.reportError('This browser cannot play imported fMP4 video.');
        return null;
      }

      const { mimeType, MediaSourceClass, usesManagedMediaSource } = config;
      this.usesManagedMediaSource = usesManagedMediaSource;

      const mediaSource = new MediaSourceClass();
      this.mediaSource = mediaSource;
      const url = URL.createObjectURL(mediaSource);
      this.mediaSourceUrl = url;

      if (usesManagedMediaSource) {
        // Required on iOS Safari/WebKit or sourceopen never fires.
        this.video.disableRemotePlayback = true;
        this.attachManagedStreamingListeners(mediaSource);
      }

      this.video.src = url;

      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error('MediaSource failed to open.'));
        };
        const cleanup = () => {
          mediaSource.removeEventListener('sourceopen', onOpen);
          mediaSource.removeEventListener('error', onError);
        };
        mediaSource.addEventListener('sourceopen', onOpen, { once: true });
        mediaSource.addEventListener('error', onError, { once: true });
      });

      if (this.destroyed) return null;

      const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
      // Place fragments back-to-back; imported HLS fMP4 chunks may not have
      // continuous baseMediaDecodeTime values across segment boundaries.
      try {
        sourceBuffer.mode = 'sequence';
      } catch {
        // Some ManagedMediaSource builds reject sequence mode; default segments mode still works.
      }
      this.sourceBuffer = sourceBuffer;
      return sourceBuffer;
    })();

    try {
      return await this.openingMediaSource;
    } finally {
      this.openingMediaSource = null;
    }
  }

  async appendThroughIndex(targetIndex: number, options?: { singleStep?: boolean }): Promise<void> {
    if (targetIndex < 0 || targetIndex <= this.appendedThroughIndex) return;
    if (this.streamEnded) return;
    if (!this.isMediaSourceOpen() && this.appendedThroughIndex >= 0) return;

    const cappedTarget = options?.singleStep
      ? Math.min(targetIndex, this.appendedThroughIndex + 1)
      : targetIndex;
    if (cappedTarget <= this.appendedThroughIndex) return;

    const work = this.appendChain.then(() => this.appendThroughIndexInternal(cappedTarget));
    this.appendChain = work.catch(() => undefined);
    return work;
  }

  /** Appends the next playable chunk only (used during progressive playback). */
  async appendNextChunk(): Promise<boolean> {
    const nextIndex = this.appendedThroughIndex + 1;
    if (nextIndex >= this.chunks.length) return false;

    const chunk = this.chunks[nextIndex];
    if (!chunk || !chunkCanAcceptMoreAppends(chunk, this.getAppendedPartCount(nextIndex))) {
      return false;
    }

    const partsBefore = this.getAppendedPartCount(nextIndex);
    await this.appendThroughIndex(nextIndex, { singleStep: true });
    const partsAfter = this.getAppendedPartCount(nextIndex);
    return partsAfter > partsBefore || this.appendedThroughIndex >= nextIndex;
  }

  private async appendThroughIndexInternal(targetIndex: number): Promise<void> {
    const generation = this.appendGeneration;
    if (targetIndex < 0) return;
    if (this.isAppendStale(generation)) return;
    if (hasMediaElementError(this.video)) return;

    const sourceBuffer = await this.openSourceBuffer();
    if (!sourceBuffer || this.isAppendStale(generation)) return;

    if (!this.initAppended && this.initPayload) {
      const initBytes = await base64PayloadToBytes(this.initPayload);
      if (!initBytes) {
        if (!this.isAppendStale(generation)) {
          this.reportError('Failed to decode fMP4 initialization segment.');
        }
        return;
      }
      try {
        await this.appendBytes(sourceBuffer, initBytes);
      } catch (error) {
        if (this.isAppendStale(generation)) return;
        const detail = error instanceof Error ? error.message : 'init append failed';
        this.reportError(`Failed to buffer initialization segment: ${detail}`);
        return;
      }
      if (this.isAppendStale(generation)) return;
      this.initAppended = true;
    }

    for (let index = this.appendedThroughIndex + 1; index <= targetIndex; index += 1) {
      if (this.isAppendStale(generation)) return;
      if (hasMediaElementError(this.video)) break;
      const appended = await this.appendChunkParts(index, sourceBuffer, generation);
      if (!appended) break;
    }
  }

  /**
   * Drops decoded media behind the playhead from the SourceBuffer.
   * Append bookkeeping is left intact so sequence-mode segments are not duplicated.
   */
  async evictBehindPlayhead(currentTimeSec: number): Promise<void> {
    const now = Date.now();
    if (now - this.lastEvictMs < MSE_EVICT_MIN_INTERVAL_MS) return;

    const sourceBuffer = this.sourceBuffer;
    if (!sourceBuffer || !this.isMediaSourceOpen()) return;

    const removeEnd = currentTimeSec - MSE_KEEP_BACK_BUFFER_SEC;
    if (removeEnd <= this.evictedMediaBeforeSec + 1) return;

    const ranges = this.video.buffered;
    if (ranges.length === 0 || ranges.start(0) >= removeEnd) return;

    await removeSourceBufferRange(sourceBuffer, this.video, 0, removeEnd);
    this.evictedMediaBeforeSec = removeEnd;
    this.lastEvictMs = now;
  }

  /** Signals end-of-stream only when playback has consumed the full buffered range. */
  async tryCompleteStreamNearPlaybackEnd(currentTimeSec: number): Promise<void> {
    if (this.streamEnded || this.chunks.length === 0) return;
    if (this.appendedThroughIndex < this.chunks.length - 1) return;

    const lastChunk = this.chunks[this.chunks.length - 1];
    const lastChunkEndSec = lastChunk.endMs > 0 ? lastChunk.endMs / 1000 : 0;
    if (lastChunkEndSec > 0 && currentTimeSec < lastChunkEndSec - 1) return;

    const mediaSource = this.mediaSource;
    const sourceBuffer = this.sourceBuffer;
    if (!mediaSource || mediaSource.readyState !== 'open' || !sourceBuffer) return;

    await waitForSourceBufferIdle(sourceBuffer);
    if (sourceBuffer.updating || hasMediaElementError(this.video)) return;

    try {
      mediaSource.endOfStream();
      this.streamEnded = true;
    } catch {
      // SourceBuffer may still be updating.
    }
  }

  async prepareThroughIndex(targetIndex: number, shouldAutoPlay: boolean): Promise<void> {
    await this.appendThroughIndex(targetIndex);
    const chunk = this.chunks[targetIndex];
    if (chunk && chunk.startMs > 0) {
      this.video.currentTime = chunk.startMs / 1000;
    }
    if (shouldAutoPlay) {
      await this.video.play();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.appendGeneration += 1;
    this.streamingResume?.();
    this.streamingResume = null;
    const mediaSource = this.mediaSource;
    if (mediaSource?.readyState === 'open') {
      try {
        mediaSource.endOfStream();
      } catch {
        // Ignore while tearing down.
      }
    }
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.appendedThroughIndex = -1;
    this.initAppended = false;
    this.streamEnded = false;
    this.appendChain = Promise.resolve();
    this.appendedPartCountByChunk.clear();
    this.chunkPartSignatures.length = 0;
    this.evictedMediaBeforeSec = 0;
    this.lastEvictMs = 0;
    this.usesManagedMediaSource = false;
    this.streamingActive = true;
    this.streamingResume = null;
    revokeObjectUrl(this.mediaSourceUrl);
    this.mediaSourceUrl = null;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
