import type { Draft } from 'immer';
import { Status } from '../store/slices/actionSlice';
import { Metadata } from '../components/Core/types';
import type { TutorialTrees } from './controlPanelUtils';
import {
  contiguousOrdinalBannersPred,
  contiguousOrdinalContentPred,
  mergeSlides,
  orderPredicate,
  sorter,
  tutorialBannerDedupKey,
  ownershipUpdator,
  toOwnershipIdSet,
} from './sliceUtils';
import { isPersistableOrdinal, sanitizeNumericOrdinalBatch, type OwnershipPayload } from './actions';

/** Per-highlight-lane anchor for Shift+single-id highlight tracking (see `RangeSelectionOrReorderManger`). */
export interface TutorialStartId {
  tutorialBreath: number | null;
  tutorialDepth: number | null;
  contentBreath: number | null;
}

export const createTutorialStartIdInitial = (): TutorialStartId => ({
  tutorialBreath: null,
  tutorialDepth: null,
  contentBreath: null,
});

/** One batch of id → new `ordinal` values recorded after a reorder action. */
export type TutorialModifiedOrdinalBatch = Record<number, number>;

/**
 * Tracks ordinal edits from UI reorder reducers: item kind → parent banner id (-1 if absent) →
 * append-only batches of { entityId → new ordinal }.
 */
export interface TutorialModifiedOrdinals {
  banner?: Record<number, TutorialModifiedOrdinalBatch[]>;
  content?: Record<number, TutorialModifiedOrdinalBatch[]>;
}

export interface TutorialState {
  selected: number;
  noTutorials: boolean;
  content: Content[][];
  banners: Banner[];
  startId: TutorialStartId;
  modifiedOrdinals: TutorialModifiedOrdinals;
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
  status: Status | number;
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
  status: Status | number;
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

/**
 * Ctrl+range reorder using the legacy offset swap (first/last in `ids` expand order),
 * then sort and densify ordinals to 0..n-1 so nothing stays negative.
 */
export function applyOrdinalRangeReorder<T extends { id: number; ordinal: number; contiguousOrdinal?: number }>(
  allItems: readonly T[],
  ids: number[],
  direction: boolean,
  _readOrd?: (item: T) => number,
): void {
  if (ids.length < 2 || allItems.length < 2) return;
  const byId = new Map(allItems.map((item) => [item.id, item]));
  const presentIds = ids.filter((id) => byId.has(id));
  if (presentIds.length < 2) return;

  const firstId = presentIds[0];
  const lastId = presentIds[presentIds.length - 1];
  const orig = new Map<number, number>();
  for (const id of presentIds) {
    orig.set(id, byId.get(id)!.ordinal);
  }
  const firstItem = byId.get(firstId);
  const lastItem = byId.get(lastId);
  if (firstItem === undefined || lastItem === undefined) return;

  if (direction) {
    const lastOrd = orig.get(lastId)!;
    firstItem.ordinal = lastOrd + 1;
    for (let i = 1; i < presentIds.length; i++) {
      const item = byId.get(presentIds[i]);
      if (item !== undefined) item.ordinal = orig.get(presentIds[i])! - 1;
    }
  } else {
    const firstOrd = orig.get(firstId)!;
    lastItem.ordinal = firstOrd - 1;
    for (let i = 0; i < presentIds.length - 1; i++) {
      const item = byId.get(presentIds[i]);
      if (item !== undefined) item.ordinal = orig.get(presentIds[i])! + 1;
    }
  }

  const sorted = [...allItems].sort((a, b) => a.ordinal - b.ordinal);
  assignDenseOrdinalsZeroBased(sorted);
}

export const tutorialSlideExists = (
  content: WritableContentArray[],
  id: number,
  bannerId: number,
) =>
  content.some((row) =>
    row.some((slide) => slide.id === id && slide.bannerId === bannerId),
  );

function recordModifiedOrdinalBatches(
  modifiedOrdinals: TutorialModifiedOrdinals,
  kind: keyof TutorialModifiedOrdinals,
  batchesByBannerKey: Map<number, Record<number, number>>,
) {
  if (batchesByBannerKey.size === 0) return;
  const branch = modifiedOrdinals[kind] ?? (modifiedOrdinals[kind] = {});
  for (const [bannerKey, batch] of batchesByBannerKey) {
    const sanitized = sanitizeNumericOrdinalBatch(batch);
    if (Object.keys(sanitized).length === 0) continue;
    const list = branch[bannerKey] ?? (branch[bannerKey] = []);
    list.push(sanitized);
  }
}

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

export const applyDismissTutorial = (state: TutorialState, payload: dismissTutorialPayload) => {
  const { selected } = state;
  const { ids, isShow } = payload;
  if (ids.length === 0) return;

  for (const id of ids) {
    if (selected > -1) {
      const banner = state.banners[selected];
      const predicate = (slides: WritableContentArray) => slides[0]?.bannerId === banner?.id;
      const contIndex = state.content.findIndex(predicate);
      if (contIndex > -1) {
        state.content[contIndex] = state.content[contIndex].map((slide) =>
          id === slide.id
            ? { ...slide, isDismissed: payload.isDismissed ?? !slide.isDismissed }
            : slide
        );
      }
    } else {
      const dismissedBanner = state.banners.find((banner) => id === banner.id);
      const newIsDismissed = dismissedBanner ? payload.isDismissed ?? !dismissedBanner.isDismissed : false;

      state.banners = state.banners.map((banner) =>
        id === banner.id
          ? { ...banner, isDismissed: newIsDismissed }
          : banner
      );

      if (dismissedBanner) {
        const predicate = (slides: WritableContentArray) => slides[0]?.bannerId === dismissedBanner.id;
        const contIndex = state.content.findIndex(predicate);
        if (contIndex > -1) {
          state.content[contIndex] = state.content[contIndex].map((slide) => ({
            ...slide,
            isDismissed: newIsDismissed,
          }));
        }
      }

      const visibles = state.banners.filter(
        ({ isDismissed }) => isDismissed === isShow
      );
      state.noTutorials = visibles.length === 0;
    }
  }
};

export const applyHighlightTutorialDepthSelection = (
  state: TutorialState,
  payload: { ids: number[]; isHighlighted?: boolean },
) => {
  const { ids, isHighlighted } = payload;
  const { selected } = state;
  if (selected > -1) {
    const banner = state.banners[selected];
    const predicate = (slides: WritableContentArray) => slides[0]?.bannerId === banner?.id;
    const contIndex = state.content.findIndex(predicate);
    if (contIndex > -1) {
      state.content[contIndex] = state.content[contIndex].map((slide) =>
        ({ ...slide, isHighlighted: isHighlighted ?? !slide.isHighlighted }));
    }
    banner.isHighlighted = isHighlighted ?? !banner.isHighlighted;
  } else {
    const highlightedBanner = state.banners.filter((banner) => ids.includes(banner.id));

    state.banners = state.banners.map((banner) =>
      ids.includes(banner.id)
        ? { ...banner, isHighlighted: isHighlighted ?? !banner.isHighlighted }
        : banner
    );

    highlightedBanner.forEach((banner) => {
      const predicate = (slides: WritableContentArray) => slides[0]?.bannerId === banner.id;
      const contIndex = state.content.findIndex(predicate);
      if (contIndex > -1) {
        state.content[contIndex] = state.content[contIndex].map((slide) => ({
          ...slide,
          isHighlighted: isHighlighted ?? !slide.isHighlighted,
        }));
      }
    });
  }
};

export const applyHighlightContentBreathSelection = (
  state: TutorialState,
  payload: { ids: number[]; isHighlighted?: boolean },
) => {
  const bannerIds: number[] = [];
  const { ids, isHighlighted } = payload;
  if (state.selected === -1) {
    bannerIds.push(...state.banners.map(({ id }) => id));
  } else {
    bannerIds.push(state.banners[state.selected]?.id);
  }
  const predicate = (slides: WritableContentArray, index: number) => ({
    isMatch: slides.find(({ bannerId }) => bannerId && bannerIds.includes(bannerId)),
    index,
  });
  const contIndices = state.content
    .map(predicate)
    .filter(({ isMatch }) => isMatch)
    .map(({ index }) => index);
  for (let i = 0; i < state.content.length; i++) {
    const contIndex = contIndices.find((x) => x === i);
    if (contIndex === undefined) continue;
    state.content[contIndex] = state.content[contIndex].map((slide) =>
      ids.includes(slide.id)
        ? { ...slide, isHighlighted: isHighlighted ?? !slide.isHighlighted }
        : slide
    );
  }
};

export const applyClearSelectedTutorial = (state: TutorialState, payload: TutorialClearSelectedErasePayload) => {
  const { Ids = [], IDs = [], route, isShow } = payload;
  switch (route) {
    case "foundationfilters": {
      const newBanners = state.banners.filter(
        ({ id, isDismissed }) => isDismissed !== isShow || !(Ids as number[]).includes(id)
      );
      const predicate = (slides: WritableContentArray) => {
        const bannerId = slides[0]?.bannerId;
        return bannerId && newBanners.find(({ id }) => id === bannerId);
      };
      const visibles = newBanners.filter(
        ({ isDismissed }) => isDismissed === isShow
      );
      state.banners = newBanners;
      state.noTutorials = visibles.length === 0;
      state.content = state.content.filter(predicate);
      state.selected = state.selected > visibles.length ? -1 : state.selected;
      break;
    }
    case "filtersinstructions": {
      state.content = state.content.map((slides) =>
        slides.filter(
          ({ id, bannerId, isDismissed }) =>
            isDismissed !== isShow ||
            (IDs.length === 0 && !(Ids as number[]).includes(id)) ||
            (IDs.length > 0 &&
              !((Ids as number[]).includes(id) && bannerId && IDs.includes(bannerId)))
        )
      );
      break;
    }
  }
};

export const applyClearFetchedTutorial = (state: TutorialState, payload: boolean) => {
  if (state.selected > -1) {
    const banner = state.banners[state.selected];
    const predicate0 = (slides: WritableContentArray) => slides[0]?.bannerId === banner?.id;
    const visibleSlides = state.content.find(predicate0) ?? [];
    const predicate1 = (slides: WritableContentArray) => slides[0]?.bannerId !== banner?.id;
    const invisibleSlides = state.content.filter(predicate1);
    const predicate2 = ({ isDismissed }: WritableContent) => isDismissed === !payload;
    const unDismissed = visibleSlides.filter(predicate2);
    state.content = unDismissed.length > 0
      ? [unDismissed, ...invisibleSlides]
      : invisibleSlides;
  } else {
    const newBanners = state.banners.filter(
      ({ isDismissed }) => isDismissed === !payload
    );
    const predicate = (slides: WritableContentArray) => {
      const bannerId = slides[0]?.bannerId;
      return bannerId && newBanners.find(({ id }) => id === bannerId);
    };
    state.noTutorials = true;
    state.banners = newBanners;
    state.content = state.content.filter(predicate);
  }
};

export type TutorialReOrderSelectionPayload = {
  ids: number[];
  direction: boolean;
  groupReorder?: boolean;
};

export const applyReOrderTutorialSelection = (
  state: TutorialState,
  payload: TutorialReOrderSelectionPayload,
) => {
  const { ids, direction, groupReorder } = payload;
  if (ids.length < 2) return;
  const byId = new Map(state.banners.map((b) => [b.id, b]));
  if (!ids.every((id) => byId.has(id))) return;
  const beforeOrdinals = new Map(state.banners.map((b) => [b.id, b.ordinal]));
  if (groupReorder) {
    const idSet = new Set(ids);
    const fullSorted = [...state.banners].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
    const range = findContiguousSortedRange(fullSorted, (b) => idSet.has(b.id), idSet.size);
    if (!range) return;
    const segment = fullSorted.slice(range.lo, range.hi + 1);
    const newSeg = altGroupRangeReorderSegment(segment, (b) => !!b.isHighlighted);
    if (!newSeg) return;
    const newFull = [...fullSorted.slice(0, range.lo), ...newSeg, ...fullSorted.slice(range.hi + 1)];
    assignDenseOrdinalsZeroBased(newFull);
  } else {
    applyOrdinalRangeReorder(state.banners, ids, direction);
  }
  const sortedBanners = sorter([...state.banners]) as WritableBanner[];
  assignDenseOrdinalsZeroBased(sortedBanners);
  state.banners = contiguousOrdinalBannersPred(sortedBanners) as WritableBanner[];
  const batchesByBannerKey = new Map<number, Record<number, number>>();
  for (const banner of state.banners) {
    const prev = beforeOrdinals.get(banner.id);
    if (prev !== undefined && prev !== banner.ordinal && isPersistableOrdinal(banner.ordinal)) {
      const bannerKey = banner.bannerId ?? -1;
      const batch = batchesByBannerKey.get(bannerKey) ?? {};
      batch[banner.id] = banner.ordinal;
      batchesByBannerKey.set(bannerKey, batch);
    }
  }
  recordModifiedOrdinalBatches(state.modifiedOrdinals, 'banner', batchesByBannerKey);
};

export const applyReOrderContentSelection = (
  state: TutorialState,
  payload: TutorialReOrderSelectionPayload,
) => {
  const { ids, direction, groupReorder } = payload;
  if (ids.length < 2) return;
  const row = findTutorialContentRow(state.content, ids[0]);
  if (!row) return;
  const rowIds = ids.filter((id) => row.some((slide) => slide.id === id));
  if (rowIds.length < 2) return;
  const beforeOrdinals = new Map(row.map((slide) => [slide.id, slide.ordinal]));
  if (groupReorder) {
    const idSet = new Set(rowIds);
    const fullSorted = [...row].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
    const range = findContiguousSortedRange(fullSorted, (s) => idSet.has(s.id), idSet.size);
    if (!range) return;
    const segment = fullSorted.slice(range.lo, range.hi + 1);
    const newSeg = altGroupRangeReorderSegment(segment, (s) => !!s.isHighlighted);
    if (!newSeg) return;
    const newFull = [...fullSorted.slice(0, range.lo), ...newSeg, ...fullSorted.slice(range.hi + 1)];
    assignDenseOrdinalsZeroBased(newFull);
  } else {
    applyOrdinalRangeReorder(row, rowIds, direction);
  }
  const rowIndex = state.content.findIndex((r) => r === row);
  if (rowIndex === -1) return;
  sorter(row);
  assignDenseOrdinalsZeroBased(row);
  state.content = assignTutorialContentContiguousOrdinals(state.content);
  const finalRow = state.content[rowIndex];
  const bannerKey = finalRow[0]?.bannerId ?? -1;
  const batch: Record<number, number> = {};
  for (const slide of finalRow) {
    const prev = beforeOrdinals.get(slide.id);
    if (prev !== undefined && prev !== slide.ordinal && isPersistableOrdinal(slide.ordinal)) {
      batch[slide.id] = slide.ordinal;
    }
  }
  if (Object.keys(batch).length > 0) {
    recordModifiedOrdinalBatches(state.modifiedOrdinals, 'content', new Map([[bannerKey, batch]]));
  }
};

export const applyMergeTutorialFetchSkeletonsFulfilled = (
  state: TutorialState,
  response: { banners?: Banner[]; content?: Content[][] },
) => {
  const { banners: incomingBanners, content: incomingContent } = response;

  if (incomingBanners) {
    for (const banner of incomingBanners) {
      if (!state.banners.some((b) => tutorialBannerDedupKey(b) === tutorialBannerDedupKey(banner))) {
        state.banners.push(banner);
      }
    }
  }

  if (incomingContent) {
    for (const row of incomingContent) {
      for (const slide of row) {
        if (tutorialSlideExists(state.content, slide.id, slide.bannerId)) {
          continue;
        }
        const groupIndex = state.content.findIndex(
          (r) => r[0]?.bannerId === slide.bannerId
        );
        if (groupIndex > -1) {
          state.content[groupIndex].push(slide);
        } else {
          state.content.push([slide]);
        }
      }
    }
  }

  if (state.banners.length > 0) {
    const visibles = state.banners.filter(({ isDismissed }) => !isDismissed);
    state.noTutorials = visibles.length === 0;
  }

  if (state.content.length > 0) {
    state.content = assignTutorialContentContiguousOrdinals(state.content);
  }
};

export const applyUpdateOwnership = (state: TutorialState, { ids, owner, route }: OwnershipPayload): void => {
  const idSet = toOwnershipIdSet(ids);
  if (idSet.size === 0) return;

  switch (route.toLowerCase()) {
    case 'foundationfilters':
      state.banners = state.banners.map(ownershipUpdator(idSet, owner)).sort(orderPredicate);
      break;
    case 'filtersinstructions':
      state.content = state.content.map((rows) => rows.map(ownershipUpdator(idSet, owner)));
      break;
  }
};
