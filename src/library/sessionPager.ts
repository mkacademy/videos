import type { SessionItem, SessionItemKind } from '../store/slices/sessionSlice';
import type { Executedquery } from './ThunksUtils';

/**
 * Session pager helpers (ported from studio `autoUnzipPager.ts`).
 * One page = one session item. The session set and the per-route counts are fixed by the
 * first query of a search / deep link; item pages are fetched lazily, one at a time.
 */

export type PagerScreen = 'tutorial' | 'course' | 'quiz';

export const RECORDS = 'records';
export const PARENT_SESSION_ROUTE = 'dashboardsinstructions';

export const CHILD_ROUTE_BY_SCREEN: Record<PagerScreen, string> = {
  tutorial: 'instructionsfilters',
  course: 'instructionssifters',
  quiz: 'instructionsdashboards',
};

export const KIND_BY_SCREEN: Record<PagerScreen, SessionItemKind> = {
  tutorial: 'tutorial',
  course: 'course',
  quiz: 'quiz',
};

export const isPagerScreen = (value: string | undefined | null): value is PagerScreen =>
  value === 'tutorial' || value === 'course' || value === 'quiz';

export const recordsKey = (route: string): string => `${route}${RECORDS}`;

/** Gateway skips forward one row, so post the predecessor of the wanted 1-based page. */
export const postedSkipForPage = (page: number, take = 1): number => (page - 1) * take - take;

export interface PagerPageCounts {
  filters: number;
  sifters: number;
  dashboards: number;
}

export const emptyPageCounts = (): PagerPageCounts => ({ filters: 0, sifters: 0, dashboards: 0 });

const asFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const lookupCount = (counts: unknown, group: string, field: string): number => {
  if (!counts || typeof counts !== 'object') return 0;
  const record = counts as Record<string, unknown>;
  const groupKeys = [group, group.toLowerCase(), `${group.charAt(0).toLowerCase()}${group.slice(1)}`];
  for (const key of groupKeys) {
    const nested = record[key];
    if (nested && typeof nested === 'object') {
      const n = asFiniteNumber((nested as Record<string, unknown>)[field]);
      if (n !== undefined) return n;
    }
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const hit = lookupCount(value, group, field);
      if (hit > 0) return hit;
    }
  }
  return 0;
};

/** Counts come back as one scalar per route, summed over every matching session. */
export const extractPageCounts = (counts: unknown): PagerPageCounts => ({
  filters: lookupCount(counts, 'instructionsFilters', 'filters'),
  sifters: lookupCount(counts, 'instructionsSifters', 'sifters'),
  dashboards: lookupCount(counts, 'instructionsDashboards', 'dashboards'),
});

export const hasAnyCount = (counts: PagerPageCounts): boolean =>
  counts.filters + counts.sifters + counts.dashboards > 0;

export const pageCountForScreen = (counts: PagerPageCounts, screen: PagerScreen): number => {
  if (screen === 'tutorial') return counts.filters;
  if (screen === 'course') return counts.sifters;
  return counts.dashboards;
};

/** `metadata.instructionId` holds the parent session id(s). */
export const sessionItemParentIds = (item: Pick<SessionItem, 'metadata'>): number[] => {
  const raw = item.metadata?.instructionId;
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return [...new Set(list.map(Number).filter((n) => Number.isFinite(n)))];
};

/** Child-only query for one item page under one session. No parent key, no counts. */
export const buildItemPageQuery = (
  template: Record<string, Executedquery> | undefined,
  screen: PagerScreen,
  sessionId: number,
  page: number,
): Record<string, Executedquery> => {
  const key = recordsKey(CHILD_ROUTE_BY_SCREEN[screen]);
  const base = template?.[key] ?? {};
  return {
    [key]: {
      ...base,
      parentIds: [sessionId],
      skip: postedSkipForPage(page, 1),
      take: 1,
    },
  };
};

/** Root banner / quiz ids of one unzipped tree (numeric keys + `_orphans`). */
export const rootIdsFromTree = (tree: unknown): Set<number> => {
  const out = new Set<number>();
  if (!tree || typeof tree !== 'object') return out;
  for (const [key, nested] of Object.entries(tree as Record<string, unknown>)) {
    if (key === '_orphans') {
      if (Array.isArray(nested)) {
        for (const id of nested) if (typeof id === 'number' && Number.isFinite(id)) out.add(id);
      }
      continue;
    }
    const asNumber = Number(key);
    if (Number.isFinite(asNumber)) out.add(asNumber);
  }
  return out;
};
