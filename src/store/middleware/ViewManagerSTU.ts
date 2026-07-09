import { Middleware } from '@reduxjs/toolkit';
import {
  escrowRows,
  escrowContents,
  fetchingCompleted,
  fetchMockMetadata,
  fetchRows,
  fetchContents,
  abortInsertMetadata,
  insertMetadata,
  MockPayload
} from '../../library/actions';
import { getCurAppName, Tree, getInteractionIDs } from '../../utils';
import { clearEscrow, viewPayload as escrowPayload, ViewPayload } from '../slices/viewSlice';
import { restoreInteractions } from '../../library/actions';
import { tabledFetcher } from '../../library/Thunks';
import { appendRowz, prependRowz, Row } from '../slices/rowSlice';
import { appendContentz, prependContentz } from '../slices/contentSlice';
import { EntityPropertyMap } from '../../utils';
import { SessionState } from '../slices/sessionSlice';
import { InteractionState } from '../slices/interactionSlice';
import { DataRow } from '../../components/Core/types';
import { Traversal } from '../slices/traversalSlice';
import { ViewState } from '../slices/viewSlice';
import { TraversalState } from '../slices/traversalSlice';


export interface QueryParams {
  type?: string;
  IDs?: number[];
  entity?: string;
  webapp?: string;
  parent?: string;
  hasCounts?: boolean;
  convolution?: string;
  isPrivateView?: boolean
  seek?: number[] | string;
  curToken?: string | null;
  mutateRole?: string | null;
  mailer?: number | undefined;
  limit?: { take: number | undefined; skip: number | undefined };
}

const hydrate = (props: ViewPayload, params: Partial<SessionState> & { IDs: string[], seek?: number[] | string }) => {
  const { curToken, isIncognito, IDs, seek, curApp } = params;
  const { isPrivate, fetchRole, parent, curMailer } = params;
  const webapp = getCurAppName(curApp as number);

  const limit = { take: props.take, skip: props.skip };
  const query: QueryParams = isIncognito
    ? {
      type: props.type,
      entity: props.entity,
      isPrivateView: false,
      IDs: IDs.map(Number),
      parent,
      limit,
      seek,
    }
    : {
      type: props.type,
      entity: props.entity,
      isPrivateView: isPrivate,
      mutateRole: fetchRole,
      IDs: IDs.map(Number),
      convolution: webapp,
      mailer: curMailer,
      hasCounts: false,
      curToken,
      limit,
      webapp,
      parent,
      seek,
    };
  return tabledFetcher({ query });
};

interface RelinquishPayload {
  entity: string | undefined;
  parent: string | undefined;
  fetchedData: DataRow[];
}

type Callables = keyof Pick<EntityPropertyMap, "formattedData" | "nonFormattedData">;

const relinquish = (type: string, formatType: string, escrow: RelinquishPayload) => {
  const { entity, parent, fetchedData } = escrow;
  const curEntity = entity?.toLowerCase();
  const links = Tree.getProperty(curEntity as string, "connections") || [];
  const formatter = Tree.getProperty(curEntity as string, formatType as Callables);
  const formattedData = formatter ? formatter(fetchedData, links) : fetchedData;
  return { type, payload: { dest: entity, orig: parent, data: formattedData } };
};

interface DepletePayload {
  entity: string,
  parent: string,
  interactions: InteractionState,
}

const deplete = (escrow: DepletePayload) => {
  const { entity, parent, interactions } = escrow;
  if (interactions.options.length === 0) return { type: abortInsertMetadata.type };
  return restoreInteractions({ data: interactions, orig: parent, dest: entity });
};

const createMocks = (payload: MockPayload, ordinal: number) => {
  console.log("inter_mocks", payload);
  const { childIds, entity, parent, interaction } = payload as MockPayload;
  if (childIds.length === 0) return { type: abortInsertMetadata.type };
  const { parentID, childID } = getInteractionIDs(parent as string, entity);
  if (!parentID || !childID) return { type: abortInsertMetadata.type };
  return {
    type: insertMetadata.type,
    payload: {
      data: childIds.map((id: number, i: number) => ({
        ordinal: ordinal + i,
        [parentID]: -1,
        [childID]: id,
        owner: true,
      })),
      interaction,
      orig: parent,
      dest: parent !== entity ? entity : "lower" + entity,
    },
  };
};

export const getFormatType = (type: string) => {
  switch (type) {
    case appendRowz.type:
    case prependRowz.type:
      return "formattedData";
    case appendContentz.type:
    case prependContentz.type:
      return "nonFormattedData";
    default:
      throw new Error("Invalid type: " + type);
  }
};
export const getDuplicateAction = (type: string) => {
  switch (type) {
    case appendRowz.type:
      return { formatType: "nonFormattedData", type: appendContentz.type };
    case prependRowz.type:
      return { formatType: "nonFormattedData", type: prependContentz.type };
    case prependContentz.type:
      return { formatType: "formattedData", type: prependRowz.type };
    case appendContentz.type:
      return { formatType: "formattedData", type: appendRowz.type };
    default:
      throw new Error("Invalid type: " + type);
  }
};

const removeDuplicates = (acc: Traversal[], curr: Traversal) => {
  const pred = (m: Traversal) => m.urlID.toLowerCase() === curr.urlID.toLowerCase();
  const found = acc.findIndex(pred);
  if (found > -1) {
    const existing = acc[found];
    const uniqueIds = [...new Set([...existing.contentIds, ...curr.contentIds])];
    const updated: Traversal = { ...existing, contentIds: uniqueIds };
    return [...acc.slice(0, found), updated, ...acc.slice(found + 1)];
  }
  return [...acc, curr];
};

const ViewManager: Middleware = ({ dispatch, getState }) => (next) => (action: unknown) => {
  if (fetchMockMetadata.match(action) || fetchContents.match(action) || fetchRows.match(action)) {
    const state = getState();
    const { payload } = action;
    const isRows = fetchRows.match(action);
    const isContent = fetchContents.match(action);
    const isMock = fetchMockMetadata.match(action);
    const { pauseFetchers } = state.session;
    if (isContent || isRows) {
      const { type: payloadType = 'nullType' } = payload as ViewPayload;
      const { entity, parent, fetchedData, interactions } = state.view;
      if (pauseFetchers && fetchedData === undefined) {
        return next(fetchingCompleted({}));
      } else if (fetchedData && interactions) {
        const freight = { entity, parent, fetchedData };
        const duplication = getDuplicateAction(payloadType);
        const { formatType: format, type: duplicator } = duplication;
        const duplicate = relinquish(duplicator, format, freight);
        const original = relinquish(payloadType, getFormatType(payloadType), freight);
        const interactionsAction = deplete({
          interactions: interactions as InteractionState,
          entity: entity as string,
          parent: parent as string,
        });

        setTimeout(() => dispatch(original));
        setTimeout(() => dispatch(duplicate));
        setTimeout(() => dispatch(interactionsAction));

        return next(clearEscrow());
      } else {
        const { parentData } = state.view as ViewState;
        const IDs = parentData?.IDs || [];
        const parent = parentData?.parent || '';
        const { traversals, algorithm } = state.traversal as TraversalState;
        const { seek: search, ...props } = payload as ViewPayload;
        const urlID = parent + props.entity;
        const pred = (m: Traversal) => m.urlID.toLowerCase() === urlID.toLowerCase();
        const found = [...algorithm, ...traversals].reduce(removeDuplicates, []).find(pred);
        const identities = found && found.contentIds.length > 0;
        const seek = identities ? found.contentIds : search;
        const session = state.session;

        const params = seek === undefined
          ? { ...session, IDs, parent }
          : { ...session, IDs, parent, seek };
        return next(hydrate(props, params));
      }
    } else if (isMock) {
      const ordinal = state.text.length;
      return next(createMocks(payload as MockPayload, ordinal));
    }
  } else if (escrowRows.match(action)) {
    const { payload } = action;
    const state = getState();
    const rows = state.row;
    const texts = state.text;
    const statuses = state.action;
    const interactions = state.interaction;
    const fetchedData = rows.map(({ index, frozen, checked, deleted, modified }: Row) => ({
      ...texts[index],
      frozen: frozen ?? false,
      checked: checked ?? false,
      deleted: deleted ?? false,
      reordered: modified ?? false,
      stated: statuses[index]?.modified ?? false,
      status: { ...(statuses[index]?.status ?? {}) },
    }));

    return next(escrowPayload({ entity: payload, fetchedData, interactions }));
  } else if (escrowContents.match(action)) {
    const { payload } = action;
    const state = getState();
    const fetchedData = state.content;
    const interactions = state.interaction;
    return next(escrowPayload({ entity: payload, fetchedData, interactions }));
  }

  return next(action);
};

export default ViewManager;