import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchingCompleted } from '../../library/actions';

export interface ViewState {
  isFetching: boolean;
  message: string | undefined;
  requestIsProcessing: boolean;
  requestIsFetching: boolean;
}

export interface RequestPayload {
  message?: string;
  completed: boolean;
}

const initialState: ViewState = {
  isFetching: false,
  message: undefined,
  requestIsFetching: false,
  requestIsProcessing: false,
};
export const COMPLETED_MESSAGE = "completed requested actions";
const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    cpanelMessage: (state, action: PayloadAction<string>) => {
      const iswaiting = state.message?.endsWith("please wait")
        || (state.message?.startsWith("hydrating") && !action.payload.startsWith("hydrating"));
      state.message = !iswaiting ? action.payload : state.message;
    },
    viewRequestFetching: (state, action: PayloadAction<boolean>) => {
      state.requestIsFetching = action.payload;
    },
    viewRequest: (state, action: PayloadAction<RequestPayload>) => {
      const { message, completed } = action.payload;
      state.requestIsProcessing = !completed;
      state.message = message ?? COMPLETED_MESSAGE;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchingCompleted, (state) => {
        state.isFetching = false;
      })
  }
});

export const {
  cpanelMessage,
  viewRequestFetching,
  viewRequest,
} = viewSlice.actions;

export default viewSlice.reducer; 