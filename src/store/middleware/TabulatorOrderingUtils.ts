import type { RootState } from '../index';
import type { Row } from '../slices/rowSlice';
import {
  altGroupRangeReorderSegment,
  findContiguousSortedRange,
} from '../../library/TutorialUtils';

export interface ReOrderRowsPayload {
  ids: string[];
  direction: boolean;
  groupReorder?: boolean;
}

export type RangeResult<T> = { ids: T[]; direction: boolean };

export const TABULATOR_ORDER_RESET = '@reset';
export const TABULATOR_ORDER_END_PREFIX = '@end:';
export const TABULATOR_ORDER_START_PREFIX = '@start:';
export const TABULATOR_ORDER_GROUP_END_PREFIX = '@group-end:';

export type TabulatorOrderIntent = 'start' | 'end' | 'group-end' | 'reset';

export interface ParsedTabulatorOrderToggle {
  intent: TabulatorOrderIntent;
  rowId?: string;
}

export function getTabulatorRouteKey(state: RootState): string {
  return `${state.session.parent ?? ''}${state.view.entity ?? ''}`;
}

export function parseTabulatorOrderTogglePayload(
  payload: string,
): ParsedTabulatorOrderToggle | null {
  if (payload === TABULATOR_ORDER_RESET) {
    return { intent: 'reset' };
  }
  if (payload.startsWith(TABULATOR_ORDER_START_PREFIX)) {
    return { intent: 'start', rowId: payload.slice(TABULATOR_ORDER_START_PREFIX.length) };
  }
  if (payload.startsWith(TABULATOR_ORDER_END_PREFIX)) {
    return { intent: 'end', rowId: payload.slice(TABULATOR_ORDER_END_PREFIX.length) };
  }
  if (payload.startsWith(TABULATOR_ORDER_GROUP_END_PREFIX)) {
    return { intent: 'group-end', rowId: payload.slice(TABULATOR_ORDER_GROUP_END_PREFIX.length) };
  }
  return null;
}

export function visibleRowsSorted(state: Row[]): Row[] {
  return state.filter((row) => !row.deleted).sort((a, b) => a.order - b.order);
}

function idsBetweenSortedRows(
  nodes: Row[],
  idA: string,
  idB: string,
): RangeResult<string> {
  const a = nodes.find((n) => n.id === idA);
  const b = nodes.find((n) => n.id === idB);
  if (!a || !b) return { ids: Array.from(new Set([idA, idB])), direction: true };
  const oa = a.order;
  const ob = b.order;
  const lo = Math.min(oa, ob);
  const hi = Math.max(oa, ob);
  const ids = nodes
    .filter((n) => {
      const o = n.order;
      return o >= lo && o <= hi;
    })
    .map((n) => n.id);
  return { ids, direction: oa < ob };
}

export function expandTabulatorRowOrderRange(
  rows: Row[],
  startId: string,
  endId: string,
): RangeResult<string> {
  return idsBetweenSortedRows(visibleRowsSorted(rows), startId, endId);
}

/** Legacy offset swap on expand-order endpoints, then densify orders to 0..n-1. */
function applyRowOrderRangeReorder(
  byId: Map<string, Row>,
  ids: string[],
  direction: boolean,
): void {
  const presentIds = ids.filter((id) => byId.has(id));
  if (presentIds.length < 2) return;

  const firstId = presentIds[0];
  const lastId = presentIds[presentIds.length - 1];
  const orig = new Map<string, number>();
  for (const id of presentIds) {
    orig.set(id, byId.get(id)!.order);
  }
  const firstItem = byId.get(firstId);
  const lastItem = byId.get(lastId);
  if (firstItem === undefined || lastItem === undefined) return;

  if (direction) {
    const lastOrd = orig.get(lastId)!;
    firstItem.order = lastOrd + 1;
    for (let i = 1; i < presentIds.length; i++) {
      const item = byId.get(presentIds[i]);
      if (item !== undefined) item.order = orig.get(presentIds[i])! - 1;
    }
  } else {
    const firstOrd = orig.get(firstId)!;
    lastItem.order = firstOrd - 1;
    for (let i = 0; i < presentIds.length - 1; i++) {
      const item = byId.get(presentIds[i]);
      if (item !== undefined) item.order = orig.get(presentIds[i])! + 1;
    }
  }

  const sorted = [...byId.values()].sort((a, b) => a.order - b.order);
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].order = i;
  }
}

function markModifiedInOrderSpan(rows: Row[], lo: number, hi: number): Row[] {
  return rows.map((row, i) =>
    i >= lo && i <= hi && parseInt(row.id, 10) > -1
      ? { ...row, modified: true }
      : row,
  );
}

function normalizeVisibleRowOrders(visibles: Row[]): Row[] {
  return [...visibles]
    .sort((a, b) => a.order - b.order)
    .map((row, i) => ({ ...row, order: i }));
}

export function applyReOrderRows(state: Row[], payload: ReOrderRowsPayload): Row[] {
  const { ids, direction, groupReorder } = payload;
  if (ids.length < 2) return state;

  const visibles = visibleRowsSorted(state);
  const invisibles = state.filter((row) => row.deleted);
  const byId = new Map(visibles.map((row) => [row.id, { ...row }]));

  if (groupReorder) {
    const idSet = new Set(ids);
    const fullSorted = visibleRowsSorted([...byId.values()]);
    const range = findContiguousSortedRange(
      fullSorted,
      (r) => idSet.has(r.id),
      idSet.size,
    );
    if (!range) return state;

    const segment = fullSorted.slice(range.lo, range.hi + 1).map((r) => byId.get(r.id)!);
    const newSeg = altGroupRangeReorderSegment(segment, (r) => r.checked);
    if (!newSeg) return state;

    const newFull = [
      ...fullSorted.slice(0, range.lo),
      ...newSeg,
      ...fullSorted.slice(range.hi + 1),
    ];
    newFull.forEach((row, i) => {
      const item = byId.get(row.id);
      if (item) item.order = i;
    });
  } else {
    if (!ids.every((id) => byId.has(id))) return state;
    applyRowOrderRangeReorder(byId, ids, direction);
  }

  let normalized = normalizeVisibleRowOrders([...byId.values()]);
  const idPositions = ids
    .map((id) => normalized.findIndex((r) => r.id === id))
    .filter((i) => i >= 0);
  if (idPositions.length > 0) {
    const lo = Math.min(...idPositions);
    const hi = Math.max(...idPositions);
    normalized = markModifiedInOrderSpan(normalized, lo, hi);
  }

  return normalized.concat(invisibles);
}
