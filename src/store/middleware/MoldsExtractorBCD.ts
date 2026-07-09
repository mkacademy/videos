import { Middleware } from '@reduxjs/toolkit';
import { getEntityFromUrl, ADD_ROWS, getInteractionIDs } from '../../utils';
import { BaseFormattedData, DataRow, LinkTableProps, Metadata } from '../../components/Core/types';

import {
  initInteractions,
  mergeInteractions,
  restoreInteractions,
  insertMetadata,
  abortInsertMetadata,
  fetchMockMetadata,
  fetchingCompleted,
  MockPayload,
} from '../../library/actions';
import { EntityTypeMap, FormattedRowsPayload } from '../slices/rowSlice';
import { dataFetchers, dataFetchersIndeces } from './UrlDataMatcherYZA';
import { viewParentData } from '../slices/viewSlice';

interface ExtractedData {
  fetched: DataRow[] | BaseFormattedData<EntityTypeMap[keyof EntityTypeMap]>;
  dest?: string;
  orig?: string;
}

const compareMetadata = (key: string) => (a: Metadata, b: Metadata): number => {
  const aVal = a[key as keyof Metadata];
  const bVal = b[key as keyof Metadata];
  const aNum = Array.isArray(aVal) ? (aVal[0] ?? 0) : (aVal ?? 0);
  const bNum = Array.isArray(bVal) ? (bVal[0] ?? 0) : (bVal ?? 0);
  if (aNum < bNum) return -1;
  if (aNum > bNum) return 1;
  return 0;
};

const normalizeId = (id: number | (string | number)[] | undefined): number | undefined => {
  if (id === undefined) return undefined;
  if (Array.isArray(id)) {
    const first = id[0];
    return typeof first === 'string' ? parseInt(first, 10) : first;
  }
  return id;
};

const isDataFetcherAction = (action: unknown): action is { type: string; payload: FormattedRowsPayload } => {
  return dataFetchers.some(creator => creator.match(action));
};

const getCurUserMolds = (molds: Metadata[], key: string, parentKey: string): LinkTableProps[] => {
  if (molds.length === 0) return [];
  const hasParentKey = molds[0][parentKey] !== undefined;
  return molds
    .filter((item) => item.interaction)
    .sort(compareMetadata(key))
    .map((mold): LinkTableProps => {
      const { interaction, foundationId, ...rest } = mold;
      const linkProps: LinkTableProps = {
        ...rest,
        filterId: normalizeId(rest.filterId),
        sifterId: normalizeId(rest.sifterId),
        dashboardId: normalizeId(rest.dashboardId),
        underbossId: normalizeId(rest.underbossId),
        bossId: normalizeId(rest.bossId),
        minionId: normalizeId(rest.minionId),
      };
      return hasParentKey ? linkProps : { [parentKey]: 0, ...linkProps };
    });
};

const MoldsExtractor: Middleware = ({ dispatch }) => (next) => (action: unknown) => {
  if (insertMetadata.match(action)) {
    const { payload } = action;
    const { interaction, data, dest, orig } = payload;
    const { parentID, childID } = getInteractionIDs(orig || '', dest || '');
    if (interaction && parentID && childID) {
      const interactions = getCurUserMolds(data, childID, parentID);
      setTimeout(() => dispatch(mergeInteractions({ data: interactions, dest, orig })));
    }
    setTimeout(() => dispatch(fetchingCompleted({ dest, orig })));
    const isMocks = data.length > 0 && parentID ? data[0][parentID] < 0 : false;
    if (!isMocks && parentID)
      setTimeout(() => dispatch(viewParentData(data.map((mold) => mold[parentID]).filter((c) => c).map(String))));
    return next({
      type: action.type,
      payload: { dest, orig, data },
    });
  } else if (abortInsertMetadata.match(action) || restoreInteractions.match(action))
    setTimeout(() => dispatch(fetchingCompleted({})));
  return next(action);
};

export const InteractionsInitilizer: Middleware =
  ({ dispatch, getState }) =>
    (next) =>
      (action: unknown) => {
        const state = getState() ;
        if (isDataFetcherAction(action)) {
          const { payload } = action;
          const matchedIndex = dataFetchers.findIndex(creator => creator.match(action));
          if (matchedIndex > 0) {
            const data = extractFetched(matchedIndex, payload);
            if (data !== null) {
              const { isPrivate, isIncognito } = state.session;
              if (!isIncognito && !isPrivate) {
                const { fetched, dest, orig } = data;
                const list = Array.isArray(fetched) ? fetched : fetched.texts;
                const ids = list.map((row: DataRow) => parseInt(row.id.toString()));
                const initPayload = { dest: dest as string, data: ids, orig: orig as string };
                setTimeout(() => dispatch(initInteractions(initPayload)));
              }
            }
          }
        }
        return next(action);
      };

const extractFetched = (matchedIndex: number, payload?: FormattedRowsPayload): ExtractedData | null => {
  if (!payload) return null;

  const { content, rows } = dataFetchersIndeces;
  const isContent = content.includes(matchedIndex);
  if (isContent || rows.includes(matchedIndex)) {
    const { data, dest, orig } = payload;
    const fetched = isContent ? data : data.texts;
    return { fetched, dest, orig };
  }
  return null;
};

export const MetaDatasQuery: Middleware =
  ({ dispatch, getState }) =>
    (next) =>
      (action: unknown) => {
        const state = getState() ;
        if (isDataFetcherAction(action)) {
          const { payload } = action;
          const matchedIndex = dataFetchers.findIndex(creator => creator.match(action));
          if (matchedIndex > 0) {
            const { entity: viewEntity, parent: viewParent } = state.view;
            const { isPrivate, isIncognito, parent: sessionParent } = state.session;
            const { operation, ...freight } = payload || {};
            const parent = sessionParent ?? viewParent;
            const pathname = window.location.pathname;
            const entity = viewEntity ?? getEntityFromUrl(pathname);
            const data = extractFetched(matchedIndex, freight);
            const fetched = data !== null ? data.fetched : [];
            const list = Array.isArray(fetched) ? fetched : fetched.texts;
            const rawIds = list
              .filter((t: DataRow) => t.metadata === undefined)
              .map((text: DataRow) => text.id);
            const children = rawIds
              .map((id) => (typeof id === 'string' ? Number(id) : id))
              .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id));
            const savedIds = children.filter((id) => id >= 0);
            const unsavedIds = children.filter((id) => id < 0);
            const interaction = isIncognito ? true : !isPrivate;
            const query: MockPayload = {
              parent,
              entity,
              owner: true,
              childIds: unsavedIds
            };
            const nquery: MockPayload = {
              parent,
              entity,
              interaction,
              owner: false,
              childIds: savedIds,
            };
            if (unsavedIds.length > 0)
              setTimeout(() => dispatch(fetchMockMetadata(query)));
            else if (savedIds.length > 0 && operation === ADD_ROWS)
              setTimeout(() => dispatch(fetchMockMetadata(nquery)));
            return next({ type: action.type, payload: freight });
          } else if (matchedIndex === 0)
            setTimeout(() => dispatch(fetchingCompleted({})));
        }
        return next(action);
      };

export default MoldsExtractor; 