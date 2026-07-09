import { acceptedFiles } from '../utils';
import { imageFileToDataUrl } from './imageCompression';

export const MAX_IMAGE_BYTES = 1_048_576;

const MONTH_LABELS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

export type DirectoryFileNode = {
  isImage: 'true' | 'false';
  size: number;
  lastModified: number;
};

export interface DirectoryTree {
  [key: string]: DirectoryFileNode | DirectoryTree;
}

const imageExtensions = new Set(
  acceptedFiles.split(',').map((ext) => ext.trim().replace(/^\./, '').toLowerCase()),
);

export const isImageFileName = (name: string): boolean => {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return false;
  return imageExtensions.has(name.slice(dot + 1).toLowerCase());
};

/** True when decoded file contents are Unicode text (not binary). */
export const isUnicodeTextContent = (text: string): boolean => {
  if (text.includes('\0')) return false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (code < 32 && ch !== '\n' && ch !== '\r' && ch !== '\t') return false;
  }
  return true;
};

export const TEXT_CHUNK_SIZE = 500;

export const END_OF_FILE_MARKER = '<endOfFile>';

export const splitTextIntoChunks = (text: string, chunkSize = TEXT_CHUNK_SIZE): string[] => {
  if (text.length === 0) return [''];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

export const formatBannerCharacterQuote = (totalCharacters: number): string =>
  `total characters is ${totalCharacters.toLocaleString()}`;

export const isDirectoryPickerSupported = (): boolean =>
  'showDirectoryPicker' in window;

export const isDirectoryExportSupported = (): boolean =>
  isDirectoryPickerSupported();

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

const INVALID_PATH_CHARS = /[/\\:*?"<>|]/g;

export const sanitizePathSegment = (name: string): string => {
  const trimmed = name.trim().replace(INVALID_PATH_CHARS, '_');
  return trimmed || 'untitled';
};

export const isExportableDataUrl = (url: string): boolean => {
  if (!url.startsWith('data:image')) return false;
  const parts = url.split(',');
  if (parts.length !== 2) return false;
  const header = parts[0];
  if (!header.includes('data:image/') || !header.includes(';base64')) return false;
  const data = parts[1];
  return Boolean(data?.trim().length);
};

export const dataUrlToBlob = (dataUrl: string): Blob | null => {
  if (!isExportableDataUrl(dataUrl)) return null;
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(image\/[^;]+);/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
};

export const resolveExportFileName = (title: string, mime: string): string => {
  const safe = sanitizePathSegment(title);
  if (isImageFileName(safe)) return safe;
  const ext = MIME_TO_EXT[mime] ?? '.png';
  return `${safe}${ext}`;
};

export const resolveTextExportFileName = (title: string): string => {
  const safe = sanitizePathSegment(title);
  if (/\.(txt|text|md)$/i.test(safe)) return safe;
  return `${safe}.txt`;
};

export const uniqueFileName = (baseName: string, used: Set<string>): string => {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';
  let n = 2;
  let candidate = `${stem}_${n}${ext}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${stem}_${n}${ext}`;
  }
  used.add(candidate);
  return candidate;
};

export const writeBlobToHandle = async (
  dir: FileSystemDirectoryHandle,
  fileName: string,
  blob: Blob,
): Promise<void> => {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

export const pickWritableDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!isDirectoryExportSupported()) {
    console.warn('showDirectoryPicker (readwrite) is not supported in this browser');
    return null;
  }

  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    console.warn('Failed to pick writable directory:', error);
    return null;
  }
};

export const formatSizeLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = Math.round((bytes / 1024) * 100) / 100;
    return `${kb} kB`;
  }
  const mb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
  return `${mb} MB`;
};

/** Lowercase unit labels for base64 data-url byte sizes, e.g. `6 kb`, `6 mb`. */
export const formatBase64SizeLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) {
    const kb = Math.round((bytes / 1024) * 100) / 100;
    return `${kb} kb`;
  }
  const mb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
  return `${mb} mb`;
};

export const dataUrlByteLength = (dataUrl: string): number =>
  new Blob([dataUrl]).size;

export const formatLastModifiedLabel = (lastModified: number): string => {
  const date = new Date(lastModified);
  const year = date.getFullYear();
  const month = MONTH_LABELS[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}, ${hours}:${minutes}`;
};

export type BannerQuoteMedia = 'images' | 'video' | 'audio';

export const formatBannerQuote = (
  totalBytes: number,
  totalBase64Bytes: number,
  media: BannerQuoteMedia = 'images',
): string =>
  `total ${media} size is ${formatSizeLabel(totalBytes)} (${formatBase64SizeLabel(totalBase64Bytes)})`;

export const formatContentDescription = (
  size: number,
  base64Bytes: number,
  lastModified: number,
): string =>
  `image size is ${formatSizeLabel(size)} (${formatBase64SizeLabel(base64Bytes)}) and was last modified on ${formatLastModifiedLabel(lastModified)}`;

export const fileToDataUrl = async (file: File): Promise<string> => {
  const { dataUrl } = await imageFileToDataUrl(file);
  return dataUrl;
};

export const pickDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!isDirectoryPickerSupported()) {
    console.warn('showDirectoryPicker is not supported in this browser');
    return null;
  }

  try {
    return await window.showDirectoryPicker();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    console.warn('Failed to pick directory:', error);
    return null;
  }
};

export const readDirectoryTree = async (
  handle: FileSystemDirectoryHandle,
): Promise<DirectoryTree> => {
  const tree: DirectoryTree = {};

  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'file') {
      const file = await (entry as FileSystemFileHandle).getFile();
      tree[name] = {
        isImage: isImageFileName(name) ? 'true' : 'false',
        size: file.size,
        lastModified: file.lastModified,
      };
    } else {
      tree[name] = await readDirectoryTree(entry as FileSystemDirectoryHandle);
    }
  }

  return tree;
};

export const pickDirectoryTree = async (): Promise<DirectoryTree | null> => {
  const dirHandle = await pickDirectoryHandle();
  if (!dirHandle) return null;
  const tree = await readDirectoryTree(dirHandle);
  return { [dirHandle.name]: tree };
};

export const formatVideoImportProgressMessage = (current: number, total: number): string =>
  `Probing and processing video ${current}/${total}`;

export const MAX_VIDEO_BASE64_BYTES = 1_048_576;
export const MAX_AUDIO_BASE64_BYTES = MAX_VIDEO_BASE64_BYTES;
export const AUDIO_CHUNK_SIZE_MB_OPTIONS = [3, 6, 9, 12] as const;
export type AudioChunkSizeMb = typeof AUDIO_CHUNK_SIZE_MB_OPTIONS[number];
export const DEFAULT_AUDIO_CHUNK_SIZE_MB: AudioChunkSizeMb = 3;

export const audioChunkSizeMbToBytes = (mb: number): number => mb * 1024 * 1024;

export const isMp4FileName = (name: string): boolean => {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return false;
  return name.slice(dot + 1).toLowerCase() === 'mp4';
};

export const isMp4File = (file: File): boolean => {
  if (!isMp4FileName(file.name)) return false;
  return !file.type || file.type === 'video/mp4';
};

export const splitBase64IntoEvenChunks = (
  payload: string,
  maxBytes = MAX_VIDEO_BASE64_BYTES,
): string[] => {
  if (payload.length === 0) return [''];
  if (payload.length <= maxBytes) return [payload];

  const chunks: string[] = [];
  let offset = 0;
  while (offset < payload.length) {
    let end = Math.min(offset + maxBytes, payload.length);
    if (end < payload.length) {
      const length = end - offset;
      end = offset + length - (length % 4);
      if (end <= offset) end = Math.min(offset + 4, payload.length);
    }
    chunks.push(payload.slice(offset, end));
    offset = end;
  }
  return chunks;
};

/** Decode complete base64 quartets from carry + chunk; retain 0–3 trailing chars. */
export const decodeBase64StreamStep = (
  chunk: string,
  carry = '',
): { bytes: Uint8Array; carry: string } => {
  const combined = carry + chunk;
  const remainder = combined.length % 4;
  const decodableLength = combined.length - remainder;
  if (decodableLength === 0) {
    return { bytes: new Uint8Array(0), carry: combined };
  }
  const decodable = combined.slice(0, decodableLength);
  const nextCarry = remainder > 0 ? combined.slice(decodableLength) : '';
  const binary = atob(decodable);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, carry: nextCarry };
};

export const decodeBase64StreamFlush = (carry: string): Uint8Array => {
  if (carry.length === 0) return new Uint8Array(0);
  const binary = atob(carry);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/** Writes base64 chunks sequentially without holding the full decoded file in memory. */
export const writeBase64ChunksToHandle = async (
  dir: FileSystemDirectoryHandle,
  fileName: string,
  base64Chunks: readonly string[],
): Promise<void> => {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  let carry = '';
  try {
    for (let i = 0; i < base64Chunks.length; i += 1) {
      const { bytes, carry: nextCarry } = decodeBase64StreamStep(base64Chunks[i], carry);
      carry = nextCarry;
      if (bytes.length > 0) {
        await writable.write(new Blob([bytes as BlobPart]));
      }
      if (i < base64Chunks.length - 1) {
        await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
      }
    }
    const trailing = decodeBase64StreamFlush(carry);
    if (trailing.length > 0) {
      await writable.write(new Blob([trailing as BlobPart]));
    }
  } finally {
    await writable.close();
  }
};

export const parseVideoDataUrl = (
  dataUrl: string,
): { mime: string; payload: string } | null => {
  if (!dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const header = dataUrl.slice(0, comma);
  const base64Marker = ';base64';
  const markerIndex = header.lastIndexOf(base64Marker);
  if (markerIndex === -1) return null;
  const mime = header.slice(5, markerIndex);
  if (!mime) return null;
  const payload = dataUrl.slice(comma + 1);
  return payload.length > 0 ? { mime, payload } : null;
};

/** True when an imageurl can be used as an img src (not a remote-fetch placeholder). */
export const isRenderableImageUrl = (imageUrl: string | undefined | null): boolean => {
  if (!imageUrl) return false;
  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed === 'data:image') return false;
  if (trimmed.startsWith('data:')) {
    return parseVideoDataUrl(trimmed) !== null;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:';
  } catch {
    return false;
  }
};

export type VideoChunkSequence = {
  index: number;
  total: number;
  startMs?: number;
  endMs?: number;
  /** Base64 payload size label from content field, e.g. `2.2mb`. */
  base64SizeLabel?: string;
  /** @deprecated Legacy single-chunk duration field. */
  durationMs?: number;
};

export const formatVideoChunkContent = (
  index: number,
  total: number,
  startMs: number,
  endMs: number,
  /** Base64 payload character length (`base64Payload.length`), not decoded byte size. */
  base64Chars?: number,
): string => {
  const sizeSuffix = base64Chars !== undefined && base64Chars > 0
    ? `[${formatBase64SizeLabel(base64Chars).replace(/ /g, '')}]`
    : '';
  if (endMs <= startMs) {
    return `${index}/${total}${sizeSuffix}`;
  }
  return `${index}/${total}~${startMs}_${endMs}ms${sizeSuffix}`;
};

export const estimateChunkDurationsMs = (
  chunks: readonly string[],
  durationMs: number,
): number[] => {
  if (chunks.length === 0 || durationMs <= 0) {
    return chunks.map(() => 0);
  }
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (totalBytes === 0) return chunks.map(() => 0);

  const durations: number[] = [];
  let assigned = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    if (i === chunks.length - 1) {
      durations.push(Math.max(0, durationMs - assigned));
    } else {
      const ms = Math.round((chunks[i].length / totalBytes) * durationMs);
      durations.push(ms);
      assigned += ms;
    }
  }
  return durations;
};

export const estimateChunkTimeRangesMs = (
  chunks: readonly string[],
  durationMs: number,
): { startMs: number; endMs: number }[] => {
  const durations = estimateChunkDurationsMs(chunks, durationMs);
  let startMs = 0;
  return durations.map((chunkDurationMs) => {
    const endMs = startMs + chunkDurationMs;
    const range = { startMs, endMs };
    startMs = endMs;
    return range;
  });
};

export const formatVideoBannerQuote = (
  fileBytes: number,
  dataUrlBytes: number,
  probe: { durationSeconds: number; frameRate: number | null },
): string => {
  const base = formatBannerQuote(fileBytes, dataUrlBytes, 'video');
  const extras: string[] = [];
  if (probe.durationSeconds > 0) {
    extras.push(`${Math.round(probe.durationSeconds * 1000) / 1000}s`);
  }
  if (probe.frameRate && probe.frameRate > 0) {
    extras.push(`${probe.frameRate} fps`);
  }
  return extras.length > 0 ? `${base} · ${extras.join(' · ')}` : base;
};

export const parseVideoChunkSequence = (
  content: string,
): VideoChunkSequence | null => {
  const trimmed = content.trim();
  const rangeMatch = trimmed.match(
    /^(\d+)\/(\d+)~(\d+)_(\d+)ms(?:\[([\d.]+(?:kb|mb|b))\])?$/i,
  );
  if (rangeMatch) {
    const index = Number(rangeMatch[1]);
    const total = Number(rangeMatch[2]);
    const startMs = Number(rangeMatch[3]);
    const endMs = Number(rangeMatch[4]);
    const base64SizeLabel = rangeMatch[5]?.toLowerCase();
    if (
      !Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1
      || !Number.isFinite(startMs) || !Number.isFinite(endMs)
    ) {
      return null;
    }
    return {
      index,
      total,
      startMs,
      endMs,
      ...(base64SizeLabel ? { base64SizeLabel } : {}),
    };
  }

  const legacyMatch = trimmed.match(
    /^(\d+)\/(\d+)(?:~(\d+)ms(?:@[\d.]+fps)?)?(?:\[([\d.]+(?:kb|mb|b))\])?$/i,
  );
  if (!legacyMatch) return null;
  const index = Number(legacyMatch[1]);
  const total = Number(legacyMatch[2]);
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1) {
    return null;
  }
  const durationMs = legacyMatch[3] !== undefined ? Number(legacyMatch[3]) : undefined;
  const base64SizeLabel = legacyMatch[4]?.toLowerCase();
  return {
    index,
    total,
    ...(durationMs !== undefined && Number.isFinite(durationMs) ? { durationMs } : {}),
    ...(base64SizeLabel ? { base64SizeLabel } : {}),
  };
};

export const formatBase64SplitContent = (index: number, total: number): string =>
  `${index}/${total}`;

/** MIME for progressive / init MP4 boxes (ftyp + moov). */
export const VIDEO_MP4_MIME = 'video/mp4';

/** MIME for MP3 audio chunks. */
export const AUDIO_MPEG_MIME = 'audio/mpeg';

/** MIME for fMP4 media fragments (.m4s, moof + mdat). */
export const FMP4_MEDIA_MIME = 'video/iso.segment';

/** Labels the fMP4 initialization segment row stored alongside split media-fragment rows. */
export const FMP4_INIT_CONTENT_LABEL = 'init';

export const isFmp4MediaMime = (mime: string): boolean =>
  mime === FMP4_MEDIA_MIME;

export const isFmp4InitContentLabel = (content: string): boolean =>
  content.trim() === FMP4_INIT_CONTENT_LABEL;

const getMp4TopLevelBoxType = (base64Payload: string): string | null => {
  if (!base64Payload) return null;
  try {
    const sample = normalizeBase64Payload(base64Payload).slice(0, 32);
    const padding = sample.length % 4 === 0 ? '' : '='.repeat(4 - (sample.length % 4));
    const head = atob(sample + padding);
    return head.length >= 8 ? head.slice(4, 8) : null;
  } catch {
    return null;
  }
};

function forEachTopLevelMp4Box(
  base64Payload: string,
  visit: (boxType: string) => boolean | void,
  maxBytes = 65_536,
): void {
  const normalized = normalizeBase64Payload(base64Payload);
  if (!normalized) return;

  try {
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const binary = atob(normalized + padding);
    let offset = 0;
    const end = Math.min(binary.length, maxBytes);

    while (offset + 8 <= end) {
      const size = (
        (binary.charCodeAt(offset) << 24)
        | (binary.charCodeAt(offset + 1) << 16)
        | (binary.charCodeAt(offset + 2) << 8)
        | binary.charCodeAt(offset + 3)
      ) >>> 0;
      const type = binary.slice(offset + 4, offset + 8);
      if (visit(type) === false) return;
      if (size < 8) break;
      offset += size;
    }
  } catch {
    // ignore invalid base64/binary
  }
}

/** fMP4 media fragment (moof + mdat). */
export const isFmp4MediaSegment = (base64Payload: string): boolean => {
  let hasMoof = false;
  forEachTopLevelMp4Box(base64Payload, (type) => {
    if (type === 'moof') {
      hasMoof = true;
      return false;
    }
    return true;
  });
  return hasMoof;
};

/** fMP4 initialization segment (ftyp + moov). */
export const isFmp4InitSegment = (base64Payload: string): boolean =>
  getMp4TopLevelBoxType(base64Payload) === 'ftyp';

export const filterSplitPayloadRows = <T extends PlayablePayloadRow>(rows: readonly T[]): T[] =>
  rows.filter((row) => !isFmp4InitContentLabel(row.content));

export const extractFmp4InitPayloadFromRows = (
  rows: readonly PlayablePayloadRow[],
): string | null => {
  const initRow = rows.find((row) => isFmp4InitContentLabel(row.content));
  if (!initRow?.imageurl) return null;
  const payload = normalizeBase64Payload(initRow.imageurl);
  return payload && isFmp4InitSegment(payload) ? payload : null;
};

export const parseBase64SplitSequence = (
  content: string,
): { index: number; total: number } | null => {
  const match = content.trim().match(/^(\d+)\/(\d+)$/);
  if (!match) return null;
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1) {
    return null;
  }
  return { index, total };
};

export type IndexedSequence = { index: number; total: number };

export type IndexedSequenceValidationResult =
  | { valid: true; sequences: IndexedSequence[] }
  | { valid: false; error: string };

export const validateIndexedSequenceSet = (
  sequences: readonly (IndexedSequence | null)[],
  itemLabel: string,
): IndexedSequenceValidationResult => {
  if (sequences.length === 0) {
    return { valid: false, error: `no ${itemLabel}s` };
  }

  if (sequences.some((seq) => seq === null)) {
    return { valid: false, error: `invalid ${itemLabel} sequence` };
  }

  const parsed = sequences as IndexedSequence[];
  const expectedTotal = parsed[0].total;
  if (!parsed.every((seq) => seq.total === expectedTotal)) {
    return { valid: false, error: `mismatched ${itemLabel} totals` };
  }
  if (parsed.length !== expectedTotal) {
    return { valid: false, error: `expected ${expectedTotal} ${itemLabel}s, found ${parsed.length}` };
  }

  const indices = new Set(parsed.map((seq) => seq.index));
  for (let i = 1; i <= expectedTotal; i += 1) {
    if (!indices.has(i)) {
      return { valid: false, error: `missing ${itemLabel} ${i}/${expectedTotal}` };
    }
  }

  return { valid: true, sequences: parsed };
};

type PlayablePayloadRow = {
  content: string;
  imageurl: string;
  ordinal?: number;
};

export type PlayableChunkValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/** Validates tutorial content rows form a complete base64 split set (e.g. `1/3`). */
export const validateTutorialContentRows = (
  rows: readonly PlayablePayloadRow[],
): PlayableChunkValidationResult => {
  const sorted = filterSplitPayloadRows([...rows].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));
  const sequences = sorted.map((row) => parseBase64SplitSequence(row.content));
  const sequenceResult = validateIndexedSequenceSet(sequences, 'split part');
  if (!sequenceResult.valid) {
    return sequenceResult;
  }
  if (sorted.some((row) => !row.imageurl)) {
    return { valid: false, error: 'missing base64 payload in content row' };
  }
  return { valid: true };
};

/** Validates pennant/followup slide items form a complete base64 split set (e.g. `1/3`). */
export const validatePennantSlideItems = (
  slides: readonly PlayablePayloadRow[],
): PlayableChunkValidationResult => {
  const sorted = filterSplitPayloadRows([...slides].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));
  const sequences = sorted.map((slide) => parseBase64SplitSequence(slide.content));
  const sequenceResult = validateIndexedSequenceSet(sequences, 'split part');
  if (!sequenceResult.valid) {
    return sequenceResult;
  }
  if (sorted.some((slide) => !slide.imageurl)) {
    return { valid: false, error: 'missing base64 payload in slide item' };
  }
  return { valid: true };
};

export const joinBase64SplitParts = (parts: readonly string[]): string =>
  parts.map((part) => normalizeBase64Payload(part)).join('');

export const joinSplitPayloadRows = (
  rows: readonly PlayablePayloadRow[],
): { payload: string } | { error: string } => {
  const sorted = filterSplitPayloadRows([...rows].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));
  const sequences = sorted.map((row) => parseBase64SplitSequence(row.content));
  const sequenceResult = validateIndexedSequenceSet(sequences, 'split part');
  if (!sequenceResult.valid) {
    return { error: sequenceResult.error };
  }
  if (sorted.some((row) => !row.imageurl)) {
    return { error: 'missing base64 payload in content row' };
  }

  const byIndex = new Map(
    sorted.map((row) => [parseBase64SplitSequence(row.content)!.index, row]),
  );
  const expectedTotal = parseBase64SplitSequence(sorted[0].content)!.total;
  const parts = Array.from(
    { length: expectedTotal },
    (_, i) => byIndex.get(i + 1)!.imageurl,
  );
  return { payload: joinBase64SplitParts(parts) };
};

export const findContentRowsForBannerId = <T extends { bannerId?: number }>(
  contentGroups: readonly (readonly T[])[],
  bannerId: number,
): readonly T[] => (
  contentGroups.find((group) => group.some((row) => row.bannerId === bannerId)) ?? []
);

export const getFmp4ChunkAssemblyFailure = (
  rows: readonly PlayablePayloadRow[],
): string | null => {
  const splitRows = filterSplitPayloadRows(rows);
  if (splitRows.length === 0) {
    return 'no fMP4 media rows';
  }
  if (splitRows.some((row) => !normalizeBase64Payload(row.imageurl ?? ''))) {
    return 'missing base64 payload in content row';
  }

  const assembled = joinSplitPayloadRows(rows);
  if ('error' in assembled) {
    return assembled.error;
  }
  if (!isFmp4MediaSegment(assembled.payload)) {
    const boxType = getMp4TopLevelBoxType(assembled.payload);
    return boxType
      ? `expected fMP4 media segment (moof), found ${boxType}`
      : 'expected fMP4 media segment (moof)';
  }
  return null;
};

export const isChunkPayloadStoredLocally = (
  rows: readonly PlayablePayloadRow[],
): boolean => {
  const splitRows = filterSplitPayloadRows(rows);
  if (splitRows.length === 0) return false;
  return splitRows.every((row) => normalizeBase64Payload(row.imageurl ?? '').length > 0);
};

export const normalizeBase64Payload = (payload: string): string => {
  let normalized = payload.trim();
  if (normalized.startsWith('data:')) {
    const parsed = parseVideoDataUrl(normalized);
    if (!parsed) return '';
    normalized = parsed.payload;
  }
  return normalized.replace(/\s/g, '');
};

export const wrapBase64PayloadAsDataUrl = (payload: string, mime: string): string => {
  const normalized = normalizeBase64Payload(payload);
  return `data:${mime};base64,${normalized}`;
};

/** `data:video/mp4;base64,AAAA...` → `data:video/mp4`. Returns null when no base64 payload is present. */
export const stripDataUrlToMimeOnly = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('data:')) return null;
  const comma = trimmed.indexOf(',');
  if (comma === -1) return null;
  const header = trimmed.slice(0, comma);
  const base64Marker = ';base64';
  const markerIndex = header.lastIndexOf(base64Marker);
  if (markerIndex === -1) return null;
  const mime = header.slice(5, markerIndex);
  if (!mime) return null;
  const payload = trimmed.slice(comma + 1);
  if (!payload.length) return null;
  return `data:${mime}`;
};

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export const videoFileToDataUrl = async (
  file: File,
): Promise<{ dataUrl: string; fileBytes: number }> => {
  const dataUrl = await readFileAsDataUrl(file);
  return { dataUrl, fileBytes: file.size };
};

export const base64PayloadToBlob = (
  payload: string,
  mime = 'video/mp4',
): Blob | null => {
  try {
    const normalized = normalizeBase64Payload(payload);
    if (!normalized) return null;
    const bytes = Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
};

/** Builds a blob from split storage parts without joining base64 strings first. */
export const partPayloadsToBlob = (
  partPayloads: readonly string[],
  mime = 'video/mp4',
): Blob | null => {
  const byteParts: Uint8Array[] = [];
  for (const part of partPayloads) {
    const normalized = normalizeBase64Payload(part);
    if (!normalized) return null;
    try {
      const bytes = Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
      byteParts.push(bytes);
    } catch {
      return null;
    }
  }
  if (byteParts.length === 0) return null;
  return new Blob(byteParts as BlobPart[], { type: mime });
};

export const blobToBase64Payload = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 8192;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
};

export const isPlayableVideoChunkPayload = (base64Payload: string): boolean =>
  isFmp4MediaSegment(base64Payload);

/** MP3 media segment (ID3 tag or MPEG frame sync). */
export const isMp3Segment = (base64Payload: string): boolean => {
  try {
    const normalized = normalizeBase64Payload(base64Payload);
    if (!normalized || normalized.length < 4) return false;
    const sample = normalized.slice(0, 24);
    const bytes = Uint8Array.from(atob(sample), (c) => c.charCodeAt(0));
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
    return bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0;
  } catch {
    return false;
  }
};

export const isPlayableAudioChunkPayload = (base64Payload: string): boolean =>
  isMp3Segment(base64Payload);

export const isPlayableChunkPayload = (base64Payload: string): boolean =>
  isPlayableVideoChunkPayload(base64Payload) || isPlayableAudioChunkPayload(base64Payload);

export const areFmp4VideoChunks = (
  chunks: readonly string[],
  initPayload?: string | null,
): boolean => {
  if (chunks.length === 0) return false;
  if (!initPayload || !isFmp4InitSegment(initPayload)) return false;
  return chunks.every((chunk) => isFmp4MediaSegment(chunk));
};

export const resolveVideoExportFileName = (title: string): string => {
  const safe = sanitizePathSegment(title);
  if (isMp4FileName(safe)) return safe;
  return `${safe}.mp4`;
};

export const isMp3FileName = (name: string): boolean => {
  const dot = name.lastIndexOf('.');
  if (dot === -1) return false;
  return name.slice(dot + 1).toLowerCase() === 'mp3';
};

export const isMp3File = (file: File): boolean => {
  if (!isMp3FileName(file.name)) return false;
  return !file.type || file.type === 'audio/mpeg' || file.type === 'audio/mp3';
};

export const audioFileToDataUrl = videoFileToDataUrl;

export const resolveAudioExportFileName = (title: string): string => {
  const safe = sanitizePathSegment(title);
  if (isMp3FileName(safe)) return safe;
  return `${safe}.mp3`;
};
