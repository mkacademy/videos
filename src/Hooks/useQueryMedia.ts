import { medias, getCurAppName, Tree as entities, getEncodeDataPartFromUrl } from "../utils";
import { useCallback, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useLocation, useNavigationType } from "react-router-dom";
import { getValidParams } from "../components/Pagination/TableViewPager";
import { calcMenuIndex, InitNavigatorPayload } from "../store/middleware/NavigationTrackerEFG";
import { ParentData, ViewPayload, viewPayload as escrowPayload, viewMenu } from "../store/slices/viewSlice";
import { initNavigator, extractCsObject } from "../library/actions";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/types";
import { mutateCurApp, setSelectedTraversal } from "../store/slices/sessionSlice";

// Robust programmatic navigation tracking using sessionStorage
const PROGRAMMATIC_NAV_KEY = 'isProgrammaticNavigation';

export const setProgrammaticNavigation = () => {
  // Use sessionStorage to persist across React double renders
  sessionStorage.setItem(PROGRAMMATIC_NAV_KEY, Date.now().toString());
  // Clean up after both renders complete (React double render happens within ~100ms)
  setTimeout(() => {
    sessionStorage.removeItem(PROGRAMMATIC_NAV_KEY);
  }, 300);
};

const isProgrammaticNavigation = (): boolean => {
  const timestamp = sessionStorage.getItem(PROGRAMMATIC_NAV_KEY);
  if (!timestamp) return false;

  // Check if the flag was set recently (within 300ms)
  const now = Date.now();
  const flagTime = parseInt(timestamp, 10);
  const isRecent = now - flagTime < 300;

  if (!isRecent) {
    sessionStorage.removeItem(PROGRAMMATIC_NAV_KEY);
    return false;
  }

  return true;
};

const getScreenIndex = (screenQueries: boolean[]): number => {
  return screenQueries.length > 6 && screenQueries[6]
    ? 6
    : screenQueries.length > 5 && screenQueries[5]
      ? 5
      : screenQueries.length > 4 && screenQueries[4]
        ? 4
        : screenQueries.length > 3 && screenQueries[3]
          ? 3
          : screenQueries.length > 2 && screenQueries[2]
            ? 2
            : screenQueries.length > 1 && screenQueries[1]
              ? 1
              : 0;
};

interface UseQueryMediaReturn {
  screen: number;
  isTablet: boolean;
  isSmall: boolean;
  is14Inch: boolean;
  is15Inch: boolean;
  isDeskTop: boolean;
}

export default function useQueryMedia(): UseQueryMediaReturn {
  const isDeskTop = useMediaQuery(medias.DeskTop);
  const is15Inch = useMediaQuery(medias._15Inch);
  const is14Inch = useMediaQuery(medias._14Inch);
  const isSmall = useMediaQuery(medias.Small);
  const isTablet = useMediaQuery(medias.Tablet);
  const isPhablet = useMediaQuery(medias.Phablet);
  const isMobile = useMediaQuery(medias.Mobile);

  const sQ1 = [isMobile, isPhablet, isTablet];
  const sQ2 = [isSmall, is14Inch, is15Inch, isDeskTop];
  const screen = getScreenIndex(sQ1.concat(sQ2));

  return { screen, isTablet, isSmall, is14Inch, is15Inch, isDeskTop };
}
let isUndefinedParent = false;
export const useCurRoutes = (): void => {
  const dispatch = useDispatch();
  const navigationType = useNavigationType();
  const entity = useSelector((state: RootState) => state.view.entity);
  const parent = useSelector((state: RootState) => state.view.parent);
  const menuSize = useSelector((state: RootState) => state.session.menuSize);
  const parentData = useSelector((state: RootState) => state.view.parentData);
  const resetRoutes = useCallback((payload: string) => dispatch(mutateCurApp(payload)), [dispatch])
  const setSelectedMenu = useCallback((payload: number) => dispatch(viewMenu(payload)), [dispatch])
  const selectedTraversal = useCallback((payload: number) => dispatch(setSelectedTraversal(payload)), [dispatch])

  useEffect(() => {
    if (navigationType === "POP") {
      if (parent == undefined && parentData?.parent == undefined) {
        try {
          const encodedData = getEncodeDataPartFromUrl(window.location.pathname);
          const { curApp }: ParentData = JSON.parse(Buffer.from(encodedData, "base64").toString());
          console.log("useCurRoutes is POP (undefined parent) success curApp ==>", curApp);
          const appName = getCurAppName(curApp);
          isUndefinedParent = true;
          resetRoutes(appName);
        } catch (error) {
          console.log("useCurRoutes is POP (undefined parent) error", error);
        }
      }
    }

  }, []);

  useEffect(() => {
    if (!isUndefinedParent) return;
    if (parent === undefined || entity === undefined) return;
    const unlocked = entities.getProperty(parent, "unlocked");
    if (unlocked && unlocked.includes(entity ?? "")) {
      isUndefinedParent = false;
      const freight = calcMenuIndex(parent, entity as string, menuSize);
      if (freight) setTimeout(() => {
        setSelectedMenu(freight.selectedMenu);
        selectedTraversal(freight.selectedTraversal);
      });
      console.log("useCurRoutes is POP (defined parent) menu selected");
    }
  }, [parent, entity, menuSize]);
};

export const useNavigator = (): void => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigationType = useNavigationType();
  const defaultTake = useSelector((state: RootState) => state.session.defaultTake);
  const resetQuery = useCallback((payload: ViewPayload) => dispatch(escrowPayload(payload)), [dispatch])
  const navigatorPressed = useCallback((payload: InitNavigatorPayload) => dispatch(initNavigator(payload)), [dispatch])

  useEffect(() => {
    const { pathname, search } = location;
    const splits = pathname.split("/");
    const affix = splits[splits.length - 3];
    const entity = splits[splits.length - 2];
    const encodedData = splits[splits.length - 1];

    // Check navigation type (equivalent to the original action parameter)
    // "POP" = browser back/forward buttons
    // "PUSH" = clicking links, navigate() calls, etc.
    // "REPLACE" = replace() calls

    if (navigationType === "POP") {
      // Check if this is programmatic navigation vs user back button
      if (isProgrammaticNavigation()) {
        console.log("useNavigator is POP (programmatic)");
        // DON'T remove flag immediately - let both React renders complete
        // Flag will be cleaned up by setTimeout
      } else {
        // User used browser back/forward buttons
        console.log("useNavigator is POP (user back button)");
        if (affix && entity && encodedData) {
          if (affix.toLowerCase() !== "app") {
            const prefix = "/app/" + affix + "/";
            navigatorPressed({ encodedData, entity, prefix });
          } else {
            navigatorPressed({ encodedData, entity });
          }
          escrowQuery(resetQuery, search, pathname, defaultTake);
        }
      }
    } else if (navigationType === "PUSH") {
      // User clicked a link or programmatic navigation
      if (affix && entity && encodedData) {
        escrowQuery(resetQuery, search, pathname, defaultTake);
      }
    }
  }, [location, navigationType, defaultTake]);
};

export const useConvolutionator = (): void => {
  const dispatch = useDispatch();
  const navigationType = useNavigationType();
  const reExtractCsObject = useCallback(() => dispatch(extractCsObject()), [dispatch])

  useEffect(() => {
    // Check navigation type (equivalent to the original action parameter)
    // "POP" = browser back/forward buttons
    // "PUSH" = clicking links, navigate() calls, etc.
    // "REPLACE" = replace() calls

    if (navigationType === "POP") {
      // Check if this is programmatic navigation vs user back button
      if (isProgrammaticNavigation()) {
        console.log("useConvolutionator is POP (programmatic)");
        // DON'T remove flag immediately - let both React renders complete
        // Flag will be cleaned up by setTimeout
      } else {
        // User used browser back/forward buttons
        console.log("useConvolutionator is POP (user back button)");
        reExtractCsObject();
      }
    }
  }, [navigationType]);
};

const escrowQuery = (
  resetQuery: (query: ViewPayload) => void,
  search: string,
  pathname: string,
  defaultTake: number
): void => {
  if (pathname.toLowerCase().startsWith("/app/")) {
    const { seek, skip, take } = getValidParams(search, defaultTake);
    resetQuery({
      pages: [`${skip}-${take}`],
      yoinks: seek ? [seek] : [],
    });
  }
}; 