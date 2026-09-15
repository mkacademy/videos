import type { Executedquery } from './ThunksUtils';

const FALLBACK_TAKE = 1;
const FALLBACK_SKIP = 0;

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
