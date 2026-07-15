import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { signedOut } from './sessionSlice';
import {
  orderPredicate,
  textsMerger,
  metadataUpdator,
} from '../../library/sliceUtils';
import {
  updateSteps,
  updateTutorials,
  updateRootsMetadata,
  updateStepsMetadata,
} from '../../library/actions';
import {
  type SetTutorialsPayload,
  type TutorialState,
  applySetTutorials,
  assignTutorialContentContiguousOrdinals,
} from '../../library/TutorialUtils';
import { clearData } from './rowSlice';

export type {
  TutorialState,
  Banner,
  Content,
  SetTutorialsPayload,
} from '../../library/TutorialUtils';



const initialState: TutorialState = {
  noTutorials: true,
  selected: -1,
  content: [],
  banners: [],
};

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    setTutorials: (state, action: PayloadAction<SetTutorialsPayload>) => {
      applySetTutorials(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(updateSteps, (state, action) => {
        state.content = state.content.map((rows) => rows.map(textsMerger(action.payload)));
      })
      .addCase(updateTutorials, (state, action) => {
        state.banners = state.banners.map(textsMerger(action.payload));
      })
      .addCase(updateStepsMetadata, (state, action) => {
        state.content = assignTutorialContentContiguousOrdinals(
          state.content.map((rows) => rows.map(metadataUpdator(action.payload, true))),
        );
      })
      .addCase(updateRootsMetadata, (state, action) => {
        state.banners = state.banners.map(metadataUpdator(action.payload, false)).sort(orderPredicate);
      })
      .addCase(clearData, () => initialState);
  },
});

export const {
  setTutorials,
} = tutorialSlice.actions;

export default tutorialSlice.reducer;