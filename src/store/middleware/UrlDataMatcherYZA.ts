import { Middleware, type Dispatch } from '@reduxjs/toolkit';
import { setPagedRoute, setPagedRoutes } from "../slices/paginationSlice";
import { getEncodeDataPartFromUrl, getCurAppName, bannerRoutes as validRoutes, pncApps, convolutionTake, getConvSearch } from "../../utils";
import { updateCsObj } from "../slices/paginationSlice";
import { updateIds, appendRowz, prependRowz } from "../slices/rowSlice";
import { appendContentz, prependContentz } from "../slices/contentSlice";
import { extractCsObject, insertMetadata, updateMetadataId, urlGuidMismatch } from "../../library/actions";
import { toggleTutorial } from "../slices/tutorialSlice";
import {
  toggleCourse,
  setChapters,
  resetChapters,
  setChaptersViaSlideId,
  setChaptersViaPennantId,
} from "../slices/courseSlice";
import { toggleQuiz, setFollowupId, setRouteToggleMarks, clearRouteToggleMarks } from "../slices/quizSlice";
import type { RootState } from '../index';
import { fetchData } from '../../library/Thunks';
import { viewRequestFetching } from '../slices/viewSlice';
import { prependError } from '../slices/errorSlice';
import { insertKeyword, setSelectedRoute } from '../slices/searchSlice';
import {
  toggleQuizFollowupOptionsRoute,
  toggleQuizFollowupSubmissionRoute,
  toggleQuizQuestionOptionsRoute,
  toggleQuizQuestionSubmissionRoute,
} from '../../library/actions';
import {
  dispatchQuizPagedRoute,
  getQuizSelectedRoute,
  QUIZ_ROUTES,
  computeRouteToggleClick,
  routeMatchesRouteToggleMarks,
  isRouteToggleSessionActive,
  type QuizRouteToggleSide,
  type QuizRouteToggleView,
} from '../../library/quizRouteMatcherUtils';

interface PayloadWithGUID {
  GUID: string;
  [key: string]: unknown;
}

const isRequestedData = (GUID: string): boolean => {
  const urlParts = window.location.pathname.split(/[\/\?]+/);
  const index = urlParts.indexOf(GUID);
  return index > -1;
};

const isDataFetcherAction = (action: unknown): action is { type: string, payload: PayloadWithGUID } => {
  return dataFetchers.some(creator => creator.match(action));
};

// my first custom middleware
export const dataFetchersIndeces = { content: [1, 2], rows: [3, 4] };
export const dataFetchers = [
  insertMetadata,
  appendContentz,
  prependContentz,
  appendRowz,
  prependRowz,
];

const syncRouteToggleMarksWithRoute = (
  dispatch: Dispatch,
  getState: () => RootState,
): void => {
  const { routeToggleGreenIds, routeToggleOrangeMarks } = getState().quiz;
  const route = getQuizSelectedRoute(getState());
  if (
    isRouteToggleSessionActive(routeToggleGreenIds, routeToggleOrangeMarks) &&
    !routeMatchesRouteToggleMarks(route, routeToggleGreenIds, routeToggleOrangeMarks)
  ) {
    dispatch(clearRouteToggleMarks());
  }
};

const handleQuizRouteToggle = (
  dispatch: Dispatch,
  getState: () => RootState,
  view: QuizRouteToggleView,
  side: QuizRouteToggleSide,
  bannerId: number,
): void => {
  const state = getState();
  const current = getQuizSelectedRoute(state);
  const { routeToggleGreenIds, routeToggleOrangeMarks, routeTogglePrimarySide } = state.quiz;
  const wasInactive = !isRouteToggleSessionActive(routeToggleGreenIds, routeToggleOrangeMarks);
  const result = computeRouteToggleClick(
    { bannerId, view, side },
    routeToggleGreenIds,
    routeToggleOrangeMarks,
    routeTogglePrimarySide,
    current,
  );
  dispatch(setRouteToggleMarks({
    greenIds: result.greenIds,
    orangeMarks: result.orangeMarks,
    primarySide: result.primarySide,
  }));
  const becameActive = isRouteToggleSessionActive(result.greenIds, result.orangeMarks);
  if (result.route !== current || (wasInactive && becameActive)) {
    dispatchQuizPagedRoute(dispatch, getState, result.route);
  }
};

const UrlDataMatcher: Middleware<{}, RootState> = ({ getState, dispatch }) => {
  return (next) => (action) => {
    if (isDataFetcherAction(action)) {
      const { payload } = action;
      const { GUID, ...freight } = payload;
      if (isRequestedData(GUID)) return next({ type: action.type, payload: freight });
      console.log("fetched_data discarded - urlMismatch");
      return next(urlGuidMismatch);
    }

    if (updateCsObj.match(action)) {
      const { payload } = action;
      const { curApp } = getState().session;
      return next(updateCsObj([curApp, payload as string]));
    }

    if (setPagedRoute.match(action)) {
      const { payload } = action;
      const result = Array.isArray(payload)
        ? next(action)
        : (() => {
          const { curApp } = getState().session;
          return next(setPagedRoute([curApp, payload]));
        })();
      syncRouteToggleMarksWithRoute(dispatch, getState);
      return result;
    }

    if (toggleQuiz.match(action) || toggleCourse.match(action) || toggleTutorial.match(action)) {
      const state = getState();
      const {
        search: {
          selectedRoute: { traversal } = { traversal: undefined },
        },
        pagination: { selectedRoutes },
        session: { curApp },
      } = state;
      const selected = getConnectedAppSelector((action).type, state);
      if (selected === -1) {
        const inValidRoute = Object.entries(selectedRoutes).find(
          ([a, r]) => parseInt(a) === curApp && typeof r === 'string' && r.startsWith("foundation")
        );
        if (inValidRoute) {
          if (traversal === undefined || traversal === null || traversal === "" || traversal.startsWith("foundation")) {
            const [_, route] = inValidRoute;
            const validRoute =
              route.replace("foundation", "") + getDefaultChildRoute((action).type);
            setTimeout(() => dispatch(setPagedRoute([curApp, validRoute])));
          } else setTimeout(() => dispatch(setPagedRoute([curApp, traversal])));
        }
      } else {
        const inValidRoute = Object.entries(selectedRoutes).find(
          ([a, r]) => parseInt(a) === curApp && typeof r === 'string' && !r.startsWith("foundation")
        );
        if (inValidRoute) {
          const [app] = inValidRoute;
          const name = getCurAppName(app);
          const validRoute =
            validRoutes[pncApps.findIndex((n) => n === name)];
          setTimeout(() => dispatch(setPagedRoute([curApp, validRoute])));
        }
      }
      return next(action);
    }

    if (
      setChapters.match(action) ||
      setChaptersViaSlideId.match(action) ||
      setChaptersViaPennantId.match(action) ||
      resetChapters.match(action)
    ) {
      const state = getState();
      const {
        search: {
          selectedRoute: { traversal } = { traversal: undefined },
        },
        pagination: { selectedRoutes },
        session: { curApp },
        course: { chapters, selected },
      } = state;
      const chapterChildRoute = getChapterChildRoute();

      if (resetChapters.match(action)) {
        if (chapters.length > 0) {
          const onChapterRoute = Object.entries(selectedRoutes).find(
            ([a, r]) =>
              parseInt(a) === curApp &&
              typeof r === 'string' &&
              r === chapterChildRoute
          );
          if (onChapterRoute) {
            const [app] = onChapterRoute;
            const name = getCurAppName(app);
            const foundationRoute = validRoutes[pncApps.findIndex((n) => n === name)];
            const validRoute =
              foundationRoute.replace("foundation", "") + getDefaultChildRoute(toggleCourse.type);
            setTimeout(() => dispatch(setPagedRoute([curApp, validRoute])));
          }
        }
      } else if (chapters.length === 0 && selected > -1) {
        const notOnChapterRoute = Object.entries(selectedRoutes).find(
          ([a, r]) =>
            parseInt(a) === curApp &&
            typeof r === 'string' &&
            r !== chapterChildRoute
        );
        if (notOnChapterRoute) {
          if (
            traversal === undefined ||
            traversal === null ||
            traversal === "" ||
            traversal.startsWith("foundation") ||
            traversal.startsWith("sifters")
          ) {
            setTimeout(() => dispatch(setPagedRoute([curApp, chapterChildRoute])));
          } else {
            setTimeout(() => dispatch(setPagedRoute([curApp, traversal])));
          }
        }
      }
      return next(action);
    }

    if (toggleQuizQuestionSubmissionRoute.match(action)) {
      handleQuizRouteToggle(dispatch, getState, 'question', 'left', action.payload.bannerId);
      return next(action);
    }

    if (toggleQuizQuestionOptionsRoute.match(action)) {
      handleQuizRouteToggle(dispatch, getState, 'question', 'right', action.payload.bannerId);
      return next(action);
    }

    if (toggleQuizFollowupSubmissionRoute.match(action)) {
      handleQuizRouteToggle(dispatch, getState, 'followup', 'left', action.payload.bannerId);
      return next(action);
    }

    if (toggleQuizFollowupOptionsRoute.match(action)) {
      handleQuizRouteToggle(dispatch, getState, 'followup', 'right', action.payload.bannerId);
      return next(action);
    }

    if (setFollowupId.match(action)) {
      const result = next(action);
      if (getState().quiz.selected > -1) {
        const route = action.payload === undefined
          ? QUIZ_ROUTES.dashboardSifters
          : QUIZ_ROUTES.siftersFilters;
        dispatchQuizPagedRoute(dispatch, getState, route);
      }
      syncRouteToggleMarksWithRoute(dispatch, getState);
      return result;
    }

    if (updateIds.match(action)) {
      const { payload } = action;
      const { entity } = getState().view;
      dispatch(updateMetadataId({ entity: entity || '', ids: payload }));
      return next(action);
    }

    if (fetchData.fulfilled.match(action)) {
      dispatch(viewRequestFetching(false));
      return next(action);
    }

    if (fetchData.rejected.match(action)) {
      dispatch(prependError(action.payload ?? ''));
      dispatch(viewRequestFetching(false));
      return next(action);
    }

    return next(action);
  };
};

export const InsertGUID: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (isDataFetcherAction(action)) {
    const { payload } = action;
    const { GUID, ...freight } = payload;
    if (GUID === undefined) {
      const urlData = getEncodeDataPartFromUrl();
      const goods = { ...freight, GUID: urlData };
      return next({ type: action.type, payload: goods });
    }
  }
  else if (fetchData.fulfilled.match(action)) {
    const state = getState();
    const { curApp } = state.session;
    const { selectedRoutes } = state.pagination;
    const selectedRoute = selectedRoutes[curApp];
    const executedQuery = action.payload?.[selectedRoute + 'records'];
    if (executedQuery) {
      const { skip, take } = executedQuery;
      const pageRouteObj = { skip: skip ?? 0, take: take ?? convolutionTake() };
      const pageObj = { [selectedRoute]: pageRouteObj };
      dispatch(setPagedRoutes([curApp, pageObj]));
    }
  }
  else if (extractCsObject.match(action)) {
    const state = getState();
    const { curApp } = state.session;
    const { selectedRoutes } = state.pagination;
    const selectedRoute = selectedRoutes[curApp];
    const searchObj = getConvSearch(window.location.search) ?? {};
    for (const [_, value] of Object.entries(searchObj)) {
      const { search } = value as { search: string };
     if (search) dispatch(insertKeyword({ keyword: search, count: "-" }));
    }
    if (searchObj[selectedRoute]?.search) {
      const search = searchObj[selectedRoute]?.search;
      const keywords = [{ keyword: search, count: "-" }];
      dispatch(setSelectedRoute({ traversal: selectedRoute, keywords, index: 0 }));
    }
  }
  return next(action);
};

const getDefaultChildRoute = (key: string): string => {
  switch (key) {
    case toggleTutorial.type:
    case toggleCourse.type:
      return "instructions";
    case toggleQuiz.type:
      return "sifters";
    default:
      throw new Error("a default child route is required per connected app!");
  }
};

const getChapterChildRoute = (): string => "filtersinstructions";

const getConnectedAppSelector = (key: string, state: RootState): number => {
  switch (key) {
    case toggleCourse.type: {
      const {
        course: { selected },
      } = state;
      return selected;
    }
    case toggleTutorial.type: {
      const {
        tutorial: { selected },
      } = state;
      return selected;
    }
    case toggleQuiz.type: {
      const {
        quiz: { selected },
      } = state;
      return selected;
    }
    default:
      throw new Error(
        "a selected root index property is required per connected app!"
      );
  }
};

export default UrlDataMatcher; 