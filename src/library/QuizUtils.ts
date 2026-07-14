import { Status } from "../components/Core/types";
import { Metadata } from "../components/Core/types";
import type { QuizTrees } from "./controlPanelUtils";
import type {
  Banner,
  CourseState,
  Pennant,
  SlideGroup,
  SlideGroupItem,
  SlideItem,
} from "./CourseUtils";
import courseReducer from "../store/slices/courseSlice";
import {
  contiguousOrdinalQuizzesPred,
  courseBannerDedupKey,
  idsMerger,
  mergePennants,
  orderPredicate,
  textsMerger,
} from "./sliceUtils";
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



export interface QuizState {
  selected: number;
  noQuizzes: boolean;
  followupId: number | undefined;
  content: SlideGroup[];
  banners: Banner[];
  quizzes: Quiz[];
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
  };
  const result = courseReducer(courseState, action);
  return {
    banners: result.banners,
    content: result.content,
  };
};

const quizSliceCourseState = (
  content: SlideGroup[],
  banners: Banner[],
  selected: number,
): CourseState => ({
  content,
  banners,
  noCourses: true,
  chapters: [],
  couplings: {},
  selected,
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
    quizSliceCourseState(state.content, state.banners, -1),
    courseAction,
  );
  const { banners, content } = courseResult;
  state.banners = banners;
  if (newContent?.length > 0) {
    state.content = content;
  }

  state.quizzes = newQuizzesState;
  state.noQuizzes = newNoQuizzes;
};

export const applySetBanners = (state: QuizState, bannersPayload: Banner[]) => {
  const courseAction = { type: 'course/setCourses', payload: { banners: bannersPayload, content: [] } };
  const courseResult = courseReducer(
    quizSliceCourseState(state.content, state.banners, -1),
    courseAction,
  );
  state.banners = courseResult.banners;
};

export const applySetFollowupOptions = (state: QuizState, content: SlideItem[][]) => {
  const courseAction = { type: 'course/setSlides', payload: { content } };
  const courseResult = courseReducer(
    quizSliceCourseState(state.content, state.banners, -1),
    courseAction,
  );
  state.content = courseResult.content;
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
    getCombination(state.content);
  }
  if (state.quizzes.length > 0) {
    const visibles = state.quizzes.filter(({ isDismissed }) => !isDismissed);
    state.noQuizzes = visibles.length === 0;
  }
  return true;
};