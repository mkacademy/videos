import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initializedLoading, signedOut } from './sessionSlice';
import { getInteractionIDs, validatedCombination } from '../../utils';
import { CpanelRow } from '../../components/Core/types';

export interface ResponseState {
  localWebapp: string;
  parentGroups: Record<string, CpanelRow[]>;
  responseData: Record<string, LocalResponseData>;
}

export interface LocalResponseData {
  parent: string;
  connection: string;
  visibles: CpanelRow[];
  fetchedData: Record<string, CpanelRow[]>;
}

export interface ShowRecordsPayload {
  coParents: { [key: string]: CpanelRow[] };
  isSelected: boolean;
  from: string;
  to: string;
}

export interface ToggleRecordPayload {
  to: string;
  from: string;
  id: number;
}

export interface AppendRecordsPayload {
  to: string;
  from: string;
  webapp: string;
  fetchedData: Record<string, CpanelRow[]>;
}

export interface FilterRecordsPayload {
  filter?: string;
  content?: string;
  direction: boolean;
  isSelected: boolean;
  contentIds?: string[];
  selectedRoute: string;
  isFirstSelection: boolean;
  parentData?: { IDs: string[]; parent: string };
}

const initialState: ResponseState = { localWebapp: "", parentGroups: {}, responseData: {} };

const isValidCpanelRow = (row: CpanelRow | null | undefined): row is CpanelRow =>
  row != null && typeof row === "object";

const validCpanelRows = (rows: CpanelRow[] | undefined): CpanelRow[] =>
  (rows ?? []).filter(isValidCpanelRow);

const predicate0 = (previous: Record<string, CpanelRow>, cur: CpanelRow) => {
  if (!isValidCpanelRow(cur) || cur.id == null) return previous;
  return {
    ...previous,
    [cur.id]: { isOpen: false, ...cur },
  };
};

const makeCoParentPredicate = (parentKey: string, childKey: string) =>
  (previous: Record<string, CpanelRow>, cur: CpanelRow) => {
    if (!isValidCpanelRow(cur)) return previous;
    const parentVal = cur[parentKey];
    const childVal = cur[childKey];
    if (parentVal == null || childVal == null) return previous;
    return {
      ...previous,
      [`${parentVal}|${childVal}`]: {
        isOpen: false,
        ...cur,
      },
    };
  };


export const responseSlice = createSlice({
  name: 'response',
  initialState,
  reducers: {
    setParentGroups: (state, action: PayloadAction<Record<string, CpanelRow[]>>) => {
      state.parentGroups = action.payload;
    },
    appendRecords: (state, action: PayloadAction<AppendRecordsPayload>) => {
      const {
        to,
        from,
        webapp,
        fetchedData,
      } = action.payload;
      state.localWebapp = webapp;
      if (fetchedData == null || Object.keys(fetchedData).length === 0) return;
      const { parentID, childID } = getInteractionIDs(from, to);
      if (!parentID || !childID) return;
      const predicate2 = makeCoParentPredicate(parentID, childID);

      const existingState = state.responseData[from + to] ?? {};
      const connection = existingState.connection || to;
      const parent = existingState.parent || from;
      const prevFetchedData = existingState.fetchedData || {};

      const curMetadata = validCpanelRows(prevFetchedData[parent]);
      const curVisibles = validCpanelRows(prevFetchedData[connection]);
      const metadata = validCpanelRows(fetchedData[parent]);
      const visibles = validCpanelRows(fetchedData[connection]);

      const formated0 = visibles.reduce(predicate0, {});
      const formated1 = metadata.reduce(predicate2, {});
      const newVisibles = curVisibles.reduce(predicate0, { ...formated0 });
      const newMetadata = curMetadata.reduce(predicate2, { ...formated1 });

      prevFetchedData[connection] = Object.values(newVisibles);
      prevFetchedData[parent] = Object.values(newMetadata);

      const key = state.localWebapp + "_" + parent + connection;
      if (state.responseData[key]) {
        state.responseData[key].parent = parent;
        state.responseData[key].connection = connection;
        state.responseData[key].fetchedData = prevFetchedData;
        state.responseData[key].visibles = Object.values(newVisibles);
      }
      else {
        state.responseData[key] = {
          parent,
          connection,
          fetchedData: prevFetchedData,
          visibles: Object.values(newVisibles),
        };
      }
    },
    toggleRecord: (state, action: PayloadAction<ToggleRecordPayload>) => {
      const { to, from, id } = action.payload;
      const {
        visibles,
        parent = from,
        connection = to,
      } = state.responseData[state.localWebapp + "_" + from + to];
      const newVisibles = visibles.map((row) => ({
        ...row,
        isOpen: row.id === id ? !row.isOpen : row.isOpen,
      }));
      state.responseData[state.localWebapp + "_" + parent + connection].visibles = newVisibles;
    },
    filterRecords: (state, action: PayloadAction<FilterRecordsPayload>) => {
      const {
        isSelected,
        selectedRoute,
        content = "TO",
        contentIds = [],
        isFirstSelection,
        filter = "Includes",
        direction: downwards,
        parentData: { IDs, parent } = { IDs: [], parent: "FROM" },
      } = action.payload;

      const isParentDefined = selectedRoute.indexOf(parent);
      const isChildDefined = selectedRoute.indexOf(content);
      const dParent = isParentDefined
        ? parent
        : selectedRoute.replace(content, "");
      const dContent = isChildDefined
        ? content
        : selectedRoute.replace(parent, "");

      const output = validatedCombination({
        selectedParent: dParent,
        selectedChild: dContent,
      }, true, "");
      const { selectedParent, selectedChild } = output;

      const {
        fetchedData = {},
        connection = dContent,
        parent: root = dParent,
      } = state.responseData[selectedRoute] ?? {};

      const isIncludes = filter === "Includes";

      if (!downwards && !isFirstSelection && isSelected) {
        console.log("upwards match found", state.localWebapp + "_" + root + connection, selectedChild);
        state.parentGroups =
          Object.keys(fetchedData)
            .filter((key) => key !== connection)
            .reduce((prev, key) => {
              const { parentID: pId, childID: cId } = getInteractionIDs(
                key,
                connection
              );
              if (!pId || !cId) return prev;
              return {
                ...prev,
                [key]: fetchedData[key]
                  .filter((m: CpanelRow) => contentIds.includes(m[cId]) === isIncludes)
                  .map((m: CpanelRow) => m[pId]),
              };
            }, {})

      } else if (isSelected) return;
      else if (downwards && !isFirstSelection && root !== selectedParent) {
        const key = state.localWebapp + "_" + root + connection;
        state.responseData[key].connection = connection;
        state.responseData[key].fetchedData = fetchedData;
        state.responseData[key].parent = root;
        state.responseData[key].visibles = [];
      } else if (downwards && !isFirstSelection && root === selectedParent) {
        console.log("downward match found", state.localWebapp + "_" + root + connection, selectedParent);
        const params = [root, connection];
        const nodes = Object.keys(fetchedData);
        const molds = fetchedData[selectedParent] ?? [];
        const visibles = fetchedData[connection] ?? [];
        const { parentID: pId, childID: cId } = getInteractionIDs(params[0], params[1]);
        if (!pId || !cId) return;
        const pred0 = (id: number) => (m: CpanelRow) =>
          IDs.includes(m[pId]) === isIncludes && m[cId] === id;
        const pred1 = ({ id }: CpanelRow) => molds.findIndex(pred0(id as number)) > -1;

        if (nodes.length > 0 && !nodes.includes(selectedParent))
          console.log(`[${state.localWebapp + "_" + root + connection}] no molds (${selectedParent})`);

        const key = state.localWebapp + "_" + root + connection;
        state.responseData[key].parent = root;
        state.responseData[key].connection = connection;
        state.responseData[key].fetchedData = fetchedData;
        state.responseData[key].visibles = visibles.filter(molds.length > 0 ? pred1 : () => true);
      }
    },
    showRecords: (state, action: PayloadAction<ShowRecordsPayload>) => {
      const { coParents, isSelected, to, from } = action.payload;
      if (isSelected) return;

      const {
        fetchedData,
        parent = from,
        connection = to,
      } = state.responseData[state.localWebapp + "_" + from + to] ?? {};

      const selectedIds = coParents[connection] ?? [];
      const visibles = fetchedData ? fetchedData[connection] ?? [] : [];

      const predicate =
        Object.keys(coParents).length > 0
          ? ({ id }: CpanelRow) => selectedIds.some(row => row.id === id)
          : () => true;

      const newVisibles = visibles.filter(predicate);

      const key = state.localWebapp + "_" + parent + connection;
      if (state.responseData[key]) {
        state.responseData[key].parent = parent;
        state.responseData[key].visibles = newVisibles;
        state.responseData[key].connection = connection;
        state.responseData[key].fetchedData = fetchedData;
      }
      else {
        state.responseData[key] = {
          parent,
          connection,
          fetchedData,
          visibles: newVisibles,
        };
      }
    },
    clearFetched: (state, action: PayloadAction<boolean>) => {
      const highlighted = action.payload;
      const keys = Object.keys(state.responseData);
      const localWebapp = state.localWebapp + "_";
      const newState: [string, LocalResponseData][] = keys.map((key) => {
        if (!key.startsWith(localWebapp)) return [key, state.responseData[key]];
        const { parent, visibles, connection, fetchedData = {} } = state.responseData[key];
        const { childID } = getInteractionIDs(parent, connection);
        const removed = visibles
          .filter((row: CpanelRow) => row.isOpen === highlighted)
          .map((row: CpanelRow) => row.id);
        const newValues = visibles.filter(
          (row: CpanelRow) => row.isOpen !== highlighted
        );
        const metadatas = fetchedData[parent] ? fetchedData[parent].filter(
          (metadata: CpanelRow) => childID && !removed.includes(metadata[childID])
        ) : [];
        const rows = fetchedData[connection] ? fetchedData[connection].filter(
          ({ id }: CpanelRow) => !removed.includes(id)
        ) : [];
        const newFetchedData: Record<string, CpanelRow[]> = {};
        newFetchedData[connection] = rows;
        newFetchedData[parent] = metadatas;
        return [
          key,
          {
            parent,
            connection,
            visibles: newValues,
            fetchedData: newFetchedData,
          },
        ];
      });

      state.responseData = newState.reduce(
        (prev, [key, values]: [string, LocalResponseData]) => ({
          ...prev,
          [key]: values,
        }),
        {}
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializedLoading, (state, action) => {
        if (action.payload.curToken) return { ...initialState };
        else return state;
      })
      .addCase(signedOut, () => {
        console.log("cleared_cpanel");
        return initialState
      });
  },
});

export const {
  appendRecords,
  toggleRecord,
  filterRecords,
  showRecords,
  clearFetched,
  setParentGroups,
} = responseSlice.actions;

export default responseSlice.reducer; 