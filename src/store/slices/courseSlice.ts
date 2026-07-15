import { signedOut } from './sessionSlice';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  textsMerger,
  metadataUpdator,
  orderPredicate,
  getSlideIndeces,
} from '../../library/sliceUtils';
import {
  updateSteps,
  updateCourses,
  updateTutorials,
  updateRootsMetadata,
  updatePennantsMetadata,
  updateCoversMetadata,
  updateStepsMetadata,
} from '../../library/actions';

import type {
  Banner,
  SetCoursesPayload,
  SlideGroup,
  SlideItem,
  CourseState,
} from '../../library/CourseUtils';
import {
  applySetCourses,
  applyUpdateCoversMetadata,
  applyUpdateSteps,
} from '../../library/CourseUtils';
import { clearData } from './rowSlice';

export type {
  CourseState,
  SetCoursesPayload,
} from '../../library/CourseUtils';

const initialState: CourseState = {
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
    setCourses: (state, action: PayloadAction<SetCoursesPayload>) => {
      applySetCourses(state, action.payload);
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
      .addCase(updateCourses, (state, action) => {
        const { banners } = state;
        const nState = banners.map(banner => ({
          ...banner,
          ...textsMerger(action.payload)(banner)
        })) as Banner[];
        state.banners = nState;
      })
      .addCase(updateRootsMetadata, (state, action) => {
        const { banners } = state;
        const nState = banners.map(banner => ({
          ...banner,
          ...(action.payload.find(({ id }) => id === banner.id) ?? {}),
        }));
        state.banners = nState;
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
      .addCase(updateCoversMetadata, (state, action) => {
        applyUpdateCoversMetadata(state, action.payload);
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
      .addCase(clearData, () => initialState);
  },
});

export const {
  setCourses,
} = courseSlice.actions;

export default courseSlice.reducer;
