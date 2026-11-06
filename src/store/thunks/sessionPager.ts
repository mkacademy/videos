import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../index';
import { fetchData } from '../../library/Thunks';
import { buildFetchDataPayload, type Executedquery } from '../../library/ThunksUtils';
import {
  buildItemPageQuery,
  extractPageCounts,
  KIND_BY_SCREEN,
  pageCountForScreen,
  sessionItemParentIds,
  type PagerScreen,
} from '../../library/sessionPager';
import { convolutionDelay } from '../../utils';
import { setSessions, type SessionItem } from '../slices/sessionSlice';
import {
  beginPagerSet,
  hidePagerScreen,
  recordEndPage,
  recordPagerPage,
  setSessionIndex,
  showPagerItem,
  showPagerScreen,
} from '../slices/sessionPagerSlice';
import { UnzipAndHydrate } from '../../library/actions';

type ThunkApi = { state: RootState; dispatch: AppDispatch };

const SCREENS: PagerScreen[] = ['tutorial', 'course', 'quiz'];

const delayMs = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/** One page fetch at a time; extra clicks while fetching are ignored. */
let pageInFlight = false;

/** Media screens have no open-banner state, so the pager is never locked here. */
export const isPagerLocked = (_state: RootState, _screen: PagerScreen): boolean => false;

const hasTreeFor = (state: RootState, screen: PagerScreen, itemId: number): boolean => {
  const { TutorialTrees, CourseTrees, QuizTrees } = state.settings;
  if (screen === 'tutorial') return !!TutorialTrees[itemId];
  if (screen === 'course') return !!CourseTrees[itemId];
  return !!QuizTrees[itemId];
};

const currentSessionId = (state: RootState): number | undefined =>
  state.sessionPager.sessionIds[state.sessionPager.sessionIndex];

/** Last page this session can show: below the first known-empty page, and at most k. */
export const lastPageFor = (state: RootState, screen: PagerScreen, sessionId: number | undefined): number => {
  const k = pageCountForScreen(state.sessionPager.pageCounts, screen);
  if (sessionId === undefined) return 0;
  const end = state.sessionPager.endPage[screen][sessionId];
  return end === undefined ? k : Math.min(k, end - 1);
};

const showItem = async (
  dispatch: AppDispatch,
  getState: () => RootState,
  screen: PagerScreen,
  page: number,
  item: SessionItem,
) => {
  const state = getState();
  dispatch(showPagerItem({ screen, page, itemId: item.id }));
  if (hasTreeFor(state, screen, item.id)) return;
  if (!state.session.sessionItems.some((entry) => entry.id === item.id)) {
    dispatch(setSessions({ sessionItems: [...state.session.sessionItems, item] }));
  }
  dispatch(UnzipAndHydrate({ pagerItemId: item.id }));
};

/** Freeze the session set + counts after the first query of a search / deep link. */
export const initSessionPager = createAsyncThunk<
  void,
  { searchKey: string; executedQueries: Record<string, Executedquery> | undefined },
  ThunkApi
>('sessionPager/init', async ({ searchKey, executedQueries }, { dispatch, getState }) => {
  const state = getState();
  if (state.sessionPager.searchKey === searchKey && state.sessionPager.sessionIds.length > 0) return;
  const sessionIds = state.session.sessions.map((session) => session.id);
  const rawCounts = state.sessionPager.lastResponseCounts ?? {};
  dispatch(beginPagerSet({
    searchKey,
    sessionIds,
    pageCounts: extractPageCounts(rawCounts),
    rawCounts,
    executedQueries: executedQueries ?? {},
  }));
  if (sessionIds.length === 0) return;

  // Items returned by the first query become page 1 of their session.
  const seen = new Set<string>();
  for (const item of state.session.sessionItems) {
    const screen = SCREENS.find((s) => KIND_BY_SCREEN[s] === item.kind);
    if (!screen) continue;
    const parents = sessionItemParentIds(item);
    const sessionId = parents.find((id) => sessionIds.includes(id)) ?? (parents.length === 0 ? sessionIds[0] : undefined);
    if (sessionId === undefined) continue;
    const key = `${screen}:${sessionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dispatch(recordPagerPage({ screen, sessionId, page: 1, item }));
    if (sessionId === sessionIds[0]) dispatch(showPagerItem({ screen, page: 1, itemId: item.id }));
  }
});

/** Show item page N of the current session: cache first, else fetch that one item. */
export const pageSessionItem = createAsyncThunk<void, { screen: PagerScreen; page: number }, ThunkApi>(
  'sessionPager/pageItem',
  async ({ screen, page }, { dispatch, getState }) => {
    if (pageInFlight) return;
    const state = getState();
    const sessionId = currentSessionId(state);
    if (sessionId === undefined || isPagerLocked(state, screen)) return;
    if (page < 1 || page > lastPageFor(state, screen, sessionId)) return;

    pageInFlight = true;
    try {
      dispatch(hidePagerScreen());
      await delayMs(convolutionDelay);

      const cached = getState().sessionPager.pages[screen][sessionId]?.[page];
      if (cached) {
        await showItem(dispatch, getState, screen, page, cached);
        return;
      }

      const before = getState();
      const { isUnzipCourses, isUnzipQuizzes, isUnzipTutorials } = before.settings;
      const itemsBefore = before.session.sessionItems;
      const result = await dispatch(fetchData(buildFetchDataPayload(
        { isUnzipCourses, isUnzipQuizzes, isUnzipTutorials },
        {
          search: null,
          webapp: 'session',
          convolution: 'session',
          requestTake: 1,
          queriesOverride: buildItemPageQuery(before.sessionPager.executedQueries, screen, sessionId, page),
          counts: before.sessionPager.rawCounts,
        },
      )));
      if (fetchData.rejected.match(result)) {
        dispatch(showPagerScreen());
        return;
      }

      const after = getState().session.sessionItems;
      const kind = KIND_BY_SCREEN[screen];
      const item = after === itemsBefore
        ? undefined
        : after.find((entry) => {
          if (entry.kind !== kind) return false;
          const parents = sessionItemParentIds(entry);
          return parents.length === 0 || parents.includes(sessionId);
        });

      if (!item) {
        // Nothing at this page: this session has no items from here on.
        dispatch(recordEndPage({ screen, sessionId, page }));
        dispatch(showPagerScreen());
        return;
      }
      dispatch(recordPagerPage({ screen, sessionId, page, item }));
      await showItem(dispatch, getState, screen, page, item);
    } finally {
      pageInFlight = false;
    }
  },
);

/** Move within the fixed session set; never fetches session rows. */
export const pageSession = createAsyncThunk<void, { screen: PagerScreen; direction: 'next' | 'prev' }, ThunkApi>(
  'sessionPager/pageSession',
  async ({ screen, direction }, { dispatch, getState }) => {
    const state = getState();
    if (pageInFlight || isPagerLocked(state, screen)) return;
    const { sessionIds, sessionIndex } = state.sessionPager;
    const nextIndex = direction === 'next' ? sessionIndex + 1 : sessionIndex - 1;
    if (nextIndex < 0 || nextIndex >= sessionIds.length) return;
    dispatch(setSessionIndex(nextIndex));
    for (const s of SCREENS) dispatch(showPagerItem({ screen: s, page: 1, itemId: null }));
    await dispatch(pageSessionItem({ screen, page: 1 }));
  },
);

/** Prev / Next: item pages first, then the neighbouring session. */
export const pageAdjacent = createAsyncThunk<void, { screen: PagerScreen; direction: 'next' | 'prev' }, ThunkApi>(
  'sessionPager/pageAdjacent',
  async ({ screen, direction }, { dispatch, getState }) => {
    const state = getState();
    if (pageInFlight || isPagerLocked(state, screen)) return;
    const current = state.sessionPager.page[screen];
    if (direction === 'next') {
      const last = lastPageFor(state, screen, currentSessionId(state));
      if (current + 1 <= last) {
        await dispatch(pageSessionItem({ screen, page: current + 1 }));
        return;
      }
      await dispatch(pageSession({ screen, direction: 'next' }));
      return;
    }
    if (current > 1) {
      await dispatch(pageSessionItem({ screen, page: current - 1 }));
      return;
    }
    await dispatch(pageSession({ screen, direction: 'prev' }));
  },
);
