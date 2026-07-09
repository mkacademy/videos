import { store } from '../index';
import { hydrateMetadata, hydrateRows } from '../../library/actions';
import type { MetadataPayload } from '../../library/actions';
import type { ResultPayload } from '../slices/rowSlice';
import { fetchedHandles, type Handler } from '../slices/errorSlice';

const HYDRATION_STORE_FLUSH_MS = 1000;

type HydrationStoreUpdate = {
  rows: ResultPayload;
  metadata: MetadataPayload;
  handles?: Record<string, Handler[]>;
};

let rowsBuffer = new Map<string, ResultPayload>();
let metadataBuffer = new Map<string, MetadataPayload>();
let handlesBuffer: Record<string, Handler[]> = {};
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

const rowsBufferKey = (payload: ResultPayload): string =>
  `${payload.entity}:${payload.parent ?? ''}`;

const metadataBufferKey = (payload: MetadataPayload): string =>
  `${payload.orig.toLowerCase()}:${payload.dest.toLowerCase()}`;

const mergeRows = (existing: ResultPayload, incoming: ResultPayload): ResultPayload => ({
  ...incoming,
  payload: [...existing.payload, ...incoming.payload],
});

const mergeMetadata = (existing: MetadataPayload, incoming: MetadataPayload): MetadataPayload => ({
  ...incoming,
  data: [...existing.data, ...incoming.data],
});

const mergeHandles = (
  target: Record<string, Handler[]>,
  incoming: Record<string, Handler[]>,
): void => {
  for (const [route, handlers] of Object.entries(incoming)) {
    target[route] = [...(target[route] ?? []), ...handlers];
  }
};

const hasBufferedItems = (): boolean =>
  rowsBuffer.size > 0 || metadataBuffer.size > 0 || Object.keys(handlesBuffer).length > 0;

const scheduleFlush = (): void => {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushHydrationStoreBuffer();
    if (hasBufferedItems()) scheduleFlush();
  }, HYDRATION_STORE_FLUSH_MS);
};

export const enqueueHydrationStoreUpdate = (update: HydrationStoreUpdate): void => {
  const rowsKey = rowsBufferKey(update.rows);
  const existingRows = rowsBuffer.get(rowsKey);
  rowsBuffer.set(rowsKey, existingRows ? mergeRows(existingRows, update.rows) : update.rows);

  const metadataKey = metadataBufferKey(update.metadata);
  const existingMetadata = metadataBuffer.get(metadataKey);
  metadataBuffer.set(
    metadataKey,
    existingMetadata ? mergeMetadata(existingMetadata, update.metadata) : update.metadata,
  );

  if (update.handles) mergeHandles(handlesBuffer, update.handles);

  scheduleFlush();
};

/** Immediately applies pooled hydration payloads to the store. */
export const flushHydrationStoreBuffer = (): void => {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  if (!hasBufferedItems()) return;

  const dispatch = store.dispatch;
  for (const rows of rowsBuffer.values()) {
    dispatch(hydrateRows(rows));
  }
  for (const metadata of metadataBuffer.values()) {
    dispatch(hydrateMetadata(metadata));
  }
  if (Object.keys(handlesBuffer).length > 0) {
    dispatch(fetchedHandles(handlesBuffer));
  }

  rowsBuffer = new Map();
  metadataBuffer = new Map();
  handlesBuffer = {};
};

/** Clears pooled payloads without writing them to the store. */
export const resetHydrationStoreBuffer = (): void => {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  rowsBuffer = new Map();
  metadataBuffer = new Map();
  handlesBuffer = {};
};
