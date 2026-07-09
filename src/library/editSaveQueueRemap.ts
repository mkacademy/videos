import {
  saveCourseEditsPayload,
  saveQuizEditsPayload,
  saveTutorialEditsPayload,
} from './actions';
import { AddedItem } from './DeletionManagerUtils';
import { ChunkableEditsPayload, EditsFormatter } from './editSaveChunkUtils';

const FK_FIELDS = ['id', 'bannerId', 'filterId', 'sifterId', 'dashboardId'] as const;

type IdMap = Map<number, number>;
type RouteRecord = Record<string, unknown[]>;

const remapScalar = (value: number, map: IdMap): number => (map.has(value) ? map.get(value)! : value);

const remapEntity = <T>(entity: T, map: IdMap): T => {
  if (entity === null || typeof entity !== 'object') return entity;

  const record = entity as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  for (const field of FK_FIELDS) {
    if (typeof next[field] === 'number') {
      next[field] = remapScalar(next[field] as number, map);
    }
  }

  if (Array.isArray(next.pennants)) {
    next.pennants = next.pennants.map((pennant) => remapEntity(pennant, map));
  }

  return next as T;
};

const stripSyncedInserts = <T extends { id?: number }>(rows: T[], map: IdMap): T[] =>
  rows.filter((row) => !(typeof row.id === 'number' && row.id < 0 && map.has(row.id)));

const remapRouteRecord = (
  record: RouteRecord | undefined,
  map: IdMap,
  { stripInserts }: { stripInserts: boolean },
): RouteRecord | undefined => {
  if (!record) return undefined;

  const remapped: RouteRecord = {};
  for (const [route, rows] of Object.entries(record)) {
    const kept = stripInserts
      ? stripSyncedInserts(rows as { id?: number }[], map)
      : rows;
    if (kept.length === 0) continue;
    remapped[route] = kept.map((row) => remapEntity(row, map));
  }

  return Object.keys(remapped).length > 0 ? remapped : undefined;
};

const remapDeletedIds = (
  deleted: Record<string, string[]> | undefined,
  map: IdMap,
): Record<string, string[]> | undefined => {
  if (!deleted) return undefined;

  const remapped: Record<string, string[]> = {};
  for (const [route, ids] of Object.entries(deleted)) {
    const nextIds = ids
      .map((id) => {
        const parsed = parseInt(id, 10);
        return map.has(parsed) ? String(map.get(parsed)) : id;
      });
    if (nextIds.length > 0) remapped[route] = nextIds;
  }

  return Object.keys(remapped).length > 0 ? remapped : undefined;
};

const remapAddedItem = (item: AddedItem, map: IdMap): AddedItem => {
  const id = remapScalar(item.id, map);
  const bannerIds = item.bannerIds.map((bannerId) => remapScalar(bannerId, map));
  if (id === item.id && bannerIds.every((bannerId, index) => bannerId === item.bannerIds[index])) {
    return item;
  }
  return { id, bannerIds };
};

const remapAddedRecord = (
  added: Record<string, AddedItem[]> | undefined,
  map: IdMap,
): Record<string, AddedItem[]> | undefined => {
  if (!added) return undefined;

  const remapped: Record<string, AddedItem[]> = {};
  for (const [route, items] of Object.entries(added)) {
    if (!items?.length) continue;
    remapped[route] = items.map((item) => remapAddedItem(item, map));
  }

  return Object.keys(remapped).length > 0 ? remapped : undefined;
};

const remapRouteEditsPayload = <T extends saveTutorialEditsPayload | saveQuizEditsPayload | saveCourseEditsPayload>(
  payload: T,
  map: IdMap,
): T => ({
  ...payload,
  updates: remapRouteRecord(payload.updates as RouteRecord | undefined, map, { stripInserts: false }) as T['updates'],
  inserted: remapRouteRecord(payload.inserted as RouteRecord | undefined, map, { stripInserts: true }) as T['inserted'],
  deleted: remapDeletedIds(payload.deleted as Record<string, string[]> | undefined, map) as T['deleted'],
  added: remapAddedRecord(payload.added as Record<string, AddedItem[]> | undefined, map) as T['added'],
});

export const parseIdSyncPairs = (syncPayload: string[]): IdMap => {
  const ids = syncPayload.map((id) => parseInt(id, 10));
  const map = new Map<number, number>();
  for (let i = 0; i < ids.length - 1; i += 2) {
    if (!Number.isNaN(ids[i]) && !Number.isNaN(ids[i + 1])) {
      map.set(ids[i], ids[i + 1]);
    }
  }
  return map;
};

export const mergeIdSyncPairs = (target: IdMap, syncPayload: string[]): void => {
  parseIdSyncPairs(syncPayload).forEach((serverId, localId) => target.set(localId, serverId));
};

export const remapQueuedEditSavePayload = (
  payload: ChunkableEditsPayload,
  map: IdMap,
  formatter: EditsFormatter,
): ChunkableEditsPayload => {
  if (map.size === 0 || formatter === 'outgoing') return payload;

  switch (formatter) {
    case 'tutorial':
      return remapRouteEditsPayload(payload as saveTutorialEditsPayload, map);
    case 'quiz':
      return remapRouteEditsPayload(payload as saveQuizEditsPayload, map);
    case 'course':
      return remapRouteEditsPayload(payload as saveCourseEditsPayload, map);
    default:
      return payload;
  }
};
