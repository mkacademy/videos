import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../types';
import {
  highlightAll,
  simpleSelector,
  joinOverview,
  unjoinOverview,
  unHighlightAll,
  simpleUnselector,
  invertHighlighted,
  simpleInverter,
  cpanelUnjoiner,
  cpanelJoiner,
  shortcutJoiner,
  zipOverview,
  destroyOverview,
  extractMocks,
  simpleClearer,
  clearSelected,
  extractContent,
  extractToCpanel,
  finalizejoin,
  finalizeUnjoin,
  showAlgorithm,
  unfinalizeDelete,
  unfinalizeAdd,
  finalizeDelete,
  finalizeAdd,
  clearHighlighted,
  escrowConvolution,
  clearSelectedPayload,
  updateOwnerships,
} from '../../library/actions';

import {
  highlightSlideBreathSelection,
  highlightCoversBreathSelection,
} from '../slices/courseSlice';

import {
  highlightContentBreathSelection,
} from '../slices/tutorialSlice';
import {
  TutorialRootTreeSelection,
  CoursePennantTreeSelection,
  CourseRootTreeSelection,
  QuizQuestionTreeSelection,
  QuizRootTreeSelection,
} from '../../library/actions';

import {
  outlineIncoming,
  outlineOutgoing,
  outlineTutor,
} from '../slices/commsSlice';

import {
  deletedTimestamp,
  escrowTimestamp,
} from '../../utils';
import {
  tabluarPrefixes,
} from '../../constants';
import { commandSelected as setAction } from '../slices/sidebarSlice';
import { prependError as insertError } from '../slices/errorSlice';
import { setCrudUrl } from '../slices/sessionSlice';
import { toggleFormatter as setFormatters } from '../slices/settingsSlice';
import createValidTexts, { ConnectedWebapp } from '../../library/CrudsManagerUtils';
import { getCommIds, RouteType } from '../../library/commsUtils';
import { clearEscrow } from '../slices/viewSlice';
import {
  BD,
  BF,
  BI,
  BS,
  MD,
  MF,
  MI,
  MS,
  UD,
  UF,
  UI,
  US,
  FD,
  FF,
  FI,
  FS,
  B,
  M,
  U
} from '../../library/commsUtils';
import {
  appendRoute as stashRows,
  appendRoutes as stashRowsAll,
  removeStash as removeStashRows,
  removeTimestamp as unstashRows,
  StashPayload,
} from '../slices/stashSlice';
import { collectCascadingStashSegments, buildOrderedCascadeStashCells } from './cascadingStasher';
import { dispatchCascadingUnstash } from './cascadingUnstasher.ts';
import { getCurAppName, getInteractionIDs, isPncUserApp } from '../../utils';
import {
  isPncJoinShortcutStashTimestampAnyWebapp,
  isPncUnjoinShortcutStashTimestampAnyWebapp,
  isPncEscrowShortcutStashTimestamp,
} from '../../library/DeletionManagerUtils';
import { PayloadWithFromTo } from './CrudsManager123';
import { DataRow } from '../../components/Core/types';
import { Traversal } from '../slices/traversalSlice';
import { overrideSelector, OverrideSelectorParams } from '../../library/IdentitiesExtractor';
import { highlightAttemptBreathSelection } from '../slices/quizSlice';

interface CreateSelectionsParams {
  state: RootState;
  payload: PayloadWithFromTo;
  isHighlighted?: boolean;
}

interface CreateSelectionsResult extends UnknownAction {
  type: string;
  payload: {
    ids: (string | number)[];
    isHighlighted?: boolean;
  };
  error?: string;
}

interface TransferToCpanelParams {
  state: RootState;
  payload: PayloadWithFromTo;
  dispatch: AppDispatch;
}

interface Freight {
  destination: string;
  timestamp: string;
  approute: string;
  selecttype: boolean;
}

interface Cargo {
  timestamp: string;
  approute: string;
}

interface RemoveChildrenParams {
  state: RootState;
  fetchedData: DataRow[];
  payload: PayloadWithFromTo;
  parentIds?: number[];
}

interface SwapChildrenParams {
  childData: DataRow[];
  to: string;
  from: string;
  state: RootState;
  dispatch: AppDispatch;
}

/** Unix seconds (integer); used as stash key suffix for second-level uniqueness. */
const stashSecondTimestamp = (): number => Math.floor(Date.now() / 1000);

/** Unique stash key for Ctrl+Shift+J shortcut join stash rows. */
export const newShortcutJoinStashTimestamp = (): string =>
  `Joined_items-${stashSecondTimestamp()}`;

/** Unique stash key for Ctrl+Shift+U shortcut unjoin stash rows. */
export const newShortcutUnjoinStashTimestamp = (): string =>
  `Unjoined_items-${stashSecondTimestamp()}`;

/** Unique stash key for Ctrl+Shift+Y escrow shortcut stash rows (no selection clear). */
export const newShortcutEscrowStashTimestamp = (): string =>
  `Escrowed_items-${stashSecondTimestamp()}`;

export const withHierarchyStamp = (
  timestamp: string,
  webappIndex: number,
  hierarchyIndex: number
): string => `${timestamp}-${webappIndex}-${hierarchyIndex}`;

export interface ExtractToCpanelPayload {
  children: PayloadWithFromTo;
  fetchedData: DataRow[];
  formatters: string;
  parents: Traversal;
  isJoin: boolean;
}

export interface FinalizeUnjoinPayload {
  childData: DataRow[];
  parentData: DataRow[];
  from: string;
  to: string;
}

export interface FinalizejoinPayload {
  childData: DataRow[];
  to: string;
  from: string;
}

export interface FinalizeDeletePayload {
  route: string;
  ids: string[];
}

export interface FinalizeAddPayload {
  route: string;
  ids: string[];
}

interface DoCrudUrlActionParams {
  crudUrl: string;
  selectClearer?: (params: PayloadWithFromTo) => void;
  unjoiner?: (params: PayloadWithFromTo) => void;
  unhighlighter?: (params: PayloadWithFromTo) => void;
  inverter?: (params: PayloadWithFromTo) => void;
  highlighter?: (params: PayloadWithFromTo) => void;
  joiner?: (params: PayloadWithFromTo) => void;
  addMocks?: (params: PayloadWithFromTo) => void;
  purgeOverview?: (params: PayloadWithFromTo) => void;
  zipOutgoing?: (params: PayloadWithFromTo) => void;
  from?: string;
  to?: string;
}

type HighlighterTuple = [string, string[], (string | number)[]?];

// Route cache for performance optimization
const routeCache = new Map<string, { highlighter: string; type?: string | number }>();

// Cache management utilities
export const clearRouteCache = (): void => {
  routeCache.clear();
};

export const getRouteCacheStats = (): { size: number; keys: string[] } => {
  return {
    size: routeCache.size,
    keys: Array.from(routeCache.keys())
  };
};

// Utility function to handle createSelections errors consistently
const handleCreateSelectionsResult = (result: CreateSelectionsResult, dispatch: AppDispatch): void => {
  if (result.error) {
    console.warn('createSelections error:', result.error);
    dispatch(insertError(result.error));
  } else {
    dispatch(result);
  }
};

const errorMsg0 = "nothing selected, action aborted";
const sucMsg = "naviigate to Cpanel to complete action!";
const errorMsg1 = "no containers selected, action aborted";
const errorMsg2 = "no valid containers possible, action aborted";

const pred = ({ checked, ...props }: DataRow): DataRow => ({ ...props, checked: true });

/** Comms highlighter routes append a type suffix to numeric row ids; ids may be number or digit string. */
const shouldAppendCommsTypeSuffix = (id: string | number): boolean => {
  if (typeof id === 'number') return Number.isFinite(id);
  if (typeof id !== 'string' || id.length === 0) return false;
  return /^-?\d+$/.test(id);
};

const createSelections = ({ state, payload, isHighlighted }: CreateSelectionsParams): CreateSelectionsResult => {
  const { from, to } = payload;
  const {
    session: { curApp: source },
    view: { fetchedData = [] },
  } = state;

  // Validate input parameters
  if (!from || !to) {
    return {
      type: '',
      payload: { ids: [], isHighlighted },
      error: 'Missing required from/to parameters'
    };
  }

  if (!source) {
    return {
      type: '',
      payload: { ids: [], isHighlighted },
      error: 'No current app source available'
    };
  }

  let type: string | number | undefined;
  const route = getCurAppName(source) + from + to;

  // Check cache first for performance
  const cached = routeCache.get(route);
  if (cached) {
    return {
      type: cached.highlighter,
      payload: {
        ids: fetchedData.map(({ id }: DataRow) => {
          if (cached.type && shouldAppendCommsTypeSuffix(id)) {
            return id + (cached.type as string);
          }
          return id;
        }),
        isHighlighted
      }
    };
  }

  // Find matching highlighter configuration using enhanced search
  const found = highlighters.find(([_, routes, types]) => {
    const index = routes.findIndex((curRoute: string) => curRoute === route);
    if (index > -1 && types) type = types[index];
    return index > -1;
  });
  const [highlighter] = found || ['', []];
  // Cache the result for future use
  if (highlighter) routeCache.set(route, { highlighter, type });
  // Transform IDs based on type
  const ids = fetchedData.map(({ id }: DataRow) => {
    if (type && shouldAppendCommsTypeSuffix(id)) return id + (type as string);
    return id;
  });
  // Return result with error handling
  if (!highlighter) {
    return {
      type: '',
      payload: { ids, isHighlighted },
      error: `No highlighter found for route: ${route}`
    };
  }

  return {
    type: highlighter,
    payload: { ids, isHighlighted }
  };
};

const transferToCpanel = ({ state, payload, dispatch }: TransferToCpanelParams): void => {
  const { from, to } = payload;
  const {
    session: { curApp: source },
    view: { fetchedData = [] },
  } = state;

  const curApproute = from + to;
  const stash: StashPayload = {
    approute: curApproute,
    timestamp: escrowTimestamp,
    content: fetchedData.map(pred),
  };

  console.log("--stashing---");
  dispatch(stashRows(stash));

  const frieght: Freight = {
    destination: getCurAppName(source),
    timestamp: escrowTimestamp,
    approute: curApproute,
    selecttype: true,
  };

  console.log("--inserting---");
  dispatch(extractContent(frieght));

  const cargo: Cargo = {
    timestamp: escrowTimestamp,
    approute: curApproute,
  };

  console.log("--unstashing---");
  dispatch(unstashRows(cargo));
};

const UiuxManager: Middleware<{}, RootState> = ({ getState, dispatch }) => (next) => (action: unknown) => {
  if (invertHighlighted.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(simpleInverter.type));
    const resetor: OverrideSelectorParams = { selector: "dismissOnly", value: false };
    overrideSelector({ selector: "dismissOnly", value: true });
    setTimeout(() => overrideSelector(resetor), 1000);
    return next(showAlgorithm(payload));
  }

  if (simpleInverter.match(action)) {
    const { payload } = action;
    const result = createSelections({
      state: getState(),
      payload,
    });

    handleCreateSelectionsResult(result, dispatch);
    return next(clearEscrow());
  }

  if (unHighlightAll.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(simpleUnselector.type));
    const resetor: OverrideSelectorParams = { selector: "dismissOnly", value: false };
    overrideSelector({ selector: "dismissOnly", value: true });
    setTimeout(() => overrideSelector(resetor), 1000);
    return next(showAlgorithm(payload));
  }

  if (simpleUnselector.match(action)) {
    const { payload } = action;
    const result = createSelections({
      isHighlighted: false,
      state: getState(),
      payload,
    });

    handleCreateSelectionsResult(result, dispatch);
    return next(clearEscrow());
  }

  if (highlightAll.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(simpleSelector.type));
    const resetor: OverrideSelectorParams = { selector: "dismissOnly", value: false };
    overrideSelector({ selector: "dismissOnly", value: true });
    setTimeout(() => overrideSelector(resetor), 1000);
    return next(showAlgorithm(payload));
  }

  if (simpleSelector.match(action)) {
    const { payload } = action;
    const result = createSelections({
      isHighlighted: true,
      state: getState(),
      payload,
    });

    handleCreateSelectionsResult(result, dispatch);
    return next(clearEscrow());
  }

  if (clearHighlighted.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(simpleClearer.type));
    return next(showAlgorithm(payload));
  }

  if (simpleClearer.match(action)) {
    const { payload } = action;
    const state = getState();
    const { fetchedData = [] } = state.view;
    const result = removeChildren({ state, fetchedData, payload });
    dispatch(clearSelected(result));
    return next(clearEscrow());
  }

  if (unjoinOverview.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(cpanelUnjoiner.type));
    return next(showAlgorithm(payload));
  }

  if (joinOverview.match(action)) {
    const { payload } = action;
    dispatch(setCrudUrl(cpanelJoiner.type));
    return next(showAlgorithm(payload));
  }

  if (shortcutJoiner.match(action)) {
    const { payload } = action;
    const state = getState();
    const {
      view: { fetchedData = [] },
      traversal: { algorithm = [] },
    } = state;
    const { from, to } = payload;
    const parents = algorithm.find(({ to }: { to: string }) => to === from);

    if (fetchedData.length === 0) {
      setTimeout(() => dispatch(insertError(errorMsg0)));
      return next(clearEscrow());
    } else if (parents === undefined) {
      setTimeout(() => dispatch(insertError(errorMsg2)));
      return next(clearEscrow());
    }
    dispatch(setFormatters('app'));
    dispatch(finalizejoin({ childData: fetchedData, to, from }));
    return next(action);
  }

  if (cpanelJoiner.match(action) || cpanelUnjoiner.match(action)) {
    const { payload } = action;
    const state = getState();
    const {
      settings: { formatters },
      view: { fetchedData = [] },
      traversal: { algorithm = [] },
      session: { curApp },
    } = state;
    const { from } = payload;
    const parents = algorithm.find(({ to }: { to: string }) => to === from);

    if (fetchedData.length === 0) {
      setTimeout(() => dispatch(insertError(errorMsg0)));
      return next(clearEscrow());
    } else if (parents === undefined) {
      setTimeout(() => dispatch(insertError(errorMsg2)));
      return next(clearEscrow());
    }

    dispatch(setFormatters("cpanel"));
    const isJoin = cpanelJoiner.match(action);
    transferToCpanel({ state, payload, dispatch });

    const cargo: ExtractToCpanelPayload = {
      children: payload,
      fetchedData,
      formatters,
      parents,
      isJoin,
    };

    setTimeout(() => dispatch(extractToCpanel(cargo)));
    dispatch(
      setAction({
        prefix: tabluarPrefixes[isJoin ? 1 : 2],
        title: isJoin ? "Excludes" : "Includes",
        isFilter: true,
      })
    );
    return next(escrowConvolution({ ...parents, curApp }));
  }

  if (extractToCpanel.match(action)) {
    const { payload } = action;
    const state = getState();
    const { fetchedData: parentData = [] } = state.view;

    if (parentData.length === 0) {
      setTimeout(() => dispatch(insertError(errorMsg1)));
      return next(clearEscrow());
    }

    const {
      fetchedData: childData,
      children: { to, from },
      formatters,
      parents,
      isJoin,
    } = payload;

    setTimeout(() => dispatch(insertError(sucMsg)));
    setTimeout(() =>
      isJoin
        ? dispatch(finalizejoin({ childData, to, from }))
        : dispatch(finalizeUnjoin({ childData, to, from, parentData }))
    );
    transferToCpanel({ state, payload: parents, dispatch });
    dispatch(setFormatters(formatters));
    return next(clearEscrow());
  }

  if (finalizeUnjoin.match(action)) {
    const { payload } = action;
    const state = getState();
    if (!isPncUserApp(state.session.curApp))
      return next(clearEscrow());
    const { childData, parentData, to, from } = payload;
    const parentIds = parentData?.map(({ id }: DataRow) => id);
    const result = removeChildren({
      fetchedData: childData,
      payload: { to, from },
      parentIds: parentIds as number[],
      state,
    });
    const cascade = collectCascadingStashSegments(state, from, to, childData);
    const timestamp = newShortcutUnjoinStashTimestamp();
    const webappIndex = state.session.curApp;
    const curApproute = from + to;
    dispatch(clearSelected(result));
    const orderedCells = buildOrderedCascadeStashCells(
      curApproute,
      childData.map(pred),
      cascade,
      (index) => withHierarchyStamp(timestamp, webappIndex, index),
    );
    const payloads: StashPayload[] = orderedCells.map(({ approute, content, timestamp: ts }) => ({
      approute,
      timestamp: ts,
      content,
    }));
    dispatch(stashRowsAll(payloads));
    return next(clearEscrow());
  }

  if (finalizejoin.match(action)) {
    const { payload } = action;
    const state = getState();
    const { childData, to, from } = payload;
    swapChildren({ childData, to, from, state, dispatch });
    return next(clearEscrow());
  }

  if (unfinalizeDelete.match(action)) {
    const { payload } = action;
    const erroMsg = `deletion failed for route '${payload}'`;
    return next(insertError(erroMsg));
  }

  if (unfinalizeAdd.match(action)) {
    const { payload } = action;
    const erroMsg = `addition failed for route '${payload}'`;
    return next(insertError(erroMsg));
  }

  if (finalizeAdd.match(action)) {
    const { payload } = action;
    const state = getState();
    const { route: curApproute, ids } = payload;
    const routeStash = state.stash[curApproute];
    if (!routeStash) return next(action);
    for (const timestamp of Object.keys(routeStash)) {
      if (!isPncJoinShortcutStashTimestampAnyWebapp(timestamp, state)) continue;
      dispatch(removeStashRows({
        approute: curApproute,
        timestamp,
        timestampIds: ids,
      }));
    }
    return next(action);
  }

  if (updateOwnerships.match(action)) {
    const { payload } = action;
    const state = getState();
    const { route: curApproute, ids } = payload;
    const routeStash = state.stash[curApproute];
    if (!routeStash) return next(action);
    for (const timestamp of Object.keys(routeStash)) {
      if (!isPncEscrowShortcutStashTimestamp(timestamp, state)) continue;
      dispatch(removeStashRows({
        approute: curApproute,
        timestamp,
        timestampIds: ids,
      }));
    }
    return next(action);
  }

  if (finalizeDelete.match(action)) {
    const { payload } = action;
    const state = getState();
    const {
      session: { dismissals, curApp },
    } = state;
    const { route: curApproute, ids } = payload;

    if (isPncUserApp(curApp)) {
      const routeStash = state.stash[curApproute];
      if (routeStash) {
        for (const timestamp of Object.keys(routeStash)) {
          if (!isPncUnjoinShortcutStashTimestampAnyWebapp(timestamp, state)) continue;
          dispatch(removeStashRows({
            approute: curApproute,
            timestamp,
            timestampIds: ids,
          }));
        }
      }
    } else {
      dispatch(removeStashRows({
        approute: curApproute,
        timestamp: deletedTimestamp,
        timestampIds: ids,
      }));
    }

    const pred = (id: string) => ({ id: parseInt(id) });
    const fetchedData = ids.map(pred);
    const pathname = window.location.pathname;
    const isShow = dismissals[pathname] ?? false;
    const dismised = getCommIds(fetchedData, curApproute as RouteType);
    const freight = { route: curApproute, Ids: dismised, isShow };
    return next(clearSelected({ pathname, payload: freight }));
  }

  return next(action);
};

const removeChildren = ({ state, fetchedData, payload, parentIds: IDs }: RemoveChildrenParams):
  clearSelectedPayload => {
  const { from, to } = payload;
  const curApproute = from + to;
  const pathname = window.location.pathname;
  const { dismissals } = state.session;
  const isShow = dismissals[pathname] ?? false;
  const dismised = getCommIds(fetchedData, curApproute as RouteType);
  const freight = { route: curApproute, Ids: dismised, IDs, isShow };
  return { pathname, payload: freight };
};

const buildSwappedChildrenContent = ({
  childData,
  to,
  from,
  state,
}: Omit<SwapChildrenParams, 'dispatch'>): {
  content: DataRow[];
  curApproute: string;
  webapp: string;
} => {
  const { parentID, childID } = getInteractionIDs(from, to);
  const { curApp: source } = state.session;
  const webapp = getCurAppName(source);

  const texts = createValidTexts({
    to,
    from,
    state,
    childIds: childData.length,
    webapp: webapp as ConnectedWebapp,
  });

  const content = childData.map((row: DataRow, i: number) => {
    const textItem = texts[i];
    const textMetadata = (textItem as DataRow)?.metadata;
    const IDs = textMetadata?.[parentID as keyof typeof textMetadata];
    const ordinal = textMetadata?.ordinal;
    const rowMetadata = row.metadata || {};
    const id = rowMetadata[childID as keyof typeof rowMetadata];
    const { metadata, ...theRow } = row;
    return {
      metadata: {
        [parentID as string]: IDs,
        [childID as string]: id,
        owner: false,
        ordinal,
      },
      ...theRow,
      checked: true,
    };
  });

  const curApproute = from + to;
  return { content, curApproute, webapp };
};

/** Stash swapped rows, then `extractContent` and `unstashRows` (normal finalize join path). */
const swapChildren = ({ childData, to, from, state, dispatch }: SwapChildrenParams): void => {
  const { content, curApproute, webapp } = buildSwappedChildrenContent({
    childData,
    to,
    from,
    state,
  });
  const timestamp = newShortcutJoinStashTimestamp();
  const cascade = collectCascadingStashSegments(state, from, to, childData);
  const webappIndex = state.session.curApp;
  const orderedCells = buildOrderedCascadeStashCells(
    curApproute,
    content,
    cascade,
    (index) => withHierarchyStamp(timestamp, webappIndex, index),
  );
  const payloads: StashPayload[] = orderedCells.map(({ approute, content: rows, timestamp: ts }) => ({
    approute,
    timestamp: ts,
    content: rows,
  }));

  dispatch(stashRowsAll(payloads));

  const freights: Freight[] = payloads.map(({ timestamp, approute }) => ({
    timestamp,
    approute,
    destination: webapp,
    selecttype: true,
  }));
  dispatchCascadingUnstash(dispatch, freights);

};

/**
 * Same row removal + selection clear as {@link finalizeUnjoin} (no `finalizeUnjoin` action),
 * then stashes removed child rows, then clears escrow.
 */
export const dispatchShortcutUnjoinClearAndStashRemoved = (
  dispatch: AppDispatch,
  state: RootState,
  payload: FinalizeUnjoinPayload
): void => {
  const { childData, parentData, to, from } = payload;
  const parentIds = parentData?.map(({ id }: DataRow) => id);
  const result = removeChildren({
    fetchedData: childData,
    payload: { to, from },
    parentIds: parentIds as number[],
    state,
  });
  const cascade = collectCascadingStashSegments(state, from, to, childData);
  const timestamp = newShortcutUnjoinStashTimestamp();
  const webappIndex = state.session.curApp;
  const curApproute = from + to;
  dispatch(clearSelected(result));
  const orderedCells = buildOrderedCascadeStashCells(
    curApproute,
    childData.map(pred),
    cascade,
    (index) => withHierarchyStamp(timestamp, webappIndex, index),
  );
  const payloads: StashPayload[] = orderedCells.map(({ approute, content, timestamp: ts }) => ({
    approute,
    timestamp: ts,
    content,
  }));
  dispatch(stashRowsAll(payloads));
  dispatch(clearEscrow());
};

/**
 * Stashes removed child rows under {@link newShortcutEscrowStashTimestamp}, then `clearEscrow`.
 * Unlike {@link dispatchShortcutUnjoinClearAndStashRemoved}, does not dispatch `clearSelected`
 * (joined children stay visible / selected in the UI).
 *
 * Returns `{ approute, timestamp }` for each stash cell written (for UI warnings).
 */
export const dispatchShortcutEscrowStashRemoved = (
  dispatch: AppDispatch,
  state: RootState,
  payload: FinalizeUnjoinPayload
): Array<{ approute: string; timestamp: string }> => {
  const { childData, to, from } = payload;
  const cascade = collectCascadingStashSegments(state, from, to, childData);
  const timestamp = newShortcutEscrowStashTimestamp();
  const webappIndex = state.session.curApp;
  const curApproute = from + to;
  const orderedCells = buildOrderedCascadeStashCells(
    curApproute,
    childData.map(pred),
    cascade,
    (index) => withHierarchyStamp(timestamp, webappIndex, index),
  );
  const payloads: StashPayload[] = orderedCells.map(({ approute, content, timestamp: ts }) => ({
    approute,
    timestamp: ts,
    content,
  }));
  dispatch(stashRowsAll(payloads));
  dispatch(clearEscrow());
  return payloads.map(({ approute, timestamp: ts }) => ({ approute, timestamp: ts }));
};

/**
 * Non-PNC Ctrl+Shift+Y: replaces {@link escrowTimestamp} stash for the route with `fetchedData`, then
 * `clearEscrow` — no `clearSelected` (unlike `destroyOverview` / Ctrl+Shift+D).
 */
export const dispatchShortcutMemberEscrowStashRemoved = (
  dispatch: AppDispatch,
  payload: FinalizeUnjoinPayload
): Array<{ approute: string; timestamp: string }> => {
  const { childData, to, from } = payload;
  const curApproute = from + to;
  if (!childData.length) return [];
  dispatch(unstashRows({ approute: curApproute, timestamp: escrowTimestamp }));
  dispatch(
    stashRows({
      approute: curApproute,
      timestamp: escrowTimestamp,
      content: childData.map(pred),
    })
  );
  dispatch(clearEscrow());
  return [{ approute: curApproute, timestamp: escrowTimestamp }];
};

export const doCrudUrlAction = ({ crudUrl, ...props }: DoCrudUrlActionParams): void => {
  switch (crudUrl) {
    case simpleClearer.type: {
      const { selectClearer, from, to } = props;
      if (selectClearer && from && to) {
        selectClearer({ from, to });
      }
      break;
    }
    case cpanelUnjoiner.type: {
      const { unjoiner, from, to } = props;
      if (unjoiner && from && to) {
        unjoiner({ from, to });
      }
      break;
    }
    case simpleUnselector.type: {
      const { unhighlighter, from, to } = props;
      if (unhighlighter && from && to) {
        unhighlighter({ from, to });
      }
      break;
    }
    case simpleInverter.type: {
      const { inverter, from, to } = props;
      if (inverter && from && to) {
        inverter({ from, to });
      }
      break;
    }
    case simpleSelector.type: {
      const { highlighter, from, to } = props;
      if (highlighter && from && to) {
        highlighter({ from, to });
      }
      break;
    }
    case cpanelJoiner.type: {
      const { joiner, from, to } = props;
      if (joiner && from && to) {
        joiner({ from, to });
      }
      break;
    }
    case shortcutJoiner.type: {
      const { joiner, from, to } = props;
      if (joiner && from && to) {
        joiner({ from, to });
      }
      break;
    }
    case extractMocks.type: {
      const { addMocks, from, to } = props;
      if (addMocks && from && to) {
        addMocks({ from, to });
      }
      break;
    }
    case destroyOverview.type: {
      const { purgeOverview, from, to } = props;
      if (purgeOverview && from && to) {
        purgeOverview({ from, to });
      }
      break;
    }
    case zipOverview.type: {
      const { zipOutgoing, from, to } = props;
      if (zipOutgoing && from && to) {
        setTimeout(() => zipOutgoing({ from, to }));
      }
      break;
    }
    default:
      return;
  }
};

const highlighters: HighlighterTuple[] = [
  [highlightCoversBreathSelection.type, ["coursesiftersinstructions", "quizsiftersinstructions"]],
  [highlightSlideBreathSelection.type, ["coursefiltersinstructions", "quizfiltersinstructions"]],
  [CoursePennantTreeSelection.type, ["coursesiftersfilters", "quizsiftersfilters"]],
  [highlightContentBreathSelection.type, ["tutorialfiltersinstructions"]],
  [highlightAttemptBreathSelection.type, ["quizdashboardsfilters"]],
  [TutorialRootTreeSelection.type, ["tutorialfoundationfilters"]],
  [CourseRootTreeSelection.type, ["coursefoundationsifters"]],
  [QuizQuestionTreeSelection.type, ["quizdashboardssifters"]],
  [QuizRootTreeSelection.type, ["quizfoundationdashboards"]],
  [
    outlineTutor.type,
    [
      "tutorsfoundationbosses",
      "tutorsfoundationminions",
      "tutorsfoundationunderbosses",
    ],
    [B, M, U],
  ],
  [
    outlineIncoming.type,
    [
      "incomingfoundationfilters",
      "incomingfoundationsifters",
      "incomingfoundationdashboards",
      "incomingfoundationinstructions",
    ],
    [FF, FS, FD, FI],
  ],
  [
    outlineOutgoing.type,
    [
      "outgoingbossesfilters",
      "outgoingbossessifters",
      "outgoingminionsfilters",
      "outgoingminionssifters",
      "outgoingbossesdashboards",
      "outgoingminionsdashboards",
      "outgoingbossesinstructions",
      "outgoingunderbossesfilters",
      "outgoingunderbossessifters",
      "outgoingminionsinstructions",
      "outgoingunderbossesdashboards",
      "outgoingunderbossesinstructions",
    ],
    [BF, BS, MF, MS, BD, MD, BI, UF, US, MI, UD, UI],
  ],
];

export default UiuxManager;
