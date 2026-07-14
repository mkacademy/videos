import type { Metadata } from '../components/Core/types';
import type { Content } from '../store/slices/tutorialSlice';
import type { Banner as CourseBanner, Pennant, SlideGroup, SlideGroupItem } from './CourseUtils';
import { getSlideGroupItemForPennantChapterCoupling, isSlideGroupItem } from './CourseUtils';
import {
  extractFmp4InitPayloadFromRows,
  findContentRowsForBannerId,
  getFmp4ChunkAssemblyFailure,
  isChunkPayloadStoredLocally,
  isFmp4InitContentLabel,
  isFmp4InitSegment,
  isFmp4MediaSegment,
  isMp3Segment,
  isPlayableAudioChunkPayload,
  isPlayableVideoChunkPayload,
  isRenderableImageUrl,
  joinBase64SplitParts,
  joinSplitPayloadRows,
  normalizeBase64Payload,
  parseBase64SplitSequence,
  filterSplitPayloadRows,
  parseVideoChunkSequence,
  validateIndexedSequenceSet,
  validatePennantSlideItems,
  validateTutorialContentRows,
  type VideoChunkSequence,
} from './directoryTreeUtils';

export type PlaylistChunk = {
  index: number;
  total: number;
  startMs: number;
  endMs: number;
  /** Normalized split-part payloads in order; empty strings mean not yet fetched. */
  partPayloads: readonly string[];
  /** Expected split-part count for this chunk (from `1/N` content labels). */
  expectedPartCount: number;
  /** Whether all parts are present and form a playable segment. */
  playable: boolean;
  contentId: number;
  title: string;
  thumbnailUrl?: string;
  /** fMP4 initialization segment for the whole playlist (first chunk only). */
  fmp4InitPayload?: string;
};

export type PlaylistBuildResult = {
  chunks: PlaylistChunk[];
  error: string | null;
};

export type ChunkPartRow = {
  content: string;
  imageurl: string;
  ordinal?: number;
  id?: number;
  bannerId?: number;
  metadata?: Metadata;
  sizeInBytes?: number;
};

/** Decoded byte length from a base64 payload string. */
export function estimateBase64DecodedBytes(payload: string): number {
  const normalized = normalizeBase64Payload(payload);
  if (!normalized.length) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

/** Row payload size for buffer accounting — uses sizeInBytes when set, else imageurl length. */
export function estimateRowPayloadBytes(row: ChunkPartRow): number {
  if (row.sizeInBytes != null && row.sizeInBytes > 0) return row.sizeInBytes;
  return estimateBase64DecodedBytes(row.imageurl ?? '');
}

export function sumChunkPartRowsBytes(rows: readonly ChunkPartRow[]): number {
  return rows.reduce((sum, row) => sum + estimateRowPayloadBytes(row), 0);
}

export const TUTORIAL_CHUNK_PART_METADATA_KEYS = {
  parentKey: 'filterId',
  childKey: 'instructionId',
} as const;

export const COURSE_CHUNK_PART_METADATA_KEYS = {
  parentKey: 'sifterId',
  childKey: 'instructionId',
} as const;

export type TutorialVideoChunkBanner = {
  id: number;
  title: string;
  quote: string;
  bannerId?: number;
};

export const PREFETCH_WINDOW_MS = 30_000;
export const PREFETCH_TRIGGER_LEAD_MS = 5_000;
/** Max playlist chunks the player can jump ahead in one seek (MSE buffer limit). */
export const MAX_DIRECT_CHUNK_SEEK_DISTANCE = 10;

export function formatIncrementalSeekWarning(
  targetChunkListIndex: number,
  currentChunkListIndex: number,
  maxJump = MAX_DIRECT_CHUNK_SEEK_DISTANCE,
): string {
  const suggestedIndex = Math.min(
    currentChunkListIndex + maxJump,
    targetChunkListIndex,
  );
  const targetNumber = targetChunkListIndex + 1;
  const suggestedNumber = suggestedIndex + 1;
  if (suggestedNumber >= targetNumber) {
    return `Select chunk ${targetNumber} or a nearby chunk to continue toward the end of the video.`;
  }
  return `To reach chunk ${targetNumber}, select chunks in smaller steps — try chunk ${suggestedNumber} first (about ${maxJump} chunks ahead at a time).`;
}

type PlayablePayloadRow = {
  content: string;
  imageurl: string;
  ordinal?: number;
};

function fnv1aHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function appendPlayableRowSignature(parts: string[], row: PlayablePayloadRow): void {
  parts.push(`${row.content}\x00${(row.imageurl ?? '').length}`);
}

function hashPlayableRowSignatures(parts: string[]): string {
  return fnv1aHash(parts.join('\n'));
}

function hashPartPayloads(partPayloads: readonly string[]): string {
  return partPayloads.map((part) => {
    const normalized = normalizeBase64Payload(part);
    if (!normalized) return '0';
    return String(normalized.length);
  }).join(',');
}

export function getChunkPartPayloadSignature(chunk: PlaylistChunk): string {
  return hashPartPayloads(chunk.partPayloads);
}

/** Detects playlist chunk structure and base64 payload changes for player reset. */
export function getPlaylistChunksSignature(chunks: readonly PlaylistChunk[]): string {
  if (chunks.length === 0) return '';
  return chunks.map((chunk) => (
    `${chunk.contentId}:${chunk.index}/${chunk.total}:${hashPartPayloads(chunk.partPayloads)}:${chunk.fmp4InitPayload ? fnv1aHash(chunk.fmp4InitPayload) : ''}`
  )).join('|');
}

/** Detects playlist layout changes (chunk count, ids, timing) without payload edits. */
export function getPlaylistStructureSignature(chunks: readonly PlaylistChunk[]): string {
  if (chunks.length === 0) return '';
  return chunks.map((chunk) => (
    `${chunk.contentId}:${chunk.index}/${chunk.total}:${chunk.startMs}:${chunk.endMs}`
  )).join('|');
}

/** Detects course slide-group base64 payload edits while the player is open. */
export function getCourseSlideGroupPayloadSignature(slideGroup: SlideGroup): string {
  const parts: string[] = [];

  for (const key of Object.keys(slideGroup)) {
    if (key === 'slides') continue;
    const ordinal = Number(key);
    if (!Number.isInteger(ordinal)) continue;
    const item = slideGroup[ordinal];
    if (item && typeof item === 'object' && 'imageurl' in item && 'content' in item) {
      appendPlayableRowSignature(parts, item as SlideGroupItem);
    }
  }

  for (const row of slideGroup.slides ?? []) {
    for (const slide of row) {
      appendPlayableRowSignature(parts, slide);
    }
  }

  return hashPlayableRowSignatures(parts);
}

/** Detects tutorial content base64 payload edits while the player is open. */
export function getTutorialVideoGroupPayloadSignature(
  entries: readonly TutorialVideoBannerEntry[],
): string {
  const parts: string[] = [];

  for (const entry of entries) {
    const sortedRows = [...entry.contentRows].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
    for (const row of sortedRows) {
      appendPlayableRowSignature(parts, row);
    }
  }

  return hashPlayableRowSignatures(parts);
}

function chunkTimingFromSequence(seq: VideoChunkSequence): { startMs: number; endMs: number } {
  const startMs = seq.startMs ?? 0;
  const endMs = seq.endMs ?? (
    seq.durationMs !== undefined ? startMs + seq.durationMs : startMs
  );
  return { startMs, endMs };
}

export function sumPartPayloadsBytes(partPayloads: readonly string[]): number {
  return partPayloads.reduce((sum, part) => sum + estimateBase64DecodedBytes(part), 0);
}

export function extractPartPayloadsFromRows(
  rows: readonly PlayablePayloadRow[],
): { partPayloads: string[]; expectedPartCount: number } {
  const sorted = filterSplitPayloadRows([...rows].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)));
  if (sorted.length === 0) {
    return { partPayloads: [], expectedPartCount: 0 };
  }

  const firstSequence = parseBase64SplitSequence(sorted[0].content);
  const expectedPartCount = firstSequence?.total ?? sorted.length;
  const byIndex = new Map(
    sorted.flatMap((row) => {
      const sequence = parseBase64SplitSequence(row.content);
      return sequence ? [[sequence.index, row] as const] : [];
    }),
  );

  const partPayloads = Array.from({ length: expectedPartCount }, (_, i) => {
    const row = byIndex.get(i + 1);
    return row ? normalizeBase64Payload(row.imageurl ?? '') : '';
  });

  return { partPayloads, expectedPartCount };
}

export function computeChunkPlayability(
  partPayloads: readonly string[],
  expectedPartCount: number,
): boolean {
  if (expectedPartCount <= 0 || partPayloads.length < expectedPartCount) return false;
  return partPayloads.every((part) => (part ?? '').length > 0);
}

function buildPlaylistChunkFieldsFromRows(
  rows: readonly PlayablePayloadRow[],
): Pick<PlaylistChunk, 'partPayloads' | 'expectedPartCount' | 'playable'> {
  const { partPayloads, expectedPartCount } = extractPartPayloadsFromRows(rows);
  return {
    partPayloads,
    expectedPartCount,
    playable: computeChunkPlayability(partPayloads, expectedPartCount),
  };
}

export function isPlaylistChunkPlayable(chunk: PlaylistChunk): boolean {
  return chunk.playable;
}

export function chunkHasUnappendedParts(
  chunk: PlaylistChunk,
  appendedPartCount: number,
): boolean {
  for (let i = appendedPartCount; i < chunk.partPayloads.length; i += 1) {
    if (normalizeBase64Payload(chunk.partPayloads[i] ?? '').length > 0) return true;
  }
  return false;
}

export function chunkCanAcceptMoreAppends(
  chunk: PlaylistChunk,
  appendedPartCount: number,
): boolean {
  return isPlaylistChunkPlayable(chunk) || chunkHasUnappendedParts(chunk, appendedPartCount);
}

/**
 * First playlist index that still needs remote buffering, or `chunks.length` when none do.
 * Used so partially downloaded chunks behind the playhead are not abandoned when
 * `activeChunkIndex` advances past them.
 */
export function findFirstPlaylistChunkNeedingBuffer(
  chunks: readonly PlaylistChunk[],
  getPartRows: (indexInPlaylist: number) => readonly ChunkPartRow[],
): number {
  for (let i = 0; i < chunks.length; i += 1) {
    if (isPlaylistChunkPlayable(chunks[i])) continue;
    const partRows = getPartRows(i);
    if (!isChunkAwaitingRemotePayload(partRows) && partRows.length > 0) continue;
    return i;
  }
  return chunks.length;
}

/** Earliest chunk index to include in a buffering queue (incomplete chunk vs playhead). */
export function resolveChunkBufferingStartIndex(
  chunks: readonly PlaylistChunk[],
  activeChunkIndex: number,
  getPartRows: (indexInPlaylist: number) => readonly ChunkPartRow[],
): number {
  const firstNeeding = findFirstPlaylistChunkNeedingBuffer(chunks, getPartRows);
  if (firstNeeding >= chunks.length) return activeChunkIndex;
  return Math.min(firstNeeding, activeChunkIndex);
}

export function isAudioPlaylistChunk(chunk: PlaylistChunk): boolean {
  if (!chunk.playable) return false;
  return isMp3Segment(joinBase64SplitParts(chunk.partPayloads));
}

export function isVideoPlaylistChunk(chunk: PlaylistChunk): boolean {
  if (!chunk.playable) return false;
  return isFmp4MediaSegment(joinBase64SplitParts(chunk.partPayloads));
}

export function getPlaylistFmp4InitPayload(chunks: readonly PlaylistChunk[]): string | null {
  const init = chunks[0]?.fmp4InitPayload;
  return init && isFmp4InitSegment(init) ? init : null;
}

function getChunkAssemblyFailure(rows: readonly PlayablePayloadRow[]): string | null {
  if (rows.length === 0) return 'missing content rows';
  const assembled = joinSplitPayloadRows(rows);
  if ('error' in assembled) return assembled.error;
  if (isPlayableAudioChunkPayload(assembled.payload)) return null;
  return getFmp4ChunkAssemblyFailure(rows) ?? 'invalid segment';
}

/** Joins chunk parts for export paths that still need a single payload string. */
export function joinChunkPartPayloads(partPayloads: readonly string[]): string {
  return joinBase64SplitParts(partPayloads);
}

function attachPlaylistInitPayload(
  chunks: PlaylistChunk[],
  initPayload: string | null,
): PlaylistChunk[] {
  if (!initPayload || chunks.length === 0) return chunks;
  return chunks.map((chunk, index) => (
    index === 0 ? { ...chunk, fmp4InitPayload: initPayload } : chunk
  ));
}

function toMetadataIdArray(value: unknown): (string | number)[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value as string | number];
}

export function formatChunkPartCompositeId(
  row: ChunkPartRow,
  parentKey: string,
  childKey: string,
): { parentId: (string | number)[]; childId: (string | number)[] } {
  const metadata = row.metadata;
  const parentRaw = metadata?.[parentKey as keyof Metadata] ?? row.bannerId;
  const childRaw = metadata?.[childKey as keyof Metadata] ?? row.id;
  return {
    parentId: toMetadataIdArray(parentRaw),
    childId: toMetadataIdArray(childRaw),
  };
}

export type ChunkBufferingEntry = {
  type: 'thumb' | 'part';
  indexInPlaylist: number;
  parentId: (string | number)[];
  childId: (string | number)[];
  /** Part sequence within the chunk (from the source row's `ordinal`). */
  ordinal: number;
};

function toBufferingLogEntry(
  type: ChunkBufferingEntry['type'],
  indexInPlaylist: number,
  row: ChunkPartRow,
  parentKey: string,
  childKey: string,
  partParentIdOverride?: number[],
): ChunkBufferingEntry {
  const { parentId } = formatChunkPartCompositeId(row, parentKey, childKey);
  return {
    type,
    indexInPlaylist,
    parentId: type === 'part' && partParentIdOverride?.length
      ? partParentIdOverride
      : parentId,
    childId: toMetadataIdArray(row.id),
    ordinal: row.ordinal ?? 0,
  };
}

/** Flat buffering log entries: thumbs (cover) then parts (slide rows) per chunk. */
export function buildChunkBufferingLogEntries(
  indexInPlaylist: number,
  partRows: readonly ChunkPartRow[],
  thumbRows?: readonly ChunkPartRow[],
  partParentIdOverride?: number[],
): ChunkBufferingEntry[] {
  const entries: ChunkBufferingEntry[] = [];

  if (thumbRows) {
    for (const row of thumbRows) {
      entries.push(toBufferingLogEntry('thumb', indexInPlaylist, row, 'sifterId', 'instructionId'));
    }
  }

  for (const row of partRows) {
    entries.push(toBufferingLogEntry(
      'part',
      indexInPlaylist,
      row,
      'filterId',
      'instructionId',
      partParentIdOverride,
    ));
  }

  return entries;
}

export function buildCourseChunkBufferingLogEntries(
  banner: CourseBanner,
  slideGroup: SlideGroup,
  indexInPlaylist: number,
): ChunkBufferingEntry[] {
  const partRows = getCourseChunkPartRows(banner, slideGroup, indexInPlaylist);
  const coverRow = getCourseChunkCoverRow(banner, slideGroup, indexInPlaylist);
  const thumbRows = coverRow ? [coverRow] : undefined;
  const pennant = getVideoPennantAtChunkIndex(banner, indexInPlaylist);
  const partParentIdOverride = pennant?.filterId ? [pennant.filterId] : undefined;
  return buildChunkBufferingLogEntries(
    indexInPlaylist,
    partRows,
    thumbRows,
    partParentIdOverride,
  );
}

/** Builds the ordered chunk-buffer queue from the current playlist and playhead. */
export function collectChunkBufferingEntries(
  chunks: readonly PlaylistChunk[],
  focusChunkIndex: number,
  getPartRows: (indexInPlaylist: number) => readonly ChunkPartRow[],
  buildEntriesForChunk: (indexInPlaylist: number) => ChunkBufferingEntry[],
): ChunkBufferingEntry[] {
  const startIndex = resolveChunkBufferingStartIndex(chunks, focusChunkIndex, getPartRows);
  const thumbEntries: ChunkBufferingEntry[] = [];
  const partEntries: ChunkBufferingEntry[] = [];

  for (let i = startIndex; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (isPlaylistChunkPlayable(chunk)) continue;

    const partRows = getPartRows(i);
    if (!isChunkAwaitingRemotePayload(partRows) && partRows.length > 0) continue;

    for (const entry of buildEntriesForChunk(i)) {
      if (entry.type === 'thumb') {
        thumbEntries.push(entry);
      } else {
        partEntries.push(entry);
      }
    }
  }

  return [...thumbEntries, ...partEntries];
}

export function sumViewedBytesThroughChunkIndex(
  throughExclusiveIndex: number,
  getPartRows: (indexInPlaylist: number) => readonly ChunkPartRow[],
): number {
  let total = 0;
  for (let i = 0; i < throughExclusiveIndex; i += 1) {
    total += sumChunkPartRowsBytes(getPartRows(i));
  }
  return total;
}

/**
 * Bytes consumed through the playhead using assembled playlist chunk payloads.
 * Prefer this over {@link sumViewedBytesThroughChunkIndex} for headroom accounting:
 * course `content[0]` cover rows (`SlideGroupItem`) are separate from video part
 * rows in `content[0].slides[][]` (`SlideItem`) that {@link getCourseChunkPartRows} reads.
 */
export function sumViewedBytesThroughPlaylistIndex(
  chunks: readonly PlaylistChunk[],
  throughExclusiveIndex: number,
): number {
  let total = 0;
  for (let i = 0; i < throughExclusiveIndex; i += 1) {
    total += sumPartPayloadsBytes(chunks[i]?.partPayloads ?? []);
  }
  return total;
}

function sortChunkPartRows<T extends ChunkPartRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
}

export function getTutorialChunkPartRows(
  entries: readonly TutorialVideoBannerEntry[],
  chunkListIndex: number,
): ChunkPartRow[] {
  const chunkBanners = entries.map((entry) => entry.banner);
  const videoEntries = chunkBanners.flatMap((banner) => {
    const seq = parseVideoChunkSequence(banner.quote);
    return seq ? [{ banner, seq }] : [];
  });
  videoEntries.sort((a, b) => a.seq.index - b.seq.index);
  const entry = videoEntries[chunkListIndex];
  if (!entry) return [];
  const contentRows = entries.find((item) => item.banner.id === entry.banner.id)?.contentRows ?? [];
  return sortChunkPartRows(contentRows);
}

export type TutorialVideoBannerEntry = {
  banner: TutorialVideoChunkBanner;
  contentRows: readonly Content[];
};

export function isChunkAwaitingRemotePayload(partRows: readonly ChunkPartRow[]): boolean {
  if (!isChunkPayloadStoredLocally(partRows)) return true;
  if (!partRows.some((row) => isFmp4InitContentLabel(row.content))) return false;
  return extractFmp4InitPayloadFromRows(partRows) === null;
}

export function groupTutorialVideoBannerEntries(
  banners: readonly TutorialVideoChunkBanner[],
  contentGroups: readonly (readonly Content[])[],
): TutorialVideoBannerEntry[][] {
  const byTitle = new Map<string, TutorialVideoBannerEntry[]>();

  for (const banner of banners) {
    if (parseVideoChunkSequence(banner.quote) === null) continue;

    const contentRows = findContentRowsForBannerId(contentGroups, banner.id);
    const group = byTitle.get(banner.title) ?? [];
    group.push({ banner, contentRows });
    byTitle.set(banner.title, group);
  }

  return [...byTitle.values()];
}

export function findTutorialVideoGroupForBanner(
  banners: readonly TutorialVideoChunkBanner[],
  contentGroups: readonly (readonly Content[])[],
  bannerId: number,
): TutorialVideoBannerEntry[] | null {
  if (!banners.some((banner) => banner.id === bannerId)) return null;

  return groupTutorialVideoBannerEntries(banners, contentGroups)
    .find((group) => group.some((entry) => entry.banner.id === bannerId)) ?? null;
}

export function validateTutorialVideoChunkQuotes(
  chunkBanners: readonly TutorialVideoChunkBanner[],
): { valid: true; chunkCount: number } | { valid: false; error: string } {
  if (chunkBanners.length === 0) {
    return { valid: false, error: 'no video chunk banners' };
  }

  const videoEntries = chunkBanners.flatMap((banner) => {
    const seq = parseVideoChunkSequence(banner.quote);
    return seq ? [{ banner, seq }] : [];
  });

  if (videoEntries.length === 0) {
    return { valid: false, error: 'no video chunk sequences in banner quotes' };
  }

  const quoteValidation = validateIndexedSequenceSet(
    videoEntries.map(({ seq }) => seq),
    'chunk',
  );
  if (!quoteValidation.valid) {
    return quoteValidation;
  }

  return { valid: true, chunkCount: videoEntries[0].seq.total };
}

export function validateTutorialVideoChunkBanners(
  chunkBanners: readonly TutorialVideoChunkBanner[],
  contentGroups: readonly (readonly Content[])[],
): { valid: true } | { valid: false; error: string } {
  const quoteValidation = validateTutorialVideoChunkQuotes(chunkBanners);
  if (!quoteValidation.valid) {
    return quoteValidation;
  }

  const videoEntries = chunkBanners.flatMap((banner) => {
    const seq = parseVideoChunkSequence(banner.quote);
    return seq ? [{ banner, seq }] : [];
  });

  for (const { banner } of videoEntries) {
    const contentRows = findContentRowsForBannerId(contentGroups, banner.id);
    if (contentRows.length === 0) {
      return { valid: false, error: `missing content rows for "${banner.title}"` };
    }
    const contentValidation = validateTutorialContentRows(contentRows);
    if (!contentValidation.valid) {
      return { valid: false, error: `${banner.title}: ${contentValidation.error}` };
    }
  }

  return { valid: true };
}

export function buildPlaylistFromTutorialVideoGroup(
  entries: readonly TutorialVideoBannerEntry[],
): PlaylistBuildResult {
  const chunkBanners = entries.map((entry) => entry.banner);
  const quoteValidation = validateTutorialVideoChunkQuotes(chunkBanners);
  if (!quoteValidation.valid) {
    return { chunks: [], error: quoteValidation.error };
  }

  const videoEntries = chunkBanners.flatMap((banner) => {
    const seq = parseVideoChunkSequence(banner.quote);
    return seq ? [{ banner, seq }] : [];
  });

  const byIndex = new Map(videoEntries.map(({ banner, seq }) => [seq.index, { banner, seq }]));
  const expectedTotal = videoEntries[0].seq.total;
  const title = entries[0]?.banner.title ?? '';

  const chunks: (PlaylistChunk | null)[] = Array.from({ length: expectedTotal }, (_, i) => {
    const { banner, seq } = byIndex.get(i + 1)!;
    const contentRows = entries.find((entry) => entry.banner.id === banner.id)?.contentRows ?? [];
    const assembled = joinSplitPayloadRows(contentRows);
    if ('error' in assembled) {
      return null;
    }
    if (!isPlayableVideoChunkPayload(assembled.payload) && !isPlayableAudioChunkPayload(assembled.payload)) {
      return null;
    }
    const { startMs, endMs } = chunkTimingFromSequence(seq);
    const chunkFields = buildPlaylistChunkFieldsFromRows(contentRows);

    return {
      index: seq.index,
      total: seq.total,
      startMs,
      endMs,
      ...chunkFields,
      contentId: banner.id,
      title,
    };
  });

  const failedIndex = chunks.findIndex((chunk) => chunk === null);
  if (failedIndex >= 0) {
    return {
      chunks: [],
      error: `Chunk ${failedIndex + 1}/${expectedTotal} could not be assembled into a playable segment`,
    };
  }

  return {
    chunks: attachPlaylistInitPayload(
      chunks as PlaylistChunk[],
      extractFmp4InitPayloadFromRows(
        entries.find((entry) => entry.banner.id === byIndex.get(1)?.banner.id)?.contentRows
          ?? entries[0]?.contentRows
          ?? [],
      ),
    ),
    error: null,
  };
}

function findSlideRowForPennant(slideGroup: SlideGroup, pennantId: number) {
  for (const row of slideGroup.slides ?? []) {
    if (row.length > 0 && row[0].bannerId === pennantId) {
      return row;
    }
  }
  return null;
}

/**
 * Merges covers and pennant slide rows for one course banner across all content
 * groups. Quiz fetches can land slides in a separate group from the cover group.
 */
export function resolveCourseSlideGroupForBanner(
  banner: CourseBanner,
  contentGroups: readonly SlideGroup[],
): SlideGroup | null {
  const bannerId = banner.id;
  const pennantIds = new Set((banner.pennants ?? []).map((pennant) => pennant.id));
  const merged: SlideGroup = { slides: [] };
  let hasContent = false;

  for (const group of contentGroups) {
    for (const key of Object.keys(group)) {
      if (key === 'slides') continue;
      const ordinal = Number(key);
      if (!Number.isInteger(ordinal)) continue;
      const item = group[ordinal];
      if (isSlideGroupItem(item) && item.bannerId === bannerId) {
        merged[ordinal] = item;
        hasContent = true;
      }
    }

    for (const row of group.slides ?? []) {
      const pennantId = row[0]?.bannerId;
      if (pennantId == null || !pennantIds.has(pennantId)) continue;
      const existingIndex = merged.slides.findIndex(
        (existing) => existing[0]?.bannerId === pennantId,
      );
      if (existingIndex >= 0) {
        merged.slides[existingIndex] = row;
      } else {
        merged.slides.push(row);
      }
      hasContent = true;
    }
  }

  return hasContent ? merged : null;
}

function getVideoPennantAtChunkIndex(
  banner: CourseBanner,
  chunkListIndex: number,
): Pennant | null {
  const pennants = [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const videoPennants = pennants.flatMap((pennant) => {
    const seq = parseVideoChunkSequence(pennant.quote);
    return seq ? [{ pennant, seq }] : [];
  });
  videoPennants.sort((a, b) => a.seq.index - b.seq.index);
  return videoPennants[chunkListIndex]?.pennant ?? null;
}

export function getCourseChunkPartRows(
  banner: CourseBanner,
  slideGroup: SlideGroup,
  chunkListIndex: number,
): ChunkPartRow[] {
  const pennant = getVideoPennantAtChunkIndex(banner, chunkListIndex);
  if (!pennant) return [];
  const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
  return slideRow ? sortChunkPartRows(slideRow) : [];
}

export function getCourseChunkCoverRow(
  banner: CourseBanner,
  slideGroup: SlideGroup,
  chunkListIndex: number,
): ChunkPartRow | null {
  const pennant = getVideoPennantAtChunkIndex(banner, chunkListIndex);
  if (!pennant) return null;
  return getCoverForPennant(slideGroup, pennant);
}

function getCoverForPennant(slideGroup: SlideGroup, pennant: Pennant): SlideGroupItem | null {
  return getSlideGroupItemForPennantChapterCoupling(slideGroup, pennant) ?? null;
}

function thumbnailUrlFromCover(cover: SlideGroupItem | null): string | undefined {
  if (!cover?.imageurl || !isRenderableImageUrl(cover.imageurl)) return undefined;
  return cover.imageurl;
}

export function validateCourseVideoChunkQuotes(
  banner: CourseBanner,
): { valid: true; chunkCount: number } | { valid: false; error: string } {
  const pennants = [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const videoPennants = pennants.flatMap((pennant) => {
    const seq = parseVideoChunkSequence(pennant.quote);
    return seq ? [{ pennant, seq }] : [];
  });

  if (videoPennants.length === 0) {
    return { valid: false, error: 'no video chunk sequences in pennant quotes' };
  }

  const quoteValidation = validateIndexedSequenceSet(
    videoPennants.map(({ seq }) => seq),
    'chunk',
  );
  if (!quoteValidation.valid) {
    return quoteValidation;
  }

  return { valid: true, chunkCount: videoPennants[0].seq.total };
}

export function validateCourseVideoPennants(
  banner: CourseBanner,
  slideGroup: SlideGroup,
): { valid: true } | { valid: false; error: string } {
  const quoteValidation = validateCourseVideoChunkQuotes(banner);
  if (!quoteValidation.valid) {
    return quoteValidation;
  }

  const pennants = [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const videoPennants = pennants.flatMap((pennant) => {
    const seq = parseVideoChunkSequence(pennant.quote);
    return seq ? [{ pennant, seq }] : [];
  });

  for (const { pennant } of videoPennants) {
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id);
    if (!slideRow || slideRow.length === 0) {
      return { valid: false, error: `missing slide items for "${pennant.title}"` };
    }
    const slideValidation = validatePennantSlideItems(slideRow);
    if (!slideValidation.valid) {
      return { valid: false, error: `${pennant.title}: ${slideValidation.error}` };
    }
  }

  return { valid: true };
}

export function buildPlaylistFromCourseSlideGroup(
  banner: CourseBanner,
  slideGroup: SlideGroup,
): PlaylistBuildResult {
  const quoteValidation = validateCourseVideoChunkQuotes(banner);
  if (!quoteValidation.valid) {
    return { chunks: [], error: quoteValidation.error };
  }

  const pennants = [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const videoPennants = pennants.flatMap((pennant) => {
    const seq = parseVideoChunkSequence(pennant.quote);
    return seq ? [{ pennant, seq }] : [];
  });

  const chunks: (PlaylistChunk | null)[] = videoPennants.map(({ pennant, seq }) => {
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id)!;
    const chunkFields = buildPlaylistChunkFieldsFromRows(slideRow);
    if (!chunkFields.playable || !isPlayableVideoChunkPayload(joinBase64SplitParts(chunkFields.partPayloads))) {
      return null;
    }
    const cover = getCoverForPennant(slideGroup, pennant);
    const { startMs, endMs } = chunkTimingFromSequence(seq);
    const thumbnailUrl = thumbnailUrlFromCover(cover);

    return {
      index: seq.index,
      total: seq.total,
      startMs,
      endMs,
      ...chunkFields,
      contentId: pennant.id,
      title: pennant.title,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    };
  });

  const failedIndex = chunks.findIndex((chunk) => chunk === null);
  if (failedIndex >= 0) {
    return {
      chunks: [],
      error: `Chunk ${failedIndex + 1} could not be assembled into a playable fMP4 segment`,
    };
  }

  const firstPennant = videoPennants[0]?.pennant;
  const firstSlideRow = firstPennant
    ? findSlideRowForPennant(slideGroup, firstPennant.id) ?? []
    : [];

  return {
    chunks: attachPlaylistInitPayload(
      chunks as PlaylistChunk[],
      extractFmp4InitPayloadFromRows(firstSlideRow),
    ),
    error: null,
  };
}

/** Builds a full chunk playlist for the UI, including chunks that are not yet playable. */
export function buildChunkPlaylistFromTutorialVideoGroup(
  entries: readonly TutorialVideoBannerEntry[],
): PlaylistBuildResult {
  const chunkBanners = entries.map((entry) => entry.banner);
  const quoteValidation = validateTutorialVideoChunkQuotes(chunkBanners);
  if (!quoteValidation.valid) {
    return { chunks: [], error: quoteValidation.error };
  }

  const videoEntries = chunkBanners.flatMap((banner) => {
    const seq = parseVideoChunkSequence(banner.quote);
    return seq ? [{ banner, seq }] : [];
  });

  const byIndex = new Map(videoEntries.map(({ banner, seq }) => [seq.index, { banner, seq }]));
  const expectedTotal = videoEntries[0].seq.total;
  const title = entries[0]?.banner.title ?? '';

  const chunks: PlaylistChunk[] = Array.from({ length: expectedTotal }, (_, i) => {
    const entry = byIndex.get(i + 1);
    if (!entry) {
      return {
        index: i + 1,
        total: expectedTotal,
        startMs: 0,
        endMs: 0,
        partPayloads: [],
        expectedPartCount: 0,
        playable: false,
        contentId: -1,
        title,
      };
    }

    const { banner, seq } = entry;
    const contentRows = entries.find((item) => item.banner.id === banner.id)?.contentRows ?? [];
    const { startMs, endMs } = chunkTimingFromSequence(seq);

    return {
      index: seq.index,
      total: seq.total,
      startMs,
      endMs,
      ...buildPlaylistChunkFieldsFromRows(contentRows),
      contentId: banner.id,
      title,
    };
  });

  const failedIndex = chunks.findIndex((chunk) => !isPlaylistChunkPlayable(chunk));
  const failedContentRows = failedIndex >= 0
    ? entries.find((entry) => entry.banner.id === chunks[failedIndex]?.contentId)?.contentRows ?? []
    : [];
  const firstContentRows = entries.find((entry) => entry.banner.id === byIndex.get(1)?.banner.id)?.contentRows
    ?? entries[0]?.contentRows
    ?? [];
  return {
    chunks: attachPlaylistInitPayload(
      chunks,
      extractFmp4InitPayloadFromRows(firstContentRows),
    ),
    error: failedIndex >= 0
      ? `Chunk ${failedIndex + 1}/${expectedTotal}: ${getChunkAssemblyFailure(failedContentRows) ?? 'invalid segment'}`
      : null,
  };
}

/** Builds a full chunk playlist for the UI, including chunks that are not yet playable. */
export function buildChunkPlaylistFromCourseSlideGroup(
  banner: CourseBanner,
  slideGroup: SlideGroup,
): PlaylistBuildResult {
  const quoteValidation = validateCourseVideoChunkQuotes(banner);
  if (!quoteValidation.valid) {
    return { chunks: [], error: quoteValidation.error };
  }

  const pennants = [...(banner.pennants ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const videoPennants = pennants.flatMap((pennant) => {
    const seq = parseVideoChunkSequence(pennant.quote);
    return seq ? [{ pennant, seq }] : [];
  });
  videoPennants.sort((a, b) => a.seq.index - b.seq.index);
  const expectedTotal = videoPennants[0]?.seq.total ?? videoPennants.length;

  const chunks: PlaylistChunk[] = Array.from({ length: expectedTotal }, (_, i) => {
    const entry = videoPennants[i];
    if (!entry) {
      return {
        index: i + 1,
        total: expectedTotal,
        startMs: 0,
        endMs: 0,
        partPayloads: [],
        expectedPartCount: 0,
        playable: false,
        contentId: -1,
        title: banner.title,
      };
    }

    const { pennant, seq } = entry;
    const slideRow = findSlideRowForPennant(slideGroup, pennant.id) ?? [];
    const cover = getCoverForPennant(slideGroup, pennant);
    const { startMs, endMs } = chunkTimingFromSequence(seq);
    const thumbnailUrl = thumbnailUrlFromCover(cover);

    return {
      index: seq.index,
      total: seq.total,
      startMs,
      endMs,
      ...buildPlaylistChunkFieldsFromRows(slideRow),
      contentId: pennant.id,
      title: pennant.title,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    };
  });

  const failedIndex = chunks.findIndex((chunk) => !isPlaylistChunkPlayable(chunk));
  const failedSlideRow = failedIndex >= 0
    ? findSlideRowForPennant(slideGroup, videoPennants[failedIndex]?.pennant.id ?? -1) ?? []
    : [];
  const firstPennant = videoPennants[0]?.pennant;
  const firstSlideRow = firstPennant
    ? findSlideRowForPennant(slideGroup, firstPennant.id) ?? []
    : [];
  return {
    chunks: attachPlaylistInitPayload(
      chunks,
      extractFmp4InitPayloadFromRows(firstSlideRow),
    ),
    error: failedIndex >= 0
      ? `Chunk ${failedIndex + 1}/${expectedTotal}: ${getFmp4ChunkAssemblyFailure(failedSlideRow) ?? 'invalid fMP4 segment'}`
      : null,
  };
}


export function formatPlaybackMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function getChunkDurationMs(chunk: PlaylistChunk): number {
  return Math.max(0, chunk.endMs - chunk.startMs);
}

export function getTotalDurationMs(chunks: readonly PlaylistChunk[]): number {
  if (chunks.length === 0) return 0;
  const last = chunks[chunks.length - 1];
  return last.endMs > 0 ? last.endMs : chunks.reduce((sum, chunk) => sum + getChunkDurationMs(chunk), 0);
}

export function getGlobalPlaybackMs(chunks: readonly PlaylistChunk[], chunkIndex: number, localSeconds: number): number {
  const chunk = chunks[chunkIndex];
  if (!chunk) return 0;
  return chunk.startMs + localSeconds * 1000;
}

export function getChunkState(
  chunk: PlaylistChunk,
  globalPlaybackMs: number,
  activeChunkIndex: number,
  chunkListIndex: number,
): 'pending' | 'active' | 'played' {
  if (chunkListIndex === activeChunkIndex) return 'active';
  if (chunk.endMs > 0 && chunk.endMs <= globalPlaybackMs) return 'played';
  if (chunk.startMs > 0 && chunk.startMs < globalPlaybackMs && chunk.endMs <= globalPlaybackMs) return 'played';
  if (chunkListIndex < activeChunkIndex) return 'played';
  return 'pending';
}

export function chunksCoveringRange(
  chunks: readonly PlaylistChunk[],
  fromMs: number,
  throughMs: number,
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (chunk.endMs > fromMs && chunk.startMs < throughMs) {
      indices.push(i);
    }
  }
  return indices;
}
