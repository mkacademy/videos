import type { UnknownAction } from "@reduxjs/toolkit";
import { clearFetched, clearSelected, fetchedClearers } from "./actions";
import { getCommIdsByRoute, RouteType } from "./commsUtils";
import { setCurPage } from "./Thunks";
import type { AppDispatch } from "../store";
import type { RootState } from "../store/types";
import { setCleared, setClearedByApp } from "../store/slices/sessionSlice";
import {
  clearCourseTrees,
  clearQuizTrees,
  clearTutorialTrees,
} from "../store/slices/settingsSlice";
import { eraseIncoming, eraseOutgoing } from "../store/slices/commsSlice";

/** Mirrors `isMaximumFeatures` in App.tsx: partial convolution UI when any unzip flag is on. */
export const isMinimumFeatureMode = (state: RootState): boolean =>
  state.settings.isUnzipCourses ||
  state.settings.isUnzipQuizzes ||
  state.settings.isUnzipTutorials;

const matchFetchedClearerPath = (pathname: string): keyof typeof fetchedClearers | undefined =>
  (Object.keys(fetchedClearers) as (keyof typeof fetchedClearers)[]).find(
    (p) => pathname === p || pathname.endsWith(p),
  );

/** Full feature mode: same as FullAccount clear — `setCleared` then `clearFetched` via `fetchedClearers`. */
export const dispatchConvolutionClearFetched = (
  dispatch: AppDispatch,
  getState: () => RootState,
): void => {
  const matched = matchFetchedClearerPath(window.location.pathname);
  if (!matched) return;
  const dismised = getState().session.dismissals[matched] ?? false;
  dispatch(setCleared(true));
  dispatch(clearFetched({ pathname: matched, payload: dismised }));
};

export const dispatchSettingsClearContent = (
  dispatch: (action: UnknownAction) => void,
  getState: () => RootState,
): void => {
  const state = getState();
  const { dismissals } = state.session;
  const {
    clearContentType: cCT,
    TutorialTrees: tutorialTrees,
    CourseTrees: courseTrees,
    QuizTrees: quizTrees,
  } = state.settings;

  dispatch(setCleared(true));
  switch (cCT) {
    case "tutorial": {
      const route = "foundationfilters";
      const pathname = `/convolution/${cCT}`;
      const dismised = dismissals?.[pathname] ?? false;
      const ids = Object.values(tutorialTrees).flatMap((tree) => [
        ...Object.keys(tree)
          .filter((key) => key !== "_orphans")
          .map((key) => parseInt(key, 10)),
        ...(tree._orphans ?? []),
      ]);
      dispatch(clearSelected({ pathname, payload: { Ids: ids, isShow: dismised, route } }));
      const dataItems = Object.keys(tutorialTrees)
        .flatMap((item: string) => parseInt(item, 10))
        .map((item: number) => ({ id: item }));
      const identifiers0 = getCommIdsByRoute(dataItems, "bossesfilters" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers0, isShow: dismised }));
      const identifiers1 = getCommIdsByRoute(dataItems, "minionsfilters" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers1, isShow: dismised }));
      const identifiers2 = getCommIdsByRoute(dataItems, "underbossesfilters" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers2, isShow: dismised }));
      const identifiers3 = getCommIdsByRoute(dataItems, route as RouteType);
      dispatch(eraseIncoming({ Ids: identifiers3, isShow: dismised }));
      dispatch(setClearedByApp({ app: "incoming", isCleared: true }));
      dispatch(setClearedByApp({ app: "outgoing", isCleared: true }));
      dispatch(clearTutorialTrees());
      setCurPage(0);
      break;
    }
    case "course": {
      const route = "foundationsifters";
      const pathname = `/convolution/${cCT}`;
      const dismised = dismissals?.[pathname] ?? false;
      const ids = Object.values(courseTrees).flatMap((tree) => [
        ...Object.keys(tree)
          .filter((key) => key !== "_orphans")
          .map((key) => parseInt(key, 10)),
        ...(tree._orphans ?? []),
      ]);
      dispatch(clearSelected({ pathname, payload: { Ids: ids, isShow: dismised, route } }));
      const dataItems = Object.keys(courseTrees)
        .flatMap((item: string) => parseInt(item, 10))
        .map((item: number) => ({ id: item }));
      const identifiers0 = getCommIdsByRoute(dataItems, "bossessifters" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers0, isShow: dismised }));
      const identifiers1 = getCommIdsByRoute(dataItems, "minionssifters" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers1, isShow: dismised }));
      const identifiers3 = getCommIdsByRoute(dataItems, "underbossessifters" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers3, isShow: dismised }));
      const identifiers4 = getCommIdsByRoute(dataItems, route as RouteType);
      dispatch(eraseIncoming({ Ids: identifiers4, isShow: dismised }));
      dispatch(setClearedByApp({ app: "incoming", isCleared: true }));
      dispatch(setClearedByApp({ app: "outgoing", isCleared: true }));
      dispatch(clearCourseTrees());
      setCurPage(0);
      break;
    }
    case "quiz": {
      const route = "foundationdashboards";
      const pathname = `/convolution/${cCT}`;
      const dismised = dismissals?.[pathname] ?? false;
      const ids = Object.values(quizTrees).flatMap((tree) => [
        ...Object.keys(tree)
          .filter((key) => key !== "_orphans")
          .map((key) => parseInt(key, 10)),
        ...(tree._orphans ?? []),
      ]);
      dispatch(clearSelected({ pathname, payload: { Ids: ids, isShow: dismised, route } }));
      const dataItems = Object.keys(quizTrees)
        .flatMap((item: string) => parseInt(item, 10))
        .map((item: number) => ({ id: item }));
      const identifiers0 = getCommIdsByRoute(dataItems, "bossesdashboards" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers0, isShow: dismised }));
      const identifiers1 = getCommIdsByRoute(dataItems, "minionsdashboards" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers1, isShow: dismised }));
      const identifiers2 = getCommIdsByRoute(dataItems, "underbossesdashboards" as RouteType);
      dispatch(eraseOutgoing({ Ids: identifiers2, isShow: dismised }));
      const identifiers3 = getCommIdsByRoute(dataItems, route as RouteType);
      dispatch(eraseIncoming({ Ids: identifiers3, isShow: dismised }));
      dispatch(setClearedByApp({ app: "incoming", isCleared: true }));
      dispatch(setClearedByApp({ app: "outgoing", isCleared: true }));
      dispatch(clearQuizTrees());
      setCurPage(0);
      break;
    }
    default:
      break;
  }
};
