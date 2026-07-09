import { createSlice } from '@reduxjs/toolkit';
import {
  prependRowz,
  appendRowz,
  removeRows,
  updateIds,
  clearData
} from './rowSlice';
import { truncatedStringify } from '../../utils';

export interface DescendentItem {
  sums: number[];
  ids: string[];
  entity: string;
}

export type DecendentState = DescendentItem[];

const initialDecendent: DecendentState = [];

export const decendentSlice = createSlice({
  name: 'decendent',
  initialState: initialDecendent,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(prependRowz, (state, action) => {
        let indeces: { s: number; i: number }[];
        if (!action.payload?.data?.descendents) return state;
        if (state.length === 0) return [...action.payload.data.descendents];
        return state.map((descendent, i) => {
          const imply = (item: DescendentItem) => item.entity === descendent.entity;
          const match = action.payload.data.descendents.find(imply);
          if (i === 0) {
            const pred = (id: string) => (ID: string) => ID === id;
            const affirm = (id: string, i: number) => ({ s: match?.ids.findIndex(pred(id)) ?? -1, i });
            indeces = descendent.ids.map(affirm).filter((m) => m.s === -1);
          }
          return {
            sums: match?.sums.concat(indeces.map((m) => descendent.sums[m.i])) ?? [],
            ids: match?.ids.concat(indeces.map((m) => descendent.ids[m.i])) ?? [],
            entity: descendent.entity,
          };
        });
      })
      .addCase(appendRowz, (state, action) => {
        let indeces: { s: number; i: number }[];
        if (!action.payload?.data?.descendents) return state;
        if (state.length === 0) return [...action.payload.data.descendents];
        return state.map((descendent, i) => {
          const pred = (item: DescendentItem) => item.entity === descendent.entity;
          const match = action.payload.data.descendents.find(pred);
          if (match === undefined) {
            const log1 = truncatedStringify(action.payload.data.descendents, 30, 2);
            const log0 = truncatedStringify(descendent, 30, 2);
            console.log("state-", log0, "payload-", log1);
          }
          if (i === 0) {
            const pred = (id: string) => (ID: string) => ID === id;
            const affirm = (id: string, i: number) => ({ s: match?.ids.findIndex(pred(id)) ?? -1, i });
            indeces = descendent.ids.map(affirm).filter((m) => m.s === -1);
          }
          return {
            sums: indeces.map((m) => descendent.sums[m.i]).concat(match?.sums ?? []),
            ids: indeces.map((m) => descendent.ids[m.i]).concat(match?.ids ?? []),
            entity: descendent.entity,
          };
        });
      })
      .addCase(removeRows, (state, action) => {
        if (state.length === 0) return [];
        const ids1 = action.payload;
        const predicate = (id: string, i: number) =>
          ids1.findIndex((Id: string) => Id === id) > -1 ? i : -1;
        const indeces2 = state[0].ids.map(predicate);
        const pred = (_: number | string, i: number) => indeces2.findIndex((I) => I === i) === -1;
        return state.map((descendent) => {
          return {
            sums: descendent.sums.filter(pred),
            ids: descendent.ids.filter(pred),
            entity: descendent.entity,
          };
        });
      })
      .addCase(updateIds, (state, action) => {
        const indeces: number[] = [];
        const ids = action.payload;
        const affirm = (ID: string) => {
          indeces.unshift(ids.findIndex((id: string) => id === ID));
          return indeces[0] > -1 && indeces[0] % 2 === 0
            ? ids[indeces[0] + 1]
            : ID;
        };
        return state.map((descendent) => {
          indeces.length = 0;
          return {
            entity: descendent.entity,
            sums: [...descendent.sums],
            ids: descendent.ids.map(affirm),
          };
        });
      })
      .addCase(clearData, () => {
        console.log("cleared_descendents");
        return [];
      });
  },
});

export default decendentSlice.reducer; 