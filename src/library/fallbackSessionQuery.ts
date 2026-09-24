import type { DeepLinkTreeIds } from '../loadingRouteUtils';
import type { Executedquery } from './ThunksUtils';

const FALLBACK_TAKE = 1;
const FALLBACK_SKIP = 0;

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
  search: 'videos' | 'images',
): Record<string, Executedquery> => ({
  dashboardsinstructionsrecords: {
    take: FALLBACK_TAKE,
    skip: FALLBACK_SKIP,
    search,
    parentIds: [0],
  },
  instructionsfiltersrecords: { take: FALLBACK_TAKE, skip: FALLBACK_SKIP },
  instructionssiftersrecords: { take: FALLBACK_TAKE, skip: FALLBACK_SKIP },
  instructionsdashboardsrecords: { take: FALLBACK_TAKE, skip: FALLBACK_SKIP },
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
