import type { UnknownAction } from "@reduxjs/toolkit";
import type { NavigateFunction } from "react-router-dom";
import { clearSelected } from "./actions";
import { getCommIdsByRoute, RouteType } from "./commsUtils";
import { setCurPage } from "./Thunks";
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

/** Strip the query string from the current URL (pathname and hash preserved). */
const clearContentUrlSearch = (navigate?: NavigateFunction): void => {
  if (typeof window === "undefined") return;
  const { pathname, hash, search } = window.location;
  if (!search) return;
  if (navigate) {
    navigate({ pathname, hash, search: "" }, { replace: true });
    return;
  }
  window.history.replaceState(window.history.state, "", pathname + hash);
};

export const dispatchSettingsClearContent = (
  dispatch: (action: UnknownAction) => void,
  getState: () => RootState,
  navigate?: NavigateFunction,
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
  clearContentUrlSearch(navigate);
};
