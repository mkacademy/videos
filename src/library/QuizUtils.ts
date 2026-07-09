import { Status } from "../store/slices/actionSlice";
import { Metadata } from "../components/Core/types";
import type { QuizTrees } from "./controlPanelUtils";
import type {
  Banner,
  CourseModifiedOrdinals,
  CourseState,
  Pennant,
  SlideGroup,
  SlideGroupItem,
  SlideItem,
  CourseStartId,
} from "./CourseUtils";
import { createCourseStartIdInitial } from "./CourseUtils";
import { applyUpdateOwnership as applyCourseUpdateOwnership } from "./CourseUtils";
import courseReducer from "../store/slices/courseSlice";
import {
  contiguousOrdinalBannersPred,
  contiguousOrdinalQuizzesPred,
  courseBannerDedupKey,
  idsMerger,
  mergePennants,
  orderPredicate,
  sorter,
  textsMerger,
  ownershipUpdator,
  toOwnershipIdSet,
} from "./sliceUtils";
import {
  altGroupRangeReorderSegment,
  applyOrdinalRangeReorder,
  assignDenseOrdinalsZeroBased,
  findContiguousSortedRange,
  mergeGloballySortedWithAltGroupSegment,
  ordinalForReorder,
} from "./TutorialUtils";
import { getAttempts, getFocuses } from "./quizAttemptManager";
import type { OwnershipPayload } from "./actions";
import type { RandomizedType } from "./randomizedQuery";

export interface Submition {
  id: number;
  sender?: string;
  isDismissed: boolean;
  isHighlighted: boolean;
  quote: string;
  title: string;
  sizeInBytes: number;
  bannerId: number;
  ordinal: number;
  owner: boolean;
  purpose?: string;
  filter?: string;
  filterId?: number;
  status: Status | number;
  contiguousOrdinal?: number;
  descendentsSums?: Record<string, number>;
  metadata?: Metadata;
  modified?: boolean;
  edited?: boolean;
}

export interface Attempt {
  [key: string]: null | string | undefined;
}

export interface Quiz {
  id: number;
  sender?: string;
  bannerId?: number;
  owner: boolean;
  title: string;
  quote: string;
  ordinal: number;
  edited?: boolean;
  modified?: boolean;
  metadata?: Metadata;
  sizeInBytes: number;
  isDismissed: boolean;
  dashboardId?: number;
  pennants: Submition[];
  isHighlighted: boolean;
  status: Status | number;
  contiguousOrdinal?: number;
  descendentsSums?: Record<string, number>;
}

/** Shift+range anchors: quiz-native lanes plus course highlighter lanes reused on quiz (see UiuxManager `highlighters`). */
export type QuizStartId = {
  quizBreath: number | null;
  quizDepth: number | null;
  attemptBreath: number | string | null;
  questionBreath: number | null;
  questionDepth: number | null;
} & CourseStartId;

export const createQuizStartIdInitial = (): QuizStartId => ({
  ...createCourseStartIdInitial(),
  quizBreath: null,
  quizDepth: null,
  attemptBreath: null,
  questionBreath: null,
  questionDepth: null,
});

export interface QuizState {
  selected: number;
  noQuizzes: boolean;
  focus: Record<string, boolean>;
  attempt: { [x: string]: Attempt };
  combinations: string[][][];
  followupId: number | undefined;
  followupCombinations: Record<number, string[][]>;
  /** Banner ids with a green bottom o, keyed by that o's color route. */
  routeToggleGreenIds: Record<string, number[]>;
  routeToggleOrangeMarks: {
    bannerId: number;
    view: 'question' | 'followup';
    side: 'left' | 'right';
  }[];
  /** Side (left/right) selected on last fresh activation; drives global white/orange layout. */
  routeTogglePrimarySide: 'left' | 'right' | null;
  content: SlideGroup[];
  banners: Banner[];
  quizzes: Quiz[];
  startId: QuizStartId;
  modifiedOrdinals: CourseModifiedOrdinals;
}

export interface dismissOptionPayload {
  choice: Record<string, Attempt>;
}

export interface dismissFollowupOptionPayload {
  choice: Record<string, Attempt>;
}

export interface dismissChoicePayload {
  choice?: Record<string, Attempt>;
  isDismissed?: boolean;
}

export interface dismissQuestionPayload {
  ids: number[];
  isShow?: boolean;
  isDismissed?: boolean;
}

export interface dismissFollowupPayload {
  ids: number[];
  isShow?: boolean;
  isDismissed?: boolean;
}

/** Dismisses a quiz root and all banners/content under it (quiz grid / selected === -1). */
export interface dismissQuizPayload {
  ids: number[];
  isShow?: boolean;
  isDismissed?: boolean;
}

export interface dismissAttemptPayload {
  ids: number[];
  isShow?: boolean;
  isDismissed?: boolean;
}

export interface SetQuizzesPayload {
  quizzes: Quiz[];
  TreesId?: number;
  Trees?: QuizTrees;
  banners?: Banner[];
  content?: SlideGroup[];
}

/** Matches erasePayload fields used by quiz clearSelected branches. */
export interface QuizClearSelectedErasePayload {
  Ids?: number[] | string[];
  IDs?: number[];
  route?: string;
  isShow: boolean;
}

export interface ProcessedOption {
  id: string;
  value: string;
}

const predicate0 = (item: SlideItem | SlideGroupItem) => ({
  id: item.id,
  content: item.content,
  imageurl: item.imageurl,
});

const predicate1 = (arr: SlideItem[]) => arr.map(predicate0);

const toProcessedOptions = (items: Array<{ id: number; content: string; imageurl: string }>): ProcessedOption[] => {
  return items.reduce<ProcessedOption[]>((prev, cur) => {
    const { id, content, imageurl } = cur;
    prev.push({ id: id + "c", value: content });
    prev.push({ id: id + "i", value: imageurl });
    return prev;
  }, []);
};

export const getOptionsFromSlideGroup = (slideGroup: SlideGroup | undefined = { slides: [] }): ProcessedOption[] => {
  const { slides = [], ...thumbs } = slideGroup;
  const thumbView = Object.values(thumbs).map((item) => predicate0(item));
  const slideView = slides.map(predicate1).flat();
  return toProcessedOptions([...thumbView, ...slideView]);
};

export const getOptionsFromSlideItems = (slideItems: SlideItem[] = []): ProcessedOption[] => {
  const items = slideItems.map(predicate0);
  return toProcessedOptions(items);
};

export const getOptions = getOptionsFromSlideGroup;

export const getCombination = (content: SlideGroup[] = []) =>
  content.map((slideGroup) => {
    const { slides = [], ...thumbs } = slideGroup;
    // slides are intentionally ignored; combinations are based only on thumb items
    slides;
    const thumbIds = Object.values(thumbs).map(({ id }) => id);
    const preProccessed = thumbIds.reduce((prev: string[], cur: number) => {
      prev.push(cur + "c");
      prev.push(cur + "i");
      return prev;
    }, []);
    // Generate approximately 1000 unique combinations of 4 IDs, only if the number of IDs is greater than 4
    return preProccessed.length > 4 ? generateUniqueCombinations(preProccessed, 4, 1000) : [preProccessed];
  });

const filterOptionIdForRandomizedType = (id: string, randomizedType: RandomizedType): boolean => {
  if (randomizedType === 'both') return true;
  const suffix = randomizedType === 'Imageurls' ? 'i' : 'c';
  return id.endsWith(suffix);
};

export const filterCombinationsForRandomizedType = (
  combinations: string[][],
  randomizedType: RandomizedType,
): string[][] => {
  if (randomizedType === 'both') return combinations;
  return combinations
    .map((combo) => combo.filter((id) => filterOptionIdForRandomizedType(id, randomizedType)))
    .filter((combo) => combo.length > 0);
};

export const computeRanCombs = (
  combinations: string[][],
  randomizedType: RandomizedType,
  submittedOptionIds: string[],
  attemptOptionId: string | null | undefined,
): number[] => {
  const displayCombinations = filterCombinationsForRandomizedType(combinations, randomizedType);
  if (displayCombinations.length === 0) return [];

  const targetCount = Math.min(3, displayCombinations.length);

  const submittedSet = new Set(submittedOptionIds);
  const hasSubmission = submittedSet.size > 0;
  const matchingIndices = hasSubmission
    ? displayCombinations
      .map((combo, i) => (combo.some((id) => submittedSet.has(id)) ? i : -1))
      .filter((i) => i >= 0)
    : [];

  const randoms: number[] = [];
  if (matchingIndices.length > 0) {
    const attemptFirstIndex =
      attemptOptionId != null && attemptOptionId !== ''
        ? displayCombinations.findIndex((combo) => combo.includes(attemptOptionId))
        : -1;
    const firstIndex =
      attemptFirstIndex >= 0
        ? attemptFirstIndex
        : matchingIndices[(Math.random() * matchingIndices.length) | 0];
    randoms.push(firstIndex);
  }

  while (randoms.length < targetCount) {
    const pick = (Math.random() * displayCombinations.length) | 0;
    if (!randoms.includes(pick)) randoms.push(pick);
  }

  return randoms;
};

/** Combinations from slide item ids (content + image option pairs), same rules as thumb-based getCombination. */
export const getCombinationFromSlideItems = (items: SlideItem[] = []): string[][] => {
  const preProccessed = items.reduce((prev: string[], cur: SlideItem) => {
    prev.push(cur.id + "c");
    prev.push(cur.id + "i");
    return prev;
  }, []);
  return preProccessed.length > 4 ? generateUniqueCombinations(preProccessed, 4, 1000) : [preProccessed];
};

/**
 * Efficiently generates unique combinations of specified length from an array
 * @param arr - Array of elements to combine
 * @param combinationLength - Length of each combination (default 4)
 * @param maxCombinations - Maximum number of combinations to generate (default 1000)
 * @returns Array of unique combinations
 */
function generateUniqueCombinations<T>(arr: T[], combinationLength: number = 4, maxCombinations: number = 1000): T[][] {
  if (arr.length < combinationLength) {
    return []; // Not enough elements to create combinations
  }

  const combinations = new Set<string>();
  const result: T[][] = [];
  const maxAttempts = maxCombinations * 10; // Prevent infinite loops
  let attempts = 0;

  // Helper function to create a unique key for a combination
  const createKey = (combo: T[]) => [...combo].sort().join('|');

  // First, try systematic generation for better coverage
  const systematicCombinations = generateSystematicCombinations(arr, combinationLength, Math.min(maxCombinations, 500));
  for (const combo of systematicCombinations) {
    const key = createKey(combo);
    if (!combinations.has(key)) {
      combinations.add(key);
      result.push(combo);
      if (result.length >= maxCombinations) break;
    }
  }

  // If we need more combinations, use random sampling
  while (result.length < maxCombinations && attempts < maxAttempts) {
    attempts++;
    const randomCombo = generateRandomCombination(arr, combinationLength);
    const key = createKey(randomCombo);

    if (!combinations.has(key)) {
      combinations.add(key);
      result.push(randomCombo);
    }
  }

  return result;
}

/**
 * Generates combinations systematically using a more efficient approach
 */
function generateSystematicCombinations<T>(arr: T[], length: number, maxCount: number): T[][] {
  const result: T[][] = [];
  const n = arr.length;

  // Use a more efficient systematic approach
  const indices = Array.from({ length }, (_, i) => i);

  // Generate combinations using iterative approach
  const stack: number[][] = [indices];

  while (stack.length > 0 && result.length < maxCount) {
    const current = stack.pop()!;
    result.push(current.map(i => arr[i]));

    // Generate next combination
    for (let i = length - 1; i >= 0; i--) {
      if (current[i] < n - length + i) {
        const next = [...current];
        next[i]++;
        for (let j = i + 1; j < length; j++) {
          next[j] = next[j - 1] + 1;
        }
        if (next[length - 1] < n) {
          stack.push(next);
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Generates a random combination of specified length
 */
function generateRandomCombination<T>(arr: T[], length: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, length);
}

export const courseSlideOrCoverExists = (
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

export const appendCourseSlideItem = (state: Pick<QuizState, 'banners' | 'content'>, slide: SlideItem) => {
  const groupIndex = state.content.findIndex((g) =>
    g.slides?.some((row) => row[0]?.bannerId === slide.bannerId)
  );
  if (groupIndex > -1) {
    const grp = state.content[groupIndex];
    const rowIdx = grp.slides.findIndex((row) => row[0]?.bannerId === slide.bannerId);
    if (rowIdx > -1) {
      grp.slides[rowIdx].push(slide);
    } else {
      grp.slides.push([slide]);
    }
  } else {
    state.content.push({ slides: [[slide]] } as SlideGroup);
  }
};

export const recomputeFollowupCombinations = (state: QuizState) => {
  if (state.followupId === undefined) {
    state.followupCombinations = {};
    return;
  }
  const parent = state.banners.find((b) => b.id === state.followupId);
  if (!parent) {
    state.followupCombinations = {};
    return;
  }
  const allSlides: SlideItem[] = [];
  for (const group of state.content) {
    if (!group.slides) continue;
    for (const row of group.slides) {
      for (const slide of row) {
        allSlides.push(slide);
      }
    }
  }
  const next: Record<number, string[][]> = {};
  for (const pennant of parent.pennants ?? []) {
    const collected = allSlides.filter((s) => s.bannerId === pennant.id);
    next[pennant.id] = getCombinationFromSlideItems(collected);
  }
  state.followupCombinations = next;
};

export const appendCourseSlideGroupItem = (state: Pick<QuizState, 'banners' | 'content'>, item: SlideGroupItem) => {
  const groupIndex = state.content.findIndex(
    (g) =>
      ((g[0] as SlideGroupItem | undefined)?.bannerId === item.bannerId) ||
      g.slides?.some((row) => row[0]?.bannerId === item.bannerId)
  );
  if (groupIndex > -1) {
    const grp = state.content[groupIndex];
    const keys = Object.keys(grp)
      .filter((k) => k !== 'slides')
      .map(Number)
      .filter(Number.isFinite);
    const nextKey = keys.length ? Math.max(...keys) + 1 : 0;
    (grp as Record<number, SlideGroupItem | SlideItem[][]>)[nextKey] = item;
  } else {
    state.content.push({ 0: item, slides: [] } as SlideGroup);
  }
};

/** Merge attempt and set SlideGroupItem isDismissed from choice keys (e.g. choice7 → bannerId 7). */
export const applyDismissOption = (state: QuizState, choice: Record<string, Attempt>) => {
  state.attempt = { ...state.attempt, ...choice };
  const bannerIdsFromChoice = new Set(
    Object.keys(choice)
      .map((k) => parseInt(k.replace(/^choice/, ''), 10))
      .filter((n) => !Number.isNaN(n))
  );
  const slideGroupItemIdsToDismiss = new Set<number>();
  for (const key of Object.keys(choice)) {
    const attemptForBanner = choice[key];
    const value = attemptForBanner?.[key];
    if (value != null && typeof value === 'string') {
      const slideGroupItemId = parseInt(value, 10);
      if (!Number.isNaN(slideGroupItemId)) {
        slideGroupItemIdsToDismiss.add(slideGroupItemId);
      }
    }
  }
  if (bannerIdsFromChoice.size === 0) return;
  state.content = state.content.map((group) => {
    const { slides, ...rest } = group;
    const updatedRest = Object.entries(rest).reduce(
      (acc, [key, value]) => {
        const item = value as SlideGroupItem;
        if (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          'isDismissed' in item &&
          'bannerId' in item &&
          bannerIdsFromChoice.has(item.bannerId)
        ) {
          acc[key as unknown as number] = {
            ...item,
            isDismissed: slideGroupItemIdsToDismiss.has(item.id),
          };
        } else {
          acc[key as unknown as number] = item;
        }
        return acc;
      },
      {} as { [x: number]: SlideGroupItem }
    );
    return { ...updatedRest, slides } as SlideGroup;
  });
};

/** Apply followup-option dismiss via course dismissSlide using followupId as selected banner. */
export const applyDismissFollowupOption = (state: QuizState, choice: Record<string, Attempt>) => {
  state.attempt = { ...state.attempt, ...choice };
  const followupIndex = state.banners.findIndex((banner) => banner.id === state.followupId);
  if (followupIndex < 0) return;
  const selectedBanner = state.banners[followupIndex];
  if (!selectedBanner) return;

  const pennantIdsFromChoice = new Set(
    Object.keys(choice)
      .map((k) => parseInt(k.replace(/^choice/, ''), 10))
      .filter((n) => !Number.isNaN(n))
  );
  if (pennantIdsFromChoice.size === 0) return;

  const selectedSlideItemIds = new Set<number>();
  for (const key of Object.keys(choice)) {
    const attemptForBanner = choice[key];
    const value = attemptForBanner?.[key];
    if (value != null && typeof value === 'string') {
      const slideItemId = parseInt(value, 10);
      if (!Number.isNaN(slideItemId)) selectedSlideItemIds.add(slideItemId);
    }
  }

  const group = state.content.find((contentGroup) => contentGroup[0]?.bannerId === selectedBanner.id);
  if (!group?.slides) return;

  const allItems: { id: number; slideIndex: number }[] = [];
  const selectedItems: { id: number; slideIndex: number }[] = [];
  group.slides.forEach((row, slideIndex) => {
    row.forEach((slide: SlideItem) => {
      if (!pennantIdsFromChoice.has(slide.bannerId)) return;
      const item = { id: slide.id, slideIndex };
      allItems.push(item);
      if (selectedSlideItemIds.has(slide.id)) selectedItems.push(item);
    });
  });
  if (allItems.length === 0) return;

  const resetAction = {
    type: 'course/dismissSlide',
    payload: { items: allItems, isDismissed: false },
  };
  const selectAction = {
    type: 'course/dismissSlide',
    payload: { items: selectedItems, isDismissed: true },
  };
  const courseState: CourseState = {
    content: state.content,
    banners: state.banners,
    selected: followupIndex,
    chapters: [],
    couplings: {},
    noCourses: true,
    startId: createCourseStartIdInitial(),
    modifiedOrdinals: state.modifiedOrdinals,
  };
  const resetResult = courseReducer(courseState, resetAction);
  const selectResult = courseReducer(resetResult, selectAction);
  state.content = selectResult.content;
  state.modifiedOrdinals = selectResult.modifiedOrdinals;
};

/** Dismiss question flow; branches to dismissChapter when selected quiz has followupId context. */
export const applyDismissQuestion = (state: QuizState, payload: dismissQuestionPayload) => {
  const { selected, banners, quizzes, followupId } = state;
  if (selected <= -1) return;
  const { ids, isShow, isDismissed } = payload;
  if (ids.length === 0) return;
  if (followupId !== undefined) {
    const followupIndex = banners.findIndex((banner) => banner.id === followupId);
    if (followupIndex < 0) return;
    const courseAction = {
      type: 'course/dismissChapter',
      payload: { ids, isDismissed },
    };
    const courseState: CourseState = {
      content: state.content,
      banners: state.banners,
      selected: followupIndex,
      chapters: [],
      couplings: {},
      noCourses: true,
      startId: createCourseStartIdInitial(),
      modifiedOrdinals: state.modifiedOrdinals,
    };
    const result = courseReducer(courseState, courseAction);
    state.banners = result.banners;
    state.content = result.content;
    state.modifiedOrdinals = result.modifiedOrdinals;
    return;
  }
  const quiz = quizzes[selected];
  const predicate = (banner: Banner) => banner.bannerId === quiz?.id;
  const group = banners.filter(predicate).map((b) => b.id);
  const idSet = new Set(ids);
  const dismissedQuestionIds = banners
    .filter((question) => idSet.has(question.id) && group.includes(question.id))
    .map((question) => question.id);
  const courseAction = {
    type: 'course/dismissCourse',
    payload: { ids: dismissedQuestionIds, isShow, isDismissed },
  };
  const courseState: CourseState = {
    content: state.content,
    banners: state.banners,
    selected: -1,
    chapters: [],
    couplings: {},
    noCourses: true,
    startId: createCourseStartIdInitial(),
    modifiedOrdinals: state.modifiedOrdinals,
  };
  const result = courseReducer(courseState, courseAction);
  state.banners = result.banners;
  state.content = result.content;
  state.modifiedOrdinals = result.modifiedOrdinals;
};

export const applyUpdateOwnership = (state: QuizState, payload: OwnershipPayload): void => {
  const idSet = toOwnershipIdSet(payload.ids);
  if (idSet.size === 0) return;

  switch (payload.route.toLowerCase()) {
    case "foundationdashboards":
      state.quizzes = state.quizzes.map(ownershipUpdator(idSet, payload.owner));
      break;
    case "dashboardssifters":
      state.banners = state.banners.map(ownershipUpdator(idSet, payload.owner));
      break;
    case "dashboardsfilters":
      state.quizzes = state.quizzes.map(({ pennants, ...fields }) => ({
        ...fields,
        pennants: pennants.map(ownershipUpdator(idSet, payload.owner)),
      }));
      break;
    case "siftersfilters":
    case "siftersinstructions":
    case "filtersinstructions": {
      const courseState: CourseState = {
        content: state.content,
        banners: state.banners,
        selected: -1,
        chapters: [],
        couplings: {},
        noCourses: true,
        startId: createCourseStartIdInitial(),
        modifiedOrdinals: state.modifiedOrdinals,
      };
      applyCourseUpdateOwnership(courseState, payload);
      state.banners = courseState.banners;
      state.content = courseState.content;
      break;
    }
  }
};

/** Apply course slice reducer to quiz slice's course-shaped fields (content, banners). */
export const applyCourseReducer = (
  state: QuizState,
  action: { type: string; payload?: unknown }
): { banners?: Banner[]; content?: SlideGroup[] } => {
  const courseState: CourseState = {
    content: state.content,
    banners: state.banners,
    selected: -1,
    chapters: [],
    couplings: {},
    noCourses: true,
    startId: createCourseStartIdInitial(),
    modifiedOrdinals: state.modifiedOrdinals,
  };
  const result = courseReducer(courseState, action);
  state.modifiedOrdinals = result.modifiedOrdinals;
  return {
    banners: result.banners,
    content: result.content,
  };
};

const quizSliceCourseState = (
  content: SlideGroup[],
  banners: Banner[],
  selected: number,
  modifiedOrdinals: CourseModifiedOrdinals,
): CourseState => ({
  content,
  banners,
  noCourses: true,
  chapters: [],
  couplings: {},
  selected,
  startId: createCourseStartIdInitial(),
  modifiedOrdinals,
});

export const applySetQuizzes = (state: QuizState, payload: SetQuizzesPayload) => {
  const { quizzes: newQuizzes = [], content: newContent = [], banners: newBanners = [] } = payload;
  const newQuizzesState = contiguousOrdinalQuizzesPred(
    Object.values(
      [...state.quizzes, ...newQuizzes].reduce((prev, cur) => {
        const curPennants = prev[cur.id]?.pennants;
        prev[cur.id] = curPennants === undefined
          ? cur
          : {
            ...cur,
            pennants: mergePennants({
              pennants: curPennants as Pennant[],
              newPennants: cur.pennants as Pennant[],
            }) as Submition[],
          };
        return prev;
      }, {} as Record<string, Quiz>)
    ).sort(orderPredicate)
  );

  const newNoQuizzes = !state.quizzes.length ? newQuizzesState.length === 0 : state.noQuizzes;
  const courseAction = { type: 'course/setCourses', payload: { content: newContent, banners: newBanners } };
  const courseResult = courseReducer(
    quizSliceCourseState(state.content, state.banners, -1, state.modifiedOrdinals),
    courseAction,
  );
  const { banners, content } = courseResult;
  state.modifiedOrdinals = courseResult.modifiedOrdinals;
  state.banners = banners;
  if (newContent?.length > 0) {
    state.content = content;
    state.combinations = getCombination(content);
    recomputeFollowupCombinations(state);
  }

  state.quizzes = newQuizzesState;
  state.noQuizzes = newNoQuizzes;
  state.focus = getFocuses(newQuizzesState);
  state.attempt = getAttempts(newQuizzesState);
};

export const applySetBanners = (state: QuizState, bannersPayload: Banner[]) => {
  const courseAction = { type: 'course/setCourses', payload: { banners: bannersPayload, content: [] } };
  const courseResult = courseReducer(
    quizSliceCourseState(state.content, state.banners, -1, state.modifiedOrdinals),
    courseAction,
  );
  state.modifiedOrdinals = courseResult.modifiedOrdinals;
  state.banners = courseResult.banners;
};

export const applySetFollowupOptions = (state: QuizState, content: SlideItem[][]) => {
  const courseAction = { type: 'course/setSlides', payload: { content } };
  const courseResult = courseReducer(
    quizSliceCourseState(state.content, state.banners, -1, state.modifiedOrdinals),
    courseAction,
  );
  state.modifiedOrdinals = courseResult.modifiedOrdinals;
  state.content = courseResult.content;
  recomputeFollowupCombinations(state);
};

export const applyDismissFollowup = (state: QuizState, payload: dismissFollowupPayload) => {
  const { ids, isDismissed } = payload;
  if (state.followupId === undefined || ids.length === 0) return;
  const followupIndex = state.banners.findIndex((banner) => banner.id === state.followupId);
  if (followupIndex < 0) return;
  const courseAction = {
    type: 'course/dismissChapter',
    payload: { ids, isDismissed },
  };
  const result = courseReducer(
    quizSliceCourseState(state.content, state.banners, followupIndex, state.modifiedOrdinals),
    courseAction,
  );
  state.banners = result.banners;
  state.content = result.content;
  state.modifiedOrdinals = result.modifiedOrdinals;
};

export const applyClearFetched = (state: QuizState, payload: boolean) => {
  const { selected } = state;
  if (selected > -1) {
    const { banners, content, quizzes } = state;
    const quiz = quizzes[selected];
    if (!quiz) return;
    const predicate0 = (banner: Banner) => banner.bannerId !== quiz.id;
    const newBanners = banners.filter(predicate0);
    const predicate1 = (group: SlideGroup) => {
      const firstItem = group[0] as SlideGroupItem | undefined;
      return firstItem && newBanners.find(({ id }) => id === firstItem.bannerId);
    };
    state.banners = newBanners;
    state.content = content.filter(predicate1);
  } else {
    const { quizzes, banners, content } = state;
    const newQuizzes = quizzes.filter(
      ({ isDismissed }) => isDismissed === !payload
    );
    const predicate = (banner: Banner) =>
      newQuizzes.find(({ id }) => id === banner.bannerId);
    const newBanners = banners.filter(predicate);
    const predicate0 = (group: SlideGroup) => {
      const firstItem = group[0] as SlideGroupItem | undefined;
      return firstItem && newBanners.find(({ id }) => id === firstItem.bannerId);
    };
    state.noQuizzes = true;
    state.quizzes = newQuizzes;
    state.banners = newBanners;
    state.content = content.filter(predicate0);
  }
};

export const applyGroupReOrderQuizSelection = (state: QuizState, payload: { ids: number[] }) => {
  const { ids } = payload;
  if (ids.length < 2) return;
  const byId = new Map(state.quizzes.map((q) => [q.id, q]));
  if (!ids.every((id) => byId.has(id))) return;
  const fullSorted = [...state.quizzes].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
  const idSet = new Set(ids);
  const range = findContiguousSortedRange(fullSorted, (q) => idSet.has(q.id), idSet.size);
  if (!range) return;
  const segment = fullSorted.slice(range.lo, range.hi + 1);
  const newSeg = altGroupRangeReorderSegment(segment, (q) => !!q.isHighlighted);
  if (!newSeg) return;
  const newFull = [...fullSorted.slice(0, range.lo), ...newSeg, ...fullSorted.slice(range.hi + 1)];
  assignDenseOrdinalsZeroBased(newFull);
  state.quizzes = contiguousOrdinalQuizzesPred(sorter([...state.quizzes]) as Quiz[]);
  state.focus = getFocuses(state.quizzes);
  state.attempt = getAttempts(state.quizzes);
};

export const applyReOrderQuestionSelection = (
  state: QuizState,
  payload: { ids: number[]; direction: boolean; groupReorder?: boolean },
) => {
  const { ids, direction, groupReorder } = payload;
  if (ids.length < 2) return;

  if (state.selected > -1 && state.followupId !== undefined) {
    const bannerIndex = state.banners.findIndex((b) => b.id === state.followupId);
    if (bannerIndex === -1) return;
    const pennants = state.banners[bannerIndex].pennants;
    if (!ids.every((id) => pennants.some((p) => p.id === id))) return;
    if (groupReorder) {
      const idSet = new Set(ids);
      const fullSorted = [...pennants].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
      const range = findContiguousSortedRange(fullSorted, (p) => idSet.has(p.id), idSet.size);
      if (!range) return;
      const segment = fullSorted.slice(range.lo, range.hi + 1);
      const newSeg = altGroupRangeReorderSegment(segment, (p) => !!p.isHighlighted);
      if (!newSeg) return;
      const newFull = [...fullSorted.slice(0, range.lo), ...newSeg, ...fullSorted.slice(range.hi + 1)];
      assignDenseOrdinalsZeroBased(newFull);
    } else {
      applyOrdinalRangeReorder(pennants, ids, direction, ordinalForReorder);
    }
    sorter(pennants);
    state.banners[bannerIndex].pennants = contiguousOrdinalBannersPred([...pennants]) as Pennant[];
    return;
  }

  const { quizzes, selected, banners } = state;
  const quizIds =
    selected === -1
      ? quizzes.map((q) => q.id)
      : selected > -1 && quizzes[selected]
        ? [quizzes[selected].id]
        : [];
  const pool = banners.filter(
    (b) => typeof b.bannerId === 'number' && quizIds.includes(b.bannerId as number),
  );
  if (!ids.every((id) => pool.some((b) => b.id === id))) return;
  if (groupReorder) {
    const keyStrSet = new Set(ids.map(String));
    const poolSorted = [...pool].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
    const range = findContiguousSortedRange(poolSorted, (b) => keyStrSet.has(String(b.id)), ids.length);
    if (!range) return;
    const segment = poolSorted.slice(range.lo, range.hi + 1);
    const newSeg = altGroupRangeReorderSegment(segment, (b) => !!b.isHighlighted);
    if (!newSeg) return;
    const globalSorted = [...banners].sort((a, b) => ordinalForReorder(a) - ordinalForReorder(b));
    const merged = mergeGloballySortedWithAltGroupSegment(globalSorted, keyStrSet, (b) => String(b.id), newSeg);
    if (!merged) return;
    assignDenseOrdinalsZeroBased(merged);
  } else {
    applyOrdinalRangeReorder(pool, ids, direction, ordinalForReorder);
  }
  state.banners = contiguousOrdinalBannersPred(sorter([...banners]) as Banner[]);
};

export const applyCreateCoursesQuizState = (
  state: QuizState,
  action: { type: string; payload: string[] }
) => {
  const { quizzes } = state;
  const payload = action.payload;
  const nState = quizzes.map((quiz) => idsMerger(payload, 'id')(quiz));
  const nState0 = nState.map((quiz) => idsMerger(payload, 'dashboardId')(quiz));
  const nState1 = nState0.map((item) => {
    const { pennants, ...fields } = item;
    return {
      ...fields,
      pennants: pennants.map((pennant) => idsMerger(payload, 'bannerId')(pennant)),
    } as Quiz;
  });
  state.quizzes = nState1;
  const { banners, content } = applyCourseReducer(state, action);
  if (banners) state.banners = banners;
  if (content) state.content = content;
};

export const applyPersistTutorialsQuizState = (
  state: QuizState,
  action: { type: string; payload: { id: string; modified: boolean }[] }
) => {
  const { quizzes } = state;
  const finalized = action.payload
    .map(({ id, modified }) => ({ id: parseInt(id, 10), modified }))
    .map((item) => ({
      ...item,
      edited: true,
    }));
  const predicate = (pennant: Submition) => ({
    ...pennant,
    ...textsMerger(finalized)(pennant),
  });
  const nState = quizzes.map(({ pennants, ...fields }) => ({
    ...fields,
    pennants: pennants.map(predicate),
  }));
  state.quizzes = nState;
  const { banners } = applyCourseReducer(state, action);
  if (banners) state.banners = banners;
};

export const applyHighlightAttemptBreathSelection = (
  state: QuizState,
  payload: { ids: (number | string)[]; isHighlighted?: boolean; isShow?: boolean },
  getChoices: (args: Partial<Submition>) => { [x: string]: (string | null | undefined)[] }
) => {
  const { focus, quizzes } = state;
  const { ids, isHighlighted, isShow } = payload;
  if (isHighlighted !== undefined && ids.find((id) => typeof id === 'number' && !isNaN(id))) {
    const focused: string[] = [];
    const newQuizzes = quizzes.map(({ pennants: attempts, ...quiz }) => ({
      ...quiz,
      pennants: attempts.map((attempt) =>
        ids.includes(attempt.id)
          ? (focused.push(attempt.quote),
          {
            ...attempt,
            isHighlighted: isHighlighted ?? !attempt.isHighlighted,
          })
          : attempt
      ),
    }));
    const highlighted = focused
      .map(quote => getChoices({ quote }))
      .reduce((prev, cur) => ({ ...prev, ...cur }), {});
    state.quizzes = newQuizzes;
    state.focus = { ...focus, ...highlighted } as Record<string, boolean>;
  } else if (isShow !== undefined && ids.find((id) => typeof id === 'string' && id.startsWith("choice"))) {
    const newFocus: Record<string, boolean> = {};
    ids
      .filter((id): id is string => typeof id === 'string' && id.startsWith("choice"))
      .forEach((id) => (newFocus[id] = isShow));
    state.focus = { ...focus, ...newFocus };
  }
};

export const applyHighlightQuestionBreathSelection = (
  state: QuizState,
  payload: { ids: number[]; isHighlighted?: boolean }
) => {
  const bannerIds: number[] = [];
  const { ids, isHighlighted } = payload;
  const { banners, quizzes, selected, followupId } = state;
  if (selected > -1 && followupId !== undefined) {
    const followupIndex = banners.findIndex((banner) => banner.id === followupId);
    if (followupIndex < 0) return;
    const courseAction = {
      type: 'course/highlightPennantBreathSelection',
      payload: { ids, isHighlighted },
    };
    const courseState: CourseState = {
      content: state.content,
      banners: state.banners,
      selected: followupIndex,
      chapters: [],
      couplings: {},
      noCourses: true,
      startId: createCourseStartIdInitial(),
      modifiedOrdinals: state.modifiedOrdinals,
    };
    const result = courseReducer(courseState, courseAction);
    state.banners = result.banners;
    state.content = result.content;
    state.modifiedOrdinals = result.modifiedOrdinals;
    return;
  }
  if (selected === -1)
    bannerIds.push(...quizzes.map(({ id }) => id));
  else bannerIds.push(quizzes[selected]?.id);
  const predicate = (banner: Banner, index: number) => ({
    isMatch: bannerIds.includes(banner.bannerId as number),
    index,
  });
  const candIndeces = banners
    .map(predicate)
    .filter(({ isMatch }) => isMatch)
    .map(({ index }) => index);
  const questionIds = candIndeces
    .map((index) => banners[index])
    .filter((question): question is Banner => !!question && ids.includes(question.id))
    .map((question) => question.id);
  if (questionIds.length === 0) return;
  const courseAction = {
    type: 'course/highlightCourseBreathSelection',
    payload: { ids: questionIds, isHighlighted },
  };
  const courseState: CourseState = {
    content: state.content,
    banners: state.banners,
    selected: -1,
    chapters: [],
    couplings: {},
    noCourses: true,
    startId: createCourseStartIdInitial(),
    modifiedOrdinals: state.modifiedOrdinals,
  };
  const result = courseReducer(courseState, courseAction);
  state.banners = result.banners;
  state.content = result.content;
  state.modifiedOrdinals = result.modifiedOrdinals;
};

export const applyHighlightQuestionDepthSelection = (
  state: QuizState,
  payload: { ids: number[]; isHighlighted?: boolean }
) => {
  const { ids, isHighlighted } = payload;
  const { quizzes, banners, content, selected, followupId } = state;
  if (selected > -1 && followupId !== undefined) {
    const followupIndex = banners.findIndex((banner) => banner.id === followupId);
    if (followupIndex < 0) return;
    const courseAction = {
      type: 'course/highlightPennantDepthSelection',
      payload: { ids, isHighlighted },
    };
    const courseState: CourseState = {
      content,
      banners,
      selected: followupIndex,
      chapters: [],
      couplings: {},
      noCourses: true,
      startId: createCourseStartIdInitial(),
      modifiedOrdinals: state.modifiedOrdinals,
    };
    const result = courseReducer(courseState, courseAction);
    state.banners = result.banners;
    state.content = result.content;
    state.modifiedOrdinals = result.modifiedOrdinals;
    return;
  }
  const quizIds = selected === -1
    ? quizzes.map(({ id }) => id)
    : [quizzes[selected]?.id];
  const predicate = (banner: Banner) => (quizIds.includes(banner.bannerId as number) && ids.includes(banner.id));
  const questionIdsArray = banners.filter(predicate).map(({ id }) => id);
  if (questionIdsArray.length > 0) {
    const courseAction = {
      type: 'course/highlightCourseDepthSelection',
      payload: { ids: questionIdsArray, isHighlighted },
    };
    const courseState: CourseState = {
      content,
      banners,
      selected: -1,
      chapters: [],
      couplings: {},
      noCourses: true,
      startId: createCourseStartIdInitial(),
      modifiedOrdinals: state.modifiedOrdinals,
    };
    const result = courseReducer(courseState, courseAction);
    state.banners = result.banners;
    state.content = result.content;
    state.modifiedOrdinals = result.modifiedOrdinals;
  }
};

/** Highlight selected quiz(es), their pennants, then course depth for related banners. */
export const applyHighlightQuizDepthSelection = (
  state: QuizState,
  payload: { ids: number[]; isHighlighted?: boolean }
) => {
  const { ids, isHighlighted } = payload;
  const { quizzes, banners, selected } = state;
  const quizIds = selected === -1
    ? quizzes.map(({ id }) => id).filter((id) => ids.includes(id))
    : [quizzes[selected]?.id];

  const pennantIdsToHighlight = new Set<number>();

  const questionIdsToHighlight = new Set<number>();

  state.quizzes = quizzes.map((quiz) => {
    const shouldHighlightQuiz = quizIds.includes(quiz.id);

    if (shouldHighlightQuiz) {
      banners
        .filter((banner) => banner.bannerId === quiz.id)
        .forEach((banner) => questionIdsToHighlight.add(banner.id));
    }

    const updatedPennants = shouldHighlightQuiz ? quiz.pennants.map((pennant) => {
      pennantIdsToHighlight.add(pennant.id);
      return { ...pennant, isHighlighted: isHighlighted ?? !pennant.isHighlighted };
    }) : quiz.pennants;

    return shouldHighlightQuiz
      ? {
        ...quiz,
        isHighlighted: isHighlighted ?? !quiz.isHighlighted,
        pennants: updatedPennants,
      }
      : {
        ...quiz,
        pennants: updatedPennants,
      };
  });

  const questionIdsArray = Array.from(questionIdsToHighlight);
  if (questionIdsArray.length > 0) {
    const courseAction = {
      type: 'course/highlightCourseDepthSelection',
      payload: { ids: questionIdsArray, isHighlighted },
    };
    const courseState: CourseState = {
      content: state.content,
      banners: state.banners,
      selected: -1,
      chapters: [],
      couplings: {},
      noCourses: true,
      startId: createCourseStartIdInitial(),
      modifiedOrdinals: state.modifiedOrdinals,
    };
    const result = courseReducer(courseState, courseAction);
    state.banners = result.banners;
    state.content = result.content;
    state.modifiedOrdinals = result.modifiedOrdinals;
  }
};

type GetChoicesFn = (args: Partial<Submition>) => { [x: string]: (string | null | undefined)[] };

/** Quiz grid dismiss (selected === -1); mutates banners, content, quizzes, noQuizzes. */
export const applyDismissQuizToState = (state: QuizState, payload: dismissQuizPayload) => {
  if (state.selected > -1) return;
  const { ids, isShow } = payload;
  if (ids.length === 0) return;

  for (const id of ids) {
    const { quizzes, banners } = state;

    const dismissedQuiz = quizzes.find((q) => id === q.id);
    const newIsDismissed = dismissedQuiz ? payload.isDismissed ?? !dismissedQuiz.isDismissed : false;

    const newState = quizzes.map((q) =>
      id === q.id
        ? {
          ...q,
          isDismissed: newIsDismissed,
          pennants: q.pennants.map((pennant) => ({
            ...pennant,
            isDismissed: newIsDismissed,
          })),
        }
        : q
    );

    if (dismissedQuiz) {
      const quizBannerIds = banners
        .filter((banner) => banner.bannerId === dismissedQuiz.id)
        .map((banner) => banner.id);

      const courseAction = {
        type: 'course/dismissCourse',
        payload: { ids: quizBannerIds, isShow, isDismissed: payload.isDismissed },
      };
      const courseState: CourseState = {
        content: state.content,
        banners: state.banners,
        selected: -1,
        chapters: [],
        couplings: {},
        noCourses: true,
        startId: createCourseStartIdInitial(),
        modifiedOrdinals: state.modifiedOrdinals,
      };
      const result = courseReducer(courseState, courseAction);
      state.banners = result.banners;
      state.content = result.content;
      state.modifiedOrdinals = result.modifiedOrdinals;
    }

    const visbles = newState.filter(
      ({ isDismissed }) => isDismissed === isShow
    );
    state.quizzes = newState;
    state.noQuizzes = visbles.length === 0;
  }
};

export const applyClearSelectedQuizBranches = (
  state: QuizState,
  payload: QuizClearSelectedErasePayload,
  getChoices: GetChoicesFn
) => {
  const { Ids = [], IDs = [], route, isShow } = payload;
  switch (route) {
    case "foundationdashboards": {
      const { quizzes, content, banners, selected } = state;
      const newQuizzes = quizzes.filter(
        ({ id, isDismissed }) => isDismissed !== isShow || !(Ids as number[]).includes(id)
      );
      const visbles = newQuizzes.filter(
        ({ isDismissed }) => isDismissed === isShow
      );
      const predicate = (banner: Banner) =>
        newQuizzes.find(({ id }) => id === banner.bannerId);
      const newBanners = banners.filter(predicate);
      const predicate0 = (group: SlideGroup) => {
        const firstItem = group[0] as SlideGroupItem | undefined;
        return firstItem && newBanners.find(({ id }) => id === firstItem.bannerId);
      };
      state.banners = newBanners;
      state.quizzes = newQuizzes;
      state.noQuizzes = visbles.length === 0;
      state.content = content.filter(predicate0);
      state.selected =
        selected < 0 || selected >= newQuizzes.length ? -1 : selected;
      break;
    }
    case "dashboardsfilters": {
      const focused: string[] = [];
      const { focus, attempt, quizzes } = state;
      const newQuizzes = quizzes.map(({ pennants, ...props }) => ({
        pennants: pennants.filter(
          ({ id, isDismissed, bannerId, quote }) => {
            const result =
              isDismissed !== isShow ||
              (IDs.length === 0 && !(Ids as number[]).includes(id)) ||
              (IDs.length > 0 &&
                !((Ids as number[]).includes(id) && IDs.includes(bannerId)));
            return result ? true : (focused.push(quote), false);
          }
        ),
        ...props,
      }));
      const resetattempts = Object.entries(focus)
        .filter(([_, v]) => v)
        .reduce((prev, [key]) => ({ ...prev, [key]: { [key]: null } }), {});
      const deleteed = focused.map(quote => getChoices({ quote }));
      const distiller = ([key, _]: [string, unknown]) =>
        deleteed.find((choices) => {
          const [deletedkey] = Object.entries(choices).pop() || [];
          return deletedkey === key;
        }) === undefined;
      const newAttemptState = Object.entries({
        ...attempt,
        ...resetattempts,
      })
        .filter(distiller)
        .reduce((p, [k, v]) => ({ ...p, [k]: v }), {});
      state.quizzes = newQuizzes;
      state.attempt = newAttemptState;
      break;
    }
    default: {
      const { content, banners } = state;
      const courseAction = { type: 'course/clearSelected', payload: { Ids, IDs, route, isShow } };
      const courseState: CourseState = {
        content,
        banners,
        selected: -1,
        chapters: [],
        noCourses: true,
        couplings: {},
        startId: createCourseStartIdInitial(),
        modifiedOrdinals: state.modifiedOrdinals,
      };
      const courseResult = courseReducer(courseState, courseAction);
      state.banners = courseResult.banners;
      state.content = courseResult.content;
      state.modifiedOrdinals = courseResult.modifiedOrdinals;
      break;
    }
  }
};

type SyncFocusAttemptFn = (state: QuizState) => void;

/** Returns false if screen is not quiz (no-op). */
export const mergeQuizFetchSkeletonsFulfilledIfQuiz = (
  state: QuizState,
  screen: string,
  response: { quizzes?: Quiz[]; banners?: Banner[]; content?: SlideGroup[] },
  syncFocusAttempt: SyncFocusAttemptFn
): boolean => {
  if (screen !== 'quiz') return false;
  const incomingQuizzes = response.quizzes;
  const incomingBanners = response.banners;
  const incomingContent = response.content;

  if (incomingQuizzes) {
    for (const quiz of incomingQuizzes) {
      if (!state.quizzes.some((q) => q.id === quiz.id)) {
        state.quizzes.push(quiz);
      }
    }
  }

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

  syncFocusAttempt(state);
  if (state.content.length > 0) {
    state.combinations = getCombination(state.content);
    recomputeFollowupCombinations(state);
  }
  if (state.quizzes.length > 0) {
    const visibles = state.quizzes.filter(({ isDismissed }) => !isDismissed);
    state.noQuizzes = visibles.length === 0;
  }
  return true;
};