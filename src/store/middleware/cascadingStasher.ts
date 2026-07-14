import { DataRow, Metadata } from '../../components/Core/types';
import { getSlideIndeces } from '../../library/sliceUtils';
import { getCurAppName } from '../../utils';
import { RootState } from '../types';
import type { Banner, SlideGroup, SlideGroupItem, SlideItem } from '../../library/CourseUtils';
import type { QuizState } from '../slices/quizSlice';

/** Matches {@link UiuxManager} `pred`: strip `checked`, set `checked: true` for stash rows. */
const toStashRow = ({ checked: _c, ...rest }: DataRow): DataRow => ({ ...rest, checked: true });

export interface CascadeStashSegment {
  approute: string;
  content: DataRow[];
}

/** Root → leaf order for course/quiz hierarchy stash legs (matches `editSaveChunkUtils`). */
const COURSE_LIKE_CASCADE_ROUTE_ORDER = [
  'foundationdashboards',
  'foundationsifters',
  'dashboardssifters',
  'siftersfilters',
  'siftersinstructions',
  'filtersinstructions',
  'dashboardsfilters',
] as const;

const cascadeRouteRank = (approute: string): number => {
  const index = COURSE_LIKE_CASCADE_ROUTE_ORDER.indexOf(
    approute as (typeof COURSE_LIKE_CASCADE_ROUTE_ORDER)[number],
  );
  return index >= 0 ? index : COURSE_LIKE_CASCADE_ROUTE_ORDER.length;
};

export interface OrderedCascadeStashCell {
  approute: string;
  content: DataRow[];
  timestamp: string;
}

/** Sort primary + cascade stash legs so parents unstash before children (e.g. chapters before covers). */
export const buildOrderedCascadeStashCells = (
  primaryApproute: string,
  primaryContent: DataRow[],
  cascade: CascadeStashSegment[],
  stampAtIndex: (index: number) => string,
): OrderedCascadeStashCell[] =>
  [{ approute: primaryApproute, content: primaryContent }, ...cascade]
    .sort((a, b) => cascadeRouteRank(a.approute) - cascadeRouteRank(b.approute))
    .map((segment, index) => ({
      ...segment,
      timestamp: stampAtIndex(index),
    }));

const remapPennantRowsToDestinationBanners = (
  rows: DataRow[],
  destinationBannerIds: number[],
): DataRow[] => {
  if (destinationBannerIds.length === 0) return rows;
  const sifterId = destinationBannerIds.length === 1
    ? destinationBannerIds[0]
    : destinationBannerIds;
  return rows.map((row) => {
    const metadata = { ...(row.metadata ?? {}), owner: row.metadata?.owner ?? false };
    const meta = metadata as Record<string, unknown>;
    meta.sifterId = sifterId;
    return {
      ...row,
      bannerId: destinationBannerIds[0],
      metadata,
    };
  });
};

const mergeInto = (
  byRoute: Map<string, DataRow[]>,
  approute: string,
  rows: DataRow[]
): void => {
  if (rows.length === 0) return;
  const cur = byRoute.get(approute) ?? [];
  const normalized = mergeNonFoundationRows(cur, rows, approute);
  byRoute.set(approute, normalized);
};

const ROUTE_ENTITY_PLURALS = [
  'underbosses',
  'instructions',
  'dashboards',
  'foundations',
  'sifters',
  'filters',
  'minions',
  'bosses',
] as const;

const ENTITY_SINGULAR_BY_PLURAL: Record<(typeof ROUTE_ENTITY_PLURALS)[number], string> = {
  underbosses: 'underboss',
  instructions: 'instruction',
  dashboards: 'dashboard',
  foundations: 'foundation',
  sifters: 'sifter',
  filters: 'filter',
  minions: 'minion',
  bosses: 'boss',
};

const getRouteParentChild = (
  approute: string
): { parent: string; child: string } | null => {
  for (const childPlural of ROUTE_ENTITY_PLURALS) {
    if (!approute.endsWith(childPlural)) continue;
    const parentPlural = approute.slice(0, -childPlural.length) as keyof typeof ENTITY_SINGULAR_BY_PLURAL;
    if (!parentPlural || !(parentPlural in ENTITY_SINGULAR_BY_PLURAL)) return null;
    return {
      parent: ENTITY_SINGULAR_BY_PLURAL[parentPlural],
      child: ENTITY_SINGULAR_BY_PLURAL[childPlural],
    };
  }
  return null;
};

const toIdList = (value: unknown): Array<string | number> => {
  if (Array.isArray(value)) return value.filter((v) => v !== undefined && v !== null) as Array<string | number>;
  if (value === undefined || value === null) return [];
  return [value as string | number];
};

const getRowOrdinal = (row: DataRow): number | undefined => {
  const candidate = (row as DataRow & { ordinal?: unknown }).ordinal;
  return typeof candidate === 'number' ? candidate : undefined;
};

const getRowBannerId = (row: DataRow): string | number | undefined => {
  const candidate = (row as DataRow & { bannerId?: unknown }).bannerId;
  if (typeof candidate === 'number' || typeof candidate === 'string') return candidate;
  return undefined;
};

type MetadataIdKey =
  | 'foundationId'
  | 'bossId'
  | 'underbossId'
  | 'minionId'
  | 'dashboardId'
  | 'sifterId'
  | 'filterId'
  | 'instructionId';

const withInitializedMetadata = (
  row: DataRow,
  parentIdKey: MetadataIdKey,
  childIdKey: MetadataIdKey
): DataRow => {
  const metadata: Metadata = { ...(row.metadata ?? {}), owner: row.metadata?.owner ?? false };
  const metadataRecord = metadata as unknown as Record<string, unknown>;
  const parentIds = new Set(toIdList(metadataRecord[parentIdKey]));
  const rowBannerId = getRowBannerId(row);
  if (rowBannerId !== undefined) parentIds.add(rowBannerId);
  metadataRecord[parentIdKey] = Array.from(parentIds);
  metadataRecord[childIdKey] = row.id;
  if (metadata.ordinal === undefined) {
    const rowOrdinal = getRowOrdinal(row);
    if (rowOrdinal !== undefined) metadata.ordinal = rowOrdinal;
  }
  return { ...row, metadata };
};

const mergeRowsByParentMetadata = (
  current: DataRow[],
  incoming: DataRow[],
  parentIdKey: MetadataIdKey,
  childIdKey: MetadataIdKey
): DataRow[] => {
  const byId = new Map<string, DataRow>();
  const pushOrMerge = (source: DataRow) => {
    const prepared = withInitializedMetadata(source, parentIdKey, childIdKey);
    const key = String(prepared.id);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, prepared);
      return;
    }
    const existingMeta = existing.metadata ?? { owner: false };
    const preparedMeta = prepared.metadata ?? { owner: false };
    const existingMetaRecord = existingMeta as unknown as Record<string, unknown>;
    const preparedMetaRecord = preparedMeta as unknown as Record<string, unknown>;
    const mergedParentIds = Array.from(
      new Set([...toIdList(existingMetaRecord[parentIdKey]), ...toIdList(preparedMetaRecord[parentIdKey])])
    );
    const mergedMetadata = {
      ...existingMeta,
      ...preparedMeta,
      owner: existingMeta.owner ?? preparedMeta.owner ?? false,
      ordinal: existingMeta.ordinal ?? preparedMeta.ordinal,
      [childIdKey]: existingMetaRecord[childIdKey] ?? preparedMetaRecord[childIdKey] ?? prepared.id,
      [parentIdKey]: mergedParentIds,
    };
    byId.set(key, { ...existing, ...prepared, metadata: mergedMetadata });
  };
  current.forEach(pushOrMerge);
  incoming.forEach(pushOrMerge);
  return Array.from(byId.values());
};

const mergeNonFoundationRows = (current: DataRow[], incoming: DataRow[], approute: string): DataRow[] => {
  const route = getRouteParentChild(approute);
  if (!route) return current.concat(incoming);
  if (route.parent === 'foundation') return current.concat(incoming);
  const parentIdKey = `${route.parent}Id` as MetadataIdKey;
  const childIdKey = `${route.child}Id` as MetadataIdKey;
  return mergeRowsByParentMetadata(current, incoming, parentIdKey, childIdKey);
};

/** Follow-up option slides use `slide.bannerId` = pennant id; they may sit in slide-only groups. */
const collectFilterSlidesForPennants = (
  content: SlideGroup[],
  pennantIds: Set<number>,
): DataRow[] => {
  if (pennantIds.size === 0) return [];
  const filters: DataRow[] = [];
  for (const group of content) {
    for (const slideArr of group.slides ?? []) {
      for (const slide of slideArr) {
        if (pennantIds.has(slide.bannerId)) {
          filters.push(toStashRow(slide as unknown as DataRow));
        }
      }
    }
  }
  return filters;
};

const groupBelongsToAnyBanner = (group: SlideGroup, bannerIds: Set<number>): boolean => {
  for (const key of Object.keys(group)) {
    if (key === 'slides') continue;
    const val = group[key as keyof SlideGroup];
    if (typeof val === 'object' && val !== null && 'bannerId' in val) {
      if (bannerIds.has((val as SlideGroupItem).bannerId)) return true;
    }
  }
  return false;
};

const getSlideGroupLeaves = (group: SlideGroup): { sifters: DataRow[]; filters: DataRow[] } => {
  const sifters: DataRow[] = [];
  const filters: DataRow[] = [];
  for (const key of Object.keys(group)) {
    if (key === 'slides') continue;
    const val = group[key as keyof SlideGroup];
    if (typeof val === 'object' && val !== null && 'id' in val && 'bannerId' in val) {
      sifters.push(toStashRow(val as SlideGroupItem as unknown as DataRow));
    }
  }
  for (const slideArr of group.slides ?? []) {
    for (const slide of slideArr) {
      filters.push(toStashRow(slide as SlideItem as unknown as DataRow));
    }
  }
  return { sifters, filters };
};

/** `course`/`quiz` `siftersfilters` clear only filters `slides` (see `courseSlice`); stash those rows. */
const collectSifterFiltersCascade = (
  content: SlideGroup[],
  clearedPennantIds: Set<number>,
  add: (approute: string, rows: DataRow[]) => void
): void => {
  add('filtersinstructions', collectFilterSlidesForPennants(content, clearedPennantIds));
};

/**
 * Pennants coupled to cleared covers — same ordinal + slide-row pairing as {@link getSlideIndeces}.
 */
const collectCoupledPennantsForClearedCovers = (
  banners: Banner[],
  content: SlideGroup[],
  clearedSifterIds: Set<number>,
): DataRow[] => {
  const pennants: DataRow[] = [];
  const seen = new Set<number>();

  for (const group of content) {
    const slides = group.slides ?? [];
    const bannerId = group[0]?.bannerId;
    if (bannerId === undefined) continue;
    const banner = banners.find((b) => b.id === bannerId);
    if (!banner) continue;

    for (const key of Object.keys(group)) {
      if (key === 'slides') continue;
      const item = group[key as keyof SlideGroup];
      if (typeof item !== 'object' || item === null || !('id' in item)) continue;
      if (!clearedSifterIds.has(Number(item.id))) continue;
      const cover = item as SlideGroupItem;

      for (const pennant of banner.pennants) {
        if (pennant.ordinal !== cover.ordinal || seen.has(pennant.id)) continue;
        const hasCoupledSlide = slides.some(
          (slideArr) => slideArr.length > 0 && slideArr[0].bannerId === pennant.id,
        );
        if (!hasCoupledSlide) continue;
        pennants.push(toStashRow(pennant as unknown as DataRow));
        seen.add(pennant.id);
      }
    }
  }
  return pennants;
};

/** `siftersinstructions` clear removes covers; stash coupled chapters and their slides. */
const collectSifterInstructionsCascade = (
  banners: Banner[],
  content: SlideGroup[],
  clearedSifterIds: Set<number>,
  destinationBannerIds: number[],
  add: (approute: string, rows: DataRow[]) => void
): void => {
  const couplings = getSlideIndeces(banners, content);
  const filters: DataRow[] = [];
  for (const group of content) {
    const slides = group.slides ?? [];
    const courseId = group[0]?.bannerId;
    for (const key of Object.keys(group)) {
      if (key === 'slides') continue;
      const item = group[key as keyof SlideGroup];
      if (typeof item !== 'object' || item === null || !('id' in item)) continue;
      if (!clearedSifterIds.has(Number(item.id))) continue;
      for (const idx of couplings[courseId]?.[Number(item.id)] ?? []) {
        const slideArr = slides[idx];
        if (!slideArr) continue;
        for (const slide of slideArr) {
          filters.push(toStashRow(slide as unknown as DataRow));
        }
      }
    }
  }
  const coupledPennants = collectCoupledPennantsForClearedCovers(banners, content, clearedSifterIds);
  add(
    'siftersfilters',
    remapPennantRowsToDestinationBanners(coupledPennants, destinationBannerIds),
  );
  add('filtersinstructions', filters);
};

const collectCourseFoundationSifters = (
  state: RootState['course'],
  clearedBannerIds: Set<number>,
  add: (approute: string, rows: DataRow[]) => void
): void => {
  const pennants: DataRow[] = [];
  for (const b of state.banners) {
    if (clearedBannerIds.has(b.id)) {
      pennants.push(...b.pennants.map((p) => toStashRow(p as unknown as DataRow)));
    }
  }
  add('siftersfilters', pennants);

  for (const group of state.content) {
    if (!groupBelongsToAnyBanner(group, clearedBannerIds)) continue;
    const { sifters } = getSlideGroupLeaves(group);
    add('siftersinstructions', sifters);
  }

  const pennantIds = new Set(pennants.map((p) => Number(p.id)));
  add('filtersinstructions', collectFilterSlidesForPennants(state.content, pennantIds));
};

const collectQuizFoundationDashboards = (
  q: QuizState,
  clearedQuizIds: Set<number>,
  add: (approute: string, rows: DataRow[]) => void
): void => {
  const df: DataRow[] = [];
  for (const quiz of q.quizzes) {
    if (clearedQuizIds.has(quiz.id)) {
      df.push(...quiz.pennants.map((p) => toStashRow(p as unknown as DataRow)));
    }
  }
  add('dashboardsfilters', df);

  const clearedBanners = q.banners.filter(
    (b) => b.bannerId !== undefined && clearedQuizIds.has(b.bannerId as number)
  );
  const clearedBannerIds = new Set(clearedBanners.map((b) => b.id));
  add('dashboardssifters', clearedBanners.map((b) => toStashRow(b as unknown as DataRow)));

  const pennants: DataRow[] = [];
  for (const b of clearedBanners) {
    pennants.push(...b.pennants.map((p) => toStashRow(p as unknown as DataRow)));
  }

  for (const group of q.content) {
    if (!groupBelongsToAnyBanner(group, clearedBannerIds)) continue;
    const { sifters } = getSlideGroupLeaves(group);
    add('siftersinstructions', sifters);
  }

  add('siftersfilters', pennants);
  const pennantIds = new Set(pennants.map((p) => Number(p.id)));
  add('filtersinstructions', collectFilterSlidesForPennants(q.content, pennantIds));
};

const collectCourseLikeUnderQuiz = (
  q: QuizState,
  clearedBannerIds: Set<number>,
  add: (approute: string, rows: DataRow[]) => void
): void => {
  const pennants: DataRow[] = [];
  for (const b of q.banners) {
    if (clearedBannerIds.has(b.id)) {
      pennants.push(...b.pennants.map((p) => toStashRow(p as unknown as DataRow)));
    }
  }

  for (const group of q.content) {
    if (!groupBelongsToAnyBanner(group, clearedBannerIds)) continue;
    const { sifters } = getSlideGroupLeaves(group);
    add('siftersinstructions', sifters);
  }

  add('siftersfilters', pennants);
  const pennantIds = new Set(pennants.map((p) => Number(p.id)));
  add('filtersinstructions', collectFilterSlidesForPennants(q.content, pennantIds));
};

/**
 * Rows removed by `clearSelected` on child routes when unjoining parents — collect from state
 * before `clearSelected` so they can be stashed under their own `from+to` approutes.
 */
export function collectCascadingStashSegments(
  state: RootState,
  from: string,
  to: string,
  childData: DataRow[]
): CascadeStashSegment[] {
  const curApp = getCurAppName(state.session.curApp);
  const route = from + to;
  const clearedIds = new Set(childData.map((r) => Number(r.id)));
  const byRoute = new Map<string, DataRow[]>();
  const add = (approute: string, rows: DataRow[]): void => mergeInto(byRoute, approute, rows);

  if (curApp === 'tutorial') {
    if (route === 'foundationfilters') {
      const slides: DataRow[] = [];
      for (const slidesArr of state.tutorial.content) {
        if (slidesArr.length === 0) continue;
        const bid = slidesArr[0]?.bannerId;
        if (bid !== undefined && clearedIds.has(bid)) {
          slides.push(...slidesArr.map((c) => toStashRow(c as unknown as DataRow)));
        }
      }
      add('filtersinstructions', slides);
    }
  } else if (curApp === 'course') {
    if (route === 'foundationsifters') {
      collectCourseFoundationSifters(state.course, clearedIds, add);
    } else if (route === 'siftersfilters') {
      collectSifterFiltersCascade(state.course.content, clearedIds, add);
    } else if (route === 'siftersinstructions') {
      const destinationBannerIds = state.course.banners
        .filter(({ isHighlighted }) => isHighlighted)
        .map(({ id }) => id);
      collectSifterInstructionsCascade(
        state.course.banners,
        state.course.content,
        clearedIds,
        destinationBannerIds,
        add,
      );
    }
  } else if (curApp === 'quiz') {
    if (route === 'foundationdashboards') {
      collectQuizFoundationDashboards(state.quiz, clearedIds, add);
    } else if (route === 'dashboardssifters') {
      collectCourseLikeUnderQuiz(state.quiz, clearedIds, add);
    } else if (route === 'siftersfilters') {
      collectSifterFiltersCascade(state.quiz.content, clearedIds, add);
    } else if (route === 'siftersinstructions') {
      const destinationBannerIds = state.quiz.banners
        .filter(({ isHighlighted }) => isHighlighted)
        .map(({ id }) => id);
      collectSifterInstructionsCascade(
        state.quiz.banners,
        state.quiz.content,
        clearedIds,
        destinationBannerIds,
        add,
      );
    }
  }

  return Array.from(byRoute.entries())
    .filter(([, content]) => content.length > 0)
    .map(([approute, content]) => ({ approute, content }));
}
