import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { hydrationDelay, getPlural } from '../../utils';
import { anonymousFetch, authenticatedFetch } from '../../library/ThunksUtils';
import { deHydratedRowsDataFetcher } from '../../library/Thunks';
import { QueryParams } from '../types';
import { RootState, store } from '../index';
import { hydrateData } from '../../library/actions';
import { cpanelMessage } from '../slices/viewSlice';
import {
  flushHydrationStoreBuffer,
  resetHydrationStoreBuffer,
} from './hydrationPayloadBuffer';
import {
  getHydrationCpanelMessage,
  type HydrationLegProgress,
} from './hydrationLegUtils';

type DeriveHydrationLegQueries = () => QueryParams[];

export const getActiveWebapp = (): string | undefined => activeWebapp;

export const clearActiveWebapp = (): void => {
  activeWebapp = undefined;
  bypassShouldHydrateSession = false;
};

const HYDRATION_BATCH_SIZE = 10;

type QueryFetcher = () => ReturnType<typeof anonymousFetch>;

type HydrationFetchSpec = {
  fetcher: QueryFetcher;
  hydrationSeekIds: number[];
};

let activeWebapp: string | undefined;
let hydrationQueue: HydrationFetchSpec[] = [];
let hydrationQueueActive = false;
let hydrationCancelled = false;
let currentBatchTimeouts: ReturnType<typeof setTimeout>[] = [];
let batchSize = 0;
let batchTimeoutsFired = 0;
let batchInFlight = 0;
let deriveNextLeg: DeriveHydrationLegQueries | null = null;
let currentLegIndex = 0;
let totalLegs = 0;
let isIncognitoSession = false;
let hydrationAttemptedSeekIds: Set<number> | null = null;
let bypassShouldHydrateSession = false;

export const isBypassShouldHydrateSession = (): boolean => bypassShouldHydrateSession;

export const bindHydrationAttemptScope = (attemptedSeekIds: Set<number> | null): void => {
  hydrationAttemptedSeekIds = attemptedSeekIds;
};

export const markHydrationAttemptedSeekIds = (ids: number[]): void => {
  if (!hydrationAttemptedSeekIds) return;
  ids.forEach((id) => hydrationAttemptedSeekIds!.add(id));
};

const extractHydrationSeekIds = (query: QueryParams): number[] => {
  const seek = query.seek;
  if (!Array.isArray(seek)) return [];
  return seek.filter((id) => Number.isFinite(id) && id > 0);
};

export const isHydrationQueueActive = (): boolean =>
  deriveNextLeg !== null || hydrationQueueActive || batchInFlight > 0;

export const isHydrationCancelled = (): boolean => hydrationCancelled;

export const getHydrationInFlightCount = (): number => batchInFlight;

export const isHydrationSessionBusy = (): boolean =>
  deriveNextLeg !== null || hydrationQueueActive || batchInFlight > 0;

export const getHydrationLegProgress = (): HydrationLegProgress => ({
  currentLeg: totalLegs > 0 ? currentLegIndex + 1 : 0,
  totalLegs,
});

/** Queued + scheduled + in-flight hydration fetches for the current leg only. */
export const getHydrationQueueLength = (): number => {
  const undispatchedInCurrentBatch = Math.max(0, batchSize - batchTimeoutsFired);
  return hydrationQueue.length + undispatchedInCurrentBatch + batchInFlight;
};

const resetLegSessionState = (): void => {
  deriveNextLeg = null;
  currentLegIndex = 0;
  totalLegs = 0;
  isIncognitoSession = false;
};

const resetCurrentLegQueueState = (): void => {
  currentBatchTimeouts.forEach(clearTimeout);
  currentBatchTimeouts = [];
  hydrationQueue = [];
  batchSize = 0;
  batchTimeoutsFired = 0;
  batchInFlight = 0;
};

const resetHydrationQueueState = (): void => {
  resetCurrentLegQueueState();
  hydrationQueueActive = false;
  hydrationCancelled = false;
  resetLegSessionState();
  bypassShouldHydrateSession = false;
  resetHydrationStoreBuffer();
  clearActiveWebapp();
  bindHydrationAttemptScope(null);
};

const dispatchBatch = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  batch: HydrationFetchSpec[],
): void => {
  batchSize = batch.length;
  batchTimeoutsFired = 0;
  batchInFlight = 0;
  currentBatchTimeouts = [];

  batch.forEach((spec, index) => {
    const timeout = setTimeout(() => {
      batchTimeoutsFired += 1;
      batchInFlight += 1;
      dispatch(deHydratedRowsDataFetcher({
        fetcher: spec.fetcher,
        hydrationSeekIds: hydrationAttemptedSeekIds ? spec.hydrationSeekIds : undefined,
      }));
    }, (index + 1) * hydrationDelay);
    currentBatchTimeouts.push(timeout);
  });
};

const notifyLegProgress = (): void => {
  if (!activeWebapp) return;
  const { hydrationQueries } = store.getState().session;
  if (hydrationQueries <= 0) return;
  const webapp = getPlural(activeWebapp);
  store.dispatch(cpanelMessage(
    getHydrationCpanelMessage(webapp, hydrationQueries, getHydrationLegProgress()),
  ));
};

const startLeg = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  legFetchSpecs: HydrationFetchSpec[],
): void => {
  resetCurrentLegQueueState();
  if (legFetchSpecs.length === 0) return;

  hydrationQueueActive = true;
  const firstBatch = legFetchSpecs.slice(0, HYDRATION_BATCH_SIZE);
  hydrationQueue = legFetchSpecs.slice(HYDRATION_BATCH_SIZE);
  dispatchBatch(dispatch, firstBatch);
};

const toFetchSpecs = (queries: QueryParams[]): HydrationFetchSpec[] =>
  queries.map((query) => ({
    fetcher: isIncognitoSession
      ? () => anonymousFetch(query)
      : () => authenticatedFetch(query),
    hydrationSeekIds: extractHydrationSeekIds(query),
  }));

/** Starts a multi-leg session; leg 2+ is re-derived from store state after each leg completes. */
export const startHydrationSession = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  webapp: string,
  isIncognito: boolean,
  deriveLeg: DeriveHydrationLegQueries,
  firstLegQueries: QueryParams[],
  estimatedTotalLegs: number,
  attemptedSeekIds?: Set<number>,
  bypassShouldHydrate = false,
): void => {
  resetHydrationQueueState();
  if (firstLegQueries.length === 0) return;

  bypassShouldHydrateSession = bypassShouldHydrate;

  bindHydrationAttemptScope(attemptedSeekIds ?? null);
  hydrationQueueActive = true;
  activeWebapp = webapp;
  isIncognitoSession = isIncognito;
  deriveNextLeg = deriveLeg;
  totalLegs = estimatedTotalLegs;
  currentLegIndex = 0;
  startLeg(dispatch, toFetchSpecs(firstLegQueries));
};

const startNextLeg = (dispatch: ThunkDispatch<RootState, unknown, UnknownAction>): boolean => {
  if (!deriveNextLeg) return false;

  flushHydrationStoreBuffer();
  const nextLegQueries = deriveNextLeg();
  if (nextLegQueries.length === 0) {
    deriveNextLeg = null;
    return false;
  }

  currentLegIndex += 1;
  store.dispatch(hydrateData(nextLegQueries.length));
  startLeg(dispatch, toFetchSpecs(nextLegQueries));
  notifyLegProgress();
  return true;
};

const finishCancelledInFlight = (): void => {
  if (batchInFlight === 0) {
    hydrationCancelled = false;
    clearActiveWebapp();
  }
};

export const onHydrationQueryComplete = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
): void => {
  if (batchInFlight <= 0) return;

  batchInFlight -= 1;

  if (hydrationCancelled) {
    finishCancelledInFlight();
    return;
  }

  if (!hydrationQueueActive) return;
  if (batchInFlight > 0 || batchTimeoutsFired < batchSize) return;

  currentBatchTimeouts = [];

  if (hydrationQueue.length === 0) {
    if (startNextLeg(dispatch)) return;
    hydrationQueueActive = false;
    deriveNextLeg = null;
    return;
  }

  const nextBatch = hydrationQueue.splice(0, HYDRATION_BATCH_SIZE);
  dispatchBatch(dispatch, nextBatch);
};
