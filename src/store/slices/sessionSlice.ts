import { Tree, getActionFromUrl, getCurAppIndex, getCurAppName, orderedWebappRoutes } from '../../utils';
import { tabluarPrefixes } from '../../constants';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Search } from '../../store/slices/searchSlice';
import { clearEscrow } from './viewSlice';
import { fetchingCompleted, hydrateData } from '../../library/actions';
import { clearData } from './rowSlice';
import { authenticate, deHydratedRowsDataFetcher } from '../../library/Thunks';
import { MutateEntityResponse } from '../../library/types';
import { ParentData } from './viewSlice';
import { DataRow } from '../../components/Core/types';
import { TABULATOR_RENDER_CAP } from '../../constants';
import { fetchData } from '../../library/Thunks';
import { resolveAppIndexFromExecutedQueryRoutes } from '../../library/ThunksUtils';


export interface SessionState {
  affix: string;
  curApp: number;
  curMailer: number;
  curRoutes: string[];
  operation: string;
  tableAction: string;
  urlPartsIndex: number;
  selectedMenu: number;
  isPrivate: boolean;
  isAppend: boolean;
  isFetching: boolean;
  defaultTake: number;
  hydrationQueries: number;
  prefix: string;
  roleIndex: number;
  padCount: number;
  menuSize: number;
  addCount: number;
  exData: boolean;
  imData: boolean;
  exAlgorithm: boolean;
  isIncognito: boolean;
  exTraversals: boolean;
  entity: string | null;
  search: string | null;
  showShortcuts: boolean;
  authenticated: boolean;
  topPagination: boolean;
  pauseFetchers: boolean;
  curToken: string | null;
  fetchRole: string | null;
  isSearchlocally: boolean;
  showRolesToggler: boolean;
  selectedTraversal: number;
  mutateRole: string | null;
  bottomPagination: boolean;
  quota: number | undefined;
  userid: number | undefined;
  parent: string | undefined;
  crudUrl: string | undefined;
  roles: string[] | undefined;
  username: string | undefined;
  roleIds: number[] | undefined;
  parentData: ParentData | null;
  isCleared: Record<string, boolean>;
  dismissals: Record<string, boolean>;
  singleItemForms?: Record<string, boolean>;
  report: MutateEntityResponse | string | undefined;
  response: MutateEntityResponse | string | undefined;
  searchHistory: Search[];
  offlineFormatter: boolean;
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
  dismissals: {},
  quota: undefined,
  crudUrl: undefined,
  roleIds: undefined,
  showShortcuts: true,
  searchHistory: [],
  curRoutes: [], // Initialize as empty array, will be populated after Tree is initialized
  operation: 'viewRows',
  showRolesToggler: false,
  isSearchlocally: false,
  tableAction: "tabulator",
  affix: "",
  pauseFetchers: true,
  selectedTraversal: 0,
  urlPartsIndex: 0,
  selectedMenu: 0,
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
  response: undefined,
  report: undefined,
  topPagination: false,
  bottomPagination: false,
  defaultTake: 10,
  prefix: "/app/tabulator/",
  roleIndex: -1,
  padCount: 10,
  menuSize: 2,
  addCount: 1,
  exData: true,
  imData: true,
  exAlgorithm: false,
  exTraversals: false,
  entity: null,
  search: null,
  parentData: null,
  offlineFormatter: true,
  tabulatorRenderOffset: 0,
  tabulatorOrderStartId: {},
  allowMimeOnlyImageurlOverrideOnUpdateSteps: false,
};

let loginAttempts = -2;

export interface InitializedLoadingPayload extends Partial<SessionState> {
  urlData?: string;
  rootIDS?: string[];
  operation?: string;
  isExtractAlgo?: boolean;
  parentData?: ParentData;
  insertedRows?: DataRow[];
}

const updateCurRoutes = (curApp: number): { curRoutes: string[]; curApp: number } => {
  const curRoutes = getCurRoutes(getCurAppName(curApp));
  return { curRoutes, curApp };
}

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    resetHydrationQueries: (state) => {
      state.hydrationQueries = 0;
    },
    shiftTabulatorRenderWindow: (state, action: PayloadAction<'prev' | 'next'>) => {
      const step = TABULATOR_RENDER_CAP;
      if (action.payload === 'prev') {
        state.tabulatorRenderOffset = Math.max(0, state.tabulatorRenderOffset - step);
      } else {
        state.tabulatorRenderOffset += step;
      }
    },
    setCleared: (state, action: PayloadAction<boolean>) => {
      state.isCleared[state.curApp] = action.payload;
    },
    setClearedByApp: (state, action: PayloadAction<{ app: string; isCleared: boolean }>) => {
      const { app, isCleared } = action.payload;
      const appIndex = getCurAppIndex(app);
      if (appIndex.length === 2) {
        const [index] = appIndex;
        state.isCleared[index] = isCleared;
      }
      else console.log("unknown app ==>", app, 'nothing cleared');
    },
    setSelectedTraversal: (state, action: PayloadAction<number>) => {
      state.selectedTraversal = action.payload;
    },
    initializedLoading: (state, action: PayloadAction<InitializedLoadingPayload>) => {
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
      const payloadToApply = prefix?.startsWith("/app/") ? action.payload : prefixIgnored;
      (Object.keys(payloadToApply) as Array<keyof typeof payloadToApply>).forEach((key) => {
        const value = payloadToApply[key];
        if (value !== null && value !== undefined) state[key] = value;
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
    toggleDismissed: (state, action: PayloadAction<string>) => {
      state.dismissals[action.payload] = state.dismissals[action.payload] !== undefined
        ? !state.dismissals[action.payload]
        : true;
    },
    mutateAppend: (state, action: PayloadAction<boolean>) => {
      state.isAppend = action.payload;
    },
    quotaUsed: (state, action: PayloadAction<number>) => {
      state.quota = action.payload;
    },
    setCrudUrl: (state, action: PayloadAction<string>) => {
      state.crudUrl = action.payload;
    },
    mutateRows: (state, action: PayloadAction<MutateEntityResponse | string>) => {
      state.report = action.payload;
    },
    linkRows: (state, action: PayloadAction<MutateEntityResponse | string>) => {
      state.response = action.payload;
    },
    togglePagination: (state, action: PayloadAction<{ direction: string; showForm: boolean }>) => {
      const { direction, showForm } = action.payload;
      if (direction !== 'DOWNWARDS') {
        state.topPagination = showForm;
      } else {
        state.bottomPagination = showForm;
      }
    },
    mutateRole: (state, action: PayloadAction<{ roleIndex: number; mutateRole: string }>) => {
      state.roleIndex = action.payload.roleIndex;
      state.mutateRole = action.payload.mutateRole;
    },
    mutatePrefix: (state, action: PayloadAction<{ prefix: string; toIMG?: boolean } | string>) => {
      if (typeof action.payload === 'string') {
        state.prefix = action.payload;
      }
      if (typeof action.payload === 'string') return;
      const { prefix, toIMG } = action.payload;
      if (!toIMG || !prefix) return;
      let i = tabluarPrefixes.findIndex((p) => p === prefix);
      const affix = i > -1 ? prefix : state.affix;
      i = i < 0 && prefix === "/app/" ? 0 : i;

      state.prefix = prefix;
      state.affix = affix;
      state.urlPartsIndex = i;
    },
    pauseFetchers: (state) => {
      state.pauseFetchers = !state.pauseFetchers;
    },
    signedOut: (state) => {
      const { isAppend } = state;
      state.isCleared = initialCleared;
      state.userid = undefined;
      state.parent = undefined;
      state.curMailer = -1;
      state.dismissals = {};
      state.quota = undefined;
      state.crudUrl = undefined;
      state.roleIds = undefined;
      state.showShortcuts = true;
      state.searchHistory = [];
      // state.curRoutes = []; registaion.tsx needs routes not cleared
      state.operation = 'viewRows';
      state.showRolesToggler = false;
      state.isSearchlocally = false;
      state.tableAction = "tabulator";
      state.affix = "";
      state.pauseFetchers = true;
      state.selectedTraversal = 0;
      state.urlPartsIndex = 0;
      state.selectedMenu = 0;
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
      state.response = undefined;
      state.report = undefined;
      state.topPagination = false;
      state.bottomPagination = false;
      state.defaultTake = 10;
      state.prefix = "/app/tabulator/";
      state.roleIndex = -1;
      state.padCount = 10;
      state.menuSize = 2;
      state.addCount = 1;
      state.exData = true;
      state.imData = true;
      state.exAlgorithm = false;
      state.exTraversals = false;
      state.entity = null;
      state.search = null;
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
      .addCase(clearEscrow, (state) => {
        console.log('clear_Session_Url');
        state.crudUrl = undefined;
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
      .addMatcher(
        (action): action is { type: string } =>
          typeof (action as { type?: unknown }).type === 'string' &&
          (action as { type: string }).type === 'settings/switchToMaximunFeature',
        (state) => {
          state.singleItemForms = {};
        }
      );
  }
});

export const {
  resetHydrationQueries,
  setCleared,
  initializedLoading,
  mutateCurApp,
  toggleDismissed,
  mutateAppend,
  quotaUsed,
  setCrudUrl,
  mutateRows,
  linkRows,
  togglePagination,
  mutateRole,
  mutatePrefix,
  pauseFetchers,
  signedOut,
  setSelectedTraversal,
  setClearedByApp,
  shiftTabulatorRenderWindow,
  setAllowMimeOnlyImageurlOverrideOnUpdateSteps,
} = sessionSlice.actions;

export default sessionSlice.reducer; 