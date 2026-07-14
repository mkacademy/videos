import { getCurAppName } from '../../utils';
import { bytesFetcher } from '../../library/Thunks';
import type { SlideGroup } from '../../library/CourseUtils';
import type { ChunkBufferingEntry } from '../../library/videoChunkPlayback';
import { normalizeBase64Payload } from '../../library/directoryTreeUtils';
import { Metadata } from '../../components/Core/types';
import { QueryParams } from './ViewManagerSTU';
import { SessionState } from '../slices/sessionSlice';
import type { ChunkBuffer } from '../slices/playbackSlice';
import { setChunkFetchInFlight } from '../slices/playbackSlice';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../types';

const toNumericIds = (ids: readonly (string | number)[]): number[] => (
  ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
);

type ChunkBufferMatchRow = {
  id?: number;
  bannerId?: number;
  filterId?: number;
  sifterId?: number;
  imageurl?: string;
  metadata?: Metadata;
};

const idsOverlap = (left: readonly number[], right: readonly number[]): boolean =>
  left.some((id) => right.includes(id));

const metadataIds = (
  row: ChunkBufferMatchRow,
  key: keyof Metadata | 'filterId' | 'sifterId',
): number[] => {
  if (key === 'filterId' || key === 'sifterId') {
    const top = row[key];
    if (top != null) {
      const n = Number(top);
      if (Number.isFinite(n)) return [n];
    }
  }
  const raw = row.metadata?.[key as keyof Metadata];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  }
  const n = Number(raw);
  return Number.isFinite(n) ? [n] : [];
};

const rowMatchesChunkBufferEntry = (
  row: ChunkBufferMatchRow,
  entry: ChunkBufferingEntry,
): boolean => {
  const parentKey = entry.type === 'thumb' ? 'sifterId' : 'filterId';
  const childIds = toNumericIds(entry.childId);
  const parentIds = toNumericIds(entry.parentId);
  const rowChildIds = [
    ...metadataIds(row, 'instructionId'),
    ...(row.id != null ? [Number(row.id)] : []),
  ].filter((id) => Number.isFinite(id));
  if (!idsOverlap(childIds, rowChildIds)) return false;

  const rowParentIds = [
    ...metadataIds(row, parentKey),
    ...(row.bannerId != null ? [Number(row.bannerId)] : []),
  ].filter((id) => Number.isFinite(id));
  return idsOverlap(parentIds, rowParentIds);
};

const rowHasValidBase64 = (row: { imageurl?: string }): boolean =>
  normalizeBase64Payload(row.imageurl ?? '').length > 0;

const isPlayablePayloadRow = (value: unknown): value is ChunkBufferMatchRow & { content: string; imageurl: string } =>
  value != null && typeof value === 'object' && 'content' in value && 'imageurl' in value;

const collectSlideGroupPlayableRows = (slideGroup: SlideGroup): ChunkBufferMatchRow[] => {
  const rows: ChunkBufferMatchRow[] = [];
  for (const key of Object.keys(slideGroup)) {
    if (key === 'slides') continue;
    const ordinal = Number(key);
    if (!Number.isInteger(ordinal)) continue;
    const item = slideGroup[ordinal];
    if (isPlayablePayloadRow(item)) {
      rows.push(item);
    }
  }
  for (const slideRow of slideGroup.slides ?? []) {
    for (const slide of slideRow) {
      rows.push(slide);
    }
  }
  return rows;
};

export const resolvePlaybackWebapp = (state: RootState): string => (
  state.playback.playbackWebapp ?? getCurAppName(state.session.curApp).toLowerCase()
);

const collectWebappInstructionRows = (state: RootState): ChunkBufferMatchRow[] => {
  const webapp = resolvePlaybackWebapp(state);
  if (webapp === 'tutorial') {
    return state.tutorial.content.flat();
  }
  if (webapp === 'course') {
    return state.course.content.flatMap(collectSlideGroupPlayableRows);
  }
  if (webapp === 'quiz') {
    return state.quiz.content.flatMap(collectSlideGroupPlayableRows);
  }
  return [];
};

/** True when the webapp row for this buffer entry already carries base64 payload. */
export const chunkBufferEntryHasValidBase64 = (
  state: RootState,
  entry: ChunkBufferingEntry,
): boolean => {
  const rows = collectWebappInstructionRows(state);
  const matchingRows = rows.filter((row) => rowMatchesChunkBufferEntry(row, entry));
  const entryChildIds = toNumericIds(entry.childId);
  const specificRows = matchingRows.filter(
    (row) => row.id != null && entryChildIds.includes(Number(row.id)),
  );
  const rowsToCheck = specificRows.length > 0 ? specificRows : matchingRows;
  return rowsToCheck.length > 0
    && rowsToCheck.every((row) => rowHasValidBase64(row));
};

/** Maps the first chunk-buffer entry to a ViewManager-style fetch query. */
export const buildQueryParamsForChunkBufferEntry = (
  entry: ChunkBufferingEntry,
  session: SessionState,
  webappOverride?: string,
): QueryParams => {
  const { isIncognito, isPrivate, fetchRole, curMailer, curToken } = session;
  const parent = entry.type === 'thumb' ? 'sifters' : 'filters';
  const IDs = toNumericIds(entry.parentId);
  const seek = toNumericIds(entry.childId);
  const webapp = webappOverride ?? getCurAppName(session.curApp);
  const limit = { take: 1, skip: 0 };
  const entity = 'instructions';

  if (isIncognito) {
    return {
      isPrivateView: false,
      entity,
      IDs,
      parent,
      limit,
      seek,
    };
  }

  return {
    isPrivateView: isPrivate,
    mutateRole: fetchRole,
    convolution: webapp,
    mailer: curMailer,
    hasCounts: false,
    entity,
    curToken,
    webapp,
    parent,
    limit,
    IDs,
    seek,
  };
};

const querySeekIds = (seek: QueryParams['seek']): number[] => {
  if (seek == null) return [];
  if (Array.isArray(seek)) {
    return seek.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  }
  const n = Number(seek);
  return Number.isFinite(n) ? [n] : [];
};

/** True when a bytesFetcher query targets the same parent/child ids as a buffer entry. */
export const queryMatchesChunkBufferEntry = (
  query: QueryParams,
  entry: ChunkBufferingEntry,
): boolean => {
  const parent = entry.type === 'thumb' ? 'sifters' : 'filters';
  if (query.parent !== parent) return false;
  const queryParentIds = (query.IDs ?? []).map((id) => Number(id)).filter((id) => Number.isFinite(id));
  const queryChildIds = querySeekIds(query.seek);
  return idsOverlap(queryParentIds, toNumericIds(entry.parentId))
    && idsOverlap(queryChildIds, toNumericIds(entry.childId));
};

const compareChunkBufferEntries = (
  a: ChunkBufferingEntry,
  b: ChunkBufferingEntry,
): number => {
  if (a.indexInPlaylist !== b.indexInPlaylist) {
    return a.indexInPlaylist - b.indexInPlaylist;
  }
  return a.ordinal - b.ordinal;
};

/** Thumb entries first, then parts — matching mediaPlayer `updateChunkBuffer` ordering. */
export const chunkBufferEntriesInOrder = (
  chunkBuffer: Record<string, ChunkBuffer>,
): ChunkBufferingEntry[] => {
  const entries = Object.entries(chunkBuffer).map(([key, entry]) => ({
    type: entry.type,
    indexInPlaylist: Number(key.split(':')[1]),
    parentId: entry.parentId,
    childId: entry.childId,
    ordinal: entry.ordinal,
  }));
  return [
    ...entries.filter((e) => e.type === 'thumb').sort(compareChunkBufferEntries),
    ...entries.filter((e) => e.type === 'part').sort(compareChunkBufferEntries),
  ];
};

/** First chunk-buffer entry in fetch order that still lacks base64 payload. */
export const findFirstUnfetchedChunkBufferEntry = (
  state: RootState,
): ChunkBufferingEntry | undefined => {
  const ordered = chunkBufferEntriesInOrder(state.playback.chunkBuffer);
  return ordered.find((entry) => !chunkBufferEntryHasValidBase64(state, entry));
};

export const resumeChunkBufferFetchIfNeeded = (
  dispatch: AppDispatch,
  getState: () => RootState,
): void => {
  const state = getState();
  const { chunkFetchInFlight } = state.playback;

  if (chunkFetchInFlight) {
    return;
  }

  const nextEntry = findFirstUnfetchedChunkBufferEntry(state);
  if (!nextEntry) {
    return;
  }

  dispatch(setChunkFetchInFlight(true));
  const dispatcher = dispatch as unknown as ThunkDispatch<RootState, unknown, UnknownAction>;
  const webapp = resolvePlaybackWebapp(state);
  const query = buildQueryParamsForChunkBufferEntry(nextEntry, state.session, webapp);
  dispatcher(bytesFetcher({ query }));
};

/**
 * Resolves the next buffer entry to fetch after a fulfilled bytesFetcher call.
 * Matches the completed query against chunkBuffer, then scans forward; when the
 * queue end is reached, wraps to the beginning so entries prepended by
 * updateChunkBuffer are not skipped while a later item was in flight.
 */
export const findNextChunkBufferEntryToFetch = (
  state: RootState,
  query: QueryParams,
): ChunkBufferingEntry | undefined => {
  const ordered = chunkBufferEntriesInOrder(state.playback.chunkBuffer);
  const currentIndex = ordered.findIndex((entry) => queryMatchesChunkBufferEntry(query, entry));
  const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

  const findUnfetchedFrom = (from: number, to: number): ChunkBufferingEntry | undefined => {
    for (let i = from; i < to; i += 1) {
      const entry = ordered[i];
      if (!chunkBufferEntryHasValidBase64(state, entry)) {
        return entry;
      }
    }
    return undefined;
  };

  const forward = findUnfetchedFrom(startIndex, ordered.length);
  if (forward) return forward;
  if (currentIndex < 0) return undefined;
  return findUnfetchedFrom(0, currentIndex);
};
