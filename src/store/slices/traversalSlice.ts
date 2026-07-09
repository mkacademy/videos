import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ParentData } from './viewSlice';

export interface Traversal {
  urlID: string;
  contentIds: number[];
  encodedData: string;
  from: string;
  fromIMG: string;
  toIMG: string;
  parentData: ParentData;
  to: string;
  prefix?: string;
  search?: string;
}

export interface TraversalState {
  traversals: Traversal[];
  algorithm: Traversal[];
}

const initialState: TraversalState = {
  traversals: [],
  algorithm: []
};

export const traversalSlice = createSlice({
  name: 'traversal',
  initialState,
  reducers: {
    appendTraversal: (state, action: PayloadAction<Partial<Traversal>>) => {
      const { traversals } = state;
      let notTraversal = false;
      const nState = traversals.map((trav) => {
        const left = action.payload.urlID?.toLowerCase();
        const right = trav.urlID.toLowerCase();
        const isMatch = left === right;
        if (!isMatch) return { ...trav };
        const mergedIds = [...(action.payload.contentIds || []), ...trav.contentIds];
        const contentIds = [...new Set(mergedIds)];
        console.log("cachedIds - ", contentIds?.toString());
        notTraversal = isMatch;
        return { ...trav, contentIds };
      });
      if (notTraversal) {
        state.traversals = nState;
        return;
      }
      nState.unshift(action.payload as Traversal);
      state.traversals = nState;
    },
    purgeTraversal: (state, action: PayloadAction<string>) => {
      state.traversals = state.traversals.filter(t => t.urlID !== action.payload);
    },
    uncacheTraversal: (state, action: PayloadAction<string>) => {
      state.traversals = state.traversals.map((trav) => {
        const left = action.payload.toLowerCase();
        const right = trav.urlID.toLowerCase();
        const isMatch = left === right;
        if (!isMatch) return { ...trav };
        if (trav.contentIds.length) {
          console.log("clearedCachedIds - ", trav.contentIds?.toString());
        }
        return { ...trav, contentIds: [] };
      });
    },
    mutateAlgorithm: (state, action: PayloadAction<Traversal[]>) => {
      state.algorithm = action.payload;
    },
    clearTraversals: (state) => {
      state.traversals = [];
    }
  },
});

export const {
  appendTraversal,
  purgeTraversal,
  uncacheTraversal,
  mutateAlgorithm,
  clearTraversals
} = traversalSlice.actions;

export default traversalSlice.reducer; 