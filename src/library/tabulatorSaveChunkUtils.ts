import { MutationDataAccumulator, PayloadData } from '../Hooks/useSaveMutations';
import { DELETE_ROWS, INSERT_ROWS, UPDATE_ROWS } from '../utils';
import { MAX_SAVE_PAYLOAD_BYTES } from './editSaveChunkUtils';
import { safeUtf8ByteLength } from './jsonStringifyUtils';

export const tabulatorSaveMessage = 'saving tabulator... please wait';

export const getTabulatorBatchProgressMessage = (remaining: number): string =>
  `saving tabulator... ${remaining} batch${remaining === 1 ? '' : 'es'} remaining`;

export const isTabulatorSaveMessage = (message: string | null | undefined): boolean =>
  message === tabulatorSaveMessage || Boolean(message?.startsWith('saving tabulator...'));

const TABULATOR_META_KEYS = new Set([
  'requestIsProcessing',
  'curToken',
  'curMailer',
  'pause',
  'curApp',
  'quota',
  'entity',
  'mutateRole',
  'resolvers',
  'target',
]);

const TASK_ORDER = [DELETE_ROWS, INSERT_ROWS, UPDATE_ROWS] as const;

type TabulatorChunkEntry = { key: string; value: PayloadData };

const utf8ByteLength = safeUtf8ByteLength;

export const tabulatorRequestBodySize = (payload: MutationDataAccumulator): number =>
  utf8ByteLength(payload);

export const willChunkTabulatorPayload = (payload: MutationDataAccumulator): boolean =>
  tabulatorRequestBodySize(payload) > MAX_SAVE_PAYLOAD_BYTES;

const extractBase = (payload: MutationDataAccumulator): MutationDataAccumulator => {
  const base: MutationDataAccumulator = {};
  for (const [key, value] of Object.entries(payload)) {
    if (TABULATOR_META_KEYS.has(key)) {
      base[key] = value;
    }
  }
  return base;
};

const collectTabulatorEntries = (payload: MutationDataAccumulator): TabulatorChunkEntry[] => {
  const entries: TabulatorChunkEntry[] = [];
  const seen = new Set<string>();

  for (const key of TASK_ORDER) {
    const value = payload[key];
    if (value == null) continue;
    seen.add(key);

    if (key === UPDATE_ROWS && Array.isArray(value)) {
      for (const item of value) {
        entries.push({ key, value: item as PayloadData });
      }
    } else {
      entries.push({ key, value: value as PayloadData });
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (TABULATOR_META_KEYS.has(key) || seen.has(key) || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        entries.push({ key, value: item as PayloadData });
      }
    } else {
      entries.push({ key, value: value as PayloadData });
    }
  }

  return entries;
};

const entriesToPayload = (
  base: MutationDataAccumulator,
  entries: TabulatorChunkEntry[],
): MutationDataAccumulator => {
  const result: MutationDataAccumulator = { ...base };
  const updates: PayloadData[] = [];

  for (const { key, value } of entries) {
    if (key === UPDATE_ROWS) {
      updates.push(value);
    } else {
      result[key] = value;
    }
  }

  if (updates.length > 0) {
    result[UPDATE_ROWS] = updates;
  }

  return result;
};

export const chunkTabulatorPayload = (payload: MutationDataAccumulator): MutationDataAccumulator[] => {
  if (tabulatorRequestBodySize(payload) <= MAX_SAVE_PAYLOAD_BYTES) return [payload];

  const base = extractBase(payload);
  const entries = collectTabulatorEntries(payload);
  if (entries.length === 0) return [payload];

  const chunks: MutationDataAccumulator[] = [];
  let batch: TabulatorChunkEntry[] = [];

  const flush = () => {
    if (batch.length === 0) return;
    chunks.push(entriesToPayload(base, batch));
    batch = [];
  };

  for (const entry of entries) {
    batch.push(entry);
    const candidate = entriesToPayload(base, batch);
    if (tabulatorRequestBodySize(candidate) > MAX_SAVE_PAYLOAD_BYTES) {
      batch.pop();
      if (batch.length > 0) flush();
      batch = [entry];
      if (tabulatorRequestBodySize(entriesToPayload(base, batch)) > MAX_SAVE_PAYLOAD_BYTES) {
        flush();
      }
    }
  }
  flush();

  return chunks.length > 0 ? chunks : [payload];
};
