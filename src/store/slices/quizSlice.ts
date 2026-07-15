import { signedOut } from './sessionSlice';
import type {
  QuizState,
  SetQuizzesPayload,
} from '../../library/QuizUtils';
import {
  applyCourseReducer,
  applySetQuizzes,
} from '../../library/QuizUtils';

export type {
  Quiz,
  QuizState,
  SetQuizzesPayload,
} from '../../library/QuizUtils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  textsMerger,
} from '../../library/sliceUtils';
import {
  updateQuizzes,
  updateCourses,
  updateTutorials,
  updateSteps,
  updateQuestionsMetadata,
  updateQuizMetadata,
  updatePennantsMetadata,
  updateCoversMetadata,
  updateStepsMetadata,
  updateAnswersMetadata,
} from '../../library/actions';
import { clearData } from './rowSlice';
const initialState: QuizState = {
  followupId: undefined,
  noQuizzes: true,
  selected: -1,
  content: [],
  banners: [],
  quizzes: [],
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
      .addCase(clearData, () => {
        return initialState;
      })
  },
});

export const {
  setQuizzes,
} = quizSlice.actions;

export default quizSlice.reducer; 