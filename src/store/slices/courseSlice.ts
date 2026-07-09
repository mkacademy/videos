import { signedOut } from './sessionSlice';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  textsMerger,
  finalizer,
  ordinalsUpdator,
  metadataUpdator,
  orderPredicate,
  getSlideIndeces,
} from '../../library/sliceUtils';
import {
  createSteps,
  createCourses,
  persistTutorials,
  persistSteps,
  updateCourses,
  updateRootsOrdinals,
  updatePennantsOrdinals,
  updateCoversOrdinals,
  updateStepsOrdinals,
  updateTutorials,
  updateSteps,
  erasePayload,
  persistCourses,
  createTutorials,
  updateRootsMetadata,
  updatePennantsMetadata,
  updateCoversMetadata,
  updateStepsMetadata,
  FETCH_SKELETONS_FULFILLED,
  updateOwnerships,
} from '../../library/actions';

import type {
  Banner,
  Pennant,
  SetCoursesPayload,
  SlideGroup,
  SlideItem,
  dismissCoursePayload,
  dismissSlidePayload,
  CourseReOrderSelectionPayload,
  CourseHighlightSlideBreathSelectionPayload,
  CourseHighlightCoversBreathSelectionPayload,
  CourseSetSlidesPayload,
  CourseState,
} from '../../library/CourseUtils';
import {
  applyClearSelectedCourseState,
  applyClearFetchedCourseState,
  applyDismissChapter,
  applyDismissSlide,
  applyDismissCourseWithSelection,
  applyDismissCourseWithoutSelection,
  applyHighlightCoversBreathSelection,
  applyHighlightCourseDepthSelection,
  applyHighlightPennantDepthSelection,
  applyHighlightSlideBreathSelection,
  applyCreateCourses,
  applyCreateSteps,
  applyCreateTutorials,
  applyPersistSteps,
  applyReOrderCoversSelection,
  applyReOrderCourseSelection,
  applyReOrderPennantSelection,
  applyReOrderSlideSelection,
  applySetChaptersViaPennantId,
  applySetChaptersViaSlideId,
  applySetCourses,
  applySetSlides,
  applyUpdateCoversMetadata,
  applyUpdateCoversOrdinals,
  applyUpdateSteps,
  applyUpdateOwnership,
  createCourseStartIdInitial,
  mergeCourseFetchSkeletonsContent,
  type CourseStartId,
} from '../../library/CourseUtils';

export type {
  SlideGroupItem,
  SlideGroup,
  SlideItem,
  Banner,
  Pennant,
  CourseState,
  CourseStartId,
  SetCoursesPayload,
  dismissCoursePayload,
  dismissSlidePayload,
  CourseModifiedOrdinals,
  CourseSetSlidesPayload,
  CourseModifiedOrdinalBatch,
  CourseHighlightSlideBreathSelectionPayload,
  CourseHighlightCoversBreathSelectionPayload,
} from '../../library/CourseUtils';

export {
  isSlideGroupItem,
  getBannerChaptersCouplings,
  resolveChaptersForSlideInSelectedCourse,
  resolveSlidesForChapterInSelectedCourse,
} from '../../library/CourseUtils';

const initialState: CourseState = {
  startId: createCourseStartIdInitial(),
  modifiedOrdinals: {},
  noCourses: true,
  couplings: {},
  selected: -1,
  chapters: [],
  content: [],
  banners: [],
};

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    toggleCourseDismissed: (state, action: PayloadAction<boolean>) => {
      state.noCourses = action.payload;
    },
    toggleCourse: (state, action: PayloadAction<{ selectedId?: number, canToggle?: boolean }>) => {
      const { selectedId, canToggle = true } = action.payload;
      const index = state.banners.findIndex(({ id }) => id === selectedId);
      if (canToggle && state.selected === index) {
        state.selected = -1;
      } else {
        state.selected = index;
      }
      state.chapters = [];
    },
    setSelected: (state, action: PayloadAction<number>) => {
      if (action.payload >= -1) {
        state.selected = action.payload;
        state.chapters = [];
      }
    },
    setChapters: (state, action: PayloadAction<number[]>) => {
      if (state.selected < 0 && state.chapters.length > 0) {
        state.chapters = [];
        return;
      }
      state.chapters = action.payload;
    },
    resetChapters: (state) => {
      state.chapters = [];
    },
    setChaptersViaSlideId: (state, action: PayloadAction<number>) => {
      applySetChaptersViaSlideId(state, action.payload);
    },
    setChaptersViaPennantId: (state, action: PayloadAction<number>) => {
      applySetChaptersViaPennantId(state, action.payload);
    },
    setCourses: (state, action: PayloadAction<SetCoursesPayload>) => {
      applySetCourses(state, action.payload);
    },
    setSlides: (state, action: PayloadAction<CourseSetSlidesPayload>) => {
      applySetSlides(state, action.payload);
    },
    highlightSlideBreathSelection: (state, action: PayloadAction<CourseHighlightSlideBreathSelectionPayload>) => {
      applyHighlightSlideBreathSelection(state, action.payload);
    },
    highlightCourseBreathSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      const { ids, isHighlighted } = action.payload;
      const { banners, selected } = state;
      const bannerIds = selected === -1
        ? banners.map(({ id }) => id).filter((id) => ids.includes(id))
        : [banners[selected]?.id];
      const newState = banners.map((banner: Banner) =>
        bannerIds.includes(banner.id)
          ? { ...banner, isHighlighted: isHighlighted ?? !banner.isHighlighted }
          : banner
      );
      state.banners = newState;
    },
    highlightPennantBreathSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      const { banners } = state;
      const { ids, isHighlighted } = action.payload;
      const newState = banners.map((banner: Banner) => {
        return {
          ...banner,
          pennants: banner.pennants.map((pennant: Pennant) =>
            ids.includes(pennant.id)
              ? { ...pennant, isHighlighted: isHighlighted ?? !pennant.isHighlighted }
              : pennant
          ),
        }
      });
      state.banners = newState;
    },
    highlightCoversBreathSelection: (state, action: PayloadAction<CourseHighlightCoversBreathSelectionPayload>) => {
      applyHighlightCoversBreathSelection(state, action.payload);
    },
    highlightPennantDepthSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightPennantDepthSelection(state, action.payload);
    },

    highlightCourseDepthSelection: (state, action: PayloadAction<{ ids: number[]; isHighlighted?: boolean }>) => {
      applyHighlightCourseDepthSelection(state, action.payload);
    },
    dismissCourse: (state, action: PayloadAction<dismissCoursePayload>) => {
      const { ids, isShow, isDismissed } = action.payload;
      if (ids.length === 0 || state.selected > -1) return;
      for (const id of ids) applyDismissCourseWithoutSelection(state, id, isDismissed, isShow);
    },
    dimissMainslide: (state, action: PayloadAction<dismissCoursePayload>) => {
      const { ids, isDismissed } = action.payload;
      if (ids.length === 0) return;
      for (const id of ids) applyDismissCourseWithSelection(state, id, isDismissed);
    },
    dismissChapter: (state, action: PayloadAction<dismissCoursePayload>) => {
      applyDismissChapter(state, action.payload);
    },
    dismissSlide: (state, action: PayloadAction<dismissSlidePayload>) => {
      applyDismissSlide(state, action.payload);
    },
    clearSelected: (state, action: PayloadAction<erasePayload>) => {
      applyClearSelectedCourseState(state, action.payload);
    },
    clearFetched: (state, action: PayloadAction<boolean>) => {
      applyClearFetchedCourseState(state, action.payload);
    },
    reOrderSlideSelection: (state, action: PayloadAction<CourseReOrderSelectionPayload>) => {
      applyReOrderSlideSelection(state, action.payload);
    },
    reOrderCoversSelection: (state, action: PayloadAction<CourseReOrderSelectionPayload>) => {
      applyReOrderCoversSelection(state, action.payload);
    },
    reOrderCourseSelection: (state, action: PayloadAction<CourseReOrderSelectionPayload>) => {
      applyReOrderCourseSelection(state, action.payload);
    },
    reOrderPennantSelection: (state, action: PayloadAction<CourseReOrderSelectionPayload>) => {
      applyReOrderPennantSelection(state, action.payload);
    },
    setShiftHighlightStartIdLane: (
      state,
      action: PayloadAction<{ lane: keyof CourseStartId; id: number | null }>,
    ) => {
      state.startId[action.payload.lane] = action.payload.id;
    },
    resetShiftHighlightStartId: (state) => {
      state.startId = createCourseStartIdInitial();
    },
    coupleChapterAndCovers: (state) => {
      state.couplings = getSlideIndeces(state.banners, state.content);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(updateTutorials, (state, action) => {
        const { banners } = state;
        const nState = banners.map(({ pennants, ...fields }: Banner) => ({
          pennants: pennants.map(pennant => ({
            ...pennant,
            ...textsMerger(action.payload)(pennant)
          })),
          ...fields,
        }));
        state.banners = nState;
      })
      .addCase(updateSteps, (state, action) => {
        applyUpdateSteps(state, action.payload);
      })
      .addCase(createSteps, (state, action) => {
        applyCreateSteps(state, action.payload);
      })
      .addCase(createTutorials, (state, action) => {
        applyCreateTutorials(state, action.payload);
      })
      .addCase(createCourses, (state, action) => {
        applyCreateCourses(state, action.payload);
      })
      .addCase(persistCourses, (state, action) => {
        const { banners } = state;
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        const nState = banners.map(textsMerger(finalized));
        state.banners = nState;
      })
      .addCase(persistTutorials, (state, action) => {
        const { banners } = state;
        const finalized = action.payload.map(({ id, modified }) => ({ id: parseInt(id), modified })).map(finalizer);
        const predicate = (pennant: Pennant) => ({
          ...pennant,
          ...textsMerger(finalized)(pennant)
        });
        const nState = banners.map(({ pennants, ...fields }: Banner) => ({
          ...fields,
          pennants: pennants.map(predicate),
        }));
        state.banners = nState;
      })
      .addCase(persistSteps, (state, action) => {
        applyPersistSteps(state, action.payload);
      })
      .addCase(updateCourses, (state, action) => {
        const { banners } = state;
        const nState = banners.map(banner => ({
          ...banner,
          ...textsMerger(action.payload)(banner)
        })) as Banner[];
        state.banners = nState;
      })
      .addCase(updateRootsOrdinals, (state, action) => {
        const { banners } = state;
        const nState = banners.map(banner => ({
          ...banner,
          ordinal: action.payload.find(({ id }) => id === banner.id)?.ordinal ?? banner.ordinal
        }));
        state.banners = nState.sort(orderPredicate);
      })
      .addCase(updateRootsMetadata, (state, action) => {
        const { banners } = state;
        const nState = banners.map(banner => ({
          ...banner,
          ...(action.payload.find(({ id }) => id === banner.id) ?? {}),
        }));
        state.banners = nState;
      })
      .addCase(updatePennantsOrdinals, (state, action) => {
        const { banners } = state;
        const nState = banners.map(({ pennants, ...fields }: Banner) => ({
          ...fields,
          pennants: pennants.map(ordinalsUpdator(action.payload, true)).sort(orderPredicate)
        }));
        state.banners = nState;
        state.couplings = getSlideIndeces(nState, state.content);
      })
      .addCase(updatePennantsMetadata, (state, action) => {
        const { banners } = state;
        const nState = banners.map(({ pennants, ...fields }: Banner) => ({
          ...fields,
          pennants: pennants.map(metadataUpdator(action.payload, true)).sort(orderPredicate)
        }));
        state.banners = nState;
        state.couplings = getSlideIndeces(nState, state.content);
      })
      .addCase(updateCoversOrdinals, (state, action) => {
        applyUpdateCoversOrdinals(state, action.payload);
      })
      .addCase(updateCoversMetadata, (state, action) => {
        applyUpdateCoversMetadata(state, action.payload);
      })
      .addCase(updateStepsOrdinals, (state, action) => {
        const { content } = state;
        const nState = content.map(({ slides, ...fields }: SlideGroup) => ({
          ...fields,
          slides: slides.map((rows: SlideItem[]) =>
            rows.map(ordinalsUpdator(action.payload, true)).sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0))
          ),
        })) as SlideGroup[];
        state.content = nState;
      })
      .addCase(updateStepsMetadata, (state, action) => {
        const { content } = state;
        const nState = content.map(({ slides, ...fields }: SlideGroup) => ({
          ...fields,
          slides: slides.map((rows: SlideItem[]) =>
            rows.map(metadataUpdator(action.payload, true)).sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0))
          ),
        })) as SlideGroup[];
        state.content = nState;
      })
      .addCase(updateOwnerships, (state, action) => {
        applyUpdateOwnership(state, action.payload);
      })
      .addMatcher(
        (action): action is PayloadAction<{ screen: string; response: { banners?: Banner[]; content?: SlideGroup[] } }> =>
          action.type === FETCH_SKELETONS_FULFILLED,
        (state, action) => {
          if (action.payload.screen !== 'course') return;
          mergeCourseFetchSkeletonsContent(state, action.payload.response);
          state.couplings = getSlideIndeces(state.banners, state.content);
          if (state.banners.length > 0) {
            const visibles = state.banners.filter(({ isDismissed }) => !isDismissed);
            state.noCourses = visibles.length === 0;
          }
        }
      );
  },
});

export const {
  toggleCourseDismissed,
  toggleCourse,
  setCourses,
  setSlides,
  dismissSlide,
  highlightSlideBreathSelection,
  highlightCourseBreathSelection,
  highlightPennantBreathSelection,
  highlightCoversBreathSelection,
  highlightPennantDepthSelection,
  highlightCourseDepthSelection,
  dismissCourse,
  dimissMainslide,
  dismissChapter,
  clearSelected,
  clearFetched,
  setSelected,
  setChapters,
  resetChapters,
  setChaptersViaSlideId,
  setChaptersViaPennantId,
  setShiftHighlightStartIdLane,
  resetShiftHighlightStartId,
  reOrderSlideSelection,
  reOrderCoversSelection,
  reOrderCourseSelection,
  reOrderPennantSelection,
  coupleChapterAndCovers,
} = courseSlice.actions;

export const clearCourseSelected = clearSelected;

export default courseSlice.reducer; 