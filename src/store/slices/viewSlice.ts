import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchingCompleted } from '../../library/actions';
import { DataRow } from '../../components/Core/types';
import { IconKey } from '../../Hooks/useIconsAssembler';

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
  requestIsProcessing: boolean;
  requestIsFetching: boolean;
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
  requestIsFetching: false,
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
    viewLoading: (state) => {
      state.isFetching = true;
    },
    viewRequestFetching: (state, action: PayloadAction<boolean>) => {
      state.requestIsFetching = action.payload;
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
    viewMenu: (state, action: PayloadAction<number>) => {
      state.selectedMenu = action.payload;
    },
    viewRequest: (state, action: PayloadAction<RequestPayload>) => {
      const { message, completed } = action.payload;
      state.requestIsProcessing = !completed;
      state.message = message ?? COMPLETED_MESSAGE;
    },
    clearEscrow: (state) => {
      console.log("cleared_view");
      state.fetchedData = undefined;
    },
    viewPage: (state, action: PayloadAction<string>) => {
      state.pages = [...state.pages, action.payload];
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
  viewLoading,
  viewRequestFetching,
  initFileManager,
  viewPayload,
  viewMenu,
  viewRequest,
  clearEscrow,
  viewPage,
} = viewSlice.actions;

export default viewSlice.reducer; 