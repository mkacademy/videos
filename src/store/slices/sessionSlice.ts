import { Tree, getActionFromUrl, getCurAppIndex, getCurAppName, orderedWebappRoutes } from '../../utils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchingCompleted, hydrateData } from '../../library/actions';
import { clearData } from './rowSlice';
import { authenticate, deHydratedRowsDataFetcher } from '../../library/Thunks';
import { ParentData } from './viewSlice';
import { fetchData } from '../../library/Thunks';
import { resolveAppIndexFromExecutedQueryRoutes } from '../../library/ThunksUtils';


export interface SessionState {
  curApp: number;
  curMailer: number;
  curRoutes: string[];
  tableAction: string;
  isPrivate: boolean;
  isAppend: boolean;
  isFetching: boolean;
  defaultTake: number;
  hydrationQueries: number;
  prefix: string;
  roleIndex: number;
  isIncognito: boolean;
  entity: string | null;
  authenticated: boolean;
  curToken: string | null;
  fetchRole: string | null;
  mutateRole: string | null;
  quota: number | undefined;
  userid: number | undefined;
  parent: string | undefined;
  roles: string[] | undefined;
  username: string | undefined;
  roleIds: number[] | undefined;
  parentData: ParentData | null;
  isCleared: Record<string, boolean>;
  tabulatorRenderOffset: number;
  tabulatorOrderStartId: Record<string, string | null>;
  /** When false (default), updateSteps keeps valid base64 imageurl if the update is mime-only. */
  allowMimeOnlyImageurlOverrideOnUpdateSteps: boolean;
}

const getCurRoutes = (app: string) => orderedWebappRoutes(Tree.entities, app);
const initialCleared = { [1]: true, [2]: true, [3]: true, [4]: true, [5]: true, [6]: true, };
const initialState: SessionState = {
  isCleared: initialCleared,
  hydrationQueries: 0,
  userid: undefined,
  curApp: 1,
  parent: undefined,
  curMailer: -1,
  quota: undefined,
  roleIds: undefined,
  curRoutes: [], // Initialize as empty array, will be populated after Tree is initialized
  tableAction: "tabulator",
  mutateRole: null,
  roles: undefined,
  fetchRole: null,
  isPrivate: false,
  isAppend: true,
  curToken: null,
  isFetching: true,
  isIncognito: true,
  username: undefined,
  authenticated: false,
  defaultTake: 10,
  prefix: "/app/tabulator/",
  roleIndex: -1,
  entity: null,
  parentData: null,
  tabulatorRenderOffset: 0,
  tabulatorOrderStartId: {},
  allowMimeOnlyImageurlOverrideOnUpdateSteps: false,
};

let loginAttempts = -2;


const updateCurRoutes = (curApp: number): { curRoutes: string[]; curApp: number } => {
  const curRoutes = getCurRoutes(getCurAppName(curApp));
  return { curRoutes, curApp };
}

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    initializedLoading: (state, action: PayloadAction<Partial<SessionState>>) => {
      const tableAction = getActionFromUrl();
      const { prefix, ...prefixIgnored } = action.payload;
      const newRoleIndex =
        action.payload.fetchRole && state.roles
          ? state.roles.findIndex((role) => role === action.payload.fetchRole)
          : action.payload.roleIndex ?? state.roleIndex;
      if (action.payload?.parentData?.curApp && action.payload.parentData.curApp !== state.curApp) {
        const { curRoutes, curApp } = updateCurRoutes(action.payload.parentData.curApp);
        state.curRoutes = curRoutes;
        state.curApp = curApp;
      }
      const previousDefaultTake = state.defaultTake;
      const payloadToApply = (
        prefix?.startsWith("/app/") ? action.payload : prefixIgnored
      ) as Partial<SessionState>;
      (Object.keys(payloadToApply) as Array<keyof SessionState>).forEach((key) => {
        const value = payloadToApply[key];
        if (value !== null && value !== undefined) {
          Object.assign(state, { [key]: value });
        }
      });
      if (state.defaultTake !== previousDefaultTake) {
        state.isCleared = initialCleared;
      }
      state.roleIndex = newRoleIndex;
      state.tableAction = tableAction === "view" ? "tabulator" : tableAction;
    },
    mutateCurApp: (state, action: PayloadAction<string>) => {
      const userApp = getCurAppIndex(action.payload);
      if (userApp.length === 2) {
        const [index, appname] = userApp;
        state.curApp = parseInt(index);
        const curRoutes = getCurRoutes(appname.toLowerCase());
        state.curRoutes = curRoutes;
      }
      else console.log("unknown app ==>", action.payload);
    },
    signedOut: (state) => {
      const { isAppend } = state;
      state.isCleared = initialCleared;
      state.userid = undefined;
      state.parent = undefined;
      state.curMailer = -1;
      state.quota = undefined;
      state.roleIds = undefined;
      state.tableAction = "tabulator";
      state.mutateRole = null;
      state.roles = undefined;
      state.fetchRole = null;
      state.isPrivate = false;
      state.isAppend = !isAppend;
      state.curToken = null;
      state.isFetching = true;
      state.isIncognito = true;
      state.username = undefined;
      state.authenticated = false;
      state.defaultTake = 10;
      state.prefix = "/app/tabulator/";
      state.roleIndex = -1;
      state.entity = null;
      state.parentData = null;
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
      .addCase(clearData, (state) => {
        console.log('clear_Session');
        state.tabulatorRenderOffset = 0;
        state.tabulatorOrderStartId = {};
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
      .addCase(fetchData.fulfilled, (state, action) => {
        const { webapp, isMinimumFeatureMode } = action.meta.arg;
        const curApp = isMinimumFeatureMode
          ? resolveAppIndexFromExecutedQueryRoutes(action.payload) ?? getCurAppIndex(webapp)[0]
          : getCurAppIndex(webapp)[0];
        if (curApp) state.isCleared[curApp] = false;
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
