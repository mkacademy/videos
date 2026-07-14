import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  mergeInteractions,
  initInteractions,
  restoreInteractions,
  fetchingCompleted,
} from '../../library/actions';
import { removeRows } from './rowSlice';
import { getEntityFromUrl, getInteractionIDs } from '../../utils';
import { LinkTableProps } from '../../components/Core/types';

export interface InteractionOption {
  undone: boolean;
  owner: boolean | null;
}

export interface InteractionState {
  options: InteractionOption[];
  clicked: number[];
}

export interface MergeInteractionsPayload {
  data: LinkTableProps[];
  orig: string;
  dest: string;
}

export interface InitInteractionsPayload {
  data: number[];
  orig: string;
  dest: string;
}

export interface RestoreInteractionsPayload {
  data: InteractionState;
  orig: string;
  dest: string;
}

interface FetchingCompletedPayload {
  dest?: string;
  orig?: string;
}

const oPred0 = (r: LinkTableProps, rId: string, lId: string) => (R: InteractionOption) =>
  R[rId] === r[rId] && R[lId] === r[lId];

const mergeInteractionsHelper = (state: InteractionOption[], fetched: LinkTableProps[], rit: string, lft: string) =>
  fetched.map((interaction) => {
    const curInteraction = state.find(oPred0(interaction, rit, lft));
    return {
      ...interaction,
      undone: curInteraction ? curInteraction.undone : false,
    };
  });

const initialState: InteractionState = { options: [], clicked: [] };

export const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(mergeInteractions, (state, action: PayloadAction<MergeInteractionsPayload>) => {
        const { data: fetchedInteractions, orig, dest } = action.payload;
        const { parentID: rit, childID: lft } = getInteractionIDs(orig, dest);
        if (!rit || !lft) return;
        const merged = mergeInteractionsHelper(state.options, fetchedInteractions, rit, lft);
        const pred0 = (r: InteractionOption, rId: string, lId: string) => (R: LinkTableProps & { undone: boolean; owner?: boolean }) =>
          (r[rId] === null && R[lId] === r[lId]) ||
          (R[rId] === r[rId] && R[lId] === r[lId]);
        const pred1 = (r: InteractionOption) => merged.findIndex(pred0(r, rit, lft)) === -1;
        const newOptions = state.options
          .filter(pred1)
          .concat(merged.map(m => ({ ...m, owner: m.owner ?? null })))
          .map((m) => (m.owner === null ? { ...m, owner: false } : m));
        state.options = newOptions;
      })
      .addCase(initInteractions, (state, action: PayloadAction<InitInteractionsPayload>) => {
        const { orig, data, dest } = action.payload;
        console.log("init_interactions", orig + dest);
        const { parentID, childID } = getInteractionIDs(orig, dest);
        if (!parentID || !childID) return;
        const placeholders = data.map((id) => ({
          [parentID]: null,
          [childID]: id,
          owner: null,
          undone: false,
        }));
        if (state.options.length === 0) {
          state.options = [...placeholders];
        } else {
          state.options = state.options.concat(placeholders);
        }
      })
      .addCase(restoreInteractions, (_, action: PayloadAction<RestoreInteractionsPayload>) => {
        const { data } = action.payload;
        console.log("restore_interactions");
        return { ...data, clicked: [] };
      })
      .addCase(removeRows, (state, action: PayloadAction<string[]>) => {
        const url = window.location.pathname;
        const entity = getEntityFromUrl(url);
        if (!entity) return;
        const { childID: cID } = getInteractionIDs("", entity);
        if (!cID) return;
        const pred2 = (r: InteractionOption) => (ID: string) => ID === r[cID];
        const newOptions = state.options.filter(
          (r) => action.payload.findIndex(pred2(r)) === -1
        );
        state.options = newOptions;
      })
      .addCase(fetchingCompleted, (state, action) => {
        const payload = action.payload as FetchingCompletedPayload | undefined;
        if (!payload || !payload.dest || !payload.orig) return;
        const { dest, orig } = payload;
        const { parentID: rit, childID: lft } = getInteractionIDs(orig, dest);
        if (!rit || !lft) return;
        const pred0 = (r: InteractionOption, rId: string, lId: string) => (R: InteractionOption) =>
          (r[rId] === null && R[lId] === r[lId]) ||
          (R[rId] === r[rId] && R[lId] === r[lId]);
        const newOptions = state.options.filter(
          (r, p, s) => s.findIndex(pred0(r, rit, lft)) === p
        );
        state.options = newOptions;
      });
  },
});

export default interactionSlice.reducer; 