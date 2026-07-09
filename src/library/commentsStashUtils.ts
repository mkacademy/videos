import type { DataRow } from '../components/Core/types';
import type { AppDispatch } from '../store';
import type { CommentsEntry, CommentsFor, CommentsState } from '../store/slices/commentsSlice';
import {
  getStashCellRows,
  type StashPayload,
  type StashState,
} from '../store/slices/stashSlice';
import { viewExports } from '../store/slices/viewSlice';
import { exportTexts } from './actions';
import { commentsTimestamp } from '../utils';

export const COMMENTS_STASH_ROUTE_PREFIX = 'comments/';

const COMMENTS_STASH_MARKER = '__commentsStashV1__';

const COMMENTS_FOR_AREAS: readonly CommentsFor[] = ['course', 'tutorial', 'quiz'];

export const commentsStashApproute = (_for: CommentsFor): string =>
  `${COMMENTS_STASH_ROUTE_PREFIX}${_for}`;

export const isCommentsStashApproute = (approute: string): boolean =>
  approute.startsWith(COMMENTS_STASH_ROUTE_PREFIX);

export const parseCommentsStashApproute = (approute: string): CommentsFor | null => {
  if (!isCommentsStashApproute(approute)) return null;
  const _for = approute.slice(COMMENTS_STASH_ROUTE_PREFIX.length) as CommentsFor;
  return COMMENTS_FOR_AREAS.includes(_for) ? _for : null;
};

export const isCommentsStashRoutesData = (
  routesData: Record<string, unknown>
): boolean => {
  const keys = Object.keys(routesData);
  return keys.length > 0 && keys.every((k) => isCommentsStashApproute(k));
};

export const commentsEntryToStashRow = (
  commentsId: number,
  entry: CommentsEntry
): DataRow => ({
  id: String(commentsId),
  keywords: [COMMENTS_STASH_MARKER, JSON.stringify(entry)],
  descendentsSums: {},
  sizeInBytes: 0,
  status: 0,
  checked: true,
  frozen: false,
  modified: false,
});

export const stashRowToCommentsEntry = (
  row: DataRow
): { commentsId: number; entry: CommentsEntry } | null => {
  const marker = row.keywords?.[0];
  const payload = row.keywords?.[1];
  if (marker !== COMMENTS_STASH_MARKER || typeof payload !== 'string') return null;
  try {
    const entry = JSON.parse(payload) as CommentsEntry;
    const commentsId = Number(row.id);
    if (!Number.isFinite(commentsId)) return null;
    return { commentsId, entry };
  } catch {
    return null;
  }
};

export const buildCommentsStashPayloadsFromState = (
  commentsState: CommentsState,
  timestamp: string = commentsTimestamp
): StashPayload[] => {
  const payloads: StashPayload[] = [];
  for (const _for of COMMENTS_FOR_AREAS) {
    const area = commentsState[_for];
    const content: DataRow[] = [];
    for (const [key, entry] of Object.entries(area)) {
      const commentsId = Number(key);
      if (!Number.isFinite(commentsId) || !entry) continue;
      content.push(commentsEntryToStashRow(commentsId, entry));
    }
    if (content.length) {
      payloads.push({
        approute: commentsStashApproute(_for),
        timestamp,
        content,
      });
    }
  }
  return payloads;
};

export const countCommentsStashEntries = (commentsState: CommentsState): number => {
  let n = 0;
  for (const _for of COMMENTS_FOR_AREAS) {
    n += Object.keys(commentsState[_for]).length;
  }
  return n;
};

export const collectCommentsStashExportDatas = (
  stash: StashState,
  timestamp: string = commentsTimestamp
): Record<string, DataRow[]> => {
  const exportedDatas: Record<string, DataRow[]> = {};
  for (const approute of Object.keys(stash)) {
    if (!isCommentsStashApproute(approute)) continue;
    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    if (rows.length) exportedDatas[approute] = rows;
  }
  return exportedDatas;
};

export const commentsStashRowsToArea = (rows: DataRow[]): Record<number, CommentsEntry> => {
  const area: Record<number, CommentsEntry> = {};
  for (const row of rows) {
    const parsed = stashRowToCommentsEntry(row);
    if (!parsed) continue;
    area[parsed.commentsId] = parsed.entry;
  }
  return area;
};

export const commentsStashRoutesToState = (
  routesData: Record<string, DataRow[]>
): Partial<CommentsState> => {
  const out: Partial<CommentsState> = {};
  for (const [approute, rows] of Object.entries(routesData)) {
    const _for = parseCommentsStashApproute(approute);
    if (!_for || !Array.isArray(rows)) continue;
    out[_for] = commentsStashRowsToArea(rows);
  }
  return out;
};

export const buildCommentsStashImportPayloads = (
  routesData: Record<string, DataRow[]>,
  timestamp: string = commentsTimestamp
): StashPayload[] => {
  const payloads: StashPayload[] = [];
  for (const [approute, rawRows] of Object.entries(routesData)) {
    if (!isCommentsStashApproute(approute) || !Array.isArray(rawRows) || !rawRows.length) {
      continue;
    }
    const content = rawRows
      .map((row) => stashRowToCommentsEntry(row))
      .filter((p): p is { commentsId: number; entry: CommentsEntry } => p !== null)
      .map(({ commentsId, entry }) => commentsEntryToStashRow(commentsId, entry));
    if (!content.length) continue;
    payloads.push({ approute, timestamp, content });
  }
  return payloads;
};

export const listCommentsStashApproutes = (stash: StashState): string[] =>
  Object.keys(stash).filter(isCommentsStashApproute);

export type ExportCommentsStashResult =
  | { status: 'no_data'; exported: 0 }
  | { status: 'success'; exported: number; routeLabels: string[]; entryCount: number };

export const exportCommentsStashToFile = (
  stash: StashState,
  dispatch: AppDispatch,
  timestamp: string = commentsTimestamp
): ExportCommentsStashResult => {
  const exportedDatas = collectCommentsStashExportDatas(stash, timestamp);
  const routeLabels = Object.keys(exportedDatas);
  if (!routeLabels.length) {
    return { status: 'no_data', exported: 0 };
  }
  const entryCount = routeLabels.reduce(
    (sum, route) => sum + (exportedDatas[route]?.length ?? 0),
    0
  );
  dispatch(
    viewExports({
      actionType: exportTexts.type,
      exportedDatas,
    })
  );
  return { status: 'success', exported: routeLabels.length, routeLabels, entryCount };
};
