import type { Dispatch } from '@reduxjs/toolkit';
import { setPagedRoute } from '../store/slices/paginationSlice';
import { setSelectedRoute } from '../store/slices/searchSlice';
import type { RootState } from '../store/types';

export const QUIZ_ROUTES = {
  dashboardSifters: 'dashboardssifters',
  dashboardFilters: 'dashboardsfilters',
  siftersInstructions: 'siftersinstructions',
  siftersFilters: 'siftersfilters',
  filtersInstructions: 'filtersinstructions',
} as const;

export type QuizTraversalRoute = typeof QUIZ_ROUTES[keyof typeof QUIZ_ROUTES];

export type QuizRouteToggleSide = 'left' | 'right';
export type QuizRouteToggleView = 'question' | 'followup';

export type QuizRouteToggleBannerPayload = {
  bannerId: number;
};

export type QuizRouteToggleOrangeMark = {
  bannerId: number;
  view: QuizRouteToggleView;
  side: QuizRouteToggleSide;
};

export type QuizRouteToggleGreenIds = Partial<Record<QuizTraversalRoute, number[]>>;

export const QUIZ_ROUTE_TOGGLE_COLOR_ROUTES: Record<
  QuizRouteToggleView,
  Record<QuizRouteToggleSide, QuizTraversalRoute>
> = {
  question: {
    left: QUIZ_ROUTES.dashboardFilters,
    right: QUIZ_ROUTES.siftersInstructions,
  },
  followup: {
    left: QUIZ_ROUTES.dashboardFilters,
    right: QUIZ_ROUTES.filtersInstructions,
  },
};

export const QUIZ_ROUTE_TOGGLE_COMMON_ROUTES: Record<QuizRouteToggleView, QuizTraversalRoute> = {
  question: QUIZ_ROUTES.dashboardSifters,
  followup: QUIZ_ROUTES.siftersFilters,
};

export const QUIZ_ROUTE_TOGGLE_PAIRS: Record<
  QuizRouteToggleView,
  Record<QuizRouteToggleSide, [QuizTraversalRoute, QuizTraversalRoute]>
> = {
  question: {
    left: [QUIZ_ROUTES.dashboardFilters, QUIZ_ROUTES.dashboardSifters],
    right: [QUIZ_ROUTES.dashboardSifters, QUIZ_ROUTES.siftersInstructions],
  },
  followup: {
    left: [QUIZ_ROUTES.siftersFilters, QUIZ_ROUTES.dashboardFilters],
    right: [QUIZ_ROUTES.siftersFilters, QUIZ_ROUTES.filtersInstructions],
  },
};

export const toggleBetweenRoutes = (current: string, a: string, b: string): string =>
  current === a ? b : a;

export const getOppositeRouteToggleSide = (side: QuizRouteToggleSide): QuizRouteToggleSide =>
  side === 'left' ? 'right' : 'left';

export const getQuizSelectedRoute = (state: RootState): string => {
  const { curApp } = state.session;
  return state.pagination.selectedRoutes[curApp] ?? '';
};

export const dispatchQuizPagedRoute = (
  dispatch: Dispatch,
  getState: () => RootState,
  route: string,
): void => {
  const state = getState();
  const { curApp } = state.session;
  dispatch(setPagedRoute([curApp, route]));
  const { selectedRoute } = state.search;
  if (selectedRoute.traversal !== route) {
    dispatch(setSelectedRoute({
      ...selectedRoute,
      traversal: route,
    }));
  }
};

export const isRouteToggleSessionActive = (
  greenIds: QuizRouteToggleGreenIds,
  orangeMarks: QuizRouteToggleOrangeMark[] | undefined,
): boolean =>
  Object.values(greenIds).some((ids) => (ids?.length ?? 0) > 0) || (orangeMarks?.length ?? 0) > 0;

const isGreenOnSide = (
  greenIds: QuizRouteToggleGreenIds,
  bannerId: number,
  view: QuizRouteToggleView,
  side: QuizRouteToggleSide,
): boolean => {
  const colorRoute = QUIZ_ROUTE_TOGGLE_COLOR_ROUTES[view][side];
  return greenIds[colorRoute]?.includes(bannerId) ?? false;
};

const hasOrangeMarkOnSide = (
  orangeMarks: QuizRouteToggleOrangeMark[],
  bannerId: number,
  view: QuizRouteToggleView,
  side: QuizRouteToggleSide,
): boolean =>
  orangeMarks.some(
    (mark) => mark.bannerId === bannerId && mark.view === view && mark.side === side,
  );

export const getRouteToggleOState = (
  bannerId: number,
  view: QuizRouteToggleView,
  side: QuizRouteToggleSide,
  greenIds: QuizRouteToggleGreenIds,
  orangeMarks: QuizRouteToggleOrangeMark[] | undefined,
  primarySide: QuizRouteToggleSide | null | undefined,
): 'white' | 'green' | 'orange' => {
  const marks = orangeMarks ?? [];
  if (isGreenOnSide(greenIds, bannerId, view, side)) return 'green';
  if (hasOrangeMarkOnSide(marks, bannerId, view, side)) return 'orange';
  if (!isRouteToggleSessionActive(greenIds, marks)) return 'white';
  if (primarySide == null) return 'orange';
  if (side === getOppositeRouteToggleSide(primarySide)) return 'white';
  return 'orange';
};

export const routeMatchesRouteToggleMarks = (
  route: string,
  greenIds: QuizRouteToggleGreenIds,
  orangeMarks: QuizRouteToggleOrangeMark[] | undefined,
): boolean => {
  const marks = orangeMarks ?? [];
  if (!isRouteToggleSessionActive(greenIds, marks)) return true;

  const hasGreenColorRoutes = (Object.keys(greenIds) as QuizTraversalRoute[]).some(
    (colorRoute) => (greenIds[colorRoute]?.length ?? 0) > 0,
  );

  if (hasGreenColorRoutes) {
    return (Object.keys(greenIds) as QuizTraversalRoute[]).some(
      (colorRoute) => (greenIds[colorRoute]?.length ?? 0) > 0 && route === colorRoute,
    );
  }

  for (const mark of marks) {
    const [a, b] = QUIZ_ROUTE_TOGGLE_PAIRS[mark.view][mark.side];
    if (route === a || route === b) return true;
  }

  return route === QUIZ_ROUTE_TOGGLE_COMMON_ROUTES.question
    || route === QUIZ_ROUTE_TOGGLE_COMMON_ROUTES.followup;
};

export const computeRouteToggleClick = (
  payload: { bannerId: number; view: QuizRouteToggleView; side: QuizRouteToggleSide },
  greenIds: QuizRouteToggleGreenIds,
  orangeMarks: QuizRouteToggleOrangeMark[] | undefined,
  primarySide: QuizRouteToggleSide | null | undefined,
  currentRoute: string,
): {
  greenIds: QuizRouteToggleGreenIds;
  orangeMarks: QuizRouteToggleOrangeMark[];
  primarySide: QuizRouteToggleSide | null;
  route: string;
} => {
  const { bannerId, view, side } = payload;
  const marks = orangeMarks ?? [];
  const colorRoute = QUIZ_ROUTE_TOGGLE_COLOR_ROUTES[view][side];
  const oState = getRouteToggleOState(bannerId, view, side, greenIds, marks, primarySide);

  if (oState === 'green') {
    const nextGreenIds = { ...greenIds };
    const ids = nextGreenIds[colorRoute]?.filter((id) => id !== bannerId) ?? [];
    if (ids.length > 0) nextGreenIds[colorRoute] = ids;
    else delete nextGreenIds[colorRoute];
    return {
      greenIds: nextGreenIds,
      orangeMarks: [...marks, { bannerId, view, side }],
      primarySide: primarySide ?? null,
      route: currentRoute,
    };
  }

  if (oState === 'orange') {
    const nextGreenIds = { ...greenIds };
    const ids = [...(nextGreenIds[colorRoute] ?? [])];
    if (!ids.includes(bannerId)) ids.push(bannerId);
    nextGreenIds[colorRoute] = ids;
    const nextOrangeMarks = marks.filter(
      (mark) => !(mark.bannerId === bannerId && mark.view === view && mark.side === side),
    );
    return {
      greenIds: nextGreenIds,
      orangeMarks: nextOrangeMarks,
      primarySide: primarySide ?? side,
      route: currentRoute,
    };
  }

  const oppositeSide = getOppositeRouteToggleSide(side);
  const counterpartOState = getRouteToggleOState(
    bannerId,
    view,
    oppositeSide,
    greenIds,
    marks,
    primarySide,
  );

  if (isRouteToggleSessionActive(greenIds, marks) && counterpartOState !== 'white') {
    return {
      greenIds: {},
      orangeMarks: [],
      primarySide: null,
      route: QUIZ_ROUTE_TOGGLE_COMMON_ROUTES[view],
    };
  }

  if (!isRouteToggleSessionActive(greenIds, marks)) {
    return {
      greenIds: { [colorRoute]: [bannerId] },
      orangeMarks: [],
      primarySide: side,
      route: colorRoute,
    };
  }

  const nextGreenIds = { ...greenIds };
  const ids = [...(nextGreenIds[colorRoute] ?? [])];
  if (!ids.includes(bannerId)) ids.push(bannerId);
  nextGreenIds[colorRoute] = ids;
  return {
    greenIds: nextGreenIds,
    orangeMarks: marks,
    primarySide: primarySide ?? side,
    route: colorRoute,
  };
};

export const resolveRouteToggleBannerIdForFallback = (
  quiz: Pick<RootState['quiz'], 'banners' | 'followupId' | 'routeToggleGreenIds' | 'routeToggleOrangeMarks'>,
  selectedQueryRoute: string,
): number | undefined => {
  const { routeToggleGreenIds, routeToggleOrangeMarks, banners, followupId } = quiz;
  if (!isRouteToggleSessionActive(routeToggleGreenIds, routeToggleOrangeMarks)) return undefined;

  const toggleId =
    routeToggleGreenIds[selectedQueryRoute as QuizTraversalRoute]?.[0] ??
    Object.values(routeToggleGreenIds).find((ids) => (ids?.length ?? 0) > 0)?.[0];

  if (toggleId === undefined) return undefined;

  if (banners.some((banner) => banner.id === toggleId)) return toggleId;

  if (followupId !== undefined) {
    const parent = banners.find((banner) => banner.id === followupId);
    if (parent?.pennants.some((pennant) => pennant.id === toggleId)) return followupId;
  }

  return undefined;
};
