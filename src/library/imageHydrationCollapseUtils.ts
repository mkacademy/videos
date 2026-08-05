import type { DataRow } from '../components/Core/types';
import type { RootState } from '../store/types';
import type { UpdatePayload } from './actions';
import {
  hasMediaBase64Payload,
  isMimeOnlyMediaUrl,
  toPermanentMediaSlotSentinel,
} from './imageUtils';
import { findInstructionRowImageurlById } from './updateStepsImageurlUtils';

/**
 * When bytesFetcher gets no usable payload for a seek id, collapse its local mime-only
 * `imageurl` to a permanent bare sentinel so it is not re-queued. Payload is `{ id, imageurl }`
 * only — never sets `edited` / `modified`.
 */
export const buildEmptyImageHydrationCollapseUpdates = (
  seekIds: readonly number[],
  state: RootState,
): UpdatePayload[] => {
  const updates: UpdatePayload[] = [];
  for (const id of seekIds) {
    const current = findInstructionRowImageurlById(state, id);
    if (typeof current !== 'string' || !isMimeOnlyMediaUrl(current)) continue;
    const sentinel = toPermanentMediaSlotSentinel(current);
    if (!sentinel || sentinel === current) continue;
    updates.push({ id, imageurl: sentinel });
  }
  return updates;
};

/** True when a fetched instruction row carries a loadable media payload in `imageurl`. */
export const instructionRowHasHydratedMedia = (row: DataRow): boolean => {
  const imageurl = typeof row.imageurl === 'string' ? row.imageurl : '';
  return hasMediaBase64Payload(imageurl);
};

export const partitionImageHydrationRows = (
  seekIds: readonly number[],
  rows: readonly DataRow[],
): { hydratedRows: DataRow[]; collapseSeekIds: number[] } => {
  const byId = new Map<number, DataRow>();
  for (const row of rows) {
    const id = parseInt(String(row.id), 10);
    if (Number.isFinite(id) && id > 0) byId.set(id, row);
  }

  const hydratedRows: DataRow[] = [];
  const collapseSeekIds: number[] = [];
  for (const id of seekIds) {
    const row = byId.get(id);
    if (row && instructionRowHasHydratedMedia(row)) {
      hydratedRows.push(row);
    } else {
      collapseSeekIds.push(id);
    }
  }
  return { hydratedRows, collapseSeekIds };
};
