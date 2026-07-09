import { createSelector } from '@reduxjs/toolkit';
import type { NavigateFunction } from 'react-router-dom';
import type { AppDispatch } from '../store';
import { prependWarning } from '../store/slices/errorSlice';
import { fsqSelected, toggleShouldHydrate } from '../store/slices/settingsSlice';
import { fsqAliases } from '../utils';

export type StickyFsqOptions = {
  shouldHydrate: boolean;
  fsq: number;
};

type StickyFsqState = { settings: { shouldHydrate: boolean; fsq: number } };

const selectShouldHydrate = (state: StickyFsqState) => state.settings.shouldHydrate;
const selectFsq = (state: StickyFsqState) => state.settings.fsq;

export const stickyFsqFromState = createSelector(
  [selectShouldHydrate, selectFsq],
  (shouldHydrate, fsq): StickyFsqOptions => ({ shouldHydrate, fsq }),
);

export const getDefaultFsqGreaterThanOne = (): number =>
  Number(Object.keys(fsqAliases).find((key) => Number(key) > 1));

export const isFetchSequenceConfigured = (
  shouldHydrate: boolean,
  fsq: number,
): boolean => !shouldHydrate && fsq > 1;

export const toggleFetchSequenceConfiguration = (
  dispatch: AppDispatch,
  { shouldHydrate, fsq }: StickyFsqOptions,
): void => {
  if (isFetchSequenceConfigured(shouldHydrate, fsq)) {
    if (!shouldHydrate) dispatch(toggleShouldHydrate());
    if (fsq > 1) dispatch(fsqSelected(1));
    return;
  }
  if (shouldHydrate) dispatch(toggleShouldHydrate());
  if (fsq <= 1) dispatch(fsqSelected(getDefaultFsqGreaterThanOne()));
};

export const rebuildConvolutionSearch = (
  currentSearch: string,
  stickyFsq: StickyFsqOptions,
): string | undefined | null => {
  const raw = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(raw);
  const csEncoded = params.get('cs') ?? undefined;
  const extraParams: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key !== 'cs' && key !== 'fsq') extraParams[key] = value;
  });
  return buildConvolutionNavSearch(
    csEncoded,
    stickyFsq,
    Object.keys(extraParams).length > 0 ? extraParams : undefined,
  );
};

export const syncConvolutionUrlFsq = (
  dispatch: AppDispatch,
  navigate: NavigateFunction,
  pathname: string,
  currentSearch: string,
  stickyFsq: StickyFsqOptions,
): boolean => {
  if (!isFsqEligiblePathname(pathname)) return true;
  const search = rebuildConvolutionSearch(currentSearch, stickyFsq);
  if (search === null) {
    warnConvolutionCsFsqConflict(dispatch);
    return false;
  }
  navigate({ pathname, search }, { replace: true });
  return true;
};

export type ConvolutionNavigateTo = {
  pathname: string;
  search: string | undefined;
};

const FSQ_ELIGIBLE_PATHS = new Set([
  '/convolution/tutorial',
  '/convolution/course',
  '/convolution/quiz',
]);

/** Routes where fetch-sequence (`fsq`) query params are meaningful. */
export const isFsqEligiblePathname = (pathname: string): boolean =>
  FSQ_ELIGIBLE_PATHS.has(pathname);

const parseGoBackUrl = (goBackUrl: string): ConvolutionNavigateTo => {
  const url = new URL(goBackUrl, 'http://local');
  return { pathname: url.pathname, search: url.search || undefined };
};

const wouldAppendCs = (csEncoded?: string, extraParams?: Record<string, string>) =>
  Boolean(csEncoded) || extraParams?.cs !== undefined;

const wouldAppendFsq = (
  { shouldHydrate, fsq }: StickyFsqOptions,
  extraParams?: Record<string, string>,
) => (!shouldHydrate && fsq > 1) || extraParams?.fsq !== undefined;

/** `cs` and `fsq` are mutually exclusive in convolution query strings. */
export const isConvolutionNavCancelled = (
  csEncoded?: string,
  stickyFsq: StickyFsqOptions = { shouldHydrate: true, fsq: 1 },
  extraParams?: Record<string, string>,
): boolean =>
  wouldAppendCs(csEncoded, extraParams) && wouldAppendFsq(stickyFsq, extraParams);

export const CONVOLUTION_CS_FSQ_CONFLICT_MESSAGE =
  'Navigation cancelled: saved search (cs) and fetch sequence (fsq) cannot both appear in the query string.';

export const warnConvolutionCsFsqConflict = (dispatch: AppDispatch) => {
  dispatch(prependWarning(CONVOLUTION_CS_FSQ_CONFLICT_MESSAGE));
};

export const buildConvolutionNavSearch = (
  csEncoded?: string,
  stickyFsq: StickyFsqOptions = { shouldHydrate: true, fsq: 1 },
  extraParams?: Record<string, string>,
): string | undefined | null => {
  if (isConvolutionNavCancelled(csEncoded, stickyFsq, extraParams)) return null;

  const params = new URLSearchParams();
  if (csEncoded) params.set('cs', csEncoded);
  if (!stickyFsq.shouldHydrate && stickyFsq.fsq > 1) params.set('fsq', String(stickyFsq.fsq));
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
  const search = buildConvolutionNavSearch(csEncoded, stickyFsq, extraParams);
  if (search === null) return null;
  return { pathname, search };
};

/** Settings exit: merge sticky fsq only on PnC routes; all other go-back URLs are preserved as-is. */
export const resolveSettingsExitTarget = (
  goBackUrl: string,
  stickyFsq: StickyFsqOptions,
): ConvolutionNavigateTo | null => {
  const url = new URL(goBackUrl, 'http://local');
  if (!isFsqEligiblePathname(url.pathname)) return parseGoBackUrl(goBackUrl);

  const csEncoded = url.searchParams.get('cs') ?? undefined;
  const extraParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'cs' && key !== 'fsq') extraParams[key] = value;
  });
  return buildConvolutionNavigateTo(
    url.pathname,
    csEncoded,
    stickyFsq,
    Object.keys(extraParams).length > 0 ? extraParams : undefined,
  );
};

export const navigateConvolutionOrWarn = (
  dispatch: AppDispatch,
  navigate: NavigateFunction,
  pathname: string,
  csEncoded?: string,
  stickyFsq?: StickyFsqOptions,
  extraParams?: Record<string, string>,
): boolean => {
  const target = buildConvolutionNavigateTo(pathname, csEncoded, stickyFsq, extraParams);
  if (!target) {
    warnConvolutionCsFsqConflict(dispatch);
    return false;
  }
  navigate(target);
  return true;
};

/** Removes `fsq` from a location search string; returns `false` when `fsq` was not present. */
export const stripFsqFromSearch = (search: string): string | undefined | false => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  if (!params.has('fsq')) return false;
  params.delete('fsq');
  const next = params.toString();
  return next ? `?${next}` : undefined;
};
