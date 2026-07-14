import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getInteractionIDs, calcBytes, Tree, ADD_ROWS } from '../../utils';
import { clearData, updateIds, unselectAll, selectAll, prependRowz, appendRowz } from './rowSlice';
import { updateMetadataId, insertMetadata } from '../../library/actions';
import { DataRow, Metadata } from '../../components/Core/types';

export type ContentState = DataRow[];

const initialState: ContentState = [];

export const declare = (keywords?: string[]) =>
  keywords ? (r: DataRow) => ({ ...r, keywords }) : (r: DataRow) => r;

export const getOverlaps = (oldData: DataRow[], newData: DataRow[], affirm: (r: DataRow) => (R: DataRow) => boolean) => {
  const pred = (r: DataRow) => oldData.findIndex(affirm(r)) > -1;
  return newData.filter(pred).map((row) => {
    const existingRow = oldData.find((old) => old.id === row.id);
    const keywords = existingRow?.keywords || [];
    const mergedKeywords = [...(row.keywords || []), ...keywords];
    const uniqueKeywords = Array.from(new Set(mergedKeywords));
    return { ...row, keywords: uniqueKeywords };
  });
};

export const getOrderedTexts = (before: DataRow[], unorderedMess: DataRow[], after: DataRow[]) => {
  const orderedIDs = before.map((r) => r.id).concat(after.map((r) => r.id));
  return orderedIDs.map((id) => unorderedMess.find((r) => r.id === id)).filter(Boolean) as DataRow[];
};

export const mergeMetaDatas = (row: DataRow, metadatas: Metadata[], orig: string) => {
  if (!Array.isArray(metadatas))
    throw new Error("metadatas needs to be an array");
  const { parentID } = getInteractionIDs(orig, '');
  if (!parentID) throw new Error("parentID is null");
  if (row.metadata === undefined)
    return {
      ...metadatas[0],
      [parentID]: metadatas.map((m) => m[parentID]).filter((c) => c),
    };
  else {
    const parentIds = [
      ...(row.metadata[parentID] || []),
      ...metadatas.map((m) => m[parentID]).filter((c) => c),
    ];
    return { ...row.metadata, [parentID]: parentIds };
  }
};

export const updateMetadataID = (row: DataRow, entity: string, id: number) => {
  const { childID } = getInteractionIDs('', entity);
  if (!childID) throw new Error("childID is null");
  return { ...row.metadata, [childID]: id } as DataRow['metadata'];
};

export const updateMetadataIDs = (row: DataRow, payload: { parent: string; parentId: number; operation: string }) => {
  const { parent, parentId, operation } = payload;
  const { parentID } = getInteractionIDs(parent, '');
  if (!parentID) throw new Error("parentID is null");
  const parentIds =
    operation === ADD_ROWS
      ? [...(row.metadata?.[parentID] || []), parentId]
      : (row.metadata?.[parentID] || []).filter((id: number) => id !== parentId);
  return { ...row.metadata, [parentID]: parentIds } as DataRow['metadata'];
};

export const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    removeContent: (state, action: PayloadAction<number[]>) => {
      const ids = action.payload;
      const pred = (r: DataRow) => (ID: number) => parseInt(ID.toString()) === r.id;
      return state.filter((r) => ids.findIndex(pred(r)) === -1);
    },
    selectContent: (state, action: PayloadAction<Partial<DataRow>[]>) => {
      if (action.payload.length === 0) return state;
      const contents = action.payload.map((p) => ({ ...p, id: parseInt(p.id?.toString() || '0') }));
      const getIndex = (r: DataRow) => contents.findIndex((p) => p.id === r.id);
      return state.map((row) => {
        const index = getIndex(row);
        if (index === -1) return row;
        else return { ...row, ...contents[index] };
      });
    },
    appendContentz: (state, action: PayloadAction<{ keywords?: string[]; GUID?: string; data: DataRow[] }>) => {
      const { keywords, data } = action.payload;
      const newData = data.map(declare(keywords));
      const affirm = (r: DataRow) => (R: DataRow) => R.id === r.id;
      const signify = (r: DataRow) => state.findIndex(affirm(r)) === -1;
      const pred = (r: DataRow) => newData.findIndex(affirm(r)) === -1;
      const nonOverlapedState = state.filter(pred);
      const nonOverlapedData = newData.filter(signify);
      const overlaps = getOverlaps(state, newData, affirm);
      const unorderedMess = nonOverlapedState
        .concat(overlaps)
        .concat(nonOverlapedData);
      return getOrderedTexts(state, unorderedMess, nonOverlapedData);
    },
    prependContentz: (state, action: PayloadAction<{ keywords?: string[]; GUID?: string; data: DataRow[] }>) => {
      const { keywords, data } = action.payload;
      const newData = data.map(declare(keywords));
      const affirm = (r: DataRow) => (R: DataRow) => R.id === r.id;
      const signify = (r: DataRow) => state.findIndex(affirm(r)) === -1;
      const pred = (r: DataRow) => newData.findIndex(affirm(r)) === -1;
      const nonOverlapedState = state.filter(pred);
      const nonOverlapedData = newData.filter(signify);
      const overlaps = getOverlaps(state, newData, affirm);
      const unorderedMess = nonOverlapedData
        .concat(overlaps)
        .concat(nonOverlapedState);
      return getOrderedTexts(nonOverlapedData, unorderedMess, state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(clearData, () => {
        console.log("cleared_contents");
        return [];
      })
      .addCase(updateIds, (state, action) => {
        const ids = action.payload.map((id: string) => parseInt(id));
        return state.map((row) => {
          const i = ids.findIndex((id: number) => id === row.id);
          return i !== -1 && i % 2 === 0
            ? {
              ...row,
              id: ids[i + 1],
              modified: false,
              sizeInBytes: calcBytes(row),
            }
            : { ...row };
        });
      })
      .addCase(unselectAll, (state) => {
        return state.map((r) => ({
          ...r,
          checked: r.frozen ? r.checked : false,
        }));
      })
      .addCase(selectAll, (state) => {
        return state.map((row) => ({ ...row, checked: true }));
      })
      .addCase(updateMetadataId, (state, action) => {
        const { ids: serverIds, entity } = action.payload;
        const ids = serverIds.map((id: string) => parseInt(id));
        return state.map((row) => {
          const i = ids.findIndex((id: number) => id === row.id);
          return i !== -1 && i % 2 === 0
            ? { ...row, metadata: updateMetadataID(row, entity, ids[i + 1]) }
            : { ...row };
        });
      })
      .addCase(insertMetadata, (state, action) => {
        const { orig, dest, data: metadatas } = action.payload;
        const { childID } = getInteractionIDs('', dest);
        if (!childID) return state;
        return state.map((row) => {
          const metadata = metadatas.filter((meta: Metadata) => meta[childID] === parseInt(row.id as string));
          return metadata.length > 0
            ? { ...row, metadata: mergeMetaDatas(row, metadata, orig) }
            : { ...row };
        });
      }).addCase(prependRowz, (state, action) => {
        const affirm = (r: DataRow) => (ID: number | string) => ID === r.id;
        if (!action.payload?.content) return state;
        if (state.length === 0) return [...action.payload.content];
        const appended = action.payload.content.map((c: DataRow) => c.id);
        const pred = (r: DataRow) => appended.findIndex(affirm(r)) === -1;
        return action.payload.content.concat(state.filter(pred));
      }).addCase(appendRowz, (state, action) => {
        const affirm = (r: DataRow) => (ID: number | string) => ID === r.id;
        if (!action.payload?.content) return state;
        if (state.length === 0) return [...action.payload.content];
        const prepend = action.payload.content.map((c: DataRow) => c.id);
        const pred = (r: DataRow) => prepend.findIndex(affirm(r)) === -1;
        return state.filter(pred).concat(action.payload.content);
      });
  },
});

export const {
  removeContent,
  selectContent,
  appendContentz,
  prependContentz,
} = contentSlice.actions;

export const appendContent = ({
  entity,
  parent,
  payload,
  keywords = [],
  isAppend = false,
}: {
  entity: string;
  parent: string;
  payload: DataRow[];
  keywords?: string[];
  isAppend?: boolean;
}) => {
  const formatter = Tree.getProperty(entity, "nonFormattedData");
  return {
    payload: {
      keywords,
      orig: parent,
      dest: entity,
      data: formatter?.(payload) ?? [],
    },
    type: isAppend ? contentSlice.actions.appendContentz.type : contentSlice.actions.prependContentz.type,
  };
  };
export default contentSlice.reducer; 