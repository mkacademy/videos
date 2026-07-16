import { Metadata } from "../components/Core/types";
import type { QuizTrees } from "./controlPanelUtils";
import type {
  Banner,
  CourseState,
  Pennant,
  SlideGroup,
} from "./CourseUtils";
import courseReducer from "../store/slices/courseSlice";
import {
  contiguousOrdinalQuizzesPred,
  mergePennants,
  orderPredicate,
} from "./sliceUtils";

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
  status: number;
  contiguousOrdinal?: number;
  descendentsSums?: Record<string, number>;
  metadata?: Metadata;
  modified?: boolean;
  edited?: boolean;
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
  status: number;
  contiguousOrdinal?: number;
  descendentsSums?: Record<string, number>;
}



export interface QuizState {
  selected: number;
  noQuizzes: boolean;
  content: SlideGroup[];
  banners: Banner[];
  quizzes: Quiz[];
}

export interface SetQuizzesPayload {
  quizzes: Quiz[];
  TreesId?: number;
  Trees?: QuizTrees;
  banners?: Banner[];
  content?: SlideGroup[];
}

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