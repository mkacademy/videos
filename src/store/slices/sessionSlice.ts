import { getCurAppIndex } from '../../utils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchingCompleted, hydrateData } from '../../library/actions';
import { clearData } from './rowSlice';
import { authenticate, deHydratedRowsDataFetcher } from '../../library/Thunks';


export interface SessionState {
  curApp: number;
  curMailer: number;
  isPrivate: boolean; 
  isFetching: boolean;
  defaultTake: number;
  hydrationQueries: number;
  roleIndex: number;
  isIncognito: boolean;
  authenticated: boolean;
  curToken: string | null;
  fetchRole: string | null;
  mutateRole: string | null;
  quota: number | undefined;
  userid: number | undefined;
  roles: string[] | undefined;
  username: string | undefined;
  roleIds: number[] | undefined;
  allowMimeOnlyImageurlOverrideOnUpdateSteps: boolean;
}

const initialState: SessionState = {
  hydrationQueries: 0,
  userid: undefined,
  curApp: 1,
  curMailer: -1,
  quota: undefined,
  roleIds: undefined,
  mutateRole: null,
  roles: undefined,
  fetchRole: null,
  isPrivate: false,
  curToken: null,
  isFetching: true,
  isIncognito: true,
  username: undefined,
  authenticated: false,
  defaultTake: 10,
  roleIndex: -1,
  allowMimeOnlyImageurlOverrideOnUpdateSteps: false,
};

let loginAttempts = -2;

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    initializedLoading: (state, action: PayloadAction<Partial<SessionState>>) => {
      const newRoleIndex =
        action.payload.fetchRole && state.roles
          ? state.roles.findIndex((role) => role === action.payload.fetchRole)
          : action.payload.roleIndex ?? state.roleIndex;
      const payloadToApply = action.payload as Partial<SessionState>;
      (Object.keys(payloadToApply) as Array<keyof SessionState>).forEach((key) => {
        const value = payloadToApply[key];
        if (value !== null && value !== undefined) {
          Object.assign(state, { [key]: value });
        }
      });
      state.roleIndex = newRoleIndex;
    },
    mutateCurApp: (state, action: PayloadAction<string>) => {
      const userApp = getCurAppIndex(action.payload);
      if (userApp.length === 2) {
        const [index] = userApp;
        state.curApp = parseInt(index);
      }
      else console.log("unknown app ==>", action.payload);
    },
    signedOut: (state) => {
      state.userid = undefined;
      state.curMailer = -1;
      state.quota = undefined;
      state.roleIds = undefined;
      state.mutateRole = null;
      state.roles = undefined;
      state.fetchRole = null;
      state.isPrivate = false;
      state.curToken = null;
      state.isFetching = true;
      state.isIncognito = true;
      state.username = undefined;
      state.authenticated = false;
      state.defaultTake = 10;
      state.roleIndex = -1;
      state.allowMimeOnlyImageurlOverrideOnUpdateSteps = false;
    },
    setAllowMimeOnlyImageurlOverrideOnUpdateSteps: (state, action: PayloadAction<boolean>) => {
      state.allowMimeOnlyImageurlOverrideOnUpdateSteps = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchingCompleted, (state) => {
        state.isFetching = false;
      })
      .addCase(clearData, () => {
        console.log('clear_Session');
      })
      .addCase(authenticate.pending, (state) => {
        console.log("authenticate.pending");
        state.isFetching = true;
      })
      .addCase(authenticate.fulfilled, (state, action) => {
        console.log("authenticate.fulfilled");
        return sessionSlice.caseReducers.initializedLoading(state, action);
      })
      .addCase(authenticate.rejected, (state) => {
        console.log("authenticate.rejected");
        return sessionSlice.caseReducers.initializedLoading(state, {
          type: initializedLoading.type,
          payload: { roleIndex: loginAttempts-- }
        });
      })
      .addCase(hydrateData, (state, action) => {
        state.hydrationQueries += action.payload;
        state.allowMimeOnlyImageurlOverrideOnUpdateSteps = false;
      })
      .addCase(deHydratedRowsDataFetcher.pending, (state) => {
        state.allowMimeOnlyImageurlOverrideOnUpdateSteps = false;
      })
      .addCase(deHydratedRowsDataFetcher.fulfilled, (state) => {
        if (state.hydrationQueries > 0) state.hydrationQueries -= 1;
      })
      .addCase(deHydratedRowsDataFetcher.rejected, (state) => {
        if (state.hydrationQueries > 0) state.hydrationQueries -= 1;
      })
  }
});

export const {
  initializedLoading,
  mutateCurApp,
  signedOut,
  setAllowMimeOnlyImageurlOverrideOnUpdateSteps,
} = sessionSlice.actions;

export default sessionSlice.reducer;
