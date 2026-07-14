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
  },
});

export const {
  uncacheTraversal,
  mutateAlgorithm,
} = traversalSlice.actions;

export default traversalSlice.reducer; 