import React, { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as styles from "../../styles/loading.module.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchData } from "../../library/Thunks";
import { buildFetchDataPayload } from "../../library/ThunksUtils";
import { buildDeepLinkSessionQueries, buildFallbackSessionQueries } from "../../library/fallbackSessionQuery";
import { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { RootState } from "../../store";
import { UnzipAndHydrate } from "../../library/actions";
import {
  completedUnzipping,
  toggleUnzipCourses,
  toggleUnzipQuizzes,
  toggleUnzipTutorials,
} from "../../store/slices/settingsSlice";
import { setCurPage } from "../../library/Thunks";
import {
  LOADING_DEEP_LINK_PAIRS,
  getDeepLinkTreeIds,
  parseLoadingTreeFlags,
  primaryLoadingWebapp,
  resolveEditorDeepLinkSearch,
  type LoadingDeepLinkPair,
} from "../../loadingRouteUtils";

const MIN_LOADING_DELAY_MS = 2_000;
const MAX_LOADING_WAIT_MS = 30_000;

const LoadingAnimation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  const isNotUnzipping = useSelector((state: RootState) => state.settings.isNotUnzipping);
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const noTutorials = useSelector((state: RootState) => state.tutorial.noTutorials);
  const noCourses = useSelector((state: RootState) => state.course.noCourses);
  const noQuizzes = useSelector((state: RootState) => state.quiz.noQuizzes);
  const hasNavigated = useRef(false);
  const hasTriggeredUnzip = useRef(false);
  const prevIsNotUnzipping = useRef(isNotUnzipping);
  const loadStartedAt = useRef(Date.now());
  const hydrateEnabledAt = useRef<number | null>(null);

  const { foundPairs, hasTutorial, hasCourse, hasQuiz, hasTreeParams, resolvedSearch } = useMemo(() => {
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

    const isFallback = !hasTreeParams && foundPairs.length === 0;
    dispatch(toggleUnzipTutorials(isFallback || hasTutorial));
    dispatch(toggleUnzipCourses(isFallback || hasCourse));
    dispatch(toggleUnzipQuizzes(isFallback || hasQuiz));
    dispatch(completedUnzipping(true));
    setCurPage(0);
    dispatch(fetchData(buildFetchDataPayload(
      {
        isUnzipCourses: isFallback || hasCourse,
        isUnzipQuizzes: isFallback || hasQuiz,
        isUnzipTutorials: isFallback || hasTutorial,
      },
      isFallback
        ? {
            search: resolvedSearch,
            webapp: 'session',
            convolution: 'session',
            requestTake: 1,
            queriesOverride: buildFallbackSessionQueries('videos'),
          }
        : {
            search: null,
            webapp: 'session',
            convolution: 'session',
            requestTake: 1,
            queriesOverride: buildDeepLinkSessionQueries(getDeepLinkTreeIds(resolvedSearch)),
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
    const fetchJustCompleted = prevIsNotUnzipping.current && !isNotUnzipping;
    prevIsNotUnzipping.current = isNotUnzipping;

    if (fetchJustCompleted && !hasTriggeredUnzip.current) {
      hasTriggeredUnzip.current = true;
      setTimeout(() => dispatch(UnzipAndHydrate()));
    }
  }, [isNotUnzipping, dispatch]);

  useEffect(() => {
    hasNavigated.current = false;

    const isFallback = !hasTreeParams && foundPairs.length === 0;

    const proceed = () => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      if (isFallback) {
        navigate('/media-player?tab=tutorial', { replace: true });
        return;
      }

      const webapp = primaryLoadingWebapp(resolvedSearch, foundPairs);
      const currentUrl = `${location.pathname}${location.search}`;
      const mediaSearch = new URLSearchParams({ tab: webapp, ldr: currentUrl });
      navigate(`/media-player?${mediaSearch.toString()}`, { replace: true });
    };

    if (shouldHydrate && hydrateEnabledAt.current === null) {
      hydrateEnabledAt.current = Date.now();
    }

    const scheduleProceed = (useMaxWait = false) => {
      const now = Date.now();
      const minRemaining = Math.max(0, MIN_LOADING_DELAY_MS - (now - loadStartedAt.current));

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

    const isContentReady = isFallback
      ? (!noTutorials || !noCourses || !noQuizzes)
      : (hasTutorial && !noTutorials) ||
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
    resolvedSearch,
  ]);

  return (
    <div className={styles["ring"]}>
      loading
      <span></span>
    </div>
  );
};

export default LoadingAnimation;
