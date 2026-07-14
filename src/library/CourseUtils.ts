import { Status } from "../components/Core/types";
import { Metadata } from "../components/Core/types";
import type { CourseTrees } from "./controlPanelUtils";
import {
  sorterCourse,
  contiguousOrdinalBannersPred,
  getSlideIndeces,
  getCoverCouplingIndexes,
  mergePennants,
  orderPredicate,
  mergeSlideshows,
  courseBannerDedupKey,
  textsMerger,
  idsMerger,
  finalizer,
  ordinalsUpdator,
  metadataUpdator,
  ownershipUpdator,
  toOwnershipIdSet,
  type CourseCouplings,
} from "./sliceUtils";
import { type MetadataUpdate, type OrdinalUpdate, type OwnershipPayload, type UpdatePayload } from "./actions";

export interface SlideItem {
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
  descendentsSums: Record<string, number>;
  contiguousOrdinal?: number;
  isDismissed: boolean;
  modified?: boolean;
  edited?: boolean;
}

export interface SlideGroupItem {
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
  descendentsSums: Record<string, number>;
  contiguousOrdinal?: number;
  isDismissed: boolean;
  modified?: boolean;
  edited?: boolean;
};

export interface SlideGroup {
  [key: number]: SlideGroupItem;
  slides: SlideItem[][];
}

export interface Banner {
  id: number;
  sender?: string;
  owner: boolean;
  quote: string;
  title: string;
  ordinal: number;
  sifterId?: number;
  metadata?: Metadata;
  sizeInBytes: number;
  isDismissed: boolean;
  isHighlighted: boolean;
  status: Status | number;
  contiguousOrdinal?: number;
  descendentsSums: Record<string, number>;
  pennants: Pennant[];
  modified?: boolean;
  bannerId?: number;
  edited?: boolean;
}

export interface Pennant {
  id: number;
  sender?: string;
  owner: boolean;
  quote: string;
  title: string;
  ordinal: number;
  bannerId: number;
  filterId?: number;
  metadata?: Metadata;
  sizeInBytes: number;
  isDismissed: boolean;
  isHighlighted: boolean;
  status: Status | number;
  descendentsSums: Record<string, number>;
  contiguousOrdinal?: number;
  modified?: boolean;
  edited?: boolean;
}

/** Per-highlight-lane anchor for Shift+single-id highlight tracking (see `RangeSelectionOrReorderManger`). */
/** One batch of id → new `ordinal` values recorded after a reorder action. */
export type CourseModifiedOrdinalBatch = Record<number, number>;

/**
 * Tracks ordinal edits from UI reorder reducers: item kind → parent id (-1 if absent) →
 * append-only batches of { entityId → new ordinal }. Parent id resolves as follows:
 * - `banner`: course banner.bannerId ?? -1 (root)
 * - `pennant`: parent course banner id
 * - `cover`: parent course banner id
 * - `slide`: parent pennant id
 */

export interface CourseState {
  /** Nested as courseId → coverId → slide indexes (guards shared cover ids across courses). */
  couplings: CourseCouplings;
  content: SlideGroup[];
  noCourses: boolean;
  banners: Banner[];
  selected: number;
  chapters: number[];
}

/** One slide row (`SlideItem[]`) that contains `slideId`, if any. Used for Ctrl+range slide reorder. */
export function findCourseSlideRowForSlideId(
  content: SlideGroup[],
  slideId: number,
): SlideItem[] | null {
  for (const group of content) {
    for (const row of group.slides ?? []) {
      if (row.some((s) => s.id === slideId)) return row;
    }
  }
  return null;
}

/** Mainslide/cover thumb entries for the slide group that contains `coverId`. */
export function findSlideGroupForCoverId(
  content: SlideGroup[],
  coverId: number,
): { groupIndex: number; entries: [string, SlideGroupItem][] } | null {
  for (let groupIndex = 0; groupIndex < content.length; groupIndex++) {
    const group = content[groupIndex];
    const entries = Object.entries(group).filter(([key, v]) => {
      if (key === 'slides') return false;
      return typeof v === 'object' && v !== null && 'id' in v && 'ordinal' in v;
    }) as [string, SlideGroupItem][];
    if (entries.some(([, v]) => v.id === coverId)) return { groupIndex, entries };
  }
  return null;
}

export interface SetCoursesPayload {
  TreesId?: number;
  banners: Banner[];
  content: SlideGroup[];
  Trees?: CourseTrees;
}


const courseSlideOrCoverExists = (
  content: SlideGroup[],
  id: number,
  bannerId: number
): boolean => {
  for (const group of content) {
    for (const key of Object.keys(group)) {
      if (key === 'slides') continue;
      const v = group[key as keyof SlideGroup];
      if (typeof v === 'object' && v !== null && 'id' in v && 'bannerId' in v) {
        const item = v as SlideGroupItem;
        if (item.id === id && item.bannerId === bannerId) return true;
      }
    }
    const { slides } = group;
    if (slides) {
      for (const row of slides) {
        for (const slide of row) {
          if (slide.id === id && slide.bannerId === bannerId) return true;
        }
      }
    }
  }
  return false;
};

const groupMatchesSlideGroupItemBanner = (group: SlideGroup, bannerId: number): boolean => {
  for (const key of Object.keys(group)) {
    if (key === 'slides') continue;
    const value = group[key as keyof SlideGroup];
    if (typeof value === 'object' && value !== null && 'bannerId' in value) {
      if ((value as SlideGroupItem).bannerId === bannerId) return true;
    }
  }

  return group.slides?.some((row) => row[0]?.bannerId === bannerId) ?? false;
};

const resolveBannerIdForPennantId = (state: CourseState, pennantId: number): number | undefined => {
  for (const banner of state.banners) {
    for (const pennant of banner.pennants ?? []) {
      if (pennant.id === pennantId) return pennant.bannerId;
    }
  }
  return undefined;
};

const appendCourseSlideItem = (state: CourseState, slide: SlideItem) => {
  // For slides, `slide.bannerId` refers to the pennant id. We need to resolve the parent banner id.
  const parentBannerId = resolveBannerIdForPennantId(state, slide.bannerId);
  if (parentBannerId === undefined) {
    throw new Error(
      `appendCourseSlideItem: unknown pennantId=${slide.bannerId} for slide id=${slide.id}`
    );
  }

  const groupIndex = state.content.findIndex((g) => groupMatchesSlideGroupItemBanner(g, parentBannerId));
  if (groupIndex > -1) {
    const grp = state.content[groupIndex];
    const rowIdx = grp.slides.findIndex((row) => row[0]?.bannerId === slide.bannerId);
    if (rowIdx > -1) {
      grp.slides[rowIdx].push(slide);
    } else {
      grp.slides.push([slide]);
    }
  } else {
    throw new Error(
      `appendCourseSlideItem: no matching SlideGroup for slide id=${slide.id}, pennantId=${slide.bannerId}, parentBannerId=${parentBannerId}`
    );
  }
};

const appendCourseSlideGroupItem = (state: CourseState, item: SlideGroupItem) => {
  const groupIndex = state.content.findIndex((g) => groupMatchesSlideGroupItemBanner(g, item.bannerId));
  if (groupIndex > -1) {
    const grp = state.content[groupIndex];
    const keys = Object.keys(grp)
      .filter((k) => k !== 'slides')
      .map(Number)
      .filter(Number.isFinite);
    const nextKey = keys.length ? Math.max(...keys) + 1 : 0;
    grp[nextKey] = item;
  } else {
    state.content.push({ 0: item, slides: [] } as SlideGroup);
  }
};

export const isSlideGroupItem = (item: unknown): item is SlideGroupItem =>
  typeof item === 'object' &&
  item !== null &&
  !Array.isArray(item) &&
  'id' in item &&
  'bannerId' in item &&
  'ordinal' in item;

export const getBannerChaptersCouplings = (
  { content, couplings }: Pick<CourseState, 'content' | 'couplings'>,
  bannerId: number
): number[][] =>
  content
    .flatMap((group) =>
      Object.values(group).filter(
        (item): item is SlideGroupItem => isSlideGroupItem(item) && item.bannerId === bannerId
      )
    )
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((item) => getCoverCouplingIndexes(couplings, bannerId, item.id))
    .filter((coupling) => coupling.length > 0);

/**
 * Same resolution as setChaptersViaSlideId. Use to decide whether a slide can enable chapter mode.
 * - `ok` — coupling has at least one index; safe to dispatch setChaptersViaSlideId.
 * - `no-coupling` — slide is in the selected course’s content but couplings are missing/empty; warn user.
 * - `no-context` — reducer would no-op (e.g. wrong course selected); do not show a coupling warning.
 */
export const resolveChaptersForSlideInSelectedCourse = (
  state: Pick<CourseState, 'selected' | 'banners' | 'content' | 'couplings'>,
  slideId: number
): 'ok' | 'no-coupling' | 'no-context' => {
  if (state.selected < 0) return 'no-context';
  const selectedBanner = state.banners[state.selected];
  if (!selectedBanner) return 'no-context';
  const selectedContent = state.content.find((group) => group[0]?.bannerId === selectedBanner.id);
  if (!selectedContent) return 'no-context';
  const matched = Object.values(selectedContent).find(
    (item): item is SlideGroupItem => isSlideGroupItem(item) && item.id === slideId
  );
  if (!matched) return 'no-context';
  const c = getCoverCouplingIndexes(state.couplings, selectedBanner.id, matched.id);
  if (c.length > 0) return 'ok';
  return 'no-coupling';
};

/**
 * Slide-group item (cover) whose couplings row applies to this pennant — same pairing rules as {@link getSlideIndeces}.
 */
export const getSlideGroupItemForPennantChapterCoupling = (
  selectedContent: SlideGroup,
  pennant: Pennant
): SlideGroupItem | undefined => {
  const slides = selectedContent.slides ?? [];
  for (const value of Object.values(selectedContent)) {
    if (!isSlideGroupItem(value)) continue;
    if (value.bannerId !== pennant.bannerId || value.ordinal !== pennant.ordinal) continue;
    const hasPennantSlide = slides.some(
      (slideArray) => slideArray.length > 0 && slideArray[0].bannerId === pennant.id
    );
    if (hasPennantSlide) return value;
  }
  return undefined;
};

/** True if the course slide matrix has at least one row whose first slide uses this pennant id. */
export const pennantHasAssignedSlideRowsInGroup = (
  selectedContent: SlideGroup,
  pennantId: number
): boolean =>
  (selectedContent.slides ?? []).some(
    (slideArray) => slideArray.length > 0 && slideArray[0].bannerId === pennantId
  );

/**
 * One pass over the course slide matrix: count slide items per {@link SlideItem.bannerId} (pennant id).
 * Only rows matching `predicate` are included (e.g. same dismissed / active filter as chapter rows).
 */
export const countSlideItemsByBannerId = (
  slides: SlideItem[][],
  predicate: (item: SlideItem) => boolean
): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const row of slides) {
    if (!row) continue;
    for (const item of row) {
      if (!predicate(item)) continue;
      const { bannerId } = item;
      counts.set(bannerId, (counts.get(bannerId) ?? 0) + 1);
    }
  }
  return counts;
};

export type ResolveSlidesForChapterInSelectedCourseResult =
  | 'ok'
  | 'no-slides'
  | 'no-context'
  | 'no-ordinal-match'
  | 'no-coupling';

/**
 * Reverse of {@link resolveChaptersForSlideInSelectedCourse}: resolve chapter coupling from a pennant id
 * (same key as {@link getSlideIndeces} / setChaptersViaSlideId, but keyed by pennant).
 *
 * - `no-ordinal-match` — pennant has slide rows in the course group, but no slide-group item
 *   shares its banner/ordinal pairing (cannot attach chapter coupling to a cover).
 */
export const resolveSlidesForChapterInSelectedCourse = (
  state: Pick<CourseState, 'selected' | 'banners' | 'content' | 'couplings'>,
  pennantId: number
): ResolveSlidesForChapterInSelectedCourseResult => {
  if (state.selected < 0) return 'no-context';
  const selectedBanner = state.banners[state.selected];
  if (!selectedBanner) return 'no-context';
  const pennant = selectedBanner.pennants?.find((p) => p.id === pennantId);
  if (!pennant) return 'no-context';
  const selectedContent = state.content.find((group) => group[0]?.bannerId === selectedBanner.id);
  if (!selectedContent) return 'no-context';
  const matched = getSlideGroupItemForPennantChapterCoupling(selectedContent, pennant);
  if (!matched) {
    if (pennantHasAssignedSlideRowsInGroup(selectedContent, pennantId))
      return 'no-ordinal-match';
    return 'no-slides';
  }
  const c = getCoverCouplingIndexes(state.couplings, selectedBanner.id, matched.id);
  if (c.length > 0) return 'ok';
  return 'no-coupling';
};


export interface dismissCoursePayload {
  ids: number[];
  isShow?: boolean;
  isDismissed?: boolean;
}

export interface dismissSlidePayload {
  items: Array<{ id: number; slideIndex: number }>;
  isDismissed?: boolean;
}

const findContentIndexForCourseBanner = (
  content: SlideGroup[],
  courseBannerId: number
): number => content.findIndex((group) => group[0]?.bannerId === courseBannerId);

const findSlideGroupItemById = (
  mainslides: Omit<SlideGroup, 'slides'>,
  itemId: number
): SlideGroupItem | undefined =>
  Object.values(mainslides).find(
    (item): item is SlideGroupItem =>
      typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
  );

const mapMainslidesWithToggledDismiss = (
  mainslides: Omit<SlideGroup, 'slides'>,
  targetId: number,
  isDismissed: boolean
): { [x: number]: SlideGroupItem } =>
  Object.entries(mainslides).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null && 'id' in value) {
      acc[key] = targetId === value.id ? { ...value, isDismissed } : value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as { [x: number]: SlideGroupItem });

const pennantIdsFromSlideRowIndices = (
  slides: SlideItem[][],
  rowIndices: number[]
): Set<number> => {
  const ids = new Set<number>();
  for (const slideIndex of rowIndices) {
    const row = slides[slideIndex];
    if (!row) continue;
    for (const slide of row) ids.add(slide.bannerId);
  }
  return ids;
};

const mapSlidesDismissedAtRowIndices = (
  slides: SlideItem[][],
  rowIndices: number[],
  isDismissed: boolean
): SlideItem[][] => {
  const rowSet = new Set(rowIndices);
  return slides.map((slideArray, slideIndex) =>
    rowSet.has(slideIndex)
      ? slideArray.map((slide) => ({ ...slide, isDismissed }))
      : slideArray
  );
};

const mapBannersWithPennantsDismissed = (
  banners: Banner[],
  pennantIds: Set<number>,
  isDismissed: boolean
): Banner[] =>
  banners.map((b) => ({
    ...b,
    pennants: b.pennants.map((pennant) =>
      pennantIds.has(pennant.id) ? { ...pennant, isDismissed } : pennant
    ),
  }));

const mapBannersForDismissCourseTarget = (
  banners: Banner[],
  targetId: number,
  isDismissed?: boolean
): Banner[] => {
  const dismissedBanner = banners.find((b) => targetId === b.id);
  const bannerDismissIs = dismissedBanner
    ? isDismissed ?? !dismissedBanner.isDismissed
    : false;

  return banners.map((banner) =>
    targetId === banner.id
      ? {
        ...banner,
        isDismissed: bannerDismissIs,
        pennants: banner.pennants.map((pennant) => ({
          ...pennant,
          isDismissed: bannerDismissIs,
        })),
      }
      : {
        ...banner,
        pennants: banner.pennants.map((pennant) =>
          targetId === pennant.id
            ? { ...pennant, isDismissed: isDismissed ?? !pennant.isDismissed }
            : pennant
        ),
      }
  );
};

const slideGroupIndexForBannerId = (content: SlideGroup[], bannerId: number): number =>
  content.findIndex((group) => {
    const first = group[0];
    return first && typeof first === 'object' && 'bannerId' in first
      ? (first as SlideGroupItem).bannerId === bannerId
      : false;
  });

const mapSlideGroupDismissAllForBanner = (
  group: SlideGroup,
  courseBannerId: number,
  pennantIds: number[],
  isDismissed: boolean
): SlideGroup => {
  const { slides, ...mainslides } = group;
  const pennantSet = new Set(pennantIds);

  const updatedMainslides = Object.entries(mainslides).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null && 'bannerId' in value && 'isDismissed' in value) {
      acc[key] =
        value.bannerId === courseBannerId ? { ...value, isDismissed } : value;
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as { [x: number]: SlideGroupItem });

  const updatedSlides = slides.map((slideArray) =>
    slideArray.map((slide) =>
      pennantSet.has(slide.bannerId) ? { ...slide, isDismissed } : slide
    )
  );

  return { ...updatedMainslides, slides: updatedSlides };
};

const noCoursesVisibleForShowFilter = (banners: Banner[], isShow?: boolean): boolean =>
  banners.filter(
    ({ isDismissed, pennants }) =>
      isDismissed === isShow ||
      pennants.some(({ isDismissed: pDismissed }) => pDismissed === isShow)
  ).length === 0;

export const applyDismissCourseWithSelection = (
  state: CourseState,
  targetId: number,
  isDismissed?: boolean,
): void => {
  const banner = state.banners[state.selected];
  if (!banner) return;

  const contentIndex = findContentIndexForCourseBanner(state.content, banner.id);
  if (contentIndex === -1) return;

  const { slides, ...mainslides } = state.content[contentIndex];
  const dismissedMainslide = findSlideGroupItemById(mainslides, targetId);
  const newIsDismissed = dismissedMainslide
    ? isDismissed ?? !dismissedMainslide.isDismissed
    : false;

  const updatedMainslides = mapMainslidesWithToggledDismiss(mainslides, targetId, newIsDismissed);

  let updatedSlides = slides;
  let pennantIdsFromCoupledSlides = new Set<number>();
  if (dismissedMainslide) {
    const slideIndices = getCoverCouplingIndexes(
      state.couplings,
      banner.id,
      dismissedMainslide.id
    );
    pennantIdsFromCoupledSlides = pennantIdsFromSlideRowIndices(slides, slideIndices);
    updatedSlides = mapSlidesDismissedAtRowIndices(slides, slideIndices, newIsDismissed);
  }

  if (pennantIdsFromCoupledSlides.size > 0) {
    state.banners = mapBannersWithPennantsDismissed(
      state.banners,
      pennantIdsFromCoupledSlides,
      newIsDismissed
    );
  }

  state.content[contentIndex] = {
    ...updatedMainslides,
    slides: updatedSlides,
  };
  state.content = [...state.content];
};

export const applyDismissCourseWithoutSelection = (
  state: CourseState,
  targetId: number,
  isDismissed?: boolean,
  isShow?: boolean
): void => {
  const dismissedBanner = state.banners.find((b) => targetId === b.id);
  const isBannerDismissal = dismissedBanner !== undefined;

  state.banners = mapBannersForDismissCourseTarget(state.banners, targetId, isDismissed);

  if (isBannerDismissal && dismissedBanner) {
    const pennantIds = dismissedBanner.pennants.map((p) => p.id);
    const contentIndex = slideGroupIndexForBannerId(state.content, dismissedBanner.id);
    if (contentIndex > -1) {
      const newIsDismissed = isDismissed ?? !dismissedBanner.isDismissed;
      state.content[contentIndex] = mapSlideGroupDismissAllForBanner(
        state.content[contentIndex],
        dismissedBanner.id,
        pennantIds,
        newIsDismissed
      );
    }
  }

  state.noCourses = noCoursesVisibleForShowFilter(state.banners, isShow);
};

/** Same shape as erasePayload for course clearSelected branches. */
export interface CourseClearSelectedErasePayload {
  Ids?: number[] | string[];
  IDs?: number[];
  route?: string;
  isShow: boolean;
}

export const applyClearSelectedCourseState = (
  state: CourseState,
  payload: CourseClearSelectedErasePayload
) => {
  const { Ids = [], IDs = [], route, isShow } = payload;
  switch (route) {
    case "foundationsifters": {
      const { banners, content, selected = -1 } = state;
      const newBanners = banners.filter(
        ({ id, isDismissed }) => isDismissed !== isShow || !(Ids as number[]).includes(id)
      );
      const predicate = (group: SlideGroup) =>
        newBanners.find(({ id }) => id === group[0]?.bannerId);
      const visbles = newBanners.filter(
        ({ isDismissed }) => isDismissed === isShow
      );
      state.banners = newBanners;
      state.noCourses = visbles.length === 0;
      state.content = content.filter(predicate);
      state.selected =
        selected < 0 || selected >= newBanners.length ? -1 : selected;
      state.chapters = [];
      break;
    }
    case "dashboardssifters": {
      const { banners, content } = state;
      const newBanners = banners.filter(
        ({ id, isDismissed, bannerId }) =>
          isDismissed !== isShow ||
          (IDs.length === 0 && !(Ids as number[]).includes(id)) ||
          (IDs.length > 0 && !((Ids as number[]).includes(id) && IDs.includes(bannerId ?? 0)))
      );
      const predicate = (group: SlideGroup) =>
        newBanners.find(({ id }) => id === group[0]?.bannerId);
      state.banners = newBanners;
      state.content = content.filter(predicate);
      break;
    }
    case "siftersfilters": {
      const { banners, content } = state;
      const newBanners = banners.map(({ pennants, ...props }: Banner) => ({
        pennants: pennants.filter(
          ({ id, isDismissed, bannerId }: Pennant) =>
            isDismissed !== isShow ||
            (IDs.length === 0 && !(Ids as number[]).includes(id)) ||
            (IDs.length > 0 &&
              !((Ids as number[]).includes(id) && IDs.includes(bannerId ?? 0)))
        ),
        ...props,
      }));
      const pennantIds = banners
        .map(({ pennants }: Banner) => pennants.map(({ id }: Pennant) => id))
        .flat();
      state.banners = newBanners;
      state.content = content.map(({ slides, ...objSlides }: SlideGroup) => ({
        slides: slides.map((slideArr: SlideItem[]) =>
          slideArr.filter((slide: SlideItem) =>
            slide.isDismissed !== isShow || pennantIds.includes(slide.bannerId)
          )
        ).filter((slideArr: SlideItem[]) => slideArr.length > 0),
        ...objSlides,
      }));
      break;
    }
    case "siftersinstructions": {
      const { banners, content, selected } = state;
      const visbles = banners.filter(
        ({ isDismissed }) => isDismissed === isShow
      );
      state.content = content
        .map(({ slides, ...objSlides }: SlideGroup) => {
          const filteredFields = Object.entries(objSlides).reduce((acc, [key, value]) => {
            if (typeof value === 'object' && value !== null && 'id' in value && 'isDismissed' in value && 'bannerId' in value) {
              if (value.isDismissed !== isShow ||
                (IDs.length === 0 && !(Ids as number[]).includes(value.id)) ||
                (IDs.length > 0 && !((Ids as number[]).includes(value.id) && IDs.includes(value.bannerId ?? 0)))) {
                acc[key] = value;
              }
            } else {
              acc[key] = value;
            }
            return acc;
          }, {} as { [x: number]: SlideGroupItem; });

          return {
            ...filteredFields,
            slides,
          };
        })
        .filter(group => Object.keys(group).length > 1);
      state.selected = selected > visbles.length ? -1 : selected;
      state.chapters = [];
      break;
    }
    case "filtersinstructions": {
      const { content } = state;
      state.content = content.map(({ slides, ...objSlides }: SlideGroup) => ({
        slides: slides.map((slideArr: SlideItem[]) =>
          slideArr.filter((slide: SlideItem) =>
            slide.isDismissed !== isShow ||
            (IDs.length === 0 && !(Ids as number[]).includes(slide.id)) ||
            (IDs.length > 0 &&
              !((Ids as number[]).includes(slide.id) && IDs.includes(slide.bannerId ?? 0)))
          )
        ),
        ...objSlides,
      }));
      break;
    }
  }
};

export const applyDismissChapter = (
  state: CourseState,
  payload: dismissCoursePayload
): void => {
  const { ids, isDismissed } = payload;
  if (ids.length === 0 || state.selected < 0) return;

  const selectedBanner = state.banners[state.selected];
  if (!selectedBanner) return;

  const targetPennantIds = new Set(
    selectedBanner.pennants
      .filter((pennant) => ids.includes(pennant.id))
      .map((pennant) => pennant.id)
  );
  if (targetPennantIds.size === 0) return;

  state.banners = state.banners.map((banner) => {
    if (banner.id !== selectedBanner.id) return banner;
    return {
      ...banner,
      pennants: banner.pennants.map((pennant) =>
        targetPennantIds.has(pennant.id)
          ? { ...pennant, isDismissed: isDismissed ?? !pennant.isDismissed }
          : pennant
      ),
    };
  });

  state.content = state.content.map((group) => {
    if (group[0]?.bannerId !== selectedBanner.id) return group;
    const { slides, ...mainslides } = group;
    return {
      ...mainslides,
      slides: slides.map((row) =>
        row.map((slide) =>
          targetPennantIds.has(slide.bannerId)
            ? { ...slide, isDismissed: isDismissed ?? !slide.isDismissed }
            : slide
        )
      ),
    };
  });
};

export const applyDismissSlide = (
  state: CourseState,
  payload: dismissSlidePayload
): void => {
  const { content, selected, banners } = state;
  const banner = banners[selected];
  const predicate = (group: SlideGroup) => group[0]?.bannerId === banner?.id;
  const contIndex = content.findIndex(predicate);
  if (selected === -1 || contIndex === -1) return;

  const { items, isDismissed } = payload;
  if (items.length === 0) return;

  const { slides, ...mainslides } = content[contIndex];
  const idSet = new Map<number, Set<number>>();
  for (const { id, slideIndex } of items) {
    if (!idSet.has(slideIndex)) idSet.set(slideIndex, new Set());
    idSet.get(slideIndex)!.add(id);
  }

  content[contIndex] = {
    slides: slides.map((slideArray: SlideItem[], index: number) => {
      const idsAtRow = idSet.get(index);
      if (!idsAtRow) return slideArray;
      return slideArray.map((slide: SlideItem) =>
        idsAtRow.has(slide.id)
          ? { ...slide, isDismissed: isDismissed ?? !slide.isDismissed }
          : slide
      );
    }),
    ...mainslides,
  };
};

export const applySetChaptersViaSlideId = (state: CourseState, slideId: number): void => {
  if (state.selected < 0 || (state.chapters && state.chapters.length > 0)) return;
  const selectedBanner = state.banners[state.selected];
  if (!selectedBanner) return;
  const selectedContent = state.content.find((group) => group[0]?.bannerId === selectedBanner.id);
  if (!selectedContent) return;
  const matchedSlideGroupItem = Object.values(selectedContent).find(
    (item): item is SlideGroupItem => isSlideGroupItem(item) && item.id === slideId
  );
  if (!matchedSlideGroupItem) return;
  state.chapters = getCoverCouplingIndexes(
    state.couplings,
    selectedBanner.id,
    matchedSlideGroupItem.id
  );
};

export const applySetChaptersViaPennantId = (state: CourseState, pennantId: number): void => {
  if (state.selected < 0) return;
  const selectedBanner = state.banners[state.selected];
  if (!selectedBanner) return;
  const pennant = selectedBanner.pennants?.find((p) => p.id === pennantId);
  if (!pennant) return;
  const selectedContent = state.content.find((group) => group[0]?.bannerId === selectedBanner.id);
  if (!selectedContent) return;
  const matched = getSlideGroupItemForPennantChapterCoupling(selectedContent, pennant);
  if (!matched) return;
  const c = getCoverCouplingIndexes(state.couplings, selectedBanner.id, matched.id);
  if (c.length === 0) return;
  state.chapters = c;
};

export const applySetCourses = (state: CourseState, payload: SetCoursesPayload): void => {
  const { banners: newBanners = [], content: newContent = [] } = payload;
  const mergedBanners = [...newBanners, ...state.banners].reduce((prev, cur) => {
    const id = courseBannerDedupKey(cur);
    const curPennants = prev[id]?.pennants;
    prev[id] =
      curPennants === undefined
        ? cur
        : {
            ...cur,
            pennants: mergePennants({
              pennants: curPennants,
              newPennants: cur.pennants,
            }) as Pennant[],
          };
    return prev;
  }, {} as Record<string, Banner>);

  const stateBanner = contiguousOrdinalBannersPred(
    Object.values(mergedBanners).sort(orderPredicate)
  ) as Banner[];
  state.noCourses = stateBanner.length === 0;
  state.banners = stateBanner;
  if (newContent.length > 0) {
    const newContentState = mergeSlideshows(newContent, state.content).map(sorterCourse);
    state.couplings = getSlideIndeces(stateBanner, newContentState);
    state.content = newContentState;
  } else state.couplings = getSlideIndeces(stateBanner, state.content);
};

export interface CourseSetSlidesPayload {
  content: SlideItem[][];
}

export const applySetSlides = (state: CourseState, payload: CourseSetSlidesPayload): void => {
  const { content: steps } = payload;
  const slideCovers = state.banners.map(({ pennants }) => pennants).flat();
  if (slideCovers.length > 0) {
    const predicate = ({ bannerId: sifterId, id: filterId }: Pennant) => ({
      ...state.content.find(({ 0: { bannerId } }) => sifterId === bannerId)!,
      slides: steps.filter(({ 0: { bannerId } }) => bannerId === filterId),
    });
    const newContent = slideCovers.map(predicate);
    const newContentState = mergeSlideshows(newContent, state.content);
    state.couplings = getSlideIndeces(state.banners, newContentState);
    state.content = newContentState;
  }
};

export interface CourseHighlightSlideBreathSelectionPayload {
  ids: number[];
  slideIndex?: number;
  isHighlighted?: boolean;
}

export const applyHighlightSlideBreathSelection = (
  state: CourseState,
  { ids, slideIndex, isHighlighted }: CourseHighlightSlideBreathSelectionPayload
): void => {
  const pennantIds: number[] = [];
  const { content, banners, selected } = state;
  if (selected === -1)
    pennantIds.push(...banners.map(({ pennants }) => pennants).flat().map(({ id }) => id));
  else pennantIds.push(...banners[selected]?.pennants?.map(({ id }: Pennant) => id));
  const predicate = ({ slides }: SlideGroup, index: number) => ({
    isMatch: slides.find((slide: SlideItem[]) =>
      slide.find(({ bannerId }: SlideItem) => pennantIds.includes(bannerId))
    ),
    index,
  });
  const contIndeces = content
    .map(predicate)
    .filter(({ isMatch }) => isMatch)
    .map(({ index }) => index);
  for (let i = 0; i < content.length; i++) {
    const contIndex = contIndeces.find((x) => x === i);
    if (contIndex === undefined) continue;
    const { slides, ...mainslides } = content[contIndex];
    content[contIndex] = {
      slides: slides.map((slideRow: SlideItem[], index: number) => {
        return index === (slideIndex ?? index)
          ? slideRow.map((slide: SlideItem) => {
              return ids.includes(slide.id)
                ? {
                    ...slide,
                    isHighlighted: isHighlighted ?? !slide.isHighlighted,
                  }
                : slide;
            })
          : slideRow;
      }),
      ...mainslides,
    };
  }
};

export interface CourseHighlightCoversBreathSelectionPayload {
  ids: number[];
  isHighlighted?: boolean;
}

export const applyHighlightCoversBreathSelection = (
  state: CourseState,
  { ids, isHighlighted }: CourseHighlightCoversBreathSelectionPayload
): void => {
  const bannerIds =
    state.selected === -1 ? state.banners.map(({ id }) => id) : [state.banners[state.selected]?.id];

  state.content = state.content.map((group) => {
    if (!bannerIds.includes(group[0]?.bannerId)) return group;

    const { slides, ...mainslides } = group;
    const updatedMainslides = Object.entries(mainslides).reduce(
      (acc, [key, value]) => {
        if (typeof value === "object" && value !== null && "id" in value) {
          acc[key] = ids.includes(value.id)
            ? {
                ...value,
                isHighlighted: isHighlighted ?? !value.isHighlighted,
              }
            : value;
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as { [x: number]: SlideGroupItem }
    );

    return {
      ...updatedMainslides,
      slides,
    };
  });
};

export const applyUpdateSteps = (state: CourseState, payload: UpdatePayload[]): void => {
  const { content } = state;
  const nState = content.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") {
          const predicate = (row: SlideItem) => ({
            ...row,
            ...textsMerger(payload)(row),
          });
          const mapped = (row as SlideItem[][]).map((rows: SlideItem[]) => rows.map(predicate));
          return [key, mapped];
        }
        const updates = textsMerger(payload)(row as SlideGroupItem);
        return [key, { ...row, ...updates }];
      })
      .reduce(
        (prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }),
        {} as SlideGroup
      )
  );
  state.content = nState;
};

export const applyCreateSteps = (state: CourseState, payload: string[]): void => {
  const { content } = state;
  const nState = content.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") {
          const predicate = (row: SlideItem) => idsMerger(payload, "id")(row);
          const mapped = (row as SlideItem[][]).map((rows: SlideItem[]) => rows.map(predicate));
          return [key, mapped];
        }
        const updates = idsMerger(payload, "id")(row as SlideGroupItem);
        return [key, { ...row, ...updates }];
      })
      .reduce(
        (prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }),
        {} as SlideGroup
      )
  );
  state.content = nState;
  state.couplings = getSlideIndeces(state.banners, nState);
};

export const applyCreateTutorials = (state: CourseState, payload: string[]): void => {
  const { banners, content } = state;
  const nState = banners.map(({ pennants, ...fields }: Banner) => ({
    pennants: pennants.map(idsMerger(payload, "id")),
    ...fields,
  }));
  const nState0 = content.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") {
          const predicate = (row: SlideItem) => idsMerger(payload, "bannerId")(row);
          const mapped = (row as SlideItem[][]).map((rows: SlideItem[]) => rows.map(predicate));
          return [key, mapped];
        } else return [key, row];
      })
      .reduce(
        (prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }),
        {} as SlideGroup
      )
  );
  state.banners = nState;
  state.content = nState0;
  state.couplings = getSlideIndeces(nState, nState0);
};

export const applyCreateCourses = (state: CourseState, payload: string[]): void => {
  const { banners, content } = state;
  const nState = banners.map((item) => idsMerger(payload, "id")(item));
  const nState0 = nState.map((item) => idsMerger(payload, "sifterId")(item));
  const nState1 = nState0.map((item) => {
    const { pennants, ...fields } = item;
    return {
      ...fields,
      pennants: pennants.map((pennant) => idsMerger(payload, "bannerId")(pennant)),
    };
  });
  const nState2 = content.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") return [key, row];
        const updates = idsMerger(payload, "bannerId")(row as SlideGroupItem);
        return [key, { ...row, ...updates }];
      })
      .reduce(
        (prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }),
        {} as SlideGroup
      )
  );
  state.banners = nState1;
  state.content = nState2;
  state.couplings = getSlideIndeces(nState1, nState2);
};

export type PersistStepsPayload = { id: string; modified: boolean }[];

export const applyPersistSteps = (state: CourseState, payload: PersistStepsPayload): void => {
  const { content } = state;
  const finalized = payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
  const nState = content.map((steps: SlideGroup) =>
    Object.entries(steps)
      .map(([key, row]: [string, SlideGroupItem | SlideItem[][]]) => {
        if (key === "slides") {
          const predicate = (row: SlideItem) => ({
            ...row,
            ...textsMerger(finalized)(row),
          });
          const mapped = (row as SlideItem[][]).map((rows: SlideItem[]) => rows.map(predicate));
          return [key, mapped];
        }
        const updates = textsMerger(finalized)(row as SlideGroupItem);
        return [key, { ...row, ...updates }];
      })
      .reduce(
        (prev: SlideGroup, [key, value]) => ({ ...prev, [key as keyof SlideGroup]: value }),
        {} as SlideGroup
      )
  );
  state.content = nState;
};

export const applyUpdateCoversOrdinals = (state: CourseState, payload: OrdinalUpdate[]): void => {
  const { content } = state;
  const nState = content.map(({ slides, ...fields }: SlideGroup) => {
    const updatedFields = Object.entries(fields).reduce(
      (acc, [key, value]) => {
        if (typeof value === "object" && value !== null && "ordinal" in value)
          acc[key] = ordinalsUpdator(payload, true)(value);
        else acc[key] = value;
        return acc;
      },
      {} as { [x: number]: SlideGroupItem }
    );

    return {
      ...updatedFields,
      slides,
    };
  });
  state.content = nState;
  state.couplings = getSlideIndeces(state.banners, nState);
};

export const applyUpdateCoversMetadata = (state: CourseState, payload: MetadataUpdate[]): void => {
  const { content } = state;
  const nState = content.map(({ slides, ...fields }: SlideGroup) => {
    const updatedFields = Object.entries(fields).reduce(
      (acc, [key, value]) => {
        if (typeof value === "object" && value !== null && "ordinal" in value)
          acc[key] = metadataUpdator(payload, true)(value);
        else acc[key] = value;
        return acc;
      },
      {} as { [x: number]: SlideGroupItem }
    );

    return {
      ...updatedFields,
      slides,
    };
  });
  state.content = nState;
  state.couplings = getSlideIndeces(state.banners, nState);
};

const applyUpdateCoversOwnership = (state: CourseState, idSet: Set<number>, owner: boolean): void => {
  state.content = state.content.map(({ slides, ...fields }: SlideGroup) => {
    const updatedFields = Object.entries(fields).reduce(
      (acc, [key, value]) => {
        if (typeof value === "object" && value !== null && "id" in value)
          acc[Number(key)] = ownershipUpdator<SlideGroupItem>(idSet, owner)(value as SlideGroupItem);
        return acc;
      },
      {} as { [x: number]: SlideGroupItem },
    );
    return { ...updatedFields, slides };
  });
  state.couplings = getSlideIndeces(state.banners, state.content);
};

const applyUpdateSlidesOwnership = (state: CourseState, idSet: Set<number>, owner: boolean): void => {
  state.content = state.content.map(({ slides, ...fields }: SlideGroup) => ({
    ...fields,
    slides: slides.map((rows) => rows.map(ownershipUpdator(idSet, owner))),
  }));
};

export const applyUpdateOwnership = (state: CourseState, { ids, owner, route }: OwnershipPayload): void => {
  const idSet = toOwnershipIdSet(ids);
  if (idSet.size === 0) return;

  switch (route.toLowerCase()) {
    case "foundationsifters":
      state.banners = state.banners.map(ownershipUpdator(idSet, owner));
      break;
    case "siftersfilters":
      state.banners = state.banners.map(({ pennants, ...fields }) => ({
        ...fields,
        pennants: pennants.map(ownershipUpdator(idSet, owner)),
      }));
      state.couplings = getSlideIndeces(state.banners, state.content);
      break;
    case "siftersinstructions":
      applyUpdateCoversOwnership(state, idSet, owner);
      break;
    case "filtersinstructions":
      applyUpdateSlidesOwnership(state, idSet, owner);
      break;
  }
};

export interface CourseReOrderSelectionPayload {
  ids: number[];
  direction: boolean;
  groupReorder?: boolean;
}





/** Append skeleton banners/slides from fetch; caller updates couplings and noCourses. */
export const mergeCourseFetchSkeletonsContent = (
  state: CourseState,
  response: { banners?: Banner[]; content?: SlideGroup[] }
): void => {
  const incomingBanners = response.banners;
  const incomingContent = response.content;

  if (incomingBanners) {
    for (const banner of incomingBanners) {
      if (!state.banners.some((b) => courseBannerDedupKey(b) === courseBannerDedupKey(banner))) {
        state.banners.push(banner);
      }
    }
  }

  if (incomingContent) {
    for (const group of incomingContent) {
      for (const key of Object.keys(group)) {
        if (key === 'slides') continue;
        const v = group[key as keyof SlideGroup];
        if (typeof v === 'object' && v !== null && 'id' in v && 'bannerId' in v) {
          const item = v as SlideGroupItem;
          if (courseSlideOrCoverExists(state.content, item.id, item.bannerId)) {
            continue;
          }
          appendCourseSlideGroupItem(state, item);
        }
      }
      const { slides } = group;
      if (slides) {
        for (const row of slides) {
          for (const slide of row) {
            if (courseSlideOrCoverExists(state.content, slide.id, slide.bannerId)) {
              continue;
            }
            appendCourseSlideItem(state, slide);
          }
        }
      }
    }
  }
};

export const applyHighlightPennantDepthSelection = (
  state: CourseState,
  payload: { ids: number[]; isHighlighted?: boolean }
) => {
  const { ids, isHighlighted } = payload;

  const pennantIdsToHighlight = new Set<number>();

  const newState = state.banners.map((banner: Banner) =>
    ids.includes(banner.id)
      ? { ...banner, isHighlighted: isHighlighted ?? !banner.isHighlighted }
      : {
        ...banner,
        pennants: banner.pennants.map((pennant: Pennant) => {
          const shouldHighlightPennant = ids.includes(pennant.id);

          if (shouldHighlightPennant) {
            pennantIdsToHighlight.add(pennant.id);
          }

          return shouldHighlightPennant
            ? {
              ...pennant,
              isHighlighted: isHighlighted ?? !pennant.isHighlighted,
            }
            : pennant;
        }),
      }
  );
  state.banners = newState;

  state.content = state.content.map(group => {
    const { slides, ...mainslides } = group;

    const updatedSlides = slides.map((slideArray: SlideItem[]) =>
      slideArray.map((slide: SlideItem) =>
        pennantIdsToHighlight.has(slide.bannerId)
          ? {
            ...slide,
            isHighlighted: isHighlighted ?? !slide.isHighlighted,
          }
          : slide
      )
    );

    return {
      ...mainslides,
      slides: updatedSlides,
    };
  });
};

export const applyHighlightCourseDepthSelection = (
  state: CourseState,
  payload: { ids: number[]; isHighlighted?: boolean }
) => {
  const { ids, isHighlighted } = payload;
  const bannerIds = state.selected === -1
    ? state.banners.map(({ id }) => id).filter((id) => ids.includes(id))
    : [state.banners[state.selected]?.id];

  const pennantIdsToHighlight = new Set<number>();

  state.banners = state.banners.map((banner: Banner) => {
    const shouldHighlightBanner = bannerIds.includes(banner.id);

    const updatedPennants = shouldHighlightBanner ? banner.pennants.map((pennant: Pennant) => {
      pennantIdsToHighlight.add(pennant.id);
      return { ...pennant, isHighlighted: isHighlighted ?? !pennant.isHighlighted };
    }) : banner.pennants;

    return shouldHighlightBanner
      ? {
        ...banner,
        isHighlighted: isHighlighted ?? !banner.isHighlighted,
        pennants: updatedPennants,
      }
      : {
        ...banner,
        pennants: updatedPennants,
      };
  });

  state.content = state.content.map(group => {
    if (!bannerIds.includes(group[0]?.bannerId)) return group;

    const { slides, ...mainslides } = group;

    const slideIndicesToHighlight = new Set<number>();

    const updatedMainslides = Object.entries(mainslides).reduce((acc, [key, value]) => {
      acc[key] = { ...value, isHighlighted: isHighlighted ?? !value.isHighlighted };
      return acc;
    }, {} as { [x: number]: SlideGroupItem });

    slides.forEach((slideArray: SlideItem[], slideIndex: number) => {
      const hasHighlightedPennantSlide = slideArray.some((slide: SlideItem) =>
        pennantIdsToHighlight.has(slide.bannerId)
      );
      if (hasHighlightedPennantSlide) slideIndicesToHighlight.add(slideIndex);
    });

    const updatedSlides = slides.map((slideArray: SlideItem[], slideIndex: number) =>
      slideIndicesToHighlight.has(slideIndex)
        ? slideArray.map((slide: SlideItem) => ({
          ...slide,
          isHighlighted: isHighlighted ?? !slide.isHighlighted,
        }))
        : slideArray
    );

    return {
      ...updatedMainslides,
      slides: updatedSlides,
    };
  });
};
