import type { Draft } from 'immer';
import { Metadata } from '../components/Core/types';
import type { TutorialTrees } from './controlPanelUtils';
import {
  contiguousOrdinalBannersPred,
  contiguousOrdinalContentPred,
  mergeSlides,
  orderPredicate,
  sorter,
  tutorialBannerDedupKey,
} from './sliceUtils';

export interface TutorialState {
  selected: number;
  noTutorials: boolean;
  content: Content[][];
  banners: Banner[];
}

export interface Banner {
  id: number;
  sender?: string;
  owner: boolean;
  quote: string;
  title: string;
  ordinal: number;
  filterId?: number;
  bannerId?: number;
  metadata?: Metadata;
  sizeInBytes: number;
  isDismissed: boolean;
  isHighlighted: boolean;
  status: number;
  contiguousOrdinal?: number;
  descendentsSums: Record<string, number>;
  modified?: boolean;
  edited?: boolean;
}

export interface Content {
  id: number;
  sender?: string;
  owner: boolean;
  title: string;
  ordinal: number;
  content: string;
  bannerId: number;
  imageurl: string;
  metadata?: Metadata;
  sizeInBytes: number;
  isHighlighted: boolean;
  status: number;
  contiguousOrdinal?: number;
  descendentsSums: Record<string, number>;
  isDismissed: boolean;
  modified?: boolean;
  edited?: boolean;
}

export interface dismissTutorialPayload {
  ids: number[];
  isShow?: boolean;
  isDismissed?: boolean;
}

export interface SetTutorialsPayload {
  TreesId?: number;
  banners: Banner[];
  content: Content[][];
  Trees?: TutorialTrees;
}

/** Same shape as `erasePayload` from actions — tutorial `clearSelected` routes only. */
export interface TutorialClearSelectedErasePayload {
  Ids?: number[] | string[];
  IDs?: number[];
  route?: string;
  isShow: boolean;
}

export type WritableContent = Draft<Content>;
export type WritableBanner = Draft<Banner>;
export type WritableContentArray = Draft<Content[]>;

/** Same ordering key as `sortOrdinalKey` in `RangeSelectionOrReorderMangerUtils`. */
export function ordinalForReorder(x: { ordinal: number; contiguousOrdinal?: number }): number {
  if (typeof x.contiguousOrdinal === 'number') return x.contiguousOrdinal;
  return x.ordinal;
}

/**
 * Alt+ordinal-range “group” reorder within an ordinal-sorted segment.
 * Endpoints must disagree on highlight (exactly one of start/end highlighted).
 *
 * - Start not highlighted, end highlighted: rotate so the first highlighted row
 *   in the segment moves to the front (equivalent to moving all highlighted before
 *   the leading non-highlighted block when that block is a prefix).
 * - Start highlighted, end not: rotate at the first non-highlighted row — suffix
 *   (from that row through the end) then prefix (leading highlighted rows).
 *
 * This matches `RangeSelectionOrReorderManger` examples 1–3, including interleaved H/! inside the range.
 */
export function altGroupRangeReorderSegment<T>(
  segment: readonly T[],
  getHighlighted: (t: T) => boolean,
): T[] | null {
  if (segment.length < 2) return null;
  const startH = getHighlighted(segment[0]);
  const endH = getHighlighted(segment[segment.length - 1]);
  if (startH === endH) return null;

  if (!startH && endH) {
    const i = segment.findIndex(getHighlighted);
    if (i < 1 || i >= segment.length) return null;
    return [...segment.slice(i), ...segment.slice(0, i)];
  }
  const i = segment.findIndex((t) => !getHighlighted(t));
  if (i < 1 || i >= segment.length) return null;
  return [...segment.slice(i), ...segment.slice(0, i)];
}

/** Contiguous index run in `fullSorted` covering exactly `expectedRangeCount` members. */
export function findContiguousSortedRange<T>(
  fullSorted: readonly T[],
  rangeMember: (t: T) => boolean,
  expectedRangeCount: number,
): { lo: number; hi: number } | null {
  let lo = -1;
  let hi = -1;
  for (let i = 0; i < fullSorted.length; i++) {
    if (!rangeMember(fullSorted[i])) continue;
    if (lo === -1) {
      lo = hi = i;
      continue;
    }
    if (i === hi + 1) {
      hi = i;
      continue;
    }
    return null;
  }
  if (lo === -1) return null;
  let count = 0;
  for (let i = lo; i <= hi; i++) {
    if (rangeMember(fullSorted[i])) count++;
  }
  if (count !== expectedRangeCount) return null;
  return { lo, hi };
}

/**
 * Rebuild global order when `rangeKeySet` rows may be interleaved with others (e.g. comms types):
 * emit `newSegment` once at the first range row, then skip other range rows, preserving non-range order.
 */
export function mergeGloballySortedWithAltGroupSegment<T>(
  globalSorted: readonly T[],
  rangeKeySet: Set<string>,
  mergeKey: (t: T) => string,
  newSegment: readonly T[],
): T[] | null {
  let emitted = false;
  const out: T[] = [];
  for (const row of globalSorted) {
    if (rangeKeySet.has(mergeKey(row))) {
      if (!emitted) {
        out.push(...newSegment);
        emitted = true;
      }
      continue;
    }
    out.push(row);
  }
  if (!emitted) return null;
  return out;
}

export function findTutorialContentRow(
  content: WritableContentArray[],
  id: number,
): WritableContentArray | null {
  for (const row of content) {
    if (row.some((slide) => slide.id === id)) return row;
  }
  return null;
}

/** Reassign `ordinal` (and `contiguousOrdinal` when present) to 0..length-1 in list order. */
export function assignDenseOrdinalsZeroBased<
  T extends { ordinal: number; contiguousOrdinal?: number },
>(items: readonly T[]): void {
  for (let i = 0; i < items.length; i++) {
    items[i].ordinal = i;
    if (typeof items[i].contiguousOrdinal === 'number') {
      items[i].contiguousOrdinal = i;
    }
  }
}



export const tutorialSlideExists = (
  content: WritableContentArray[],
  id: number,
  bannerId: number,
) =>
  content.some((row) =>
    row.some((slide) => slide.id === id && slide.bannerId === bannerId),
  );



/** Assign unique contiguous ordinals across all tutorial content rows (flat order). */
export function assignTutorialContentContiguousOrdinals(
  content: WritableContentArray[],
): WritableContentArray[] {
  let offset = 0;
  return content.map((row) => {
    const sorted = sorter([...row]) as WritableContentArray;
    const updated = contiguousOrdinalContentPred(sorted as Content[], offset) as WritableContentArray;
    offset += updated.length;
    return updated;
  });
}

export const applySetTutorials = (state: TutorialState, payload: SetTutorialsPayload) => {
  const { banners: newBanners = [], content: newContent = [] } = payload;
  const newBannerState = contiguousOrdinalBannersPred(
    Object.values(
      [...newBanners, ...state.banners].reduce((prev, cur) => {
        prev[tutorialBannerDedupKey(cur)] = cur;
        return prev;
      }, {} as Record<string, Banner>)
    ).sort(orderPredicate)
  );
  const newNoTutorials =
    !state.banners.length ? newBannerState.length === 0 : state.noTutorials;
  if (newContent.length > 0) {
    const newContentState = mergeSlides(newContent, state.content);
    state.banners = newBannerState;
    state.noTutorials = newNoTutorials;
    state.content = assignTutorialContentContiguousOrdinals(newContentState);
  } else {
    state.banners = newBannerState;
    state.noTutorials = newNoTutorials;
  }
};




