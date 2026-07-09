import {
  saveCourseEditsPayload,
  saveOutgoingEditsPayload,
  saveQuizEditsPayload,
  saveTutorialEditsPayload,
} from './actions';
import { AddedItem } from './DeletionManagerUtils';
import { safeUtf8ByteLength } from './jsonStringifyUtils';
import { editsMessage } from '../utils';

export const MAX_SAVE_PAYLOAD_BYTES = 1024 * 1024;

export type RouteEditsPayload =
  | saveTutorialEditsPayload
  | saveQuizEditsPayload
  | saveCourseEditsPayload;

export type ChunkableEditsPayload = saveOutgoingEditsPayload | RouteEditsPayload;

export type EditsFormatter = 'outgoing' | 'tutorial' | 'quiz' | 'course';

/** Parent routes must be chunked before child routes so inserts/adds are not duplicated across batches. */
const ROUTE_HIERARCHY: Record<Exclude<EditsFormatter, 'outgoing'>, string[]> = {
  tutorial: ['foundationfilters', 'filtersinstructions'],
  course: ['foundationsifters', 'siftersfilters', 'siftersinstructions', 'filtersinstructions'],
  quiz: [
    'foundationdashboards',
    'dashboardssifters',
    'dashboardsfilters',
    'siftersfilters',
    'siftersinstructions',
    'filtersinstructions',
  ],
};

const utf8ByteLength = safeUtf8ByteLength;

export const willChunkEditsPayload = (
  payload: ChunkableEditsPayload,
  formatter: EditsFormatter,
): boolean => mutateRequestBodySize(payload, formatter) > MAX_SAVE_PAYLOAD_BYTES;

export const mutateRequestBodySize = (payload: ChunkableEditsPayload, formatter: EditsFormatter): number => {
  switch (formatter) {
    case 'outgoing': {
      const { curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter: fmt, sent, quota, ordinals } =
        payload as saveOutgoingEditsPayload;
      return utf8ByteLength({ curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter: fmt, sent, quota, ordinals });
    }
    case 'tutorial': {
      const { curToken, mutateRole, curMailer, quota, updates, deleted, added, inserted, formatter: fmt, ordinals } =
        payload as saveTutorialEditsPayload;
      return utf8ByteLength({ curToken, mutateRole, curMailer, quota, updates, deleted, added, inserted, formatter: fmt, ordinals });
    }
    case 'quiz': {
      const { curToken, curMailer, updates, deleted, added, inserted, formatter: fmt, mutateRole, quota, ordinals } =
        payload as saveQuizEditsPayload;
      return utf8ByteLength({ curToken, curMailer, updates, deleted, added, inserted, formatter: fmt, mutateRole, quota, ordinals });
    }
    case 'course': {
      const { curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter: fmt, quota, ordinals } =
        payload as saveCourseEditsPayload;
      return utf8ByteLength({ curToken, mutateRole, curMailer, updates, deleted, added, inserted, formatter: fmt, quota, ordinals });
    }
  }
};

type RouteRecord = Record<string, unknown[]>;

type ChunkEntry =
  | { kind: 'update'; route: string; item: unknown }
  | { kind: 'inserted'; route: string; item: unknown }
  | { kind: 'added'; route: string; item: unknown }
  | { kind: 'deleted'; route: string; id: string }
  | { kind: 'sent'; route: string; item: unknown };

const collectRouteRecordEntries = (
  record: RouteRecord | undefined,
  kind: ChunkEntry['kind'],
): ChunkEntry[] => {
  if (!record) return [];
  return Object.entries(record).flatMap(([route, values]) =>
    (values ?? []).map((item) =>
      kind === 'deleted'
        ? { kind: 'deleted' as const, route, id: String(item) }
        : { kind, route, item },
    ),
  );
};

const entriesToRouteRecord = (entries: ChunkEntry[], kind: ChunkEntry['kind']): RouteRecord | undefined => {
  const filtered = entries.filter((entry) => entry.kind === kind);
  if (filtered.length === 0) return undefined;

  const record: RouteRecord = {};
  for (const entry of filtered) {
    if (entry.kind !== kind) continue;
    if (!record[entry.route]) record[entry.route] = [];
    if (entry.kind === 'deleted') {
      record[entry.route].push(entry.id);
    } else if (entry.kind === 'update' || entry.kind === 'inserted' || entry.kind === 'added') {
      record[entry.route].push(entry.item);
    }
  }
  return record;
};

const entriesToPayload = <T extends RouteEditsPayload>(base: T, entries: ChunkEntry[]): T => ({
  ...base,
  updates: entriesToRouteRecord(entries, 'update') as T['updates'],
  deleted: entriesToRouteRecord(entries, 'deleted') as T['deleted'],
  inserted: entriesToRouteRecord(entries, 'inserted') as T['inserted'],
  added: entriesToRouteRecord(entries, 'added') as T['added'],
});

const collectHierarchyOrderedEntries = (
  payload: RouteEditsPayload,
  formatter: Exclude<EditsFormatter, 'outgoing'>,
): ChunkEntry[] => {
  const { updates, deleted, inserted, added } = payload;
  const routes = ROUTE_HIERARCHY[formatter];
  const entries: ChunkEntry[] = [];

  for (const route of routes) {
    entries.push(
      ...collectRouteRecordEntries(
        updates ? { [route]: (updates as RouteRecord)[route] } : undefined,
        'update',
      ),
      ...collectRouteRecordEntries(
        inserted ? { [route]: (inserted as RouteRecord)[route] } : undefined,
        'inserted',
      ),
      ...collectRouteRecordEntries(
        added ? { [route]: (added as RouteRecord)[route] } : undefined,
        'added',
      ),
      ...collectRouteRecordEntries(
        deleted?.[route as keyof typeof deleted]
          ? { [route]: (deleted[route as keyof typeof deleted] ?? []).map(String) }
          : undefined,
        'deleted',
      ),
    );
  }

  return entries;
};

const splitRouteEditsPayload = <T extends RouteEditsPayload>(
  payload: T,
  formatter: Exclude<EditsFormatter, 'outgoing'>,
): T[] => {
  if (mutateRequestBodySize(payload, formatter) <= MAX_SAVE_PAYLOAD_BYTES) return [payload];

  const { updates, deleted, inserted, added, ...base } = payload;
  const entries = collectHierarchyOrderedEntries(payload, formatter);

  if (entries.length === 0) return [payload];

  const chunks: T[] = [];
  let batch: ChunkEntry[] = [];

  const flush = () => {
    if (batch.length === 0) return;
    chunks.push(entriesToPayload(base as T, batch));
    batch = [];
  };

  for (const entry of entries) {
    batch.push(entry);
    const candidate = entriesToPayload(base as T, batch);
    if (mutateRequestBodySize(candidate, formatter) > MAX_SAVE_PAYLOAD_BYTES) {
      batch.pop();
      if (batch.length > 0) flush();
      batch = [entry];
      if (mutateRequestBodySize(entriesToPayload(base as T, batch), formatter) > MAX_SAVE_PAYLOAD_BYTES) {
        flush();
      }
    }
  }
  flush();

  return chunks.length > 0 ? chunks : [payload];
};

const collectOutgoingEntries = (payload: saveOutgoingEditsPayload): ChunkEntry[] => {
  const entries: ChunkEntry[] = [];

  for (const item of payload.updates ?? []) {
    entries.push({ kind: 'update', route: '_updates', item });
  }
  for (const item of payload.inserted ?? []) {
    entries.push({ kind: 'inserted', route: '_inserted', item });
  }
  if (payload.added) {
    for (const [route, items] of Object.entries(payload.added)) {
      for (const item of items ?? []) {
        entries.push({ kind: 'added', route, item });
      }
    }
  }
  if (payload.deleted) {
    for (const [route, ids] of Object.entries(payload.deleted)) {
      for (const id of ids ?? []) {
        entries.push({ kind: 'deleted', route, id: String(id) });
      }
    }
  }
  if (payload.sent) {
    for (const [route, items] of Object.entries(payload.sent)) {
      for (const item of items ?? []) {
        entries.push({ kind: 'sent', route, item });
      }
    }
  }

  return entries;
};

const outgoingEntriesToPayload = (
  base: Omit<saveOutgoingEditsPayload, 'updates' | 'inserted' | 'added' | 'deleted' | 'sent'>,
  entries: ChunkEntry[],
): saveOutgoingEditsPayload => {
  const updates = entries
    .filter((entry): entry is Extract<ChunkEntry, { kind: 'update' }> => entry.kind === 'update')
    .map(({ item }) => item) as saveOutgoingEditsPayload['updates'];

  const inserted = entries
    .filter((entry): entry is Extract<ChunkEntry, { kind: 'inserted' }> => entry.kind === 'inserted')
    .map(({ item }) => item) as saveOutgoingEditsPayload['inserted'];

  const addedEntries = entries.filter((entry): entry is Extract<ChunkEntry, { kind: 'added' }> => entry.kind === 'added');
  const added = addedEntries.length
    ? addedEntries.reduce<NonNullable<saveOutgoingEditsPayload['added']>>((acc, { route, item }) => {
        const routeKey = route as keyof NonNullable<saveOutgoingEditsPayload['added']>;
        if (!acc[routeKey]) acc[routeKey] = [];
        acc[routeKey]!.push(item as AddedItem);
        return acc;
      }, {} as NonNullable<saveOutgoingEditsPayload['added']>)
    : undefined;

  const deletedEntries = entries.filter((entry): entry is Extract<ChunkEntry, { kind: 'deleted' }> => entry.kind === 'deleted');
  const deleted = deletedEntries.length
    ? deletedEntries.reduce<NonNullable<saveOutgoingEditsPayload['deleted']>>((acc, { route, id }) => {
        if (!acc[route as keyof typeof acc]) acc[route as keyof typeof acc] = [];
        acc[route as keyof typeof acc]!.push(id);
        return acc;
      }, {} as NonNullable<saveOutgoingEditsPayload['deleted']>)
    : undefined;

  const sentEntries = entries.filter((entry): entry is Extract<ChunkEntry, { kind: 'sent' }> => entry.kind === 'sent');
  const sent = sentEntries.length
    ? sentEntries.reduce<NonNullable<saveOutgoingEditsPayload['sent']>>((acc, { route, item }) => {
        if (!acc[route]) acc[route] = [];
        acc[route].push(item as NonNullable<saveOutgoingEditsPayload['sent']>[string][number]);
        return acc;
      }, {} as NonNullable<saveOutgoingEditsPayload['sent']>)
    : undefined;

  return {
    ...base,
    updates: updates?.length ? updates : undefined,
    inserted: inserted?.length ? inserted : undefined,
    added,
    deleted,
    sent,
  };
};

const splitOutgoingPayload = (payload: saveOutgoingEditsPayload): saveOutgoingEditsPayload[] => {
  if (mutateRequestBodySize(payload, 'outgoing') <= MAX_SAVE_PAYLOAD_BYTES) return [payload];

  const { updates, inserted, added, deleted, sent, ...base } = payload;
  const entries = collectOutgoingEntries(payload);
  if (entries.length === 0) return [payload];

  const chunks: saveOutgoingEditsPayload[] = [];
  let batch: ChunkEntry[] = [];

  const flush = () => {
    if (batch.length === 0) return;
    chunks.push(outgoingEntriesToPayload(base, batch));
    batch = [];
  };

  for (const entry of entries) {
    batch.push(entry);
    const candidate = outgoingEntriesToPayload(base, batch);
    if (mutateRequestBodySize(candidate, 'outgoing') > MAX_SAVE_PAYLOAD_BYTES) {
      batch.pop();
      if (batch.length > 0) flush();
      batch = [entry];
      if (mutateRequestBodySize(outgoingEntriesToPayload(base, batch), 'outgoing') > MAX_SAVE_PAYLOAD_BYTES) {
        flush();
      }
    }
  }
  flush();

  return chunks.length > 0 ? chunks : [payload];
};

export const chunkEditsPayload = <T extends ChunkableEditsPayload>(
  payload: T,
  formatter: EditsFormatter,
): T[] => {
  switch (formatter) {
    case 'outgoing':
      return splitOutgoingPayload(payload as saveOutgoingEditsPayload) as T[];
    case 'tutorial':
      return splitRouteEditsPayload(payload as saveTutorialEditsPayload, 'tutorial') as T[];
    case 'quiz':
      return splitRouteEditsPayload(payload as saveQuizEditsPayload, 'quiz') as T[];
    case 'course':
      return splitRouteEditsPayload(payload as saveCourseEditsPayload, 'course') as T[];
  }
};

export const getEditsBatchProgressMessage = (remaining: number): string =>
  `saving edits... ${remaining} batch${remaining === 1 ? '' : 'es'} remaining`;

export const isEditsSaveMessage = (message: string | null | undefined): boolean =>
  message === editsMessage || Boolean(message?.startsWith('saving edits...'));
