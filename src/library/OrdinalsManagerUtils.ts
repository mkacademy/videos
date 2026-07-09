import {
  isPersistableOrdinal,
  type OrdinalUpdate,
  type saveCourseEditsPayload,
  type saveOutgoingEditsPayload,
  type saveQuizEditsPayload,
  type saveTutorialEditsPayload,
  type saveTutorsEditsPayload,
  type mutateIncomingPayload,
} from './actions';
import type { CommsModifiedOrdinals, CommsModifiedOrdinalLane } from './commsUtils';
import { typesToRoutes } from './commsUtils';
import type { CourseModifiedOrdinals } from './CourseUtils';
import type { TutorialModifiedOrdinals } from './TutorialUtils';

type SaveOrdinals =
  | NonNullable<saveTutorsEditsPayload['ordinals']>
  | NonNullable<saveOutgoingEditsPayload['ordinals']>
  | NonNullable<mutateIncomingPayload['ordinals']>
  | NonNullable<saveTutorialEditsPayload['ordinals']>
  | NonNullable<saveQuizEditsPayload['ordinals']>
  | NonNullable<saveCourseEditsPayload['ordinals']>;

export const hasSaveOrdinals = (ordinals?: SaveOrdinals): boolean =>
  Boolean(ordinals && Object.values(ordinals).some((entries) => entries && entries.length > 0));

const FOUNDATION_ROUTES = new Set([
  'foundationfilters',
  'foundationsifters',
  'foundationdashboards',
  'foundationinstructions',
  'foundationbosses',
  'foundationminions',
  'foundationunderbosses',
]);

type CommsOrdinalLookupRow = { id: number; type: string; targets?: (string | number)[] };

const toBannerIds = (value: number | (string | number)[] | undefined | null): number[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map(Number).filter((n) => !Number.isNaN(n)))];
  }
  const n = Number(value);
  return Number.isNaN(n) ? [] : [n];
};

const parentKeyToBannerIds = (parentKey: number): number[] =>
  parentKey > 0 ? [parentKey] : [];

const upsertOrdinalUpdate = (
  byId: Map<number, OrdinalUpdate>,
  id: number,
  ordinal: number,
  bannerIds: number[],
): void => {
  if (!isPersistableOrdinal(ordinal)) return;
  const existing = byId.get(id);
  if (existing) {
    existing.ordinal = ordinal;
    if (bannerIds.length > 0) {
      existing.bannerIds = [...new Set([...existing.bannerIds, ...bannerIds])];
    }
    return;
  }
  byId.set(id, { id, ordinal, bannerIds: [...bannerIds] });
};

type ModifiedOrdinalParents = Record<number, Record<number, number>[]>;

const collectKindOrdinals = (
  modifiedOrdinals: CourseModifiedOrdinals | TutorialModifiedOrdinals,
  kindToRoute: Record<string, string>,
): Record<string, OrdinalUpdate[]> => {
  const result: Record<string, OrdinalUpdate[]> = {};
  for (const [kind, parents] of Object.entries(modifiedOrdinals)) {
    const route = kindToRoute[kind];
    if (!route || !parents) continue;
    const isFoundation = FOUNDATION_ROUTES.has(route);
    const byId = new Map<number, OrdinalUpdate>();
    for (const [parentKeyStr, batchList] of Object.entries(parents as ModifiedOrdinalParents)) {
      const parentBannerIds = isFoundation ? [] : parentKeyToBannerIds(Number(parentKeyStr));
      for (const batch of batchList) {
        for (const [idStr, ordinal] of Object.entries(batch)) {
          upsertOrdinalUpdate(byId, Number(idStr), ordinal, parentBannerIds);
        }
      }
    }
    const updates = [...byId.values()];
    if (updates.length > 0) result[route] = updates;
  }
  return result;
};

const COURSE_KIND_TO_ROUTE = {
  banner: 'foundationsifters',
  pennant: 'siftersfilters',
  cover: 'siftersinstructions',
  slide: 'filtersinstructions',
} as const satisfies Record<string, keyof NonNullable<saveCourseEditsPayload['ordinals']>>;

const QUIZ_KIND_TO_ROUTE = {
  banner: 'dashboardssifters',
  pennant: 'siftersfilters',
  cover: 'siftersinstructions',
  slide: 'filtersinstructions',
} as const satisfies Record<string, keyof NonNullable<saveQuizEditsPayload['ordinals']>>;

const TUTORIAL_KIND_TO_ROUTE = {
  banner: 'foundationfilters',
  content: 'filtersinstructions',
} as const satisfies Record<string, keyof NonNullable<saveTutorialEditsPayload['ordinals']>>;

const TUTOR_ROUTE_KEYS = new Set([
  'foundationbosses',
  'foundationminions',
  'foundationunderbosses',
]);

const OUTGOING_ROUTE_KEYS = new Set([
  'bossesfilters',
  'bossesinstructions',
  'bossesdashboards',
  'bossessifters',
  'underbossesdashboards',
  'underbossesinstructions',
  'underbossesfilters',
  'underbossessifters',
  'minionsfilters',
  'minionssifters',
  'minionsdashboards',
  'minionsinstructions',
]);

const INCOMING_ROUTE_KEYS = new Set([
  'foundationfilters',
  'foundationsifters',
  'foundationdashboards',
  'foundationinstructions',
]);

const parseCommsOutlineKey = (key: string): number => {
  const match = key.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : parseInt(key, 10);
};

const collectCommsLaneOrdinals = (
  modifiedOrdinals: CommsModifiedOrdinals,
  lane: CommsModifiedOrdinalLane,
  allowedRoutes: Set<string>,
  rows: CommsOrdinalLookupRow[],
): Record<string, OrdinalUpdate[]> => {
  const branch = modifiedOrdinals[lane];
  if (!branch) return {};

  const rowsByKey = new Map(rows.map((row) => [`${row.id}${row.type}`, row]));
  const byRoute = new Map<string, Map<number, OrdinalUpdate>>();
  for (const [typeKey, batchList] of Object.entries(branch)) {
    const route = typesToRoutes[typeKey];
    if (!route || !allowedRoutes.has(route)) continue;
    const isFoundation = FOUNDATION_ROUTES.has(route);
    const routeMap = byRoute.get(route) ?? new Map<number, OrdinalUpdate>();
    for (const batch of batchList) {
      for (const [compositeKey, ordinal] of Object.entries(batch)) {
        const id = parseCommsOutlineKey(compositeKey);
        const bannerIds = isFoundation ? [] : toBannerIds(rowsByKey.get(compositeKey)?.targets);
        upsertOrdinalUpdate(routeMap, id, ordinal, bannerIds);
      }
    }
    byRoute.set(route, routeMap);
  }

  const result: Record<string, OrdinalUpdate[]> = {};
  for (const [route, idMap] of byRoute) {
    if (idMap.size > 0) result[route] = [...idMap.values()];
  }
  return result;
};

export const collectTutorialOrdinals = (
  modifiedOrdinals: TutorialModifiedOrdinals,
): NonNullable<saveTutorialEditsPayload['ordinals']> =>
  collectKindOrdinals(modifiedOrdinals, TUTORIAL_KIND_TO_ROUTE) as NonNullable<
    saveTutorialEditsPayload['ordinals']
  >;

export const collectCourseOrdinals = (
  modifiedOrdinals: CourseModifiedOrdinals,
): NonNullable<saveCourseEditsPayload['ordinals']> =>
  collectKindOrdinals(modifiedOrdinals, COURSE_KIND_TO_ROUTE) as NonNullable<
    saveCourseEditsPayload['ordinals']
  >;

export const collectQuizOrdinals = (
  modifiedOrdinals: CourseModifiedOrdinals,
): NonNullable<saveQuizEditsPayload['ordinals']> =>
  collectKindOrdinals(modifiedOrdinals, QUIZ_KIND_TO_ROUTE) as NonNullable<saveQuizEditsPayload['ordinals']>;

export const collectTutorOrdinals = (
  modifiedOrdinals: CommsModifiedOrdinals,
  tutors: CommsOrdinalLookupRow[],
): NonNullable<saveTutorsEditsPayload['ordinals']> =>
  collectCommsLaneOrdinals(modifiedOrdinals, 'tutor', TUTOR_ROUTE_KEYS, tutors) as NonNullable<
    saveTutorsEditsPayload['ordinals']
  >;

export const collectOutgoingOrdinals = (
  modifiedOrdinals: CommsModifiedOrdinals,
  outgoing: CommsOrdinalLookupRow[],
): NonNullable<saveOutgoingEditsPayload['ordinals']> =>
  collectCommsLaneOrdinals(modifiedOrdinals, 'outgoing', OUTGOING_ROUTE_KEYS, outgoing) as NonNullable<
    saveOutgoingEditsPayload['ordinals']
  >;

export const collectIncomingOrdinals = (
  modifiedOrdinals: CommsModifiedOrdinals,
  incoming: CommsOrdinalLookupRow[],
): NonNullable<mutateIncomingPayload['ordinals']> =>
  collectCommsLaneOrdinals(modifiedOrdinals, 'incoming', INCOMING_ROUTE_KEYS, incoming) as NonNullable<
    mutateIncomingPayload['ordinals']
  >;
