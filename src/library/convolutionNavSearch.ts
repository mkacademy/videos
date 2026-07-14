import { createSelector } from '@reduxjs/toolkit';
import type { NavigateFunction } from 'react-router-dom';
import type { AppDispatch } from '../store';
import { prependWarning } from '../store/slices/errorSlice';

export type StickyFsqOptions = {
  shouldHydrate: boolean;
  fsq: number;
};

type StickyFsqState = { settings: StickyFsqOptions };

const selectShouldHydrate = (state: StickyFsqState) =>
  state.settings.shouldHydrate;
const selectFsq = (state: StickyFsqState) => state.settings.fsq;

export const stickyFsqFromState = createSelector(
  [selectShouldHydrate, selectFsq],
  (shouldHydrate, fsq): StickyFsqOptions => ({ shouldHydrate, fsq }),
);

export type ConvolutionNavigateTo = {
  pathname: string;
  search: string | undefined;
};

const wouldAppendCs = (
  csEncoded?: string,
  extraParams?: Record<string, string>,
): boolean => Boolean(csEncoded) || extraParams?.cs !== undefined;

const wouldAppendFsq = (
  { shouldHydrate, fsq }: StickyFsqOptions,
  extraParams?: Record<string, string>,
): boolean =>
  (!shouldHydrate && fsq > 1) || extraParams?.fsq !== undefined;

/** `cs` and `fsq` are mutually exclusive in convolution query strings. */
export const isConvolutionNavCancelled = (
  csEncoded?: string,
  stickyFsq: StickyFsqOptions = { shouldHydrate: true, fsq: 1 },
  extraParams?: Record<string, string>,
): boolean =>
  wouldAppendCs(csEncoded, extraParams) &&
  wouldAppendFsq(stickyFsq, extraParams);

const CONVOLUTION_CS_FSQ_CONFLICT_MESSAGE =
  'Navigation cancelled: saved search (cs) and fetch sequence (fsq) cannot both appear in the query string.';

const warnConvolutionCsFsqConflict = (dispatch: AppDispatch): void => {
  dispatch(prependWarning(CONVOLUTION_CS_FSQ_CONFLICT_MESSAGE));
};

const buildConvolutionNavSearch = (
  csEncoded?: string,
  stickyFsq: StickyFsqOptions = { shouldHydrate: true, fsq: 1 },
  extraParams?: Record<string, string>,
): string | undefined | null => {
  if (isConvolutionNavCancelled(csEncoded, stickyFsq, extraParams)) return null;

  const params = new URLSearchParams();
  if (csEncoded) params.set('cs', csEncoded);
  if (!stickyFsq.shouldHydrate && stickyFsq.fsq > 1) {
    params.set('fsq', String(stickyFsq.fsq));
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }
  const search = params.toString();
  return search ? `?${search}` : undefined;
};

export const buildConvolutionNavigateTo = (
  pathname: string,
  csEncoded?: string,
  stickyFsq?: StickyFsqOptions,
  extraParams?: Record<string, string>,
): ConvolutionNavigateTo | null => {
  const search = buildConvolutionNavSearch(
    csEncoded,
    stickyFsq,
    extraParams,
  );
  return search === null ? null : { pathname, search };
};

export const navigateConvolutionOrWarn = (
  dispatch: AppDispatch,
  navigate: NavigateFunction,
  pathname: string,
  csEncoded?: string,
  stickyFsq?: StickyFsqOptions,
  extraParams?: Record<string, string>,
): boolean => {
  const target = buildConvolutionNavigateTo(
    pathname,
    csEncoded,
    stickyFsq,
    extraParams,
  );
  if (!target) {
    warnConvolutionCsFsqConflict(dispatch);
    return false;
  }
  navigate(target);
  return true;
};
