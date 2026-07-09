import { tabluarPrefixes } from '../../constants';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initializedLoading, signedOut } from './sessionSlice';
import { ParentData } from './viewSlice';
import { CpanelRow } from '../../components/Core/types';
import { Handler } from './errorSlice';
import { capitalizeFirstLetter, getEntity, getSingular } from '../../utils';

export interface SidebarState {
  filter: string;
  prefix: string;
  direction: boolean;
  contentIds?: string[];
  parentData: ParentData;
  isLookupEnabled: boolean;
  isFirstSelection: boolean;
  isLookupSelected: boolean;
  insertedRows?: CpanelRow[];
  content: string | undefined;
  response: Record<string, Record<string, CpanelRow[]>>;
  handles: Record<string, Handler[]>;
}

export interface IdToggledPayload {
  id: number;
  selected: boolean;
}

export interface CommandSelectedPayload {
  isFilter?: boolean;
  prefix?: string;
  title: string;
}

const initialState: SidebarState = {
  response: {},
  handles: {},
  direction: true,
  content: undefined,
  filter: "Includes",
  isLookupEnabled: true,
  isFirstSelection: true,
  isLookupSelected: false,
  prefix: tabluarPrefixes[2],
  parentData: { IDs: [], curApp: 0, parent: "" },
};

export interface SelectPayload {
  to: string;
  isReset?: boolean;
  selected?: CpanelRow[];
  selectedIds?: string[];
}


export const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    setResponse: (state, action: PayloadAction<Record<string, Record<string, CpanelRow[]>>>) => {
      state.response = action.payload;
    },
    toggleLookUp: (state) => {
      state.isLookupSelected = !state.isLookupSelected;
    },
    resetSelected: (state) => {
      state.contentIds = [];
      state.insertedRows = [];
      state.content = undefined;
      state.isLookupEnabled = true;
      state.isFirstSelection = true;
      state.isLookupSelected = false;
      state.parentData = { IDs: [], curApp: 0, parent: "" };
    },
    commandSelected: (state, action: PayloadAction<CommandSelectedPayload>) => {
      const { isFilter, prefix, title } = action.payload;
      const direction = !isFilter ? title === "Downward" : state.direction;
      if (direction !== state.direction) {
        state.contentIds = [];
        state.insertedRows = [];
        state.direction = direction;
        state.isLookupEnabled = true;
        state.isFirstSelection = true;
        state.isLookupSelected = false;
        state.prefix = prefix ?? state.prefix;
        state.filter = isFilter ? title : state.filter;
        state.parentData = { IDs: [], curApp: 0, parent: "" };
      } else {
        state.prefix = prefix ?? state.prefix;
        state.filter = isFilter ? title : state.filter;
      }
    },
    idToggled: (state, action: PayloadAction<IdToggledPayload>) => {
      const setter0 = () => {
        const { id, selected } = action.payload;
        const { parentData: { IDs, curApp, parent } = { IDs: [], curApp: 0 } } = state;
        const pred = (k: string) => k !== id.toString();
        const selectedIds = !selected
          ? IDs.filter(pred)
          : [...IDs, id.toString()];
        const uniqueIds = [...new Set(selectedIds)];
        return { parent: parent || "", IDs: uniqueIds.map(String), curApp }

      };
      const setter1 = () => {
        const { id, selected } = action.payload;
        const { contentIds = [] } = state;
        const selectedIds = !selected
          ? contentIds.filter((key) => key !== id.toString())
          : [...contentIds, id.toString()];
        return [...new Set(selectedIds)];
      };
      const { isFirstSelection, direction } = state;
      if (direction) {
        !isFirstSelection ? state.parentData = setter0() : state.contentIds = setter1();
      } else {
        !isFirstSelection ? state.contentIds = setter1() : state.parentData = setter0();
      }
    },
    ancestorSelected: (state, action: PayloadAction<SelectPayload>) => {
      const {
        isReset,
        to: parent,
        selected = [],
        selectedIds: IDs = [],
      } = action.payload;
      const newState = isReset
        ? { ...initialState, filter: state.filter, prefix: state.prefix }
        : { ...state, isLookupEnabled: false, isLookupSelected: false };
      state.prefix = newState.prefix;
      state.filter = newState.filter;
      state.content = newState.content;
      state.direction = newState.direction;
      state.contentIds = newState.contentIds;
      state.insertedRows = newState.insertedRows;
      state.parentData = { IDs, curApp: 0, parent };
      state.isFirstSelection = isReset ? false : true;
      state.isLookupEnabled = newState.isLookupEnabled;
      const keywordKey = getSingular(getEntity(parent));
      state.isLookupSelected = newState.isLookupSelected;
      const handlesKey = 'handles' + capitalizeFirstLetter(getEntity(parent));
      const predicate = (row: CpanelRow) => ({ id: parseInt(row.id.toString()), keyword: row[keywordKey] });
      const handles = selected.map(predicate);
      state.handles[handlesKey] = handles;
    },
    descendentSelected: (state, action: PayloadAction<SelectPayload>) => {
      const {
        isReset,
        to: content,
        selected: insertedRows = [],
        selectedIds: contentIds = [],
      } = action.payload;
      const newState = isReset
        ? {
          ...initialState,
          direction: false,
          filter: state.filter,
          prefix: state.prefix,
        }
        : { ...state, isLookupEnabled: false, isLookupSelected: false };

      state.filter = newState.filter;
      state.prefix = newState.prefix;
      state.direction = newState.direction;
      state.parentData = newState.parentData;
      state.isLookupEnabled = newState.isLookupEnabled;
      state.isLookupSelected = newState.isLookupSelected;
      state.isFirstSelection = isReset ? false : true;
      state.insertedRows = insertedRows;
      state.contentIds = contentIds;
      state.content = content;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializedLoading, (state, action) => {
        if (action.payload.curToken === undefined) return;
        else {
          state.response = {};
          state.direction = true;
          state.contentIds = [];
          state.insertedRows = [];
          state.filter = "Includes";
          state.content = undefined;
          state.isLookupEnabled = true;
          state.isFirstSelection = true;
          state.isLookupSelected = false;
          state.prefix = tabluarPrefixes[2];
          state.parentData = { IDs: [], curApp: 0, parent: "" };
        };
      })
      .addCase(signedOut, (state) => {
        console.log("cleared_sidebar");
        state.response = {};
        state.direction = true;
        state.contentIds = [];
        state.insertedRows = [];
        state.filter = "Includes";
        state.content = undefined;
        state.isLookupEnabled = true;
        state.isFirstSelection = true;
        state.isLookupSelected = false;
        state.prefix = tabluarPrefixes[2];
        state.parentData = { IDs: [], curApp: 0, parent: "" };
      });
  },
});

export const {
  idToggled,
  setResponse,
  toggleLookUp,
  resetSelected,
  commandSelected,
  ancestorSelected,
  descendentSelected,
} = sidebarSlice.actions;

export default sidebarSlice.reducer; 