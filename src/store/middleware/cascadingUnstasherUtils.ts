import {
  extractContent,
  Freight,
  enqueueCascadingUnstash,
} from '../../library/actions';
import { discriminatorsGenerator } from '../../library/ShortcutsUtils';
import { abortIfHydrationDisabled, handleHydrationLogic } from '../../library/hydrationUtils';
import { getCurAppName } from '../../utils';
import {
  CourseFormatter,
  OutgoingFormatter,
  PennantFormatter,
  QuestionFormatter,
  QuizFormatter,
  TutorialFormatter,
} from '../../library/Thunks';
import {
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
} from '../slices/courseSlice';
import { AppDispatch, RootState } from '../types';
import { toggleFormatter as setFormatters } from '../slices/settingsSlice';
import { highlightTutorialBreathSelection } from '../slices/tutorialSlice';
import { highlightQuestionBreathSelection, highlightQuizBreathSelection } from '../slices/quizSlice';
import { getStashCellRows } from '../slices/stashSlice';
import type { SlideGroup } from '../../library/CourseUtils';
import type { ChunkBufferingEntry } from '../../library/videoChunkPlayback';
import { normalizeBase64Payload } from '../../library/directoryTreeUtils';
import { Metadata } from '../../components/Core/types';
import { QueryParams } from './ViewManagerSTU';
import { SessionState } from '../slices/sessionSlice';
import type { ChunkBuffer } from '../slices/playbackSlice';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { bytesFetcher } from '../../library/Thunks';
import { setChunkFetchInFlight } from '../slices/playbackSlice';

export interface ChainState {
  index: number;
  freights: Freight[];
  restoreFormatter?: string;
  postUnstashHydration?: boolean;
}

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

const formatBufferEntry = (entry: ChunkBufferingEntry): string => (
  `${entry.type} chunk=${entry.indexInPlaylist + 1} ordinal=${entry.ordinal} child=${entry.childId.join(',')}`
);

export { formatBufferEntry };

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

export const hasUnfetchedChunkBufferEntries = (state: RootState): boolean => (
  findFirstUnfetchedChunkBufferEntry(state) !== undefined
);

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

export const chains = new Map<string, ChainState>();

let chainCounter = 0;

export const createChainId = (): string => {
  chainCounter += 1;
  return `cascade-${Date.now()}-${chainCounter}`;
};

export const expectedFulfilledType = ({ destination, approute }: Freight): string | undefined => {
  switch (destination) {
    case 'quiz':
      if (approute === 'dashboardssifters') return QuestionFormatter.fulfilled.type;
      if (approute === 'siftersinstructions') return CourseFormatter.fulfilled.type;
      if (approute === 'siftersfilters') return PennantFormatter.fulfilled.type;
      if (approute === 'filtersinstructions') return TutorialFormatter.fulfilled.type;
      return QuizFormatter.fulfilled.type;
    case 'tutorial':
      return TutorialFormatter.fulfilled.type;
    case 'course':
      if (approute === 'siftersfilters') return PennantFormatter.fulfilled.type;
      if (approute === 'filtersinstructions') return TutorialFormatter.fulfilled.type;
      return CourseFormatter.fulfilled.type;
    case 'outgoing':
      return OutgoingFormatter.fulfilled.type;
    default:
      return undefined;
  }
};

/** When the next `extractContent` will run a course/tutorial/quiz formatter, mirror {@link UiuxManager} `highlighters` using ids from the stash row(s) for this chain step. */
export const dispatchHighlightForFreight = (
  dispatch: AppDispatch,
  getState: () => RootState,
  freight: Freight
): void => {
  const fulfilled = expectedFulfilledType(freight);
  if (
    fulfilled !== QuizFormatter.fulfilled.type &&
    fulfilled !== TutorialFormatter.fulfilled.type &&
    fulfilled !== CourseFormatter.fulfilled.type &&
    fulfilled !== PennantFormatter.fulfilled.type &&
    fulfilled !== QuestionFormatter.fulfilled.type
  ) {
    return;
  }
  const rows = getStashCellRows(getState().stash[freight.approute]?.[freight.timestamp]);
  if (!rows.length) return;

  const ids = rows
    .map(({ id }) => (typeof id === 'string' ? parseInt(id, 10) : Number(id)))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) return;

  const fullRoute = `${freight.destination}${freight.approute}`;
  const p = { ids, isHighlighted: true as const };

  switch (fullRoute) {
    case 'coursesiftersfilters':
    case 'quizsiftersfilters':
      dispatch(highlightPennantBreathSelection(p));
      return;
    case 'tutorialfoundationfilters':
      dispatch(highlightTutorialBreathSelection(p));
      return;
    case 'coursefoundationsifters':
      dispatch(highlightCourseBreathSelection(p));
      return;
    case 'quizdashboardssifters':
      dispatch(highlightQuestionBreathSelection(p));
      return;
    case 'quizfoundationdashboards':
      dispatch(highlightQuizBreathSelection(p));
      return;
    default:
      return;
  }
};

/**
 * Begin processing the current chain index. Async-formatter legs dispatch `extractContent`
 * and wait for a matching *fulfilled*; highlights run in the middleware after `next`.
 * Legs with no `expectedFulfilledType` extract once, then continue on a microtask so the
 * synchronous part of the store update from `extractContent` has been applied.
 */
export const startCascadingLeg = (
  dispatch: AppDispatch,
  getState: () => RootState,
  chainId: string,
  chain: ChainState
): void => {
  const current = chain.freights[chain.index];
  if (!current) {
    if (chain.restoreFormatter) {
      dispatch(setFormatters(chain.restoreFormatter));
    }
    if (chain.postUnstashHydration && chain.freights.length > 0) {
      if (!abortIfHydrationDisabled(getState)) {
        const state = getState();
        const webapp = getCurAppName(state.session.curApp);
        const discriminators = discriminatorsGenerator(getState, chain.freights);
        handleHydrationLogic(webapp, getState, dispatch, discriminators);
      }
    }
    chains.delete(chainId);
    return;
  }
  const expected = expectedFulfilledType(current);
  if (expected !== undefined) {
    dispatch(extractContent(current));
    return;
  }
  dispatch(extractContent(current));
  queueMicrotask(() => {
    dispatchHighlightForFreight(dispatch, getState, current);
    chain.index += 1;
    startCascadingLeg(dispatch, getState, chainId, chain);
  });
};

export const dispatchCascadingUnstash = (
  dispatch: AppDispatch,
  freights: Freight[],
  restoreFormatter?: string,
  postUnstashHydration?: boolean
): void => {
  dispatch(enqueueCascadingUnstash({ freights, restoreFormatter, postUnstashHydration }));
};
