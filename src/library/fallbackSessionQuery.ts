import type { DeepLinkTreeIds } from '../loadingRouteUtils';
import type { Executedquery } from './ThunksUtils';

/** Only sent alongside valid query params (e.g. deep-link childIds). */
const FALLBACK_TAKE = 1;
const FALLBACK_SKIP = 0;
/** The first query fetches every matching session: that set is fixed for the search. */
export const SESSION_SET_TAKE = 100;

const CHILD_RECORDS_BY_KIND = {
  tutorial: 'instructionsfiltersrecords',
  course: 'instructionssiftersrecords',
  quiz: 'instructionsdashboardsrecords',
} as const;

const childRecordsQuery = (childId: number): Executedquery => ({
  isPrivateView: false,
  take: FALLBACK_TAKE,
  skip: FALLBACK_SKIP,
  childIds: [childId],
});

export const buildFallbackSessionQueries = (
  search: string,
): Record<string, Executedquery> => ({
  dashboardsinstructionsrecords: {
    take: SESSION_SET_TAKE,
    skip: FALLBACK_SKIP,
    search,
    parentIds: [0],
  },
  // No childIds/parentIds to pin these routes during a search, so the gateway sets the take.
  instructionsfiltersrecords: { skip: FALLBACK_SKIP },
  instructionssiftersrecords: { skip: FALLBACK_SKIP },
  instructionsdashboardsrecords: { skip: FALLBACK_SKIP },
  // The gateway only asks for counts when a key ends in `counts`; the pager's page totals come from these.
  dashboardsinstructionscounts: { isPrivateView: false, search },
  instructionsfilterscounts: { isPrivateView: false },
  instructionssifterscounts: { isPrivateView: false },
  instructionsdashboardscounts: { isPrivateView: false },
});

/** Child-only first query: one *records key per URL kind, pinned by childIds. */
export const buildDeepLinkSessionQueries = (
  treeIds: DeepLinkTreeIds,
): Record<string, Executedquery> => {
  const queries: Record<string, Executedquery> = {};
  for (const kind of ['tutorial', 'course', 'quiz'] as const) {
    const id = treeIds[kind];
    if (id === undefined) continue;
    queries[CHILD_RECORDS_BY_KIND[kind]] = childRecordsQuery(id);
  }
  return queries;
};
