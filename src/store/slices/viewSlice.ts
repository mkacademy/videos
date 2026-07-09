import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchingCompleted } from '../../library/actions';
import { DataRow } from '../../components/Core/types';
import { Traversal } from './traversalSlice';
import { IconKey } from '../../Hooks/useIconsAssembler';
import { InteractionState } from './interactionSlice';

export interface ViewState {
  menus: number;
  pages: string[];
  yoinks: string[];
  keyids: number[];
  keywords: string[];
  selectedMenu: number;
  params: UrlParamsPayload; 
  icons: Record<IconKey, string> | undefined;
  parentIndeces: number[];
  parent: string | undefined;
  entity: string | undefined;
  isFetching: boolean;
  message: string | undefined;
  toggleLayout: boolean;
  actionType: string | undefined;
  parentData: ParentData | undefined;
  fetchedData: DataRow[] | undefined;
  interactions: InteractionState | undefined;
  exportedData: Traversal[] | DataRow[] | undefined;
  exportedDatas: Record<string, DataRow[]> | undefined;
  requestIsProcessing: boolean;
  requestIsFetching: boolean;
  requestIsSkeletons: boolean;
  visibility: {
    searches: boolean;
    parents: boolean;
  };
}

export interface ParentData {
  parent?: string;
  curApp: number;
  IDs: string[];
}

export interface ExportedData {
  actionType: string;
  exportedData?: Traversal[] | DataRow[];
  exportedDatas?: Record<string, DataRow[]>;
}



export interface ViewPayload {
  type?: string;
  seek?: string;
  keyids?: number[];
  keywords?: string[];
  isMutating?: boolean;
  parentIndeces?: number[];
  icons?: Record<IconKey, string>;
  parentData?: ParentData;
  selectedMenu?: number;
  contentIds?: number[];
  interactions?: InteractionState;
  fetchedData?: DataRow[];
  pages?: string[];
  yoinks?: string[];
  entity?: string;
  dest?: string;
  orig?: string;
  take?: number;
  skip?: number;
  curApp?: number;
}

export interface UrlParamsPayload {
  encodedData?: string;
  target?: string;
}

export interface RequestPayload {
  message?: string;
  completed: boolean;
}

const initialState: ViewState = {
  menus: 1,
  pages: [],
  yoinks: [],
  params: {},
  keyids: [],
  keywords: [],
  selectedMenu: 0,
  icons: undefined,
  parentIndeces: [],
  parent: undefined,
  entity: undefined,
  isFetching: false,
  message: undefined,
  toggleLayout: true,
  actionType: undefined,
  parentData: undefined,
  fetchedData: undefined,
  interactions: undefined,
  exportedData: undefined,
  exportedDatas: undefined,
  requestIsFetching: false,
  requestIsSkeletons: false,
  requestIsProcessing: false,
  visibility: { searches: true, parents: true },
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
    toggleLayout: (state) => {
      state.toggleLayout = !state.toggleLayout;
    },
    viewLoading: (state) => {
      state.isFetching = true;
    },
    viewRequestFetching: (state, action: PayloadAction<boolean>) => {
      state.requestIsFetching = action.payload;
    },
    viewRequestSkeletons: (state, action: PayloadAction<boolean>) => {
      state.requestIsSkeletons = action.payload;
    },
    viewYoinks: (state, action: PayloadAction<string[]>) => {
      state.yoinks = action.payload;
    },
    viewExports: (state, action: PayloadAction<ExportedData>) => {
      state.actionType = action.payload.actionType;
      if (action.payload.exportedDatas !== undefined) {
        state.exportedDatas = action.payload.exportedDatas;
        state.exportedData = undefined;
      } else {
        state.exportedData = action.payload.exportedData;
        state.exportedDatas = undefined;
      }
    },
    initFileManager: (state, action: PayloadAction<string>) => {
      state.actionType = action.payload;
    },
    viewPayload: (state, action: PayloadAction<ViewPayload>) => {
      const { parentData, ...rest } = action.payload;
      // Update all other properties (only if they are defined)
      if (rest.pages !== undefined) state.pages = rest.pages;
      if (rest.icons !== undefined) state.icons = rest.icons;
      if (rest.type !== undefined) state.actionType = rest.type;
      if (rest.yoinks !== undefined) state.yoinks = rest.yoinks;
      if (rest.entity !== undefined) state.entity = rest.entity;
      if (rest.keyids !== undefined) state.keyids = rest.keyids;
      if (rest.keywords !== undefined) state.keywords = rest.keywords;
      if (rest.fetchedData !== undefined) state.fetchedData = rest.fetchedData;
      if (rest.selectedMenu !== undefined) state.selectedMenu = rest.selectedMenu;
      if (rest.interactions !== undefined) state.interactions = rest.interactions;
      if (rest.parentIndeces !== undefined) state.parentIndeces = rest.parentIndeces;
      // Handle parentData specially
      if (parentData) {
        state.parentData = {
          parent: parentData.parent,
          IDs: parentData.IDs || [],
          curApp: parentData.curApp || 0
        };
        state.parent = parentData.parent;
      }
    },
    viewParentData: (state, action: PayloadAction<Array<string | number>>) => {
      const { parent, IDs = [], curApp = 0 } = state.parentData ?? {};
      const combinedIDs = [
        ...new Set([...IDs, ...action.payload].map((id) => String(id))),
      ];
      state.parentData = { parent, IDs: combinedIDs, curApp };
    },
    removeParent: (state, action: PayloadAction<string>) => {
      if (!state.parentData?.IDs || !state.parentData?.curApp) return;
      const index = state.parentData.IDs.indexOf(action.payload);
      state.parentData.IDs = state.parentData.IDs.filter((_, i) => i !== index);
    },
    viewUrlParams: (state, action: PayloadAction<UrlParamsPayload>) => {
      state.params = action.payload;
    },
    viewSpread: (state, action: PayloadAction<number>) => {
      state.menus = action.payload;
    },
    viewMenu: (state, action: PayloadAction<number>) => {
      state.selectedMenu = action.payload;
    },
    viewKeywords: (state, action: PayloadAction<string[]>) => {
      state.keywords = action.payload;
    },
    viewRequest: (state, action: PayloadAction<RequestPayload>) => {
      const { message, completed } = action.payload;
      state.requestIsProcessing = !completed;
      state.message = message ?? COMPLETED_MESSAGE;
    },
    clearEscrow: (state) => {
      console.log("cleared_view");
      state.fetchedData = undefined;
      state.interactions = undefined;
    },
    clearExports: (state) => {
      console.log("cleared_exports");
      state.exportedData = undefined;
      state.exportedDatas = undefined;
      state.actionType = undefined;
    },
    viewKeyIds: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length > 0) {
        const { IDs } = state.parentData ?? {};
        const filt = (i: number | undefined): i is number => i !== undefined && i > -1;
        const predicate = (keyId: number) => IDs?.findIndex((id: string) => keyId === parseInt(id));
        const indeces = action.payload.map(predicate).filter(filt);
        state.keyids = action.payload;
        state.parentIndeces = indeces;
      } else {
        state.keyids = action.payload;
        state.parentIndeces = [];
      }
    },
    toggleParents: (state) => {
      state.visibility.parents = !state.visibility.parents;
    },
    toggleSearches: (state) => {
      state.visibility.searches = !state.visibility.searches;
    },
    viewPage: (state, action: PayloadAction<string>) => {
      state.pages = [...state.pages, action.payload];
    },
    removePage: (state, action: PayloadAction<string>) => {
      state.pages = state.pages.filter(page => page !== action.payload);
    },
    viewYoink: (state, action: PayloadAction<string>) => {
      state.yoinks = [...state.yoinks, action.payload];
    },
    removeYoink: (state, action: PayloadAction<string>) => {
      state.yoinks = state.yoinks.filter(yoink => yoink !== action.payload);
    },
    signedOut: () => {
      return initialState;
    }
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
  toggleLayout,
  viewLoading,
  viewRequestFetching,
  viewRequestSkeletons,
  viewYoinks,
  viewExports,
  initFileManager,
  viewPayload,
  viewParentData,
  removeParent,
  viewUrlParams,
  viewSpread,
  viewMenu,
  viewKeywords,
  viewRequest,
  clearEscrow,
  clearExports,
  viewKeyIds,
  toggleParents,
  toggleSearches,
  viewPage,
  removePage,
  viewYoink,
  removeYoink,
  signedOut
} = viewSlice.actions;

export default viewSlice.reducer; 