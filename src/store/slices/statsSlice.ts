import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { bannerPred, StatsPayload } from '../../library/requestIdsUtils';
import { Executedquery } from '../../library/ThunksUtils';
import { Banner as TutorialBanner } from './tutorialSlice';
import { Banner as CourseBanner } from './courseSlice';
import { setCleared, signedOut } from './sessionSlice';
import { Quiz } from './quizSlice';
import { SelectedRoute } from './searchSlice';
import type { IDsAtRequestState, RequestContainerIds } from '../../library/requestIdsUtils';

export type StatsState = {
  total: Record<string, number> | undefined;
  totals: Record<string, Record<string, number>>;
  executedQueries: Record<string, Record<string, Executedquery>>;
  counts: Record<string, Record<string, Record<string, number>>>;
  IDsAtRequest: IDsAtRequestState;
};

const initialState: StatsState = {
  IDsAtRequest: {},
  executedQueries: {},
  total: undefined,
  totals: {},
  counts: {}
};

const storeStatsAtKey = (
  state: StatsState,
  finalKey: string,
  counts: Record<string, Record<string, number>>,
  totals: Record<string, number>,
  query: Record<string, Record<string, Executedquery>>,
  clearTotal?: boolean
) => {
  if (clearTotal && totals) state.total = undefined;
  const curcounts = state.counts[finalKey];
  if (curcounts === undefined) state.counts[finalKey] = counts;
  else state.counts[finalKey] = Object.assign(curcounts, counts);
  const curtotals = state.totals[finalKey];
  if (curtotals === undefined) state.totals[finalKey] = totals;
  else state.totals[finalKey] = Object.assign(curtotals, totals);
  const curquery = state.executedQueries[finalKey];
  if (curquery === undefined) state.executedQueries[finalKey] = query;
  else state.executedQueries[finalKey] = Object.assign(curquery, query);
};

const clearRequestIds = (state: StatsState, requestId?: string) => {
  if (requestId) delete state.IDsAtRequest[requestId];
};

const getCoursePennantIdsForKey = (
  requestId: string | undefined,
  IDsAtRequest: IDsAtRequestState,
  courseBannerId: number | undefined,
  pennants: CourseBanner[],
  selected: number
): number[] => {
  if (requestId) {
    return IDsAtRequest[requestId]?.course?.banners.find((banner) => banner.id === courseBannerId)?.pennantIds ?? [];
  }
  return pennants[selected]?.pennants.filter((pennant) => pennant.isHighlighted).map((pennant) => pennant.id) ?? [];
};

const getQuizQuestionIdsForKey = (
  requestId: string | undefined,
  IDsAtRequest: IDsAtRequestState,
  rootId: number | undefined,
  pennantz: CourseBanner[]
): number[] => {
  if (requestId) {
    return (IDsAtRequest[requestId]?.quiz?.banners ?? [])
      .filter((banner) => banner.bannerId === rootId)
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((banner) => banner.id);
  }
  return pennantz
    .filter((pennant) => pennant.bannerId === rootId && pennant.isHighlighted)
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((pennant) => pennant.id);
};

const getTutorialBannerIdForKey = (
  requestId: string | undefined,
  IDsAtRequest: IDsAtRequestState,
  banners: TutorialBanner[],
  selected: number
): number | undefined => {
  if (requestId) {
    return IDsAtRequest[requestId]?.tutorial?.banners[0];
  }
  return banners[selected]?.id;
};

const getCourseBannerIdForKey = (
  requestId: string | undefined,
  IDsAtRequest: IDsAtRequestState,
  pennants: CourseBanner[],
  selected: number
): number | undefined => {
  if (requestId) {
    return IDsAtRequest[requestId]?.course?.banners[0]?.id;
  }
  return pennants[selected]?.id;
};

const getQuizRootIdForKey = (
  requestId: string | undefined,
  IDsAtRequest: IDsAtRequestState,
  quizzes: Quiz[],
  selected: number
): number | undefined => {
  if (requestId) {
    return IDsAtRequest[requestId]?.quiz?.quizzes[0];
  }
  return quizzes[selected]?.id;
};

export type TutorialPayload = {
  curApp: number;
  curMailer: number;
  selected: number;
  banners: TutorialBanner[];
  selectedRoute: SelectedRoute;
  routes: Record<number, string>;
  totals: Record<string, number>;
  counts: Record<string, Record<string, number>>;
  query: Record<string, Record<string, Executedquery>>;
  requestId?: string;
};

export type CoursePayload = {
  curApp: number;
  selected: number;
  curMailer: number;
  pennants: CourseBanner[];
  selectedRoute: SelectedRoute;
  routes: Record<number, string>;
  totals: Record<string, number>;
  counts: Record<string, Record<string, number>>;
  query: Record<string, Record<string, Executedquery>>;
  requestId?: string;
};

export type QuizzesPayload = {
  curApp: number;
  quizzes: Quiz[];
  selected: number;
  curMailer: number;
  pennantz: CourseBanner[];
  selectedRoute: SelectedRoute;
  routes: Record<number, string>;
  totals: Record<string, number>;
  counts: Record<string, Record<string, number>>;
  query: Record<string, Record<string, Executedquery>>;
  requestId?: string;
};

export type NonPncPayload = {
  curApp: number;
  curMailer: number;
  selectedRoute: SelectedRoute;
  totals: Record<string, number>;
  routes: Record<number, string>;
  counts: Record<string, Record<string, number>>;
  query: Record<string, Record<string, Executedquery>>;
  requestId?: string;
};

export const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    registerIDsAtRequest: (state, action: PayloadAction<{ requestId: string; ids: RequestContainerIds }>) => {
      state.IDsAtRequest[action.payload.requestId] = action.payload.ids;
    },
    clearIDsAtRequest: (state, action: PayloadAction<string>) => {
      delete state.IDsAtRequest[action.payload];
    },
    insertTutorialCounts: (state, action: PayloadAction<TutorialPayload>) => {
      const { selected, banners, counts, totals, query, curApp, curMailer, selectedRoute, requestId } = action.payload;
      if(counts === undefined || counts === null) return;
      const { traversal, keywords, index } = selectedRoute;
      const isFoundation = traversal === "foundationfilters";
      const search = keywords[index]?.keyword ?? "";
      const key = `[${curMailer.toString()}]${curApp.toString()}`;
      if (selected === -1) {
        const finalKey = isFoundation ? key + search : key;
        storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
      }
      else if (selected > -1) {
        const tutorialBannerId = getTutorialBannerIdForKey(requestId, state.IDsAtRequest, banners, selected);
        const finalKey = !isFoundation ? key + search + (tutorialBannerId ?? '') : key + (tutorialBannerId ?? '');
        storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
      }
      clearRequestIds(state, requestId);
    },
    insertCourseCounts: (state, action: PayloadAction<CoursePayload>) => {
      const { selected, pennants, counts, routes, query, curApp, curMailer, totals, selectedRoute, requestId } = action.payload;
      if(counts === undefined || counts === null) return;
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${curApp.toString()}`;
      if (selected === -1) {
        const finalKey = routes[curApp] === traversal ? workspace + search : workspace;
        storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
      }
      else if (selected > -1) {
        const webapp = curApp.toString();
        const pageroute = routes[curApp];
        const courseBannerId = getCourseBannerIdForKey(requestId, state.IDsAtRequest, pennants, selected);
        const isNestedRoot = pageroute.startsWith("siftersfil");
        const isNestedRoute = pageroute.startsWith("siftersins");
        const isSecondNestedRoot = pageroute.startsWith("filtersins");
        const selectedPennantIds = getCoursePennantIdsForKey(
          requestId,
          state.IDsAtRequest,
          courseBannerId,
          pennants,
          selected
        );
        const key = isSecondNestedRoot
          ? webapp + pageroute + selectedPennantIds.join('-') + '-' : isNestedRoot || isNestedRoute
            ? webapp + pageroute : webapp;
        const finalKey = pageroute === traversal
          ? key + (courseBannerId ?? '') + search
          : key + (courseBannerId ?? '');
        storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
      }
      clearRequestIds(state, requestId);
    },
    insertQuizzesCounts: (state, action: PayloadAction<QuizzesPayload>) => {
      const { selected, quizzes, counts, routes, query, curApp, curMailer, pennantz, totals, selectedRoute, requestId } = action.payload;
      if(counts === undefined || counts === null) return;
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${curApp.toString()}`;
      if (selected === -1) {
        const finalKey = routes[curApp] === traversal ? workspace + search : workspace;
        storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
      }
      else if (selected > -1) {
        const pageroute = routes[curApp];
        const rootId = getQuizRootIdForKey(requestId, state.IDsAtRequest, quizzes, selected);
        if (rootId === undefined) {
          clearRequestIds(state, requestId);
          return;
        }
        const isRootRoute = pageroute.startsWith("dashboardsfil");
        const isNestedRoute = pageroute.startsWith("siftersins");
        const isNestedRoot = pageroute.startsWith("dashboardssif");
        const isSecondNestedRoot = pageroute.startsWith("siftersfil");
        const isSecondNestedRoute = pageroute.startsWith("filtersins");
        const selectedQuestionIds = getQuizQuestionIdsForKey(requestId, state.IDsAtRequest, rootId, pennantz);

        if (isNestedRoot || isRootRoute) {
          const key = workspace + rootId.toString() + pageroute;
          const finalKey = pageroute === traversal ? key + search : key;
          storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
        }
        else if ((isNestedRoute || isSecondNestedRoot) && selectedQuestionIds.length > 0) {
          const courseKeys = selectedQuestionIds.join('-');
          const key = workspace + rootId.toString() + pageroute + courseKeys;
          const finalKey = pageroute === traversal ? key + search : key;
          storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
        }
        else if (isSecondNestedRoute && selectedQuestionIds.length > 0) {
          const courseKey = selectedQuestionIds.join('-');
          const key = workspace + rootId.toString() + 'dashboardssifters' + courseKey + pageroute;
          const finalKey = pageroute === traversal ? key + search : key;
          storeStatsAtKey(state, finalKey, counts, totals, query, !!totals);
        }
        else if ((isNestedRoute || isSecondNestedRoot || isSecondNestedRoute) && selectedQuestionIds.length === 0)
          console.warn("no Question(s) selected, pagination stats discarded");
      }
      clearRequestIds(state, requestId);
    },
    insertTutorsCounts: (state, action: PayloadAction<NonPncPayload>) => {
      const { counts, query, curApp, curMailer, totals, routes, selectedRoute } = action.payload;
      if(counts === undefined || counts === null) return;
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      if (totals) state.total = undefined;
      const pageroute = routes[curApp];
      const workspace = `[${curMailer.toString()}]${curApp.toString()}`;
      const key = workspace + pageroute;
      const finalKey = pageroute === traversal ? key + search : key;
      const curcounts = state.counts[finalKey];
      if (curcounts === undefined) state.counts[finalKey] = counts;
      else state.counts[finalKey] = Object.assign(curcounts, counts);
      const curtotals = state.totals[finalKey];
      if (curtotals === undefined) state.totals[finalKey] = totals;
      else state.totals[finalKey] = Object.assign(curtotals, totals);
      const curquery = state.executedQueries[finalKey];
      if (curquery === undefined) state.executedQueries[finalKey] = query;
      else state.executedQueries[finalKey] = Object.assign(curquery, query);
    },
    insertIncomingCounts: (state, action: PayloadAction<NonPncPayload>) => {
      const { counts, query, curApp, curMailer, totals, routes, selectedRoute } = action.payload;
      if(counts === undefined || counts === null) return;
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      if (totals) state.total = undefined;
      const pageroute = routes[curApp];
      const workspace = `[${curMailer.toString()}]${curApp.toString()}`;
      const key = workspace + pageroute;
      const finalKey = pageroute === traversal ? key + search : key;
      const curcounts = state.counts[finalKey];
      if (curcounts === undefined) state.counts[finalKey] = counts;
      else state.counts[finalKey] = Object.assign(curcounts, counts);
      const curtotals = state.totals[finalKey];
      if (curtotals === undefined) state.totals[finalKey] = totals;
      else state.totals[finalKey] = Object.assign(curtotals, totals);
      const curquery = state.executedQueries[finalKey];
      if (curquery === undefined) state.executedQueries[finalKey] = query;
      else state.executedQueries[finalKey] = Object.assign(curquery, query);
    },
    insertOutgoingCounts: (state, action: PayloadAction<NonPncPayload>) => {
      const { counts, query, curApp, curMailer, totals, routes, selectedRoute } = action.payload;
      if(counts === undefined || counts === null) return;
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      if (totals) state.total = undefined;
      const pageroute = routes[curApp];
      const workspace = `[${curMailer.toString()}]${curApp.toString()}`;
      const key = workspace + pageroute;
      const finalKey = pageroute === traversal ? key + search : key;
      const curcounts = state.counts[finalKey];
      if (curcounts === undefined) state.counts[finalKey] = counts;
      else state.counts[finalKey] = Object.assign(curcounts, counts);
      const curtotals = state.totals[finalKey];
      if (curtotals === undefined) state.totals[finalKey] = totals;
      else state.totals[finalKey] = Object.assign(curtotals, totals);
      const curquery = state.executedQueries[finalKey];
      if (curquery === undefined) state.executedQueries[finalKey] = query;
      else state.executedQueries[finalKey] = Object.assign(curquery, query);
    },
    setTotal: (state, action: PayloadAction<{ total: Record<string, number> | undefined }>) => {
      state.total = action.payload.total;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(signedOut, (state) => {
      console.log("cleared_stats");
      state.totals = {};
      state.counts = {};
      state.total = undefined;
      state.executedQueries = {};
      state.IDsAtRequest = {};
    })
      .addCase(setCleared, (state, action) => {
        if (action.payload) state.total = undefined;
      })
      .addMatcher(
        (action): action is { type: 'fetchData/rejected'; meta: { requestId: string } } =>
          action.type === 'fetchData/rejected',
        (state, action) => {
          const { requestId } = action.meta;
          if (requestId) delete state.IDsAtRequest[requestId];
        }
      );
  },
});


export const getCounts = (payload: StatsPayload, stats: StatsState['counts']): Record<string, Record<string, number>> | undefined => {
  return getStats(payload, stats) as Record<string, Record<string, number>> | undefined;
}

export const getTotals = (payload: StatsPayload, stats: StatsState['totals']): Record<string, number> | undefined => {
  return getStats(payload, stats) as Record<string, number> | undefined;
}

export const getExecutedQueries = (payload: StatsPayload, stats: StatsState['executedQueries']): Record<string, Record<string, Executedquery>> | undefined => {
  return getStats(payload, stats as Record<string, Record<string, number> | Record<string, Record<string, number>> | Record<string, Record<string, Executedquery>>>) as Record<string, Record<string, Executedquery>> | undefined;
}

const getStats = <T extends Record<string, number> | Record<string, Record<string, number>> | Record<string, Record<string, Executedquery>>>({
  app,
  webapp,
  selectedT,
  selectedC,
  selectedQ,
  quizzes,
  pennantz,
  pennants,
  banners,
  curMailer,
  selectedRoute,
  selecteds: routes,
}:
  StatsPayload,
  stats: Record<string, T>): T | undefined => {
  switch (app) {
    case "tutorial": {
      const pageroute = routes[webapp];
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${webapp.toString()}`;
      const finalKey = pageroute === traversal ? workspace + search : workspace;
      if (selectedT === -1) return stats[finalKey];
      else if (selectedT > -1 && banners[selectedT]) return stats[finalKey + (banners[selectedT]?.id ?? '')];
      else return undefined
    };
    case "course": {
      const pageroute = routes[webapp];
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      if (selectedC === -1) {
        const workspace = `[${curMailer.toString()}]${webapp.toString()}`;
        const finalKey = pageroute === traversal ? workspace + search : workspace;
        return stats[finalKey];
      }
      else if (selectedC > -1 && pennants[selectedC]) {
        const _webapp = webapp.toString();
        const selectedCourseBanner = pennants[selectedC];
        const isNestedRoot = pageroute.startsWith("siftersfil");
        const isNestedRoute = pageroute.startsWith("siftersins");
        const isSecondNestedRoot = pageroute.startsWith("filtersins");
        const selectedPennants = selectedCourseBanner?.pennants.filter(pennant => pennant.isHighlighted).sort((a, b) => a.ordinal - b.ordinal);
        const key = isSecondNestedRoot
          ? _webapp + pageroute + (selectedPennants.map(p => p.id).join('-')) + '-' : isNestedRoot || isNestedRoute
            ? _webapp + pageroute : _webapp;
        const finalKey = pageroute === traversal
          ? key + (selectedCourseBanner?.id ?? '') + search
          : key + (selectedCourseBanner?.id ?? '');
        return stats[finalKey];
      }
      else return undefined
    };
    case "quiz": {
      const pageroute = routes[webapp];
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${webapp.toString()}`;
      const finalKey = pageroute === traversal ? workspace + search : workspace;
      if (selectedQ === -1) return stats[finalKey];
      else if (selectedQ > -1 && quizzes[selectedQ]) {
        const rootId = quizzes[selectedQ]?.id;
        const isRootRoute = pageroute.startsWith("dashboardsfil");
        const isNestedRoute = pageroute.startsWith("siftersins");
        const isNestedRoot = pageroute.startsWith("dashboardssif");
        const isSecondNestedRoot = pageroute.startsWith("siftersfil");
        const isSecondNestedRoute = pageroute.startsWith("filtersins");
        const predicate = (pennant: ReturnType<ReturnType<typeof bannerPred>>) => pennant.bannerId === rootId && pennant.isHighlighted;
        const selectedCoursePennants: ReturnType<ReturnType<typeof bannerPred>>[] = pennantz.filter(predicate).sort((a, b) => a.ordinal - b.ordinal);;

        if (isNestedRoot || isRootRoute) {
          const key = workspace + rootId.toString() + pageroute;
          const finalKey = pageroute === traversal ? key + search : key;
          return stats[finalKey];
        }
        else if ((isNestedRoute || isSecondNestedRoot) && selectedCoursePennants.length > 0) {
          const key = workspace + rootId.toString() + pageroute + selectedCoursePennants.map(p => p.id).join('-');
          const finalKey = pageroute === traversal ? key + search : key;
          return stats[finalKey];
        }
        else if (isSecondNestedRoute && selectedCoursePennants.length > 0) {
          const courseKey = selectedCoursePennants.map(p => p.id).join('-');
          const key = workspace + rootId.toString() + 'dashboardssifters' + courseKey + pageroute;
          const finalKey = pageroute === traversal ? key + search : key;
          return stats[finalKey];
        }
        else if ((isNestedRoute || isSecondNestedRoot || isSecondNestedRoute) && selectedCoursePennants.length === 0) {
          console.warn("no Question(s) selected, pagination stats unavailable");
          return undefined;
        }
        else return undefined
      }
    };
    case "outgoing": {
      const pageroute = routes[webapp];
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${webapp.toString()}`;
      const key = workspace + pageroute;
      const finalKey = pageroute === traversal ? key + search : key;
      return stats[finalKey];
    };
    case "incoming": {
      const pageroute = routes[webapp];
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${webapp.toString()}`;
      const key = workspace + pageroute;
      const finalKey = pageroute === traversal ? key + search : key;
      return stats[finalKey];
    };
    case "tutors": {
      const pageroute = routes[webapp];
      const { traversal, keywords, index } = selectedRoute;
      const search = keywords[index]?.keyword ?? "";
      const workspace = `[${curMailer.toString()}]${webapp.toString()}`;
      const key = workspace + pageroute;
      const finalKey = pageroute === traversal ? key + search : key;
      return stats[finalKey];
    };
    default:
      return undefined;
  }
}

export const {
  setTotal,
  registerIDsAtRequest,
  clearIDsAtRequest,
  insertTutorialCounts,
  insertCourseCounts,
  insertQuizzesCounts,
  insertTutorsCounts,
  insertIncomingCounts,
  insertOutgoingCounts,
} = statsSlice.actions;
export default statsSlice.reducer;
