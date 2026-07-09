import type { Freight } from './actions';
import type { DataRow, Metadata } from '../components/Core/types';
import type { RootState } from '../store';
import { getCurAppName, getRouteAlias, incrementID } from '../utils';
import {
  buildEscrowStashImportFromRoutesData,
  findSelectedOrLatestStashFreightsForWebapp,
  hierarchyShortcutStashBaseUnixSeconds,
  isServerId,
  type StashImportRowFilter,
} from './ShortcutsUtils';
import {
  newShortcutJoinStashTimestamp,
  withHierarchyStamp,
} from '../store/middleware/UiuxManager';
import { getStashCellRows, type StashPayload } from '../store/slices/stashSlice';

const COURSE_APP_INDEX = 2;
const TUTORIAL_APP_INDEX = 1;

const PASS_ALL_ROWS: StashImportRowFilter = (_, rows) => rows;

const isInstructionsApproute = (approute: string): boolean =>
  approute.toLowerCase().endsWith('instructions');

const validateInstructionsStashRowsHaveServerIds = (
  byApproute: Map<string, DataRow[]>
): string | null => {
  const localIdApproutes: string[] = [];
  for (const [approute, rows] of byApproute) {
    if (!isInstructionsApproute(approute)) continue;
    if (rows.some((row) => !isServerId(row.id))) {
      localIdApproutes.push(approute);
    }
  }
  if (!localIdApproutes.length) return null;
  return `Selected stash rows on ${localIdApproutes.join(', ')} use local ids (server ids must be > 0).`;
};

export type ConvertStashDirection =
  | 'courses-to-tutorials'
  | 'tutorials-to-courses'
  | 'courses-to-quizzes'
  | 'quizzes-to-courses';

/** Both toggles encode conversion direction: tutorials axis × quizzes axis. */
export const resolveConvertStashDirection = (
  isCoursesToQuizzes: boolean,
  isTutorialsToCourses: boolean
): ConvertStashDirection => {
  if (!isTutorialsToCourses && !isCoursesToQuizzes) return 'courses-to-tutorials';
  if (!isTutorialsToCourses && isCoursesToQuizzes) return 'courses-to-quizzes';
  if (isTutorialsToCourses && !isCoursesToQuizzes) return 'tutorials-to-courses';
  return 'quizzes-to-courses';
};

const remapMetadataKey = (metadata: Metadata, fromKey: string, toKey: string): Metadata => {
  if (!(fromKey in metadata)) return metadata;
  const next = { ...metadata } as Record<string, unknown>;
  next[toKey] = next[fromKey];
  delete next[fromKey];
  return next as unknown as Metadata;
};

const remapIdThroughMap = (id: number, idMap: Map<number, number>): number => {
  const n = Number(id);
  if (!Number.isFinite(n)) return id;
  return idMap.get(n) ?? n;
};

/** Join grouping counts one child per instruction row; parent metadata must be a single id. */
const toSingleParentId = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const list = Array.isArray(value) ? value : [value];
  for (const entry of list) {
    const n = Number(entry);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return undefined;
};

const withScalarMetadataParentId = (
  metadata: Metadata | undefined,
  key: string
): Metadata | undefined => {
  if (!metadata) return metadata;
  const scalar = toSingleParentId(metadata[key as keyof Metadata]);
  if (scalar == null) return metadata;
  const current = metadata[key as keyof Metadata];
  if (current === scalar) return metadata;
  return { ...metadata, [key]: scalar };
};

const remapParentIdsInRow = (
  row: DataRow,
  parentKey: string,
  idMap: Map<number, number>
): DataRow => {
  if (!idMap.size) return row;
  const extended = row as DataRow & { bannerId?: number };
  let next: DataRow = row;

  if (row.metadata) {
    const val = row.metadata[parentKey as keyof Metadata];
    let metadata = row.metadata;
    if (val != null) {
      const parentId = toSingleParentId(val);
      if (parentId != null) {
        metadata = {
          ...metadata,
          [parentKey]: remapIdThroughMap(parentId, idMap),
        };
      }
    }
    if (metadata !== row.metadata) {
      next = { ...next, metadata, modified: true };
    }
  }

  if (extended.bannerId != null) {
    const bannerId = remapIdThroughMap(Number(extended.bannerId), idMap);
    if (bannerId !== Number(extended.bannerId)) {
      next = { ...next, bannerId, modified: true } as DataRow;
    }
  }

  return next;
};

type StashTextFields = DataRow & {
  quote?: string;
  title?: string;
  purpose?: string;
  filter?: string;
  sifter?: string;
};

const extractTitleQuote = (row: DataRow): { title: string; quote: string } => {
  const extended = row as StashTextFields;
  const title = String(extended.title ?? extended.filter ?? extended.sifter ?? '');
  const quote = String(extended.quote ?? extended.purpose ?? '');
  return { title, quote };
};

/** Builds a tutorial `foundationfilters` row with a new local id; copies `title` and `quote` from the source parent. */
const buildFoundationFilterFromParentSource = (
  sourceRow: DataRow
): { filterRow: DataRow; oldId: number } => {
  const oldId = Number(sourceRow.id);
  const newId = incrementID();
  const { title, quote } = extractTitleQuote(sourceRow);
  const sourceMeta = sourceRow.metadata;

  const metadata: Metadata = {
    owner: true,
    ordinal: Number(sourceMeta?.ordinal ?? 0),
    filterId: newId,
  };

  const filterRow = {
    descendentsSums: sourceRow.descendentsSums ?? {},
    id: newId,
    title,
    quote,
    filter: title,
    purpose: quote,
    status: sourceRow.status,
    sizeInBytes: Number(sourceRow.sizeInBytes ?? 0),
    checked: true,
    modified: true,
    metadata,
  } as DataRow;

  return { filterRow, oldId };
};

const buildSingleFoundationFilterFromLowestOrdinal = (foundationfilters: DataRow[]): DataRow => {
  const lowest = foundationfilters.reduce<DataRow | null>((best, row) => {
    const ord = Number(row.metadata?.ordinal ?? Number.POSITIVE_INFINITY);
    const bestOrd = Number(best?.metadata?.ordinal ?? Number.POSITIVE_INFINITY);
    return ord < bestOrd ? row : best;
  }, null);
  const newId = incrementID();
  const { title, quote } = lowest ? extractTitleQuote(lowest) : { title: '', quote: '' };

  return {
    descendentsSums: lowest?.descendentsSums ?? {},
    id: newId,
    title,
    quote,
    filter: title,
    purpose: quote,
    status: lowest?.status,
    sizeInBytes: Number(lowest?.sizeInBytes ?? 0),
    checked: true,
    modified: true,
    metadata: {
      owner: true,
      ordinal: 0,
      filterId: newId,
    },
  } as DataRow;
};

const buildParentIdMapToSingleFilter = (
  newFilterId: number,
  foundationfilters: DataRow[],
  filtersinstructions: DataRow[]
): Map<number, number> => {
  const parentIdMap = new Map<number, number>();
  for (const row of foundationfilters) {
    const oldId = Number(row.id);
    if (Number.isFinite(oldId)) parentIdMap.set(oldId, newFilterId);
  }
  for (const row of filtersinstructions) {
    const pid =
      toSingleParentId(row.metadata?.filterId) ??
      toSingleParentId((row as DataRow & { bannerId?: number }).bannerId);
    if (pid != null) parentIdMap.set(pid, newFilterId);
  }
  return parentIdMap;
};

const buildParentIdMapFromSourceRows = (
  sourceRows: DataRow[]
): { foundationFilters: DataRow[]; parentIdMap: Map<number, number> } => {
  const foundationFilters: DataRow[] = [];
  const parentIdMap = new Map<number, number>();

  for (const sourceRow of sourceRows) {
    const { filterRow, oldId } = buildFoundationFilterFromParentSource(sourceRow);
    if (!Number.isFinite(oldId)) continue;
    foundationFilters.push(filterRow);
    parentIdMap.set(oldId, Number(filterRow.id));
  }

  return { foundationFilters, parentIdMap };
};

/** Later rows win — filter-branch instructions override sifter-branch on duplicate ids. */
const dedupeInstructionsById = (rows: DataRow[]): DataRow[] => {
  const byId = new Map<number, DataRow>();
  for (const row of rows) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    byId.set(id, row);
  }
  return Array.from(byId.values());
};

const collectReferencedParentIds = (rows: DataRow[], parentKey = 'filterId'): Set<number> => {
  const refs = new Set<number>();
  for (const row of rows) {
    const pid =
      toSingleParentId(row.metadata?.[parentKey as keyof Metadata]) ??
      toSingleParentId((row as DataRow & { bannerId?: number }).bannerId);
    if (pid != null) refs.add(pid);
  }
  return refs;
};

const pruneUnreferencedFoundationFilters = (
  foundationfilters: DataRow[],
  filtersinstructions: DataRow[]
): DataRow[] => {
  const referenced = collectReferencedParentIds(filtersinstructions);
  return foundationfilters.filter((row) => referenced.has(Number(row.id)));
};

/** Course `siftersinstructions` → tutorial `filtersinstructions` with remapped parent filter ids. */
const convertSifterInstructionsRow = (
  row: DataRow,
  parentIdMap: Map<number, number>
): DataRow => {
  let next: DataRow = {
    ...row,
    checked: row.checked ?? true,
    modified: true,
  };
  if (next.metadata) {
    next.metadata = withScalarMetadataParentId(
      remapMetadataKey({ ...next.metadata }, 'sifterId', 'filterId'),
      'filterId'
    );
  }
  return remapParentIdsInRow(next, 'filterId', parentIdMap);
};

/** Course `filtersinstructions` → tutorial `filtersinstructions` with remapped parent filter ids. */
const convertFilterInstructionsRow = (
  row: DataRow,
  parentIdMap: Map<number, number>
): DataRow => {
  let next: DataRow = {
    ...row,
    checked: row.checked ?? true,
    modified: true,
  };
  if (next.metadata) {
    next.metadata = withScalarMetadataParentId(next.metadata, 'filterId');
  }
  return remapParentIdsInRow(next, 'filterId', parentIdMap);
};

/**
 * Mirrors Ctrl+Shift+J join stash rows: local-id parent banners are dropped from
 * `foundationfilters`; children carry `owner: false` and parent `filterId` links.
 */
const toJoinedInstructionRow = (row: DataRow): DataRow => {
  const rowMeta = (row.metadata ?? {}) as Metadata;
  const extended = row as DataRow & { bannerId?: number };
  const filterParentId =
    toSingleParentId(rowMeta.filterId) ?? toSingleParentId(extended.bannerId);
  const instructionId = rowMeta.instructionId ?? row.id;
  const { metadata: _metadata, ...theRow } = row;

  return {
    ...theRow,
    checked: true,
    modified: true,
    metadata: {
      ...(filterParentId != null ? { filterId: filterParentId } : {}),
      instructionId,
      owner: false,
      ordinal: Number(rowMeta.ordinal ?? 0),
    } as Metadata,
  } as DataRow;
};

const buildJoinedTutorialStashGroup = (
  filtersinstructions: DataRow[],
  webappIndex: number
): {
  appendPayloads: StashPayload[];
  stashNav: {
    hierarchyUnix: number;
    members: Array<{ approute: string; timestamp: string }>;
  };
  routeLabels: string[];
} => {
  const baseTimestamp = newShortcutJoinStashTimestamp();
  const hierarchyUnix = hierarchyShortcutStashBaseUnixSeconds(baseTimestamp);
  const webapp = getCurAppName(webappIndex);
  const joinedInstructions = filtersinstructions.map(toJoinedInstructionRow);

  const legs: Array<{ approute: string; content: DataRow[] }> = [
    { approute: 'foundationfilters', content: [] },
    { approute: 'filtersinstructions', content: joinedInstructions },
  ];

  const appendPayloads: StashPayload[] = [];
  const members: Array<{ approute: string; timestamp: string }> = [];
  const routeLabels: string[] = [];

  legs.forEach(({ approute, content }, hierarchyIndex) => {
    const timestamp = withHierarchyStamp(baseTimestamp, webappIndex, hierarchyIndex);
    appendPayloads.push({ approute, timestamp, content });
    members.push({ approute, timestamp });
    routeLabels.push(getRouteAlias(approute, webapp));
  });

  return {
    appendPayloads,
    stashNav: { hierarchyUnix, members },
    routeLabels,
  };
};

const stashRowsByApprouteFromFreights = (
  stash: RootState['stash'],
  freights: Freight[]
): Map<string, DataRow[]> => {
  const byApproute = new Map<string, DataRow[]>();
  for (const { approute, timestamp } of freights) {
    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    if (rows.length > 0) {
      byApproute.set(approute, rows);
    }
  }
  return byApproute;
};

export type ConvertCoursesToTutorialsResult =
  | {
      ok: true;
      escrowAppendPayloads: StashPayload[];
      joinAppendPayloads: StashPayload[];
      stashNav: {
        hierarchyUnix: number;
        members: Array<{ approute: string; timestamp: string }>;
      };
      escrowRouteLabels: string[];
      joinRouteLabels: string[];
    }
  | { ok: false; error: string };

/**
 * Courses → tutorials: reads the selected (or latest) course stash group, requires
 * `foundationsifters`+`siftersinstructions` and/or `siftersfilters`+`filtersinstructions`,
 * then creates a tutorial `Escrowed_items` group (`foundationfilters`+`filtersinstructions`) and a
 * matching `Joined_items` group (empty `foundationfilters`, joined `filtersinstructions`).
 * Foundation filters receive new local ids; `title`/`quote` transfer from parent source rows and
 * child instruction rows are rewired to those ids.
 */
export const convertCoursesToTutorialsStash = (state: RootState): ConvertCoursesToTutorialsResult => {
  const freights = findSelectedOrLatestStashFreightsForWebapp(state, COURSE_APP_INDEX);
  if (!freights?.length) {
    return {
      ok: false,
      error:
        'No course stash group found. Select a course stash inventory group (Prev/Next Stash Group) or create one first.',
    };
  }

  const byApproute = stashRowsByApprouteFromFreights(state.stash, freights);
  const instructionsIdError = validateInstructionsStashRowsHaveServerIds(byApproute);
  if (instructionsIdError) {
    return { ok: false, error: instructionsIdError };
  }
  const hasSifterBranch =
    (byApproute.get('foundationsifters')?.length ?? 0) > 0 &&
    (byApproute.get('siftersinstructions')?.length ?? 0) > 0;
  const hasFilterBranch =
    (byApproute.get('siftersfilters')?.length ?? 0) > 0 &&
    (byApproute.get('filtersinstructions')?.length ?? 0) > 0;

  if (!hasSifterBranch && !hasFilterBranch) {
    return {
      ok: false,
      error:
        'Course stash group must include foundationsifters+siftersinstructions and/or siftersfilters+filtersinstructions routes with rows.',
    };
  }

  const foundationfilters: DataRow[] = [];
  const filtersinstructions: DataRow[] = [];

  if (hasSifterBranch) {
    const { foundationFilters, parentIdMap } = buildParentIdMapFromSourceRows(
      byApproute.get('foundationsifters')!
    );
    foundationfilters.push(...foundationFilters);
    filtersinstructions.push(
      ...byApproute
        .get('siftersinstructions')!
        .map((row) => convertSifterInstructionsRow(row, parentIdMap))
    );
  }

  if (hasFilterBranch) {
    const { foundationFilters, parentIdMap } = buildParentIdMapFromSourceRows(
      byApproute.get('siftersfilters')!
    );
    foundationfilters.push(...foundationFilters);
    filtersinstructions.push(
      ...byApproute
        .get('filtersinstructions')!
        .map((row) => convertFilterInstructionsRow(row, parentIdMap))
    );
  }

  const dedupedInstructions = dedupeInstructionsById(filtersinstructions);
  const referencedFilters = pruneUnreferencedFoundationFilters(
    foundationfilters,
    dedupedInstructions
  );

  const routesData: Record<string, DataRow[]> = {
    foundationfilters: referencedFilters,
    filtersinstructions: dedupedInstructions,
  };

  const built = buildEscrowStashImportFromRoutesData(
    state,
    routesData,
    PASS_ALL_ROWS,
    TUTORIAL_APP_INDEX
  );
  if (!built.ok) {
    return { ok: false, error: built.error };
  }

  const joined = buildJoinedTutorialStashGroup(dedupedInstructions, TUTORIAL_APP_INDEX);

  return {
    ok: true,
    escrowAppendPayloads: built.appendPayloads,
    joinAppendPayloads: joined.appendPayloads,
    stashNav: built.stashNav,
    escrowRouteLabels: built.routeLabels,
    joinRouteLabels: joined.routeLabels,
  };
};

export type CombineTutorialTreesResult =
  | {
      ok: true;
      escrowAppendPayloads: StashPayload[];
      joinAppendPayloads: StashPayload[];
      stashNav: {
        hierarchyUnix: number;
        members: Array<{ approute: string; timestamp: string }>;
      };
      escrowRouteLabels: string[];
      joinRouteLabels: string[];
    }
  | { ok: false; error: string };

/**
 * Tutorials: reads the selected (or latest) tutorial stash group, creates one new
 * `foundationfilters` row (title/quote from the lowest-ordinal existing filter), rewires all
 * `filtersinstructions` to that parent, then writes a new `Escrowed_items` group and matching
 * `Joined_items` group.
 */
export const combineTutorialTreesStash = (state: RootState): CombineTutorialTreesResult => {
  const freights = findSelectedOrLatestStashFreightsForWebapp(state, TUTORIAL_APP_INDEX);
  if (!freights?.length) {
    return {
      ok: false,
      error:
        'No tutorial stash group found. Select a tutorial stash inventory group (Prev/Next Stash Group) or create one first.',
    };
  }

  const byApproute = stashRowsByApprouteFromFreights(state.stash, freights);
  const instructionsIdError = validateInstructionsStashRowsHaveServerIds(byApproute);
  if (instructionsIdError) {
    return { ok: false, error: instructionsIdError };
  }
  const foundationfilters = byApproute.get('foundationfilters') ?? [];
  const filtersinstructions = byApproute.get('filtersinstructions') ?? [];

  if (!filtersinstructions.length) {
    return {
      ok: false,
      error:
        'Tutorial stash group must include filtersinstructions rows to combine.',
    };
  }

  const newFoundationFilter = buildSingleFoundationFilterFromLowestOrdinal(foundationfilters);
  const newFilterId = Number(newFoundationFilter.id);
  const parentIdMap = buildParentIdMapToSingleFilter(
    newFilterId,
    foundationfilters,
    filtersinstructions
  );
  const dedupedInstructions = dedupeInstructionsById(
    filtersinstructions.map((row) => convertFilterInstructionsRow(row, parentIdMap))
  );

  const routesData: Record<string, DataRow[]> = {
    foundationfilters: [newFoundationFilter],
    filtersinstructions: dedupedInstructions,
  };

  const built = buildEscrowStashImportFromRoutesData(
    state,
    routesData,
    PASS_ALL_ROWS,
    TUTORIAL_APP_INDEX
  );
  if (!built.ok) {
    return { ok: false, error: built.error };
  }

  const joined = buildJoinedTutorialStashGroup(dedupedInstructions, TUTORIAL_APP_INDEX);

  return {
    ok: true,
    escrowAppendPayloads: built.appendPayloads,
    joinAppendPayloads: joined.appendPayloads,
    stashNav: built.stashNav,
    escrowRouteLabels: built.routeLabels,
    joinRouteLabels: joined.routeLabels,
  };
};

const isStashBreakpointRow = (row: DataRow): boolean =>
  row.checked === true ||
  (row as DataRow & { isHighlighted?: boolean }).isHighlighted === true;

const collectBreakpointIndices = (rows: DataRow[]): number[] =>
  rows.reduce<number[]>((indices, row, index) => {
    if (isStashBreakpointRow(row)) indices.push(index);
    return indices;
  }, []);

/**
 * Partitions `filtersinstructions` at checked row indices (sorted ascending).
 * First segment is the first breakpoint row; each later breakpoint starts a new segment.
 * Consecutive breakpoints yield one row per segment; gaps yield the rows strictly between
 * prior and current breakpoints; the last segment runs through the prior breakpoint (inclusive)
 * to an exclusive end derived from the final breakpoint (see examples in
 * {@link separateTutorialTreesStash}).
 */
const buildInstructionSegmentsFromBreakpoints = (
  instructions: DataRow[],
  breakpoints: number[]
): DataRow[][] => {
  const B = [...breakpoints].sort((a, b) => a - b);
  if (!B.length) return [];

  const segments: DataRow[][] = [[instructions[B[0]]]];

  for (let i = 1; i < B.length; i++) {
    if (B[i] === B[i - 1] + 1) {
      segments.push([instructions[B[i]]]);
      continue;
    }
    if (i === B.length - 1) {
      const end =
        B[i] >= instructions.length
          ? instructions.length
          : B[i] === instructions.length - 1
            ? B[i] + 1
            : B[i];
      segments.push(instructions.slice(B[i - 1], end));
      continue;
    }
    segments.push(instructions.slice(B[i - 1] + 1, B[i]));
  }

  return segments;
};

const findParentFoundationFilter = (
  instruction: DataRow,
  foundationfilters: DataRow[]
): DataRow | undefined => {
  const parentId =
    toSingleParentId(instruction.metadata?.filterId) ??
    toSingleParentId((instruction as DataRow & { bannerId?: number }).bannerId);
  if (parentId == null) return foundationfilters[0];
  return foundationfilters.find((row) => Number(row.id) === parentId);
};

const collectAssignedInstructionIndices = (segments: DataRow[][], instructions: DataRow[]): Set<number> => {
  const assigned = new Set<number>();
  for (const segment of segments) {
    for (const row of segment) {
      const index = instructions.indexOf(row);
      if (index >= 0) assigned.add(index);
    }
  }
  return assigned;
};

export type SeparateTutorialTreesResult =
  | {
      ok: true;
      escrowAppendPayloads: StashPayload[];
      joinAppendPayloads: StashPayload[];
      stashNav: {
        hierarchyUnix: number;
        members: Array<{ approute: string; timestamp: string }>;
      };
      escrowRouteLabels: string[];
      joinRouteLabels: string[];
      segmentChildCounts: number[];
    }
  | { ok: false; error: string };

/**
 * Tutorials (inverse of combine): reads the selected (or latest) tutorial stash group, uses
 * checked/highlighted `filtersinstructions` row indices as breakpoints, builds one
 * `foundationfilters` row per segment (title/quote from each segment's parent filter), rewires
 * child instructions, then writes new `Escrowed_items` and `Joined_items` groups.
 *
 * Examples — breakpoints (0,1,2) → three tutorials with (1,1,1) children; (0,3,12) on twelve
 * instruction rows → three tutorials with (1,2,9) children.
 */
export const separateTutorialTreesStash = (state: RootState): SeparateTutorialTreesResult => {
  const freights = findSelectedOrLatestStashFreightsForWebapp(state, TUTORIAL_APP_INDEX);
  if (!freights?.length) {
    return {
      ok: false,
      error:
        'No tutorial stash group found. Select a tutorial stash inventory group (Prev/Next Stash Group) or create one first.',
    };
  }

  const byApproute = stashRowsByApprouteFromFreights(state.stash, freights);
  const instructionsIdError = validateInstructionsStashRowsHaveServerIds(byApproute);
  if (instructionsIdError) {
    return { ok: false, error: instructionsIdError };
  }

  const foundationfilters = byApproute.get('foundationfilters') ?? [];
  const filtersinstructions = byApproute.get('filtersinstructions') ?? [];

  if (!filtersinstructions.length) {
    return {
      ok: false,
      error: 'Tutorial stash group must include filtersinstructions rows to separate.',
    };
  }

  const breakpoints = collectBreakpointIndices(filtersinstructions);
  if (breakpoints.length < 2) {
    return {
      ok: false,
      error:
        'Select at least two checked filtersinstructions rows as breakpoints to separate tutorials.',
    };
  }

  const invalidBreakpoint = breakpoints.find(
    (index) => index < 0 || index >= filtersinstructions.length
  );
  if (invalidBreakpoint != null) {
    return {
      ok: false,
      error: `Invalid filtersinstructions breakpoint index: ${invalidBreakpoint}.`,
    };
  }

  const segments = buildInstructionSegmentsFromBreakpoints(filtersinstructions, breakpoints);
  const assigned = collectAssignedInstructionIndices(segments, filtersinstructions);
  const uncovered = filtersinstructions
    .map((_, index) => index)
    .filter((index) => !assigned.has(index));
  if (uncovered.length) {
    return {
      ok: false,
      error: `Breakpoint rows must cover all filtersinstructions rows; missing indices: ${uncovered.join(', ')}.`,
    };
  }

  const nextFoundationfilters: DataRow[] = [];
  const nextFiltersinstructions: DataRow[] = [];

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    const parentSource =
      findParentFoundationFilter(segment[0], foundationfilters) ??
      buildSingleFoundationFilterFromLowestOrdinal(foundationfilters);
    const { filterRow, oldId } = buildFoundationFilterFromParentSource(parentSource);
    filterRow.metadata = {
      ...(filterRow.metadata ?? {}),
      ordinal: segIdx,
      filterId: Number(filterRow.id),
      owner: true,
    };

    nextFoundationfilters.push(filterRow);
    const newFilterId = Number(filterRow.id);
    const segmentParentIdMap = new Map<number, number>();
    if (Number.isFinite(oldId)) segmentParentIdMap.set(oldId, newFilterId);
    for (const row of segment) {
      const pid =
        toSingleParentId(row.metadata?.filterId) ??
        toSingleParentId((row as DataRow & { bannerId?: number }).bannerId);
      if (pid != null) segmentParentIdMap.set(pid, newFilterId);
    }

    nextFiltersinstructions.push(
      ...segment.map((row) => convertFilterInstructionsRow(row, segmentParentIdMap))
    );
  }

  const dedupedInstructions = dedupeInstructionsById(nextFiltersinstructions);
  const referencedFilters = pruneUnreferencedFoundationFilters(
    nextFoundationfilters,
    dedupedInstructions
  );

  const routesData: Record<string, DataRow[]> = {
    foundationfilters: referencedFilters,
    filtersinstructions: dedupedInstructions,
  };

  const built = buildEscrowStashImportFromRoutesData(
    state,
    routesData,
    PASS_ALL_ROWS,
    TUTORIAL_APP_INDEX
  );
  if (!built.ok) {
    return { ok: false, error: built.error };
  }

  const joined = buildJoinedTutorialStashGroup(dedupedInstructions, TUTORIAL_APP_INDEX);

  return {
    ok: true,
    escrowAppendPayloads: built.appendPayloads,
    joinAppendPayloads: joined.appendPayloads,
    stashNav: built.stashNav,
    escrowRouteLabels: built.routeLabels,
    joinRouteLabels: joined.routeLabels,
    segmentChildCounts: segments.map((segment) => segment.length),
  };
};
