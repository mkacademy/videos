import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { updateIds, clearData, appendRowz, removeRows, prependRowz } from './rowSlice';
import { insertMetadata } from '../../library/actions';
import { getInteractionIDs } from '../../utils';
import { Metadata } from '../../components/Core/types';

export interface Status {
  initial: number;
  current: number;
  owner?: boolean;
}
export interface ActionItem {
  id: string;
  status: Status;
  modified?: boolean;
}

export type ActionState = ActionItem[];

const initialState: ActionState = [];

export interface UpdateStatusesPayload {
  id: string;
  modified?: boolean;
  status?: Status;
}

export const actionSlice = createSlice({
  name: 'action',
  initialState,
  reducers: {
    toggleStatus: (state) => {
      return state.map((curStatus) => {
        const { initial, current, owner } = curStatus.status;
        return {
          ...curStatus,
          status: { initial: current, current: initial, owner },
          modified: parseInt(curStatus.id) > -1 ? true : false,
        };
      });
    },
    toggleActions: (state, action: PayloadAction<Status>) => {
      return state.map((curStatus) => ({
        ...curStatus,
        status: { ...action.payload, owner: curStatus.status.owner },
        modified: parseInt(curStatus.id) > -1 ? true : false,
      }));
    },
    toggleAction: (state, action: PayloadAction<{ status: Status; id: string; modified?: boolean }>) => {
      return state.map((curStatus) => {
        const isMatch = curStatus.id === action.payload.id;
        const modified = isMatch ? parseInt(curStatus.id) > -1 : false;
        return isMatch
          ? {
            ...curStatus,
            status: action.payload.status,
            modified: action.payload.modified ?? modified,
          }
          : { ...curStatus };
      });
    },
    updateStatuses: (state, action: PayloadAction<UpdateStatusesPayload[]>) => {
      return state.map((row) => {
        const modified = action.payload.find((status) => status.id === row.id);
        return modified !== undefined
          ? {
            ...row,
            modified: modified.modified ?? row.modified,
            status: { ...row.status, ...modified.status },
          }
          : { ...row };
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateIds, (state, action) => {
        const ids = action.payload;
        return state.map((row) => {
          const i = ids.findIndex((id: string) => id === row.id);
          return i !== -1 && i % 2 === 0
            ? { ...row, modified: false, ...{ id: ids[i + 1] } }
            : { ...row };
        });
      })
      .addCase(clearData, () => {
        console.log("cleared_actions");
        return [];
      })
      .addCase(removeRows, (state, action) => {
        const ids = action.payload;
        return state.filter((s) => ids.findIndex((ID: string) => ID === s.id) === -1);
      })
      .addCase(prependRowz, (state, action) => {
        const affirm = (r: ActionItem) => (ID: string) => ID === r.id;
        if (!action.payload?.data?.statuses) return state;
        if (state.length === 0) return [...action.payload.data.statuses];
        const appended = action.payload.data.statuses.map((c: ActionItem) => c.id);
        const pred = (r: ActionItem) => appended.findIndex(affirm(r)) === -1;
        return action.payload.data.statuses.concat(state.filter(pred));
      })
      .addCase(appendRowz, (state, action) => {
        const affirm = (r: ActionItem) => (ID: string) => ID === r.id;
        if (!action.payload?.data?.statuses) return state;
        if (state.length === 0) return [...action.payload.data.statuses];
        const prepend = action.payload.data.statuses.map((c: ActionItem) => c.id);
        const pred = (r: ActionItem) => prepend.findIndex(affirm(r)) === -1;
        return state.filter(pred).concat(action.payload.data.statuses);
      })
      .addCase(insertMetadata, (state, action) => {
        const { childID } = getInteractionIDs('', action.payload.dest);
        const metadatas = action.payload.data;
        return state.map((row) => {
          const metadata = metadatas.find((m: Metadata) => childID && m[childID] === parseInt(row.id));
          return {
            ...row,
            status:
              metadata === undefined
                ? { ...row.status }
                : { ...row.status, owner: metadata.owner },
          };
        });
      });
  },
});

export const { toggleStatus, toggleActions, toggleAction, updateStatuses } = actionSlice.actions;
export default actionSlice.reducer; 