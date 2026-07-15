import type { Draft } from 'immer';
import { jwtDecode } from 'jwt-decode';
import { UpdatePayload, OrdinalUpdate, MetadataUpdate } from './actions';
import type { Pennant, SlideItem, Banner as CourseBanner, SlideGroupItem, SlideGroup } from './CourseUtils';
import { Quiz, Submition } from './QuizUtils';
import type { Banner, Content } from './TutorialUtils';

// Type definitions
type Mergable = Banner | Content | SlideItem | Pennant | CourseBanner | SlideGroupItem | Quiz | Submition;

// Ordering utilities
export const orderPredicate = <T extends { ordinal: number }>(a: T, b: T): number => a.ordinal - b.ordinal;

/** Dedup key for top-level course banners and quiz question banners (shared course-shaped rows). */
export const courseBannerDedupKey = (banner: { id: number; bannerId?: number | null }): string => {
  const bannerId = banner.bannerId;
  if (bannerId == null || bannerId === 0 || bannerId === banner.id) {
    return String(banner.id);
  }
  return `${banner.id}|${bannerId}`;
};

/** Dedup key for top-level tutorial banners. */
export const tutorialBannerDedupKey = (banner: { id: number }): string => String(banner.id);

// Contiguous ordinal utilities
export const contiguousOrdinalPred = <T extends { ordinal: number; contiguousOrdinal?: number }>(
  row: T,
  index: number,
  array: T[]
): T => {
  if (index === 0) return row;
  const prev = array[index - 1];
  const expectedOrdinal = prev.ordinal + 1;
  return row?.contiguousOrdinal !== expectedOrdinal ? { ...row, contiguousOrdinal: expectedOrdinal } : row;
};

export const contiguousOrdinalBannersPred = <T extends { ordinal: number; contiguousOrdinal?: number }>(
  banners: T[]
): T[] => {
  return banners.reduce((acc, banner, index) => {
    if (index === 0) {
      acc.push(banner);
      return acc;
    }
    const prev = acc[index - 1];
    const expectedOrdinal = prev.ordinal + 1;
    const updatedBanner = banner?.contiguousOrdinal !== expectedOrdinal ? { ...banner, contiguousOrdinal: expectedOrdinal } : banner;
    acc.push(updatedBanner);
    return acc;
  }, [] as T[]);
};

export const contiguousOrdinalQuizzesPred = (quizzes: Quiz[]): Quiz[] => {
  return quizzes.reduce((acc, quiz, index) => {
    if (index === 0) {
      acc.push(quiz);
      return acc;
    }
    const prev = acc[index - 1];
    const expectedOrdinal = prev.ordinal + 1;
    const updatedQuiz = quiz?.contiguousOrdinal !== expectedOrdinal ? { ...quiz, contiguousOrdinal: expectedOrdinal } : quiz;
    acc.push(updatedQuiz);
    return acc;
  }, [] as Quiz[]);
};

export const contiguousOrdinalSlidesPred = (slides: SlideItem[]): SlideItem[] => {
  if (slides.length === 0) return slides;
  return slides.reduce((acc, slide, index) => {
    if (index === 0) {
      acc.push(slide);
      return acc;
    }
    const prev = acc[index - 1];
    const expectedOrdinal = prev.ordinal + 1;
    const updatedSlide = slide?.contiguousOrdinal !== expectedOrdinal ? { ...slide, contiguousOrdinal: expectedOrdinal } : slide;
    acc.push(updatedSlide);
    return acc;
  }, [] as SlideItem[]);
};

export const contiguousOrdinalThumbsPred = (entries: [string, SlideGroupItem][]): [string, SlideGroupItem][] => {
  return entries.reduce((acc, [key, item], index) => {
    if (index === 0) {
      acc.push([key, item]);
      return acc;
    }
    const prev = acc[index - 1][1];
    const expectedOrdinal = prev.ordinal + 1;
    const updatedItem = item?.contiguousOrdinal !== expectedOrdinal ? { ...item, contiguousOrdinal: expectedOrdinal } : item;
    acc.push([key, updatedItem]);
    return acc;
  }, [] as [string, SlideGroupItem][]);
};

export const contiguousOrdinalContentPred = <T extends { ordinal: number; contiguousOrdinal?: number }>(
  content: T[],
  startOffset = 0,
): T[] => {
  return content.reduce((acc, slide, index) => {
    if (index === 0) {
      const first =
        slide?.contiguousOrdinal !== startOffset ? { ...slide, contiguousOrdinal: startOffset } : slide;
      acc.push(first);
      return acc;
    }
    const prev = acc[index - 1];
    const expectedOrdinal = (prev.contiguousOrdinal ?? prev.ordinal) + 1;
    const updatedSlide =
      slide?.contiguousOrdinal !== expectedOrdinal ? { ...slide, contiguousOrdinal: expectedOrdinal } : slide;
    acc.push(updatedSlide);
    return acc;
  }, [] as T[]);
};

// Sorting utilities
export const sortSlides = (slides: SlideItem[]): SlideItem[] => slides.sort((a: SlideItem, b: SlideItem) => a.ordinal - b.ordinal);

export const sorter = <T extends { ordinal: number }>(slides: T[]): T[] => slides.sort((a: T, b: T) => a.ordinal - b.ordinal);

export const sorterCourse = (slideshow: SlideGroup): SlideGroup => {
  const { slides, ...thumbs } = slideshow;
  const orderedSlides = slides.map(sortSlides).map(contiguousOrdinalSlidesPred);
  const orderedThumbs = contiguousOrdinalThumbsPred(
    Object.entries(thumbs)
      .sort(([, a], [, b]) => a.ordinal - b.ordinal)
  );
  return {
    ...Object.fromEntries(orderedThumbs),
    slides: orderedSlides
  };
};

// Merge utilities
export const mergePennants = ({ pennants, newPennants }: { pennants: Pennant[]; newPennants: Pennant[] }): Pennant[] => {
  return contiguousOrdinalBannersPred(
    Object.values(
      [...pennants, ...newPennants].reduce((prev, cur) => {
        prev[cur.id] = cur;
        return prev;
      }, {} as Record<string, Pennant>)
    ).sort(orderPredicate)
  ) as Pennant[];
};

export const mergeSlideshows = (newContent: SlideGroup[], content: SlideGroup[]): SlideGroup[] => {
  const collapseSlidesByPennant = (rows: SlideItem[][]): SlideItem[][] => {
    const out: SlideItem[][] = [];
    const seen = new Set<number>();
    for (const row of rows) {
      const pennantId = row[0]?.bannerId;
      if (pennantId !== undefined) {
        if (seen.has(pennantId)) continue;
        seen.add(pennantId);
      }
      out.push(row);
    }
    return out;
  };

  const newArr: SlideGroup[] = [];
  return [...content, ...newContent].reduce((outerArray, curSlides) => {
    if (outerArray.length === 0) {
      const { slides, ...others } = curSlides;
      outerArray.push({ ...others, slides: collapseSlidesByPennant(slides) });
    } else {
      const predicate = (prevSlides: SlideGroup) => {
        const curItem = curSlides[0];
        const prevItem = prevSlides[0];
        return curItem?.bannerId === prevItem?.bannerId;
      };
      const index = outerArray.findIndex(predicate);
      if (index > -1) {
        const { slides: cSlides, ...cOthers } = curSlides;
        const { slides: pSlides, ...pOthers } = outerArray[index];
        const mergedItems = [...Object.values(pOthers), ...Object.values(cOthers)].reduce(
          (prev: Record<string, SlideGroupItem>, cur: SlideGroupItem) => {
            prev[cur.id] = prev[cur.id]
              ? {
                ...cur,
                isDismissed: prev[cur.id].isDismissed,
                isHighlighted: prev[cur.id].isHighlighted,
              }
              : cur;
            return prev;
          },
          {}
        );
        outerArray[index] = {
          ...Object.values(mergedItems),
          slides: cSlides.length === 0 ? collapseSlidesByPennant(pSlides) : pSlides.length === 0 ? collapseSlidesByPennant(cSlides) : (() => {
            const mergedSlides: SlideItem[][] = [];
            const mergedIndices: number[] = [];
            const seenPennantIds = new Set<number>();
            for (let i = 0; i < pSlides.length; i++) {
              const pSlide = pSlides[i];
              const pennantId = pSlide[0]?.bannerId;
              if (pennantId !== undefined && seenPennantIds.has(pennantId)) continue;
              if (pennantId !== undefined) seenPennantIds.add(pennantId);
              const predicate = (slide: SlideItem[]) =>
                slide[0]?.bannerId === pSlide[0]?.bannerId;
              const cIndex = cSlides.findIndex(predicate);
              if (cIndex > -1) {
                mergedIndices.push(cIndex);
                mergedSlides.push(
                  Object.values(
                    [...pSlide, ...cSlides[cIndex]].reduce((prev: Record<string, SlideItem>, cur: SlideItem) => {
                      prev[cur.id] = cur;
                      return prev;
                    }, {})
                  )
                );
              } else mergedSlides.push(pSlide);
            }
            for (let i = 0; i < cSlides.length; i++) {
              if (mergedIndices.includes(i)) continue;
              const pennantId = cSlides[i][0]?.bannerId;
              if (pennantId !== undefined && seenPennantIds.has(pennantId)) continue;
              if (pennantId !== undefined) seenPennantIds.add(pennantId);
              mergedSlides.push(cSlides[i]);
            }
            return mergedSlides;
          })()
        };
      } else if (Object.keys(curSlides).length > 1) outerArray.push(curSlides);
    }
    return outerArray;
  }, newArr);
};

export const mergeSlides = <T extends { id: number; bannerId?: number; isDismissed?: boolean; isHighlighted?: boolean }>(
  newContent: T[][],
  content: T[][]
): T[][] => {
  return [...content, ...newContent].reduce((outerArray, curSlides) => {
    if (outerArray.length === 0) outerArray.push(curSlides);
    else {
      const predicate = (prevSlides: T[]) =>
        curSlides[0]?.bannerId === prevSlides[0]?.bannerId;
      const index = outerArray.findIndex(predicate);
      if (index > -1)
        outerArray[index] = Object.values(
          [...outerArray[index], ...curSlides].reduce((prev, cur) => {
            prev[cur.id] = prev[cur.id]
              ? {
                ...cur,
                isDismissed: prev[cur.id].isDismissed,
                isHighlighted: prev[cur.id].isHighlighted,
              }
              : cur;
            return prev;
          }, {} as Record<string, T>)
        ) as T[];
      else if (curSlides.length > 0) outerArray.push(curSlides);
    }
    return outerArray;
  }, [] as T[][]);
};

/** Cover → slide-row indexes, nested under course id so shared cover ids across courses do not merge. */
export type CourseCouplings = Record<number, Record<number, number[]>>;

export const getCoverCouplingIndexes = (
  couplings: CourseCouplings,
  courseId: number | undefined,
  coverId: number
): number[] => {
  if (courseId == null) return [];
  return couplings[courseId]?.[coverId] ?? [];
};

// Course-specific utilities
export const getSlideIndeces = (banners: CourseBanner[], content: SlideGroup[]): CourseCouplings => {
  const result: CourseCouplings = {};
  const pennants = banners.map(({ pennants }) => pennants).flat();
  pennants.forEach(pennant => {
    content.forEach(({ slides, ...thumbs }) => {
      const slideGroupItems = Object.values(thumbs);
      for (const slideGroupItem of slideGroupItems) {
        // Same-course guard: pennant.bannerId is the course id; only pair with that course's covers.
        if (slideGroupItem.bannerId === pennant.bannerId) {
          slides.forEach((slideArray, slideIndex) => {
            const match = slideArray.length > 0 ? pennant.id === slideArray[0].bannerId : false;
            if (match && pennant.ordinal === slideGroupItem.ordinal) {
              const courseId = slideGroupItem.bannerId;
              if (!result[courseId]) result[courseId] = {};
              if (!result[courseId][slideGroupItem.id])
                result[courseId][slideGroupItem.id] = [];
              if (!result[courseId][slideGroupItem.id].includes(slideIndex))
                result[courseId][slideGroupItem.id].push(slideIndex);
            }
          });
        }
      }
    });
  });

  return result;
};

// Update utilities
export const finalizer = <T extends Mergable>({ id, modified = false }: { id: number; modified?: boolean }): T => ({
  id,
  edited: modified,
} as T);

const aliases: Record<string, string> = { details: "content", purpose: "quote" };

export const textsMerger = <T extends Mergable>(payload: UpdatePayload[]) => (row: Draft<T>): Draft<T> => {
  const match = payload.find((texts) => texts.id === row.id);
  if (match === undefined) return row;
  const predicate = (key: string) => match[key as keyof UpdatePayload] !== undefined && match[key as keyof UpdatePayload] !== null;
  const updates = Object.keys(match)
    .filter(predicate)
    .reduce((updates: Partial<UpdatePayload>, key) => {
      const alias = aliases[key] ?? key;
      return { ...updates, [alias]: match[key as keyof UpdatePayload] };
    }, {});
  return (updates["edited"] !== undefined && updates["edited"] === false
    ? {
      ...row,
      ...updates,
      sizeInBytes: 0,
    }
    : { ...row, ...updates }) as Draft<T>;
};

// Comms-specific textsMerger with type predicate
export const textsMergerComms = (
  payload: UpdatePayload[],
  isCorrectType: (row: any) => boolean
) => (row: any) => {
  if (!isCorrectType(row)) return row;
  const match = payload.find((texts) => texts.id === row.id);
  if (match === undefined) return row;
  const predicate = (key: string) => match[key] !== undefined && match[key] !== null;
  const aliasesComms = { details: "text", purpose: "text" };
  const updates = Object.keys(match)
    .filter(predicate)
    .reduce((updates: Partial<any>, key) => {
      const alias = aliasesComms[key as keyof typeof aliasesComms] ?? key;
      return { ...updates, [alias]: match[key] };
    }, {});
  return updates["edited"] !== undefined && updates["edited"] === false
    ? {
      ...row,
      ...updates,
      sizeInBytes: 0  ,
    }
    : { ...row, ...updates };
};

export const idsMerger = (payload: string[], idField: string) => <T extends Mergable>(row: Draft<T>): Draft<T> => {
  const ids = payload.map((id) => parseInt(id));
  const i = ids.findIndex((id) => id === row[idField]);
  if (i !== -1 && i % 2 === 0)
    return {
      ...row,
      edited: false,
      [idField]: ids[i + 1],
      sizeInBytes:
        idField === "id" ? 0 : row.sizeInBytes,
    } as Draft<T>;
  else return row;
};

// Comms-specific idsMerger with type predicate
export const idsMergerComms = (
  payload: string[],
  isCorrectType: (row: any) => boolean
) => (row: any) => {
  if (!isCorrectType(row)) return row;
  const ids = payload.map((id) => parseInt(id));
  const i = ids.findIndex((id) => id === row.id);
  if (i !== -1 && i % 2 === 0)
    return {
      ...row,
      id: ids[i + 1],
      modified: false,
      sizeInBytes: 0,
    };
  else return row;
};

export const ordinalsUpdator = <T extends Mergable>(payload: OrdinalUpdate[], hasBannerId: boolean) => (row: Draft<T>): Draft<T> => {
  const match = hasBannerId
    ? payload.find(
      ({ id, bannerIds }) => bannerIds.includes(row.bannerId || 0) && id === row.id
    )
    : payload.find(({ id }) => id === row.id);
  if (match === undefined) return row;
  return { ...row, ordinal: match.ordinal } as Draft<T>;
};

export const metadataUpdator = <T extends Mergable>(payload: MetadataUpdate[], hasBannerId: boolean) => (row: Draft<T>): Draft<T> => {
  const match = hasBannerId
    ? payload.find(
      ({ id, bannerId }) => bannerId === row.bannerId && id === row.id
    )
    : payload.find(({ id }) => id === row.id);
  if (match === undefined) return row;
  return { ...row, ...match } as Draft<T>;
};

export const toOwnershipIdSet = (ids: string[]): Set<number> =>
  new Set(ids.map((id) => parseInt(id, 10)).filter(Number.isFinite));

export const ownershipUpdator = <T extends { id: number; owner?: boolean }>(
  idSet: Set<number>,
  owner: boolean,
) => (row: Draft<T>): Draft<T> =>
  idSet.has(row.id) ? ({ ...row, owner } as Draft<T>) : row;

// Comms-specific utilities
interface DecodedToken {
  userid: number;
  token?: string;
}

export const getToken = (token: string): DecodedToken => {
  let decodeToken: DecodedToken = { userid: -1 };
  try {
    decodeToken = { ...jwtDecode<{ userid: number }>(token ?? ""), token: token };
  } catch (error) {
    console.log(error);
  }
  return decodeToken;
};

