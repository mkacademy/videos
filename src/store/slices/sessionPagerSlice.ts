import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SessionItem } from './sessionSlice';
import { signedOut } from './sessionSlice';
import type { Executedquery } from '../../library/ThunksUtils';
import { emptyPageCounts, type PagerPageCounts, type PagerScreen } from '../../library/sessionPager';

type PerScreen<T> = Record<PagerScreen, T>;

const perScreen = <T>(make: () => T): PerScreen<T> => ({
  tutorial: make(),
  course: make(),
  quiz: make(),
});

export interface SessionPagerState {
  /** Identifies the fixed set: the search string or deep-link query that produced it. */
  searchKey: string | null;
  /** Fixed session set, frozen at the first query of a search / deep link. */
  sessionIds: number[];
  sessionIndex: number;
  /** Current 1-based item page per screen (each kind keeps its own position). */
  page: PerScreen<number>;
  visibleItemId: PerScreen<number | null>;
  screenHidden: boolean;
  /** One-time totals per route, summed over every session in the set. */
  pageCounts: PagerPageCounts;
  /** Counts as returned by the backend; sent back so later requests skip recounting. */
  rawCounts: Record<string, Record<string, number>>;
  /** First query map; template for item-page fetches. */
  executedQueries: Record<string, Executedquery>;
  /** sessionId -> page -> item. Whole items, because `setSessions` replaces `sessionItems`. */
  pages: PerScreen<Record<number, Record<number, SessionItem>>>;
  /** sessionId -> first page found empty; that page and every page after it are disabled. */
  endPage: PerScreen<Record<number, number>>;
  /** Counts from the most recent session response, captured by `fetchData`. */
  lastResponseCounts: Record<string, Record<string, number>> | null;
}

const initialState: SessionPagerState = {
  searchKey: null,
  sessionIds: [],
  sessionIndex: 0,
  page: perScreen(() => 1),
  visibleItemId: perScreen(() => null),
  screenHidden: false,
  pageCounts: emptyPageCounts(),
  rawCounts: {},
  executedQueries: {},
  pages: perScreen(() => ({})),
  endPage: perScreen(() => ({})),
  lastResponseCounts: null,
};

export interface BeginPagerSetPayload {
  searchKey: string;
  sessionIds: number[];
  pageCounts: PagerPageCounts;
  rawCounts: Record<string, Record<string, number>>;
  executedQueries: Record<string, Executedquery>;
}

const sessionPagerSlice = createSlice({
  name: 'sessionPager',
  initialState,
  reducers: {
    beginPagerSet: (state, action: PayloadAction<BeginPagerSetPayload>) => ({
      ...initialState,
      ...action.payload,
      lastResponseCounts: state.lastResponseCounts,
    }),
    capturedSessionResponse: (state, action: PayloadAction<Record<string, Record<string, number>> | null>) => {
      state.lastResponseCounts = action.payload;
    },
    setSessionIndex: (state, action: PayloadAction<number>) => {
      state.sessionIndex = action.payload;
    },
    showPagerItem: (state, action: PayloadAction<{ screen: PagerScreen; page: number; itemId: number | null }>) => {
      const { screen, page, itemId } = action.payload;
      state.page[screen] = page;
      state.visibleItemId[screen] = itemId;
      state.screenHidden = false;
    },
    hidePagerScreen: (state) => {
      state.screenHidden = true;
    },
    showPagerScreen: (state) => {
      state.screenHidden = false;
    },
    recordPagerPage: (
      state,
      action: PayloadAction<{ screen: PagerScreen; sessionId: number; page: number; item: SessionItem }>,
    ) => {
      const { screen, sessionId, page, item } = action.payload;
      const bySession = state.pages[screen][sessionId] ?? {};
      state.pages[screen][sessionId] = { ...bySession, [page]: item };
    },
    recordEndPage: (state, action: PayloadAction<{ screen: PagerScreen; sessionId: number; page: number }>) => {
      const { screen, sessionId, page } = action.payload;
      const known = state.endPage[screen][sessionId];
      if (known === undefined || page < known) state.endPage[screen][sessionId] = page;
    },
    resetSessionPager: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(signedOut, () => initialState);
  },
});

export const {
  beginPagerSet,
  capturedSessionResponse,
  setSessionIndex,
  showPagerItem,
  hidePagerScreen,
  showPagerScreen,
  recordPagerPage,
  recordEndPage,
  resetSessionPager,
} = sessionPagerSlice.actions;

export default sessionPagerSlice.reducer;
