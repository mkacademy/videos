import { signedOut } from './sessionSlice';
import type {
  Quiz,
  QuizState,
  SetQuizzesPayload,
} from '../../library/QuizUtils';
import {
  applyCourseReducer,
  applyCreateCoursesQuizState,
  applySetQuizzes,
  applyPersistTutorialsQuizState,
  createQuizStartIdInitial,
} from '../../library/QuizUtils';

export type {
  Quiz,
  QuizState,
  SetQuizzesPayload,
} from '../../library/QuizUtils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  finalizer,
  idsMerger,
  textsMerger,
} from '../../library/sliceUtils';
import {
  createSteps,
  createCourses,
  persistQuizzes,
  persistTutorials,
  createTutorials,
  persistSteps,
  updateQuizzes,
  updateCourses,
  updateTutorials,
  updateSteps,
  createQuizzes,
  updateQuestionsMetadata,
  updateQuizMetadata,
  updatePennantsMetadata,
  updateCoversMetadata,
  updateStepsMetadata,
  updateAnswersMetadata,
} from '../../library/actions';
const initialState: QuizState = {
  startId: createQuizStartIdInitial(),
  followupCombinations: {},
  followupId: undefined,
  routeToggleGreenIds: {},
  routeToggleOrangeMarks: [],
  routeTogglePrimarySide: null,
  modifiedOrdinals: {},
  combinations: [],
  noQuizzes: true,
  selected: -1,
  content: [],
  banners: [],
  quizzes: [],
  attempt: {},
  focus: {},
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuizzes: (state, action: PayloadAction<SetQuizzesPayload>) => {
      applySetQuizzes(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(updateQuizzes, (state, action) => {
        const { quizzes } = state;
        const nState = quizzes.map(quiz => ({
          ...quiz,
          ...textsMerger(action.payload)(quiz)
        }));
        state.quizzes = nState;
      })
      .addCase(updateTutorials, (state, action) => {
        // Update quizzes (quiz-specific logic)
        const { quizzes } = state;
        const nState = quizzes.map(({ pennants, ...fields }) => ({
          pennants: pennants.map(pennant => ({
            ...pennant,
            ...textsMerger(action.payload)(pennant)
          })),
          ...fields,
        }));
        state.quizzes = nState;
        // Update banners using courseReducer
        const { banners } = applyCourseReducer(state, action);
        state.banners = banners || state.banners;
      })
      .addCase(updateCourses, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        state.banners = banners || state.banners;
      })
      .addCase(updateSteps, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        state.content = content || state.content;
      })
      .addCase(createSteps, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        state.content = content || state.content;
      })
      .addCase(createTutorials, (state, action) => {
        // Update quizzes (quiz-specific logic)
        const { quizzes } = state;
        const nState = quizzes.map(({ pennants, ...fields }) => ({
          pennants: pennants.map(pennant => idsMerger(action.payload, "id")(pennant)),
          ...fields,
        }));
        state.quizzes = nState;
        // Update banners and content using courseReducer
        const { banners, content } = applyCourseReducer(state, action);
        state.banners = banners || state.banners;
        state.content = content || state.content;
      })
      .addCase(createCourses, (state, action) => {
        applyCreateCoursesQuizState(state, action);
      })
      .addCase(createQuizzes, (state, action) => {
        const { quizzes } = state;
        const nState = quizzes.map(quiz => idsMerger(action.payload, "id")(quiz));
        const nState0 = nState.map(quiz => idsMerger(action.payload, "dashboardId")(quiz));
        const nState1 = nState0.map(item => {
          const { pennants, ...fields } = item;
          return {
            ...fields,
            pennants: pennants.map(pennant => idsMerger(action.payload, "bannerId")(pennant))
          } as Quiz;
        });
        state.quizzes = nState1;
      })
      .addCase(persistQuizzes, (state, action) => {
        const { quizzes } = state;
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        const nState = quizzes.map(textsMerger(finalized));
        state.quizzes = nState;
      })
      .addCase(persistTutorials, (state, action) => {
        applyPersistTutorialsQuizState(state, action);
      })
      .addCase(persistSteps, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        state.content = content || state.content;
      })
      .addCase(updateQuizMetadata, (state, action) => {
        const { quizzes } = state;
        const nState = quizzes.map(quiz => ({
          ...quiz,
          ...(action.payload.find(({ id }) => id === quiz.id) ?? {}),
        }));
        state.quizzes = nState;
      })
      .addCase(updateAnswersMetadata, (state, action) => {
        const { quizzes } = state;
        const nState = quizzes.map(quiz => ({
          ...quiz,
          pennants: quiz.pennants.map(pennant => ({
            ...pennant,
            ...(action.payload.find(({ id }) => id === pennant.id) ?? {}),
          })),
        }));
        state.quizzes = nState;
      })
      .addCase(updateQuestionsMetadata, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(updatePennantsMetadata, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(updateCoversMetadata, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(updateStepsMetadata, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })

  },
});

export const {
  setQuizzes,
} = quizSlice.actions;

export default quizSlice.reducer; 