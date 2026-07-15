import { Status } from "../components/Core/types";
import { Metadata } from "../components/Core/types";
import type { CourseTrees } from "./controlPanelUtils";
import {
  sorterCourse,
  contiguousOrdinalBannersPred,
  getSlideIndeces,
  mergePennants,
  orderPredicate,
  mergeSlideshows,
  courseBannerDedupKey,
  textsMerger,
  ordinalsUpdator,
  metadataUpdator,
  type CourseCouplings,
} from "./sliceUtils";
import { type MetadataUpdate, type OrdinalUpdate, type UpdatePayload } from "./actions";

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

export interface CourseState {
  /** Nested as courseId → coverId → slide indexes (guards shared cover ids across courses). */
  couplings: CourseCouplings;
  content: SlideGroup[];
  noCourses: boolean;
  banners: Banner[];
  selected: number;
  chapters: number[];
}

export interface SetCoursesPayload {
  TreesId?: number;
  banners: Banner[];
  content: SlideGroup[];
  Trees?: CourseTrees;
}

export const isSlideGroupItem = (item: unknown): item is SlideGroupItem =>
  typeof item === 'object' &&
  item !== null &&
  !Array.isArray(item) &&
  'id' in item &&
  'bannerId' in item &&
  'ordinal' in item;

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
