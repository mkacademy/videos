import React, { useEffect, useMemo, useRef } from "react";
import { NavigateOptions, useLocation, useNavigate } from "react-router-dom";
import * as styles from "../../styles/loading.module.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchData } from "../../library/Thunks";
import { buildFetchDataPayload } from "../../library/ThunksUtils";
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import { UnzipAndHydrate } from "../../library/actions";
import {
  completedUnzipping,
  toggleUnzipCourses,
  toggleUnzipQuizzes,
  toggleUnzipTutorials,
  toggleShouldHydrate,
  unzipCoursesTypeSelected,
  unzipTutorialsTypeSelected,
  unzipQuizzesTypeSelected,
  randomizedTypeSelected,
} from "../../store/slices/settingsSlice";
import { setCurPage } from "../../library/Thunks";
import {
  deepLinkExtraParams,
  LOADING_DEEP_LINK_PAIRS,
  parseLoadingTreeFlags,
  primaryLoadingRoute,
  primaryLoadingWebapp,
  resolveEditorDeepLinkSearch,
  type LoadingDeepLinkPair,
} from "../../loadingRouteUtils";
import { buildConvolutionNavigateTo, warnConvolutionCsFsqConflict } from "../../library/convolutionNavSearch";
import { parseUnzipQueryParam } from "../../library/unzipQuery";
import { parseRandomizedQueryParam } from "../../library/randomizedQuery";

const MIN_LOADING_DELAY_MS = 2_000;
const MAX_LOADING_WAIT_MS = 30_000;

const LoadingAnimation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  const isNotUnzipping = useSelector((state: RootState) => state.settings.isNotUnzipping);
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const fsq = useSelector((state: RootState) => state.settings.fsq);
  const noTutorials = useSelector((state: RootState) => state.tutorial.noTutorials);
  const noCourses = useSelector((state: RootState) => state.course.noCourses);
  const noQuizzes = useSelector((state: RootState) => state.quiz.noQuizzes);
  const hasNavigated = useRef(false);
  const hasTriggeredUnzip = useRef(false);
  const prevIsNotUnzipping = useRef(isNotUnzipping);
  const loadStartedAt = useRef(Date.now());
  const hydrateEnabledAt = useRef<number | null>(null);

  const { params, foundPairs, hasTutorial, hasCourse, hasQuiz, hasTreeParams, resolvedSearch } = useMemo(() => {
    const resolvedSearch = resolveEditorDeepLinkSearch(location.search);
    const searchParams = new URLSearchParams(
      resolvedSearch.startsWith('?') ? resolvedSearch.slice(1) : resolvedSearch,
    );
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const foundPairs: LoadingDeepLinkPair[] = LOADING_DEEP_LINK_PAIRS.filter((pair) => {
      const hasTreeId = params[pair.zipper] !== undefined;
      const hasBannerId = params[pair.webapp] !== undefined;
      return hasTreeId && hasBannerId;
    });

    const treeFlags = parseLoadingTreeFlags(resolvedSearch);

    return {
      params,
      foundPairs,
      hasTutorial: treeFlags.hasTutorial,
      hasCourse: treeFlags.hasCourse,
      hasQuiz: treeFlags.hasQuiz,
      hasTreeParams: treeFlags.hasTutorial || treeFlags.hasCourse || treeFlags.hasQuiz,
      resolvedSearch,
    };
  }, [location.search]);

  useEffect(() => {
    loadStartedAt.current = Date.now();
    hydrateEnabledAt.current = null;
    hasTriggeredUnzip.current = false;
    prevIsNotUnzipping.current = true;

    if (!hasTreeParams && foundPairs.length === 0) return;

    const webapp = primaryLoadingWebapp(resolvedSearch, foundPairs);
    const unzipTypes = parseUnzipQueryParam(resolvedSearch);
    dispatch(toggleUnzipTutorials(hasTutorial));
    dispatch(toggleUnzipCourses(hasCourse));
    dispatch(toggleUnzipQuizzes(hasQuiz));
    if (unzipTypes.tutorial) dispatch(unzipTutorialsTypeSelected(unzipTypes.tutorial));
    if (unzipTypes.course) dispatch(unzipCoursesTypeSelected(unzipTypes.course));
    if (unzipTypes.quiz) dispatch(unzipQuizzesTypeSelected(unzipTypes.quiz));
    const randomizedType = parseRandomizedQueryParam(resolvedSearch);
    if (randomizedType) dispatch(randomizedTypeSelected(randomizedType));
    dispatch(completedUnzipping(true));
    setCurPage(0);
    dispatch(fetchData(buildFetchDataPayload(
      { isUnzipCourses: hasCourse, isUnzipQuizzes: hasQuiz, isUnzipTutorials: hasTutorial },
      {
        search: resolvedSearch,
        webapp,
        convolution: webapp,
      },
    )));
  }, [location.search,
    dispatch,
    foundPairs,
    hasTutorial,
    hasCourse,
    hasQuiz,
    hasTreeParams,
    resolvedSearch,
  ]);

  useEffect(() => {
    if (!hasTreeParams && foundPairs.length === 0) return;

    const fetchJustCompleted = prevIsNotUnzipping.current && !isNotUnzipping;
    prevIsNotUnzipping.current = isNotUnzipping;

    if (fetchJustCompleted && !hasTriggeredUnzip.current) {
      hasTriggeredUnzip.current = true;
      dispatch(toggleShouldHydrate());
      setTimeout(() => dispatch(UnzipAndHydrate()));
    }
  }, [isNotUnzipping, foundPairs, hasTreeParams, dispatch]);

  useEffect(() => {
    hasNavigated.current = false;

    const isDeepLinkExit = hasTreeParams || foundPairs.length > 0;

    const proceed = () => {
      if (hasNavigated.current) return;

      const currentUrl = `${location.pathname}${location.search}`;
      const stickyFsq = { shouldHydrate, fsq };
      const exitExtra = {
        ldr: currentUrl,
        ...deepLinkExtraParams(location.search),
      };

      const route = isDeepLinkExit
        ? primaryLoadingRoute(resolvedSearch, foundPairs)
        : '/convolution/tutorial';

      const options: NavigateOptions = isDeepLinkExit
        ? {
          replace: true,
          state: {
            selectedT: params.tutorial !== undefined ? parseInt(params.tutorial, 10) : -1,
            selectedC: params.course !== undefined ? parseInt(params.course, 10) : -1,
            selectedQ: params.quiz !== undefined ? parseInt(params.quiz, 10) : -1,
          },
        }
        : { replace: true, state: { selected: -1 } };

      const target = buildConvolutionNavigateTo(
        route,
        undefined,
        stickyFsq,
        location.search || isDeepLinkExit ? exitExtra : undefined,
      );
      if (!target) {
        warnConvolutionCsFsqConflict(dispatch);
        return;
      }
      hasNavigated.current = true;
      navigate(target, options);
    };

    if (shouldHydrate && hydrateEnabledAt.current === null) {
      hydrateEnabledAt.current = Date.now();
    }

    const scheduleProceed = (useMaxWait = false) => {
      const now = Date.now();
      const minRemaining = isDeepLinkExit
        ? Math.max(0, MIN_LOADING_DELAY_MS - (now - loadStartedAt.current))
        : 0;

      let waitMs = minRemaining;
      if (useMaxWait) {
        if (shouldHydrate && hydrateEnabledAt.current !== null) {
          const hydrateRemaining = Math.max(0, MIN_LOADING_DELAY_MS - (now - hydrateEnabledAt.current));
          waitMs = Math.max(hydrateRemaining, minRemaining);
        } else {
          waitMs = Math.max(MAX_LOADING_WAIT_MS - (now - loadStartedAt.current), minRemaining);
        }
      }

      return setTimeout(proceed, waitMs);
    };

    if (!isDeepLinkExit) {
      const timeout = scheduleProceed();
      return () => clearTimeout(timeout);
    }

    const isContentReady =
      (hasTutorial && !noTutorials) ||
      (hasCourse && !noCourses) ||
      (hasQuiz && !noQuizzes);

    if (isContentReady) {
      const timeout = scheduleProceed();
      return () => clearTimeout(timeout);
    }

    const timeout = scheduleProceed(true);
    return () => clearTimeout(timeout);
  }, [
    location.pathname,
    location.search,
    navigate,
    dispatch,
    noTutorials,
    noCourses,
    noQuizzes,
    shouldHydrate,
    foundPairs,
    hasTreeParams,
    hasTutorial,
    hasCourse,
    hasQuiz,
    params,
    resolvedSearch,
    fsq,
  ]);

  return (
    <div className={styles["ring"]}>
      loading
      <span></span>
    </div>
  );
};

export default LoadingAnimation;
