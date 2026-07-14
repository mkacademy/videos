import { QueryParams } from '../store/middleware/ViewManagerSTU';
import { Banner as TutorialBanner, Content as TutorialContent } from '../store/slices/tutorialSlice';
import { Banner as CourseBanner, SlideGroup, SlideItem, SlideGroupItem } from '../store/slices/courseSlice';
import { Quiz } from '../store/slices/quizSlice';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { appendRowz } from '../store/slices/rowSlice';
import { hydrateData, hydratedThenFetch } from './actions';
import { getHydrationDefaultTake, normalizeQueryLimit } from '../utils';
import { getPlural, convolutionDelay } from '../utils';
import { prependError } from '../store/slices/errorSlice';
import { viewRequestFetching, cpanelMessage } from '../store/slices/viewSlice';
import { fetchData } from './Thunks';
import { buildFetchDataPayload, selectMinimumFeatureModeFlags } from './ThunksUtils';
import { startHydrationSession, isHydrationSessionBusy, getHydrationLegProgress } from '../store/middleware/hydrationQueue';
import {
  estimateLegCount,
  getHydrationCpanelMessage,
  takeFirstLegQueries,
} from '../store/middleware/hydrationLegUtils';
import type { IsDehydratedItem } from './controlPanelUtils';
import { isServerId } from './ShortcutsUtils';
import {
  LOADING_DEEP_LINK_PAIRS,
  type LoadingDeepLinkPair,
} from '../loadingRouteUtils';

export type DiscriminatorPredicate<T> = (item: T) => boolean;
export type GenericDiscriminatorPredicate = <T extends IsDehydratedItem>(item: T) => boolean;

export { LOADING_DEEP_LINK_PAIRS, type LoadingDeepLinkPair };

/** If redirectUrl contains `ldr`, return that in-app path instead. */
export const resolveLdrRedirectUrl = (url: string): string => {
  if (!url) return url;
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;
  const ldr = new URLSearchParams(url.slice(queryStart)).get('ldr');
  if (!ldr || !ldr.startsWith('/') || ldr.startsWith('//')) return url;
  return ldr;
};

/**
 * After login (or continue-incognito), resolve where to send the user.
 * Prefer an explicit `ldr` back-link, fall back to the loading entry (`/`) so it can
 * route into media-prepper/media-player, and otherwise honor an in-app redirect path.
 */
export const resolveLoginLoadingRedirectUrl = (url: string): string => {
  if (!url) return '/';
  const queryStart = url.indexOf('?');
  if (queryStart !== -1) {
    const ldr = new URLSearchParams(url.slice(queryStart)).get('ldr');
    if (ldr && ldr.startsWith('/') && !ldr.startsWith('//')) return ldr;
  }
  const pathOnly = url.split('?')[0];
  if (pathOnly === '/' || pathOnly === '') return url.startsWith('/') ? url : `/${url}`;
  return resolveLdrRedirectUrl(url);
};

const filterServerIds = (ids: number[]): number[] => ids.filter((id) => isServerId(id));

/** Remove local ids from seek/IDs; return null when nothing server-side remains to hydrate. */
const withoutLocalIds = (query: QueryParams): QueryParams | null => {
  const seek = query.seek;
  if (typeof seek === 'string') return query;
  if (!Array.isArray(seek)) return query;

  const filteredSeek = filterServerIds(seek);
  const originalIdsLength = (query.IDs ?? []).length;
  const filteredIds = filterServerIds(query.IDs ?? []);

  if (filteredSeek.length === 0) return null;
  if (originalIdsLength > 0 && filteredIds.length === 0) return null;

  if (filteredSeek.length === seek.length && filteredIds.length === originalIdsLength) {
    return query;
  }

  return { ...query, IDs: filteredIds, seek: filteredSeek };
};

/**
 * Groups items and returns optimized queries by choosing the direction that produces fewer queries.
 * Direction 1: Group by parent (if 5 children share same parent → 1 query)
 * Direction 2: Group by child (if 1 child has 5 parents → 1 query with all 5 parent IDs)
 * 
 * seek = child IDs (the items we want to fetch)
 * IDs = parent IDs (the IDs of the parents)
 * @param allowEmptyBannerIds - If true, allows queries with empty IDs array (for foundation functions)
 */
function optimizeQueries<T extends { id: number; bannerId?: number }>(
  items: T[],
  getParentId: (item: T) => number | undefined,
  queryTemplate: QueryParams,
  allowEmptyBannerIds: boolean = false
): QueryParams[] {
  const hydratableItems = items.filter((item) => isServerId(item.id));
  if (hydratableItems.length === 0) return [];

  // Build relationship maps to analyze both directions
  const childrenByParent = new Map<number, Set<number>>(); // parentId -> Set<childId>
  const parentsByChild = new Map<number, Set<number>>(); // childId -> Set<parentId>

  hydratableItems.forEach(item => {
    const parentId = getParentId(item);
    if (parentId === undefined) return;
    if (!allowEmptyBannerIds && !isServerId(parentId)) return;

    // Build parent->children map
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, new Set());
    }
    childrenByParent.get(parentId)!.add(item.id);

    // Build child->parents map
    if (!parentsByChild.has(item.id)) {
      parentsByChild.set(item.id, new Set());
    }
    parentsByChild.get(item.id)!.add(parentId);
  });

  // Choose direction that produces fewer queries
  const numQueriesByParent = childrenByParent.size;
  const numQueriesByChild = parentsByChild.size;

  const toQueries = (entries: Array<[number, Set<number>]>, groupByParent: boolean): QueryParams[] =>
    entries
      .map(([groupId, relatedIds]) => ({
        ...queryTemplate,
        seek: groupByParent ? filterServerIds(Array.from(relatedIds)) : [groupId],
        IDs: allowEmptyBannerIds
          ? []
          : groupByParent
            ? filterServerIds([groupId])
            : filterServerIds(Array.from(relatedIds)),
      }))
      .filter((query) => {
        if (!Array.isArray(query.seek) || query.seek.length === 0) return false;
        if (!allowEmptyBannerIds && (query.IDs ?? []).length === 0) return false;
        return true;
      });

  if (numQueriesByParent <= numQueriesByChild) {
    return toQueries(Array.from(childrenByParent.entries()), true);
  }

  return toQueries(Array.from(parentsByChild.entries()), false);
}


// ==================== TUTORIAL ====================

/**
 * Gets queries for foundation -> filters relationship.
 * Filters are banners with filterId pointing to foundation.
 * seek = filter IDs (child IDs)
 * IDs = foundation BannerIDs (parent BannerIDs - but foundation doesn't have bannerId, so we use filterId)
 * Note: Items might not have bannerIDs - this is valid for foundation functions.
 */
export function getFoundationFilters(
  banners: TutorialBanner[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<TutorialBanner>
): QueryParams[] {
  return optimizeQueries(
    banners.filter(isDehydrated),
    () => -1, // Has no parents so therefore only one query needed
    queryTemplate,
    true // Allow empty bannerIds for foundation functions
  );
}

/**
 * Gets queries for filters -> instructions relationship (Tutorial).
 * Instructions are content items with bannerId pointing to filter (banner).
 */
export function getFiltersInstructions(
  content: TutorialContent[][],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<TutorialContent>
): QueryParams[];
/**
 * Gets queries for filters -> instructions relationship (Course/Quiz).
 * Instructions are slides with bannerId pointing to filter (pennant).
 * Only processes slides, not slideGroupItems.
 */
export function getFiltersInstructions(
  content: SlideGroup[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<SlideItem>
): QueryParams[];
export function getFiltersInstructions(
  content: TutorialContent[][] | SlideGroup[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<TutorialContent | SlideItem>
): QueryParams[] {
  // TutorialContent[][] rows are arrays; SlideGroup[] entries are objects with `slides`.
  if (content.length > 0 && Array.isArray(content[0])) {
    // TutorialContent[][]
    const flatContent = (content as TutorialContent[][]).flat();
    return optimizeQueries(
      flatContent.filter(isDehydrated as DiscriminatorPredicate<TutorialContent>),
      (item) => item.bannerId, // Parent ID (filter/banner)
      queryTemplate,
      false
    );
  } else {
    // SlideGroup[]
    const slides: SlideItem[] = [];

    (content as SlideGroup[]).forEach(group => {
      if (group.slides) {
        group.slides.forEach(slideArray => {
          slides.push(...slideArray);
        });
      }
    });

    return optimizeQueries(
      slides.filter(isDehydrated as DiscriminatorPredicate<SlideItem>),
      (slide) => slide.bannerId, // Parent ID (filter/pennant)
      queryTemplate,
      false
    );
  }
}

// ==================== COURSE ====================
/**
 * Gets queries for foundation -> sifters relationship.
 * Sifters are banners with sifterId pointing to foundation.
 * Only processes banners, not pennants.
 * seek = banner IDs (child IDs)
 * IDs = foundation BannerIDs (parent BannerIDs - but foundation doesn't have bannerId, so we use sifterId)
 * Note: Items might not have bannerIDs - this is valid for foundation functions.
 */
export function getFoundationSifters(
  banners: CourseBanner[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<CourseBanner>
): QueryParams[] {
  return optimizeQueries(
    banners.filter(isDehydrated),
    () => -1, // Has no parents so therefore only one query needed
    queryTemplate,
    true // Allow empty bannerIds for foundation functions
  );
}
/**
 * Gets queries for sifters -> filters relationship.
 * Filters are pennants with bannerId pointing to sifter (banner).
 * Only processes pennants, not banners.
 * seek = pennant IDs (child IDs)
 * IDs = sifter BannerIDs (parent BannerIDs - banner.bannerId)
 * 
 * Relationship: pennant.bannerId === banner.id (the sifter)
 * We group pennants by their parent sifter (banner.id), and use the parent banner's bannerId for IDs.
 */
export function getSiftersFilters(
  banners: CourseBanner[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<CourseBanner['pennants'][number]>
): QueryParams[] {
  const pennants = banners.flatMap(banner => banner.pennants);

  // Create a map of banner.id -> banner.bannerId for lookup
  // Since pennant.bannerId === banner.id, we can look up the parent banner's bannerId


  return optimizeQueries(
    pennants.filter(isDehydrated),
    (pennant) => pennant.bannerId, // Parent ID (sifter/banner.id) - groups pennants by their parent sifter
    queryTemplate,
    false
  );
}
/**
 * Gets queries for sifters -> instructions relationship.
 * Instructions are slideGroupItems with bannerId pointing to sifter (banner).
 * Only processes slideGroupItems, not slides.
 * seek = slideGroupItem IDs (child IDs)
 * IDs = sifter BannerIDs (parent BannerIDs - need to look up banner.bannerId from banner.id)
 */
export function getSiftersInstructions(
  content: SlideGroup[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<SlideGroupItem>
): QueryParams[] {
  const slideGroupItems: SlideGroupItem[] = [];

  content.forEach(group => {
    Object.values(group).forEach(item => {
      if (item && typeof item === 'object' && 'id' in item && 'bannerId' in item && !Array.isArray(item)) {
        slideGroupItems.push(item as SlideGroupItem);
      }
    });
  });

  // For slideGroupItems, bannerId points to banner.id, but we need banner.bannerId
  // Since we don't have direct access to banners here, we'll use the bannerId as both
  // The actual banner.bannerId lookup would need to be done elsewhere if needed
  return optimizeQueries(
    slideGroupItems.filter(isDehydrated),
    (item) => item.bannerId, // Parent ID (sifter/banner.id)
    queryTemplate,
    false
  );
}


// ==================== QUIZ ====================
/**
 * Gets queries for foundation -> dashboards relationship.
 * Dashboards are quizzes with dashboardId pointing to foundation.
 * Only processes quizzes, not submissions.
 * seek = quiz IDs (child IDs)
 * IDs = foundation BannerIDs (parent BannerIDs - but foundation doesn't have bannerId, so we use dashboardId)
 * Note: Items might not have bannerIDs - this is valid for foundation functions.
 */
export function getFoundationDashboards(
  quizzes: Quiz[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<Quiz>
): QueryParams[] {
  return optimizeQueries(
    quizzes.filter(isDehydrated),
    () => -1, // Has no parents so therefore only one query needed
    queryTemplate,
    true // Allow empty bannerIds for foundation functions
  );
}
/**
 * Gets queries for dashboards -> filters relationship.
 * Filters are submissions (pennants) with bannerId pointing to dashboard (quiz).
 * Only processes submissions, not quizzes.
 * seek = submission IDs (child IDs)
 * IDs = dashboard BannerIDs (parent BannerIDs - quiz.bannerId)
 */
export function getDashboardsFilters(
  quizzes: Quiz[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<Quiz['pennants'][number]>
): QueryParams[] {
  const submissions = quizzes.flatMap(quiz => quiz.pennants);
  return optimizeQueries(
    submissions.filter(isDehydrated),
    (submission) => submission.bannerId, // Parent ID (dashboard/quiz.id)
    queryTemplate,
    false
  );
}

/**
 * Gets queries for dashboards -> sifters relationship.
 * Sifters are banners with bannerId pointing to dashboard (quiz).
 * Only processes banners, not pennants.
 * seek = banner IDs (child IDs)
 * IDs = dashboard BannerIDs (parent BannerIDs - need quiz.bannerId from quiz.id)
 */
export function getDashboardsSifters(
  banners: CourseBanner[],
  queryTemplate: QueryParams,
  isDehydrated: DiscriminatorPredicate<CourseBanner>
): QueryParams[] {
  // For banners, bannerId points to quiz.id, but we need quiz.bannerId
  // Since we don't have direct access to quizzes here, we'll use the bannerId as both
  // The actual quiz.bannerId lookup would need to be done elsewhere if needed
  return optimizeQueries(
    banners.filter(isDehydrated),
    (banner) => banner.bannerId, // Parent ID (dashboard/quiz.id)
    queryTemplate,
    false
  );
}

const withQueryTake = (query: QueryParams, take: number): QueryParams => ({
  ...query,
  limit: {
    skip: query.limit?.skip ?? 0,
    take,
  },
});

const hydrationQueryTake = (idsLength: number, seekLength: number): number =>
  idsLength === 0 ? seekLength : idsLength * seekLength;

const withAlignedTake = (
  query: QueryParams,
  ids: number[],
  seek: number[],
): QueryParams => withQueryTake(query, hydrationQueryTake(ids.length, seek.length));

/**
 * Splits queries that have a cross product (IDs.length × seek.length) larger than defaultTake
 * into multiple smaller queries where each query's cross product is ≤ defaultTake.
 *
 * Foundation queries use empty `IDs` and put all child ids in `seek`; those are sized by
 * `seek.length` alone. Child-leg queries use IDs.length × seek.length. In both cases
 * `limit.take` is aligned to each query's size so the server hydrates every id.
 *
 * @param queries - Array of queries to process
 * @param defaultTake - Maximum allowed cross product size
 * @returns Array of queries where each query's cross product is ≤ defaultTake
 */
export function getFixedSizeQueries(
  queries: QueryParams[],
  defaultTake: number
): QueryParams[] {
  const fixedQueries: QueryParams[] = [];

  for (const rawQuery of queries) {
    const sanitized = withoutLocalIds(rawQuery);
    if (!sanitized) continue;

    const query = sanitized;
    const ids = query.IDs || [];
    const seek = query.seek;

    // Handle case where seek is a string or undefined
    if (typeof seek === 'string' || !Array.isArray(seek)) {
      // If seek is not an array, we can't calculate cross product, so keep as is
      fixedQueries.push(query);
      continue;
    }

    const idsLength = ids.length;
    const seekLength = seek.length;

    // Foundation queries (empty IDs): batch size is seek.length, not 0 × seek.length.
    if (idsLength === 0) {
      if (seekLength === 0) {
        fixedQueries.push(query);
        continue;
      }
      if (seekLength <= defaultTake) {
        fixedQueries.push(withAlignedTake(query, ids, seek));
        continue;
      }
      for (let i = 0; i < seekLength; i += defaultTake) {
        const seekChunk = seek.slice(i, i + defaultTake);
        fixedQueries.push(withAlignedTake({ ...query, seek: seekChunk }, [], seekChunk));
      }
      continue;
    }

    const crossProduct = idsLength * seekLength;

    // If cross product is within limit, align take to the query size
    if (crossProduct <= defaultTake) {
      fixedQueries.push(withAlignedTake(query, ids, seek));
      continue;
    }

    // Calculate how to split to minimize number of queries
    // Option 1: Split IDs
    const idsChunkSize = Math.max(1, Math.floor(defaultTake / seekLength));
    const numQueriesByIds = Math.ceil(idsLength / idsChunkSize);

    // Verify that splitting by IDs results in valid queries (cross product ≤ defaultTake)
    let canSplitByIds = true;
    if (idsChunkSize > 0 && seekLength > 0) {
      // Check the maximum cross product when splitting by IDs
      // The last chunk might be smaller, but we check the full chunk size
      const maxCrossProductByIds = idsChunkSize * seekLength;
      canSplitByIds = maxCrossProductByIds <= defaultTake;
    }

    // Option 2: Split seek
    const seekChunkSize = Math.max(1, Math.floor(defaultTake / idsLength));
    const numQueriesBySeek = Math.ceil(seekLength / seekChunkSize);

    // Verify that splitting by seek results in valid queries (cross product ≤ defaultTake)
    let canSplitBySeek = true;
    if (seekChunkSize > 0 && idsLength > 0) {
      // Check the maximum cross product when splitting by seek
      // The last chunk might be smaller, but we check the full chunk size
      const maxCrossProductBySeek = idsLength * seekChunkSize;
      canSplitBySeek = maxCrossProductBySeek <= defaultTake;
    }

    // Choose the split strategy:
    // 1. First, reject any strategy that would produce queries with cross product > defaultTake
    // 2. Among valid strategies, choose the one with fewer queries
    if (canSplitByIds && canSplitBySeek) {
      // Both strategies are valid, choose the one with fewer queries
      if (numQueriesByIds <= numQueriesBySeek) {
        // Split IDs into chunks
        for (let i = 0; i < idsLength; i += idsChunkSize) {
          const idsChunk = ids.slice(i, i + idsChunkSize);
          fixedQueries.push(withAlignedTake({
            ...query,
            IDs: idsChunk,
            seek,
          }, idsChunk, seek));
        }
      } else {
        // Split seek into chunks
        for (let i = 0; i < seekLength; i += seekChunkSize) {
          const seekChunk = seek.slice(i, i + seekChunkSize);
          fixedQueries.push(withAlignedTake({
            ...query,
            IDs: ids,
            seek: seekChunk,
          }, ids, seekChunk));
        }
      }
    } else if (canSplitByIds) {
      // Only splitting by IDs is valid
      for (let i = 0; i < idsLength; i += idsChunkSize) {
        const idsChunk = ids.slice(i, i + idsChunkSize);
        fixedQueries.push(withAlignedTake({
          ...query,
          IDs: idsChunk,
          seek,
        }, idsChunk, seek));
      }
    } else if (canSplitBySeek) {
      // Only splitting by seek is valid
      for (let i = 0; i < seekLength; i += seekChunkSize) {
        const seekChunk = seek.slice(i, i + seekChunkSize);
        fixedQueries.push(withAlignedTake({
          ...query,
          IDs: ids,
          seek: seekChunk,
        }, ids, seekChunk));
      }
    } else {
      // Neither strategy is valid (shouldn't happen, but handle edge case)
      // Split both dimensions as a fallback
      const idsChunkSizeFallback = Math.max(1, Math.floor(Math.sqrt(defaultTake)));
      const seekChunkSizeFallback = Math.max(1, Math.floor(defaultTake / idsChunkSizeFallback));

      for (let i = 0; i < idsLength; i += idsChunkSizeFallback) {
        const idsChunk = ids.slice(i, i + idsChunkSizeFallback);
        for (let j = 0; j < seekLength; j += seekChunkSizeFallback) {
          const seekChunk = seek.slice(j, j + seekChunkSizeFallback);
          fixedQueries.push(withAlignedTake({
            ...query,
            IDs: idsChunk,
            seek: seekChunk,
          }, idsChunk, seekChunk));
        }
      }
    }
  }
  return fixedQueries;
}

const orderQueries = (queries: QueryParams[]): QueryParams[] => {
  // tutorials -> foundation -> filters
  // courses -> foundation -> sifters -> filters
  // quizzes -> foundation -> dashboards -> sifters -> filters
  const parentOrder = ['', 'foundation', 'dashboards', 'sifters', 'filters'];
  return [...queries].sort((a, b) => {
    const indexA = parentOrder.indexOf(a.parent ?? '');
    const indexB = parentOrder.indexOf(b.parent ?? '');
    return indexA - indexB;
  });
};

export const buildOrderedHydrationQueries = (
  state: RootState,
  webapp: string,
  discriminator: GenericDiscriminatorPredicate[],
): QueryParams[] => {
  const resolveDiscriminator = (index: number): GenericDiscriminatorPredicate => {
    if (discriminator.length === 0) return () => false;
    return discriminator[Math.min(index, discriminator.length - 1)];
  };
  const {
    session: { isIncognito, isPrivate, fetchRole, curMailer, curToken, defaultTake },
    tutorial,
    course,
    quiz,
  } = state;
  const baseParams: QueryParams = {
    limit: { take: 10, skip: 0 },
    type: appendRowz.type,
    isPrivateView: false,
    hasCounts: false,
    entity: '',
    parent: '',
    seek: [],
    IDs: [],
  };
  const queryTemplate: QueryParams = isIncognito
    ? baseParams
    : {
      ...baseParams,
      convolution: webapp,
      isPrivateView: !!curToken || isPrivate,
      mutateRole: fetchRole,
      mailer: curMailer,
      hasCounts: false,
      curToken,
    };

  const queries: QueryParams[] = [];

  switch (webapp) {
    case 'tutorial': {
      const query0 = { ...queryTemplate, parent: 'foundation', entity: 'filters' };
      queries.push(...getFoundationFilters(tutorial.banners, query0, resolveDiscriminator(0)));
      const query1 = { ...queryTemplate, parent: 'filters', entity: 'instructions' };
      queries.push(...getFiltersInstructions(tutorial.content, query1, resolveDiscriminator(1)));
      break;
    }
    case 'course': {
      const query0 = { ...queryTemplate, parent: 'foundation', entity: 'sifters' };
      queries.push(...getFoundationSifters(course.banners, query0, resolveDiscriminator(0)));
      const query1 = { ...queryTemplate, parent: 'sifters', entity: 'instructions' };
      queries.push(...getSiftersInstructions(course.content, query1, resolveDiscriminator(1)));
      const query2 = { ...queryTemplate, parent: 'sifters', entity: 'filters' };
      queries.push(...getSiftersFilters(course.banners, query2, resolveDiscriminator(2)));
      const query3 = { ...queryTemplate, parent: 'filters', entity: 'instructions' };
      queries.push(...getFiltersInstructions(course.content, query3, resolveDiscriminator(3)));
      break;
    }
    case 'quiz': {
      const query0 = { ...queryTemplate, parent: 'foundation', entity: 'dashboards' };
      queries.push(...getFoundationDashboards(quiz.quizzes, query0, resolveDiscriminator(0)));
      const query1 = { ...queryTemplate, parent: 'dashboards', entity: 'filters' };
      queries.push(...getDashboardsFilters(quiz.quizzes, query1, resolveDiscriminator(1)));
      const query2 = { ...queryTemplate, parent: 'dashboards', entity: 'sifters' };
      queries.push(...getDashboardsSifters(quiz.banners, query2, resolveDiscriminator(2)));
      const query3 = { ...queryTemplate, parent: 'sifters', entity: 'instructions' };
      queries.push(...getSiftersInstructions(quiz.content, query3, resolveDiscriminator(3)));
      const query4 = { ...queryTemplate, parent: 'sifters', entity: 'filters' };
      queries.push(...getSiftersFilters(quiz.banners, query4, resolveDiscriminator(4)));
      const query5 = { ...queryTemplate, parent: 'filters', entity: 'instructions' };
      queries.push(...getFiltersInstructions(quiz.content, query5, resolveDiscriminator(5)));
      break;
    }
    default:
      return [];
  }

  const hydrationTake = getHydrationDefaultTake(defaultTake);
  return orderQueries(getFixedSizeQueries(queries, hydrationTake));
};

export type DeriveHydrationLegQueries = () => QueryParams[];

export type HydrationSessionOptions = {
  maxQueriesPerLeg: number;
};

export const resolveHydrationSessionOptions = (getState: () => RootState): HydrationSessionOptions => ({
  maxQueriesPerLeg: normalizeQueryLimit(getState().settings.queryLimit),
});

export const estimateInitialLegCount = (
  getState: () => RootState,
  webapp: string,
  discriminator: GenericDiscriminatorPredicate[],
  sessionOptions: HydrationSessionOptions,
): number => {
  const ordered = buildOrderedHydrationQueries(getState(), webapp, discriminator);
  return estimateLegCount(ordered.length, sessionOptions.maxQueriesPerLeg);
};

export const createHydrationLegDeriver = (
  getState: () => RootState,
  webapp: string,
  discriminator: GenericDiscriminatorPredicate[],
  sessionOptions: HydrationSessionOptions,
): { deriveNextLeg: DeriveHydrationLegQueries } => {
  const { maxQueriesPerLeg } = sessionOptions;

  const deriveNextLeg: DeriveHydrationLegQueries = () => {
    const ordered = buildOrderedHydrationQueries(getState(), webapp, discriminator);
    return takeFirstLegQueries(ordered, maxQueriesPerLeg);
  };

  return { deriveNextLeg };
};

/** Excludes row ids whose seek was already attempted (success or failure) this session. */
export const withAttemptedSeekExclusion = (
  discriminator: GenericDiscriminatorPredicate[],
  attemptedSeekIds: Set<number>,
): GenericDiscriminatorPredicate[] =>
  discriminator.map((pred) => (item) => pred(item) && !attemptedSeekIds.has(item.id));

export const abortIfHydrationDisabled = (getState: () => RootState): boolean => {
  if (!getState().settings.shouldHydrate) {
    console.log('hydration aborted: shouldHydrate is false');
    return true;
  }
  return false;
};

export type HandleHydrationLogicOptions = {
  /** Manual cpanel Hydrate button — ignores `settings.shouldHydrate`. */
  bypassShouldHydrate?: boolean;
};

export const handleHydrationLogic = (
  webapp: string,
  getState: () => RootState,
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  discriminator: GenericDiscriminatorPredicate[],
  next?: (action: UnknownAction) => UnknownAction,
  action?: UnknownAction,
  options?: HandleHydrationLogicOptions,
) => {
  if (!options?.bypassShouldHydrate && abortIfHydrationDisabled(getState)) {
    return action ? next?.(action) : null;
  }
  if (!['tutorial', 'course', 'quiz'].includes(webapp)) {
    return action ? next?.(action) : null;
  }
  const { session: { hydrationQueries } } = getState();
  const errorMessage = `please wait... for ${getPlural(webapp)} hydration to complete`;
  if (hydrationQueries > 0 || isHydrationSessionBusy()) return next?.(prependError(errorMessage));

  const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
  const sessionOptions = resolveHydrationSessionOptions(getState);
  const attemptedSeekIds = new Set<number>();
  const trackedDiscriminator = withAttemptedSeekExclusion(discriminator, attemptedSeekIds);
  const { deriveNextLeg } = createHydrationLegDeriver(
    getState,
    webapp,
    trackedDiscriminator,
    sessionOptions,
  );
  const estimatedTotalLegs = estimateInitialLegCount(getState, webapp, trackedDiscriminator, sessionOptions);
  const firstLegQueries = deriveNextLeg();

  startHydrationSession(
    thunkDispatch,
    webapp,
    getState().session.isIncognito,
    deriveNextLeg,
    firstLegQueries,
    estimatedTotalLegs,
    attemptedSeekIds,
    options?.bypassShouldHydrate,
  );

  if (firstLegQueries.length === 0 && hydratedThenFetch.match(action)) {
    dispatch(viewRequestFetching(true));
    setTimeout(() => thunkDispatch(fetchData(buildFetchDataPayload(
      selectMinimumFeatureModeFlags(getState()),
      action.payload,
    ))), convolutionDelay);
  }
  else if (firstLegQueries.length > 0) {
    const count = firstLegQueries.length;
    const legProgress = getHydrationLegProgress();
    const message = getHydrationCpanelMessage(
      webapp,
      count,
      legProgress.totalLegs > 1 ? legProgress : undefined,
    );
    setTimeout(() => dispatch(cpanelMessage(message)), 100);
    if (!action) {
      dispatch(hydrateData(count));
    }
  }

  return action ? next?.(hydrateData(firstLegQueries.length)) : null;
};