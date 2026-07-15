import { authenticate } from '../../library/Thunks';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { signedOut } from '../slices/sessionSlice';
import { clearData } from './rowSlice';


export interface ErrorState {
  errors: string[];
  showCount: number;
  warnings: string[];
}

const initialErrors: ErrorState = {
  errors: [],
  warnings: [],
  showCount: 0,
};

const splitter = (payload: string | null) => {
  const splits = payload?.split(/\//);
  if (splits?.length && splits.length > 1) console.log(payload);
  return splits?.[splits.length - 1];
};

export const errorSlice = createSlice({
  name: 'error',
  initialState: initialErrors,
  reducers: {
    prependError: (state, action: PayloadAction<string | null>) => {
      const message: string = splitter(action.payload) ?? 'ooops, something went wrong';
      if (action.payload) {
        state.showCount += 1;
        state.errors = [message, ...state.errors];
      } else {
        state.showCount += 1;
      }
    },
    prependWarning: (state, action: PayloadAction<string | null>) => {
      if (action.payload) {
        state.showCount += 1;
        state.warnings = [action.payload, ...state.warnings];
      } else {
        state.showCount += 1;
      }
    },
    /** Replaces `warnings` with processed lines (top-to-bottom display order). Batch counterpart to multiple `prependWarning` calls after `clearOnlyWarnings`. */
    appendWarnings: (state, action: PayloadAction<string[]>) => {
      const mapped = action.payload
        .filter((msg): msg is string => msg !== undefined && msg !== '');
      state.warnings = mapped;
      if (mapped.length > 0) state.showCount += 1;
    },
    removeError: (state, action: PayloadAction<number>) => {
      if (action.payload < state.errors.length) {
        const index = action.payload;
        const newState = state.errors.filter((_, i) => i !== index);
        state.showCount = newState.length > 0 ? state.showCount : 0;
        state.errors = newState;
      }
      else {
        const index = action.payload - state.errors.length;
        const newState = state.warnings.filter((_, i) => i !== index);
        state.showCount = newState.length > 0 ? state.showCount : 0;
        state.warnings = newState;
      }
    },
    clearOnlyErrors: (state: ErrorState) => {
      state.errors = [];
    },
    clearOnlyWarnings: (state: ErrorState) => {
      state.warnings = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(clearData, () => initialErrors)
      .addCase(signedOut, () => {
        console.log("cleared_errors");
        return initialErrors;
      })
      .addCase(authenticate.rejected, (state, action) => {
        return errorSlice.caseReducers.prependError(state, { ...action, payload: action.payload as string });
      })
  }
});

export const {
  prependError,
  prependWarning,
  appendWarnings,
  removeError,
  clearOnlyErrors,
  clearOnlyWarnings,
} = errorSlice.actions;

export default errorSlice.reducer; 