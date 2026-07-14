import type { DataRow } from '../components/Core/types';
import type { RootState } from '../store';
import {
  getStashCellRows,
  normalizeStashCell,
  readStashInventoryNavUnixSeconds,
  type StashState,
} from '../store/slices/stashSlice';
import { getCurAppName, getInteractionIDs, isPncUserApp } from '../utils';
import type { Freight } from './actions';
import type { GenericDiscriminatorPredicate } from './hydrationUtils';
import {
  hierarchyShortcutStashBaseUnixSeconds,
  isDeleteEligibleShortcutStashBase,
  isEscrowedItemsShortcutStashBase,
  isJoinedItemsShortcutStashBase,
  isUnjoinedItemsShortcutStashBase,
  isUnstashEligibleShortcutStashBase,
  parseHierarchyStampedStashKey,
  shortcutUnstashStashBaseSortKey,
} from './hierarchyShortcutStashKeys';

export {
  hierarchyShortcutStashBaseUnixSeconds,
  isDeleteEligibleShortcutStashBase,
  isEscrowedItemsShortcutStashBase,
  isJoinedItemsShortcutStashBase,
  isUnjoinedItemsShortcutStashBase,
  isUnstashEligibleShortcutStashBase,
  parseHierarchyStampedStashKey,
  shortcutUnstashStashBaseSortKey,
};

const CHILD_ENTITY_SUFFIXES = [
  'lowerlowerunderbosses',
  'lowerhigherunderbosses',
  'lowerlowersifters',
  'lowerhighersifters',
  'higherunderbosses',
  'lowerunderbosses',
  'highersifters',
  'lowersifters',
  'instructions',
  'underbosses',
  'dashboards',
  'foundation',
  'filters',
  'sifters',
  'minions',
  'bosses',
] as const;

export const parseApprouteInteractionIds = (
  approute: string,
): { parentID: string; childID: string } | null => {
  const lower = approute.toLowerCase();
  for (const child of CHILD_ENTITY_SUFFIXES) {
    if (!lower.endsWith(child)) continue;
    const parent = approute.slice(0, approute.length - child.length);
    try {
      const { parentID, childID } = getInteractionIDs(parent, child);
      if (parentID && childID) return { parentID, childID };
    } catch {
      // Try the next possible entity suffix.
    }
  }
  return null;
};

export const parseApprouteChildEntity = (approute: string): string | null => {
  const lower = approute.toLowerCase();
  return CHILD_ENTITY_SUFFIXES.find((child) => lower.endsWith(child)) ?? null;
};

/** Server-assigned IDs are positive; local IDs are zero or negative. */
export const isServerId = (id: DataRow['id']): boolean => Number(id) > 0;

type ShortcutStashFreightResolveOptions = {
  isEligibleBase: (base: string) => boolean;
  baseSortKey: (base: string) => number;
};

const freightsForCompleteStashGroup = (
  byHierarchy: Map<number, { approute: string; timestamp: string }>,
  destination: string,
): Freight[] | null => {
  const hierarchyIndexes = [...byHierarchy.keys()].sort((a, b) => a - b);
  if (hierarchyIndexes.length === 0 || hierarchyIndexes[0] !== 0) return null;
  if (hierarchyIndexes.some((index, position) => index !== position)) return null;

  return hierarchyIndexes.map((index) => {
    const { approute, timestamp } = byHierarchy.get(index)!;
    return { timestamp, approute, destination, selecttype: true };
  });
};

const collectSelectedShortcutStashGroups = (
  state: RootState,
  isEligibleBase: (base: string) => boolean,
): {
  groups: Map<string, Map<number, { approute: string; timestamp: string }>>;
  destination: string;
} | null => {
  const curApp = state.session.curApp;
  if (!isPncUserApp(curApp)) return null;

  const selectedUnix = readStashInventoryNavUnixSeconds(state.stash);
  if (selectedUnix == null) return null;

  const selectedBases = new Set<string>();
  for (const routeStash of Object.values(state.stash)) {
    if (!routeStash) continue;
    for (const [timestamp, rawCell] of Object.entries(routeStash)) {
      if (normalizeStashCell(rawCell).unixSeconds !== selectedUnix) continue;
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (
        parsed &&
        parsed.webappIndex === curApp &&
        isEligibleBase(parsed.base)
      ) {
        selectedBases.add(parsed.base);
      }
    }
  }
  if (selectedBases.size === 0) return null;

  const groups = new Map<
    string,
    Map<number, { approute: string; timestamp: string }>
  >();
  for (const [approute, routeStash] of Object.entries(state.stash)) {
    if (!routeStash) continue;
    for (const timestamp of Object.keys(routeStash)) {
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (
        !parsed ||
        parsed.webappIndex !== curApp ||
        !selectedBases.has(parsed.base)
      ) {
        continue;
      }
      const byHierarchy = groups.get(parsed.base) ?? new Map();
      if (!byHierarchy.has(parsed.hierarchyIndex)) {
        byHierarchy.set(parsed.hierarchyIndex, { approute, timestamp });
      }
      groups.set(parsed.base, byHierarchy);
    }
  }

  return { groups, destination: getCurAppName(curApp) };
};

const findSelectedStashFreightsWith = (
  state: RootState,
  options: ShortcutStashFreightResolveOptions,
): Freight[] | null => {
  const selected = collectSelectedShortcutStashGroups(
    state,
    options.isEligibleBase,
  );
  if (!selected) return null;

  let best: Freight[] | null = null;
  let bestKey = -1;
  for (const [base, byHierarchy] of selected.groups) {
    const freights = freightsForCompleteStashGroup(
      byHierarchy,
      selected.destination,
    );
    if (!freights) continue;
    const key = options.baseSortKey(base);
    if (!best || key > bestKey) {
      best = freights;
      bestKey = key;
    }
  }
  return best;
};

export const findSelectedStashFreights = (
  state: RootState,
): Freight[] | null =>
  findSelectedStashFreightsWith(state, {
    isEligibleBase: isUnstashEligibleShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

export const findSelectedEscrowStashFreights = (
  state: RootState,
): Freight[] | null =>
  findSelectedStashFreightsWith(state, {
    isEligibleBase: isEscrowedItemsShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

const SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER = {
  tutorial: ['foundationfilters', 'filtersinstructions'],
  course: [
    'foundationsifters',
    'siftersinstructions',
    'siftersfilters',
    'filtersinstructions',
  ],
  quiz: [
    'foundationdashboards',
    'dashboardsfilters',
    'dashboardssifters',
    'siftersinstructions',
    'siftersfilters',
    'filtersinstructions',
  ],
} as const;

export const discriminatorsGenerator = (
  getState: () => RootState,
  freights: Freight[],
): GenericDiscriminatorPredicate[] => {
  if (freights.length === 0) return [];
  const destination = freights[0]
    ?.destination as keyof typeof SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER;
  const order = SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER[destination];
  if (!order) return [];

  const stash = getState().stash;
  const idsByApproute = new Map<string, Set<number>>();
  for (const { approute, timestamp } of freights) {
    idsByApproute.set(
      approute.toLowerCase(),
      new Set(
        getStashCellRows(stash[approute]?.[timestamp])
          .map(({ id }) => Number(id))
          .filter(Number.isFinite),
      ),
    );
  }

  return order.map((approute) => {
    const ids = idsByApproute.get(approute);
    return ids
      ? (item) => isServerId(item.id) && ids.has(item.id)
      : () => false;
  });
};

export const countStashRowsInFreights = (
  stash: StashState,
  freights: Freight[],
): number =>
  freights.reduce(
    (total, { approute, timestamp }) =>
      total + getStashCellRows(stash[approute]?.[timestamp]).length,
    0,
  );
