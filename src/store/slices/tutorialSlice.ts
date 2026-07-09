import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { signedOut } from './sessionSlice';
import {
  orderPredicate,
  finalizer,
  textsMerger,
  idsMerger,
  ordinalsUpdator,
  metadataUpdator,
} from '../../library/sliceUtils';
import {
  createSteps,
  createTutorials,
  persistTutorials,
  persistSteps,
  updateSteps,
  updateTutorials,
  updateStepsOrdinals,
  updateRootsOrdinals,
  updateRootsMetadata,
  updateStepsMetadata,
  FETCH_SKELETONS_FULFILLED,
  updateOwnerships,
} from '../../library/actions';
import type { erasePayload } from '../../library/actions';
import {
  type Banner,
  type Content,
  type dismissTutorialPayload,
  type SetTutorialsPayload,
  type TutorialStartId,
  type TutorialState,
  applySetTutorials,
  applyDismissTutorial,
  applyHighlightTutorialDepthSelection,
  applyHighlightContentBreathSelection,
  applyClearSelectedTutorial,
  applyClearFetchedTutorial,
  applyReOrderTutorialSelection,
  applyReOrderContentSelection,
  applyMergeTutorialFetchSkeletonsFulfilled,
  assignTutorialContentContiguousOrdinals,
  createTutorialStartIdInitial,
  applyUpdateOwnership,
  type TutorialReOrderSelectionPayload,
} from '../../library/TutorialUtils';

export type {
  TutorialModifiedOrdinalBatch,
  TutorialModifiedOrdinals,
  TutorialClearSelectedErasePayload,
  TutorialStartId,
  TutorialState,
  Banner,
  Content,
  SetTutorialsPayload,
  dismissTutorialPayload,
  TutorialReOrderSelectionPayload,
} from '../../library/TutorialUtils';

export {
  createTutorialStartIdInitial,
  ordinalForReorder,
  findTutorialContentRow,
  applyOrdinalRangeReorder,
  tutorialSlideExists,
} from '../../library/TutorialUtils';

const initialState: TutorialState = {
  startId: createTutorialStartIdInitial(),
  modifiedOrdinals: {},
  noTutorials: true,
  selected: -1,
  content: [],
  banners: [],
};

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    toggleTutorialDismissed: (state, action: PayloadAction<boolean>) => {
      state.noTutorials = action.payload;
    },
    setTutorials: (state, action: PayloadAction<SetTutorialsPayload>) => {
      applySetTutorials(state, action.payload);
    },
    dismissTutorial: (state, action: PayloadAction<dismissTutorialPayload>) => {
      applyDismissTutorial(state, action.payload);
    },
    toggleTutorial: (state, action: PayloadAction<{ selectedId?: number, canToggle?: boolean }>) => {
      const { selectedId, canToggle = true } = action.payload;
      const index = state.banners.findIndex(({ id }) => id === selectedId);
      if (canToggle && state.selected === index) {
        state.selected = -1;
      } else {
        state.selected = index;
      }
    },
    setSelected: (state, action: PayloadAction<number>) => {
      if (action.payload >= -1) state.selected = action.payload;
    },
    highlightTutorialBreathSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      state.banners = state.banners.map((banner) =>
        ids.includes(banner.id)
          ? { ...banner, isHighlighted: isHighlighted ?? !banner.isHighlighted }
          : banner
      );
    },
    highlightTutorialDepthSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightTutorialDepthSelection(state, action.payload);
    },
    highlightContentBreathSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightContentBreathSelection(state, action.payload);
    },
    clearSelected: (state, action: PayloadAction<erasePayload>) => {
      applyClearSelectedTutorial(state, action.payload);
    },
    clearFetched: (state, action: PayloadAction<boolean>) => {
      applyClearFetchedTutorial(state, action.payload);
    },
    reOrderTutorialSelection: (state, action: PayloadAction<TutorialReOrderSelectionPayload>) => {
      applyReOrderTutorialSelection(state, action.payload);
    },
    reOrderContentSelection: (state, action: PayloadAction<TutorialReOrderSelectionPayload>) => {
      applyReOrderContentSelection(state, action.payload);
    },
    setShiftHighlightStartIdLane: (
      state,
      action: PayloadAction<{ lane: keyof TutorialStartId; id: number | null }>,
    ) => {
      state.startId[action.payload.lane] = action.payload.id;
    },
    resetShiftHighlightStartId: (state) => {
      state.startId = createTutorialStartIdInitial();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(createSteps, (state, action) => {
        state.content = assignTutorialContentContiguousOrdinals(
          state.content.map((rows) => rows.map(idsMerger(action.payload, "id"))),
        );
      })
      .addCase(createTutorials, (state, action) => {
        state.banners = state.banners.map(idsMerger(action.payload, "id")).map(idsMerger(action.payload, "filterId"));
        state.content = assignTutorialContentContiguousOrdinals(
          state.content.map((rows) => rows.map(idsMerger(action.payload, "bannerId"))),
        );
      })
      .addCase(persistTutorials, (state, action) => {
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer<Banner>);
        state.banners = state.banners.map(textsMerger(finalized));
      })
      .addCase(persistSteps, (state, action) => {
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer<Content>);
        state.content = state.content.map((rows) => rows.map(textsMerger(finalized)));
      })
      .addCase(updateSteps, (state, action) => {
        state.content = state.content.map((rows) => rows.map(textsMerger(action.payload)));
      })
      .addCase(updateTutorials, (state, action) => {
        state.banners = state.banners.map(textsMerger(action.payload));
      })
      .addCase(updateStepsOrdinals, (state, action) => {
        state.content = assignTutorialContentContiguousOrdinals(
          state.content.map((rows) => rows.map(ordinalsUpdator(action.payload, true))),
        );
      })
      .addCase(updateStepsMetadata, (state, action) => {
        state.content = assignTutorialContentContiguousOrdinals(
          state.content.map((rows) => rows.map(metadataUpdator(action.payload, true))),
        );
      })
      .addCase(updateRootsOrdinals, (state, action) => {
        state.banners = state.banners.map(ordinalsUpdator(action.payload, false)).sort(orderPredicate);
      })
      .addCase(updateRootsMetadata, (state, action) => {
        state.banners = state.banners.map(metadataUpdator(action.payload, false)).sort(orderPredicate);
      })
      .addCase(updateOwnerships, (state, action) => {
        applyUpdateOwnership(state, action.payload);
      })
      .addMatcher(
        (action): action is PayloadAction<{ screen: string; response: { banners?: Banner[]; content?: Content[][] } }> =>
          action.type === FETCH_SKELETONS_FULFILLED,
        (state, action) => {
          if (action.payload.screen !== 'tutorial') return;
          applyMergeTutorialFetchSkeletonsFulfilled(state, action.payload.response);
        }
      );
  },
});

export const {
  toggleTutorialDismissed,
  setTutorials,
  dismissTutorial,
  toggleTutorial,
  highlightTutorialBreathSelection,
  highlightTutorialDepthSelection,
  highlightContentBreathSelection,
  clearSelected,
  clearFetched,
  setSelected,
  setShiftHighlightStartIdLane,
  resetShiftHighlightStartId,
  reOrderTutorialSelection,
  reOrderContentSelection,
} = tutorialSlice.actions;

export default tutorialSlice.reducer;