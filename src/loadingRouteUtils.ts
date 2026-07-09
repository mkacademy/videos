export const LOADING_DEEP_LINK_PAIRS = [
  { zipper: 'tutorials', webapp: 'tutorial', route: '/convolution/tutorial' },
  { zipper: 'courses', webapp: 'course', route: '/convolution/course' },
  { zipper: 'Quizzes', webapp: 'quiz', route: '/convolution/quiz' },
] as const;

export type LoadingDeepLinkPair = (typeof LOADING_DEEP_LINK_PAIRS)[number];

export type DeepLinkTreeIds = Partial<Record<LoadingDeepLinkPair['webapp'], number>>;

const normalizeSearch = (search: string): string =>
  search.startsWith('?') ? search : search ? `?${search}` : '';

const searchParamsFrom = (search: string): URLSearchParams => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(raw);
};

export const hasLoadingDeepLinkPairs = (search: string): boolean => {
  const params = searchParamsFrom(search);
  return LOADING_DEEP_LINK_PAIRS.some(
    ({ zipper, webapp }) => params.has(zipper) && params.has(webapp),
  );
};

/** Tree id params without banner ids (e.g. `?tutorials=1&courses=2&Quizzes=3`). */
export const hasLoadingTreeParams = (search: string): boolean => {
  const params = searchParamsFrom(search);
  return LOADING_DEEP_LINK_PAIRS.some(({ zipper }) => {
    const value = params.get(zipper);
    return value !== null && value !== '';
  });
};

/** Valid loading URL: full deep-link pairs and/or tree-only params. */
export const hasLoadingDeepLinkParams = (search: string): boolean =>
  hasLoadingDeepLinkPairs(search) || hasLoadingTreeParams(search);

export const parseLoadingTreeFlags = (
  search: string,
): { hasTutorial: boolean; hasCourse: boolean; hasQuiz: boolean } => {
  const params = searchParamsFrom(search);
  return {
    hasTutorial: params.has('tutorials'),
    hasCourse: params.has('courses'),
    hasQuiz: params.has('Quizzes'),
  };
};

/** Resolve deep-link search from the current URL or a `ldr` back-link param. */
export const resolveEditorDeepLinkSearch = (search: string): string => {
  const normalized = normalizeSearch(search);
  if (hasLoadingDeepLinkParams(normalized)) return normalized;

  const ldr = searchParamsFrom(search).get('ldr');
  if (!ldr) return normalized;

  const ldrSearchIdx = ldr.indexOf('?');
  const ldrSearch = ldrSearchIdx >= 0 ? ldr.slice(ldrSearchIdx) : '';
  return ldrSearch && hasLoadingDeepLinkParams(ldrSearch) ? ldrSearch : normalized;
};

export const getDeepLinkTreeIds = (search: string): DeepLinkTreeIds => {
  const params = searchParamsFrom(resolveEditorDeepLinkSearch(search));
  const ids: DeepLinkTreeIds = {};
  for (const pair of LOADING_DEEP_LINK_PAIRS) {
    const value = params.get(pair.zipper);
    if (value === null || value === '') continue;
    const treeId = parseInt(value, 10);
    if (!Number.isNaN(treeId)) ids[pair.webapp] = treeId;
  }
  return ids;
};

/** Tree + banner id params for convolution navigation (excludes `cs` / `fsq`). */
export const deepLinkExtraParams = (search: string): Record<string, string> | undefined => {
  const params = searchParamsFrom(resolveEditorDeepLinkSearch(search));
  const extra: Record<string, string> = {};
  for (const pair of LOADING_DEEP_LINK_PAIRS) {
    const treeId = params.get(pair.zipper);
    const bannerId = params.get(pair.webapp);
    if (treeId !== null) extra[pair.zipper] = treeId;
    if (bannerId !== null) extra[pair.webapp] = bannerId;
  }
  const unzip = params.get('unzip');
  if (unzip !== null && unzip !== '') extra.unzip = unzip;
  const ran = params.get('ran');
  if (ran !== null && ran !== '') extra.ran = ran;
  return Object.keys(extra).length > 0 ? extra : undefined;
};

export const primaryLoadingWebapp = (
  search: string,
  foundPairs: LoadingDeepLinkPair[],
): LoadingDeepLinkPair['webapp'] => {
  if (foundPairs.length > 0) return foundPairs[0].webapp;
  const { hasTutorial, hasCourse } = parseLoadingTreeFlags(search);
  if (hasTutorial) return 'tutorial';
  if (hasCourse) return 'course';
  return 'quiz';
};

export const primaryLoadingRoute = (
  search: string,
  foundPairs: LoadingDeepLinkPair[],
): string => {
  const webapp = primaryLoadingWebapp(search, foundPairs);
  return LOADING_DEEP_LINK_PAIRS.find((p) => p.webapp === webapp)?.route
    ?? '/convolution/tutorial';
};

export const isOnLoadingScreen = (): boolean => {
  if (typeof window === 'undefined') return false;
  const { pathname } = window.location;
  if (pathname === '/') return true;
  const basename = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  return !!basename && (pathname === basename || pathname === `${basename}/`);
};

/** Loading mounts at `/` with valid deep-link params and enforces its own min delay. */
export const willLoadingEnforceMinDelay = (): boolean =>
  isOnLoadingScreen() && hasLoadingDeepLinkParams(window.location.search);
