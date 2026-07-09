import type { Draft } from 'immer';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { imageTextSwap } from '../../library/actions';
import { signedOut } from './sessionSlice';
import { DataRow } from '../../components/Core/types';

/** One stash bucket: row payload plus optional PNC inventory-nav cursor (hierarchy base unix). */
export interface StashCell {
  rows: DataRow[];
  unixSeconds: number | null;
}

export type StashRouteBucket = Record<string, StashCell>;

export interface StashState {
  [approute: string]: StashRouteBucket;
}

export function normalizeStashCell(value: StashCell | undefined | null): StashCell {
  if (value == null || value === undefined) return { rows: [], unixSeconds: null };
  return {
    rows: value.rows ?? [],
    unixSeconds: value.unixSeconds ?? null,
  };
}

export function getStashCellRows(value: StashCell | undefined | null): DataRow[] {
  return normalizeStashCell(value).rows;
}

/** First non-null `unixSeconds` on any stash cell (inventory nav cursor), or `null`. */
export function readStashInventoryNavUnixSeconds(stash: StashState): number | null {
  for (const approute of Object.keys(stash)) {
    const route = stash[approute];
    if (!route) continue;
    for (const timestamp of Object.keys(route)) {
      const u = normalizeStashCell(route[timestamp]).unixSeconds;
      if (u != null) return u;
    }
  }
  return null;
}

export interface StashPayload {
  content: DataRow[];
  approute: string;
  timestamp: string;
}

const initialStash: StashState = {};

function applyAppendRoute(state: Draft<StashState>, payload: StashPayload) {
  const { approute, content = [], timestamp } = payload;
  const curContent = state[approute] ?? {};
  const prevCell = normalizeStashCell(curContent[timestamp]);
  const curStash = prevCell.rows;

  state[approute] = {
    ...curContent,
    [timestamp]: {
      rows: Object.values(
        [...curStash, ...content].reduce(
          (previous: DataRow, cur: DataRow) => ({
            ...previous,
            [cur.id]: cur,
          }),
          {} as DataRow
        )
      ),
      unixSeconds: prevCell.unixSeconds,
    },
  };
}

export const stashSlice = createSlice({
  name: 'stash',
  initialState: initialStash,
  reducers: {
    resetStash: () => initialStash,
    appendRoutes: (state, action: PayloadAction<StashPayload[]>) => {
      const { payload } = action;
      payload.forEach((stashPayload: StashPayload) => {
        applyAppendRoute(state, stashPayload);
      });
    },
    appendRoute: (state, action: PayloadAction<StashPayload>) => {
      applyAppendRoute(state, action.payload);
    },
    removeTimestamp: (state, action: PayloadAction<{
      approute: string;
      timestamp: string;
    }>) => {
      const { approute, timestamp } = action.payload;
      if (state[approute]) {
        delete state[approute][timestamp];
      }
    },
    setStashInventoryNavSelection: (
      state,
      action: PayloadAction<{ hierarchyUnix: number; members: Array<{ approute: string; timestamp: string }> }>
    ) => {
      const { hierarchyUnix, members } = action.payload;
      const memberSet = new Set(members.map((m) => `${m.approute}\x00${m.timestamp}`));
      for (const approute of Object.keys(state)) {
        const route = state[approute];
        if (!route) continue;
        for (const timestamp of Object.keys(route)) {
          const cell = normalizeStashCell(route[timestamp]);
          const key = `${approute}\x00${timestamp}`;
          route[timestamp] = {
            ...cell,
            unixSeconds: memberSet.has(key) ? hierarchyUnix : null,
          };
        }
      }
    },
    removeStash: (state, action: PayloadAction<{
      approute: string;
      timestampIds?: string[];
      timestamp: string;
    }>) => {
      const { approute, timestampIds: ids = [], timestamp } = action.payload;
      const IDs = ids.map((id: string) => parseInt(id));
      const curContent = state[approute];
      if (!curContent) return;

      const prevCell = normalizeStashCell(curContent[timestamp]);
      const curStash = prevCell.rows;
      const remainingstash = curStash.filter(({ id }: DataRow) => !IDs.includes(id as number));

      if (remainingstash.length > 0) {
        state[approute][timestamp] = { rows: remainingstash, unixSeconds: prevCell.unixSeconds };
      } else {
        delete state[approute][timestamp];
      }
    },
    modifyTimestamp: (state, action: PayloadAction<{
      approute: string;
      oldtimestamp: string;
      newtimestamp: string;
    }>) => {
      const { approute, oldtimestamp, newtimestamp } = action.payload;
      if (state[approute] && state[approute][oldtimestamp]) {
        const content = normalizeStashCell(state[approute][oldtimestamp]);
        delete state[approute][oldtimestamp];
        state[approute][newtimestamp] = content;
      }
    },
    modifyTimestamps: (state, action: PayloadAction<Array<{
      approute: string;
      oldtimestamp: string;
      newtimestamp: string;
    }>>) => {
      const updates = action.payload;
      if (!updates.length) return;
      const moved = new Map<string, StashCell>();

      for (const { approute, oldtimestamp } of updates) {
        const raw = state[approute]?.[oldtimestamp];
        if (!raw) continue;
        const content = normalizeStashCell(raw);
        moved.set(`${approute}@@${oldtimestamp}`, content);
      }

      for (const { approute, oldtimestamp } of updates) {
        if (!state[approute]?.[oldtimestamp]) continue;
        delete state[approute][oldtimestamp];
      }

      for (const { approute, oldtimestamp, newtimestamp } of updates) {
        const content = moved.get(`${approute}@@${oldtimestamp}`);
        if (!content) continue;
        if (!state[approute]) state[approute] = {};
        state[approute][newtimestamp] = content;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signedOut, () => {
        console.log("cleared_stash");
        return {};
      })
      .addCase(imageTextSwap, (state, action) => {
        const { txtimg, txtswap } = action.payload;

        for (const [routeKey, routeValues] of Object.entries(state)) {
          if (!routeKey.endsWith("instructions")) continue;

          for (const [timestampKey, cellRaw] of Object.entries(routeValues)) {
            const cell = normalizeStashCell(cellRaw);
            const timestampValues = cell.rows;
            state[routeKey][timestampKey] = {
              ...cell,
              rows: timestampValues.map((step: DataRow) => {
                const { imageurl, details } = step;
                if (txtimg) {
                  return { ...step, modified: true, imageurl: details };
                } else if (txtswap) {
                  return {
                    ...step,
                    modified: true,
                    imageurl: details,
                    details: imageurl,
                  };
                } else {
                  return step;
                }
              }),
            };
          }
        }
      });
  },
});

export const {
  resetStash,
  appendRoute,
  removeStash,
  appendRoutes,
  removeTimestamp,
  modifyTimestamp,
  modifyTimestamps,
  setStashInventoryNavSelection,
} = stashSlice.actions;

export default stashSlice.reducer; 