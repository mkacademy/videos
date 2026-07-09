import { signedOut } from './sessionSlice';
import type {
  dismissAttemptPayload,
  dismissFollowupOptionPayload,
  dismissFollowupPayload,
  dismissOptionPayload,
  dismissQuestionPayload,
  dismissQuizPayload,
  dismissChoicePayload,
  Quiz,
  QuizState,
  QuizStartId,
  SetQuizzesPayload,
} from '../../library/QuizUtils';
import {
  applyClearFetched,
  applyClearSelectedQuizBranches,
  applyCourseReducer,
  applyCreateCoursesQuizState,
  applyDismissFollowup,
  applyDismissFollowupOption,
  applyDismissQuestion,
  applyDismissOption,
  applyDismissQuizToState,
  applyGroupReOrderQuizSelection,
  applyHighlightAttemptBreathSelection,
  applyHighlightQuestionBreathSelection,
  applyHighlightQuestionDepthSelection,
  applyHighlightQuizDepthSelection,
  applyReOrderQuestionSelection,
  applySetBanners,
  applySetFollowupOptions,
  applySetQuizzes,
  applyPersistTutorialsQuizState,
  mergeQuizFetchSkeletonsFulfilledIfQuiz,
  recomputeFollowupCombinations,
  createQuizStartIdInitial,
  applyUpdateOwnership,
} from '../../library/QuizUtils';

export type {
  Attempt,
  dismissAttemptPayload,
  dismissFollowupOptionPayload,
  dismissFollowupPayload,
  dismissOptionPayload,
  dismissQuestionPayload,
  dismissQuizPayload,
  dismissChoicePayload,
  Quiz,
  QuizState,
  QuizStartId,
  SetQuizzesPayload,
  Submition,
} from '../../library/QuizUtils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Banner,
  SlideGroup,
  SlideItem,
  highlightCoversBreathSelection,
  highlightSlideBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  clearSelected as clearCourseSelected,
} from './courseSlice';
import {
  finalizer,
  idsMerger,
  textsMerger,
  orderPredicate,
  sorter,
  contiguousOrdinalQuizzesPred,
} from '../../library/sliceUtils';
import { applyOrdinalRangeReorder, ordinalForReorder } from '../../library/TutorialUtils';
import { getChoices, getAttempts, getFocuses } from '../../library/quizAttemptManager';
import {
  createSteps,
  createCourses,
  persistQuizzes,
  persistTutorials,
  createTutorials,
  persistSteps,
  updateQuizzes,
  updateQuizOrdinals,
  updatePennantsOrdinals,
  updateCoversOrdinals,
  updateStepsOrdinals,
  updateCourses,
  updateTutorials,
  erasePayload,
  updateSteps,
  updateQuestionsOrdinals,
  createQuizzes,
  updateQuestionsMetadata,
  updateQuizMetadata,
  updatePennantsMetadata,
  updateCoversMetadata,
  updateStepsMetadata,
  updateAnswersMetadata,
  FETCH_SKELETONS_FULFILLED,
  updateOwnerships,
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
    toggleQuizDismissed: (state, action: PayloadAction<boolean>) => {
      state.noQuizzes = action.payload;
    },
    toggleQuiz: (state, action: PayloadAction<{ selectedId?: number, canToggle?: boolean }>) => {
      const { selectedId, canToggle = true } = action.payload;
      const index = state.quizzes.findIndex(({ id }) => id === selectedId);
      if (canToggle && state.selected === index) {
        state.selected = -1;
      } else state.selected = index;
    },
    setSelected: (state, action: PayloadAction<number>) => {
      if (action.payload >= -1) state.selected = action.payload;
    },
    setFollowupId: (state, action: PayloadAction<number | undefined>) => {
      state.followupId = action.payload;
      recomputeFollowupCombinations(state);
    },
    setRouteToggleMarks: (
      state,
      action: PayloadAction<{
        greenIds: QuizState['routeToggleGreenIds'];
        orangeMarks: QuizState['routeToggleOrangeMarks'];
        primarySide: QuizState['routeTogglePrimarySide'];
      }>,
    ) => {
      state.routeToggleGreenIds = action.payload.greenIds;
      state.routeToggleOrangeMarks = action.payload.orangeMarks;
      state.routeTogglePrimarySide = action.payload.primarySide;
    },
    clearRouteToggleMarks: (state) => {
      state.routeToggleGreenIds = {};
      state.routeToggleOrangeMarks = [];
      state.routeTogglePrimarySide = null;
    },
    setQuizzes: (state, action: PayloadAction<SetQuizzesPayload>) => {
      applySetQuizzes(state, action.payload);
    },
    setBanners: (state, action: PayloadAction<{ banners: Banner[] }>) => {
      applySetBanners(state, action.payload.banners);
    },
    setFollowupOptions: (state, action: PayloadAction<{ content: SlideItem[][] }>) => {
      applySetFollowupOptions(state, action.payload.content);
    },
    highlightQuizBreathSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      const { quizzes, selected } = state;
      const { ids, isHighlighted } = action.payload;
      const quizIds = selected === -1
        ? quizzes.map(({ id }) => id).filter((id) => ids.includes(id))
        : [quizzes[selected]?.id];
      state.quizzes = quizzes.map((quiz) =>
        quizIds.includes(quiz.id)
          ? { ...quiz, isHighlighted: isHighlighted ?? !quiz.isHighlighted }
          : quiz
      );
    },
    highlightQuizDepthSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightQuizDepthSelection(state, action.payload);
    },
    highlightAttemptBreathSelection: (state, action: PayloadAction<{ ids: (number | string)[]; isHighlighted?: boolean; isShow?: boolean }>) => {
      applyHighlightAttemptBreathSelection(state, action.payload, getChoices);
    },
    highlightQuestionBreathSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightQuestionBreathSelection(state, action.payload);
    },
    highlightQuestionDepthSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightQuestionDepthSelection(state, action.payload);
    },
    dismissQuestion: (state, action: PayloadAction<dismissQuestionPayload>) => {
      applyDismissQuestion(state, action.payload);
    },
    dismissOption: (state, action: PayloadAction<dismissOptionPayload>) => {
      applyDismissOption(state, action.payload.choice);
    },
    dismissFollowupOption: (state, action: PayloadAction<dismissFollowupOptionPayload>) => {
      applyDismissFollowupOption(state, action.payload.choice);
    },
    dismissFollowup: (state, action: PayloadAction<dismissFollowupPayload>) => {
      applyDismissFollowup(state, action.payload);
    },
    dismissQuiz: (state, action: PayloadAction<dismissQuizPayload>) => {
      applyDismissQuizToState(state, action.payload);
    },
    dismissAttempt: (state, action: PayloadAction<dismissAttemptPayload>) => {
      const { ids, isDismissed } = action.payload;
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      for (const quiz of state.quizzes) {
        for (let i = 0; i < quiz.pennants.length; i++) {
          if (idSet.has(quiz.pennants[i].id)) {
            const pennant = quiz.pennants[i];
            quiz.pennants[i] = {
              ...pennant,
              isDismissed: isDismissed ?? !pennant.isDismissed,
            };
          }
        }
      }
    },
    dismissChoice: (state, action: PayloadAction<dismissChoicePayload>) => {
      const { selected, quizzes } = state;
      if (selected <= -1) return;
      const { choice } = action.payload;
      const dismissedSubmission = Object.keys(choice || {}).pop();
      state.quizzes = quizzes.map(
        ({ pennants: submissions, ...q }) => ({
          ...q,
          pennants: submissions.map((sub) => {
            if (dismissedSubmission === undefined) return sub;
            const isMatch = getChoices(sub)[dismissedSubmission];
            return !isMatch ? sub : { ...sub, isDismissed: action.payload.isDismissed ?? !sub.isDismissed };
          }),
        })
      );
    },
    clearSelected: (state, action: PayloadAction<erasePayload>) => {
      applyClearSelectedQuizBranches(state, action.payload, getChoices);
    },
    clearFetched: (state, action: PayloadAction<boolean>) => {
      applyClearFetched(state, action.payload);
    },
    reOrderQuizSelection: (
      state,
      action: PayloadAction<{ ids: number[]; direction: boolean; groupReorder?: boolean }>,
    ) => {
      const { ids, direction, groupReorder } = action.payload;
      if (ids.length < 2) return;
      if (groupReorder) {
        applyGroupReOrderQuizSelection(state, { ids });
        return;
      }
      if (!ids.every((id) => state.quizzes.some((q) => q.id === id))) return;
      applyOrdinalRangeReorder(state.quizzes, ids, direction, ordinalForReorder);
      state.quizzes = contiguousOrdinalQuizzesPred(sorter([...state.quizzes]) as Quiz[]);
      state.focus = getFocuses(state.quizzes);
      state.attempt = getAttempts(state.quizzes);
    },
    reOrderQuestionSelection: (
      state,
      action: PayloadAction<{ ids: number[]; direction: boolean; groupReorder?: boolean }>,
    ) => {
      applyReOrderQuestionSelection(state, action.payload);
    },
    setShiftHighlightStartIdLane: (
      state,
      action: PayloadAction<{ lane: keyof QuizStartId; id: number | string | null }>,
    ) => {
      const { lane, id } = action.payload;
      state.startId[lane] = id as never;
    },
    resetShiftHighlightStartId: (state) => {
      state.startId = createQuizStartIdInitial();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(clearCourseSelected, (state, action) => {
        if (action.payload.route === "dashboardssifters") {
          const { banners, content } = applyCourseReducer(state, action);
          state.banners = banners || state.banners;
          state.content = content || state.content;
        }
      })
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
        state.attempt = getAttempts(nState);
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
      .addCase(updateQuizOrdinals, (state, action) => {
        const { quizzes } = state;
        const nState = quizzes.map(quiz => ({
          ...quiz,
          ordinal: action.payload.find(({ id }) => id === quiz.id)?.ordinal ?? quiz.ordinal
        }));
        state.quizzes = nState.sort(orderPredicate);
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
      .addCase(updateQuestionsOrdinals, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(updateQuestionsMetadata, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(updatePennantsOrdinals, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(updatePennantsMetadata, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(updateCoversOrdinals, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(updateCoversMetadata, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(updateStepsOrdinals, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(updateStepsMetadata, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(highlightCourseBreathSelection, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(highlightSlideBreathSelection, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(highlightPennantBreathSelection, (state, action) => {
        const { banners } = applyCourseReducer(state, action);
        if (banners) state.banners = banners;
      })
      .addCase(highlightCoversBreathSelection, (state, action) => {
        const { content } = applyCourseReducer(state, action);
        if (content) state.content = content;
      })
      .addCase(updateOwnerships, (state, action) => {
        applyUpdateOwnership(state, action.payload);
      })
      .addMatcher(
        (action): action is PayloadAction<{
          screen: string;
          response: { quizzes?: Quiz[]; banners?: Banner[]; content?: SlideGroup[] };
        }> => action.type === FETCH_SKELETONS_FULFILLED,
        (state, action) => {
          mergeQuizFetchSkeletonsFulfilledIfQuiz(
            state,
            action.payload.screen,
            action.payload.response,
            (s) => {
              s.focus = getFocuses(s.quizzes);
              s.attempt = getAttempts(s.quizzes);
            },
          );
        }
      );
  },
});

export const {
  toggleQuizDismissed,
  toggleQuiz,
  setQuizzes,
  highlightQuizBreathSelection,
  highlightQuizDepthSelection,
  highlightAttemptBreathSelection,
  highlightQuestionBreathSelection,
  highlightQuestionDepthSelection,
  dismissOption,
  dismissFollowupOption,
  dismissChoice,
  dismissQuestion,
  dismissFollowup,
  dismissQuiz,
  dismissAttempt,
  clearSelected,
  clearFetched,
  setBanners,
  setFollowupOptions,
  setSelected,
  setFollowupId,
  setRouteToggleMarks,
  clearRouteToggleMarks,
  setShiftHighlightStartIdLane,
  resetShiftHighlightStartId,
  reOrderQuizSelection,
  reOrderQuestionSelection,
} = quizSlice.actions;

// Export aliases for backward compatibility
export const highlightQuiz = highlightQuizBreathSelection;
export const highlightQuestion = highlightQuestionBreathSelection;

export default quizSlice.reducer; 