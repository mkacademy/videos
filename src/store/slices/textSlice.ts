import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearData, updateIds, removeRows, appendRowz, prependRowz } from './rowSlice';
import { insertMetadata, updateMetadataId } from '../../library/actions';
import {
  declare,
  getOverlaps,
  getOrderedTexts,
  mergeMetaDatas,
  updateMetadataID,
} from './contentSlice';
import { getInteractionIDs, calcBytes } from '../../utils';
import { DataRow, DatabaseTableProps, Metadata, TabulatorProps } from '../../components/Core/types';

type UpdateTextsFields = Pick<
  DatabaseTableProps,
  | 'filter'
  | 'sifter'
  | 'dashboard'
  | 'instruction'
  | 'underboss'
  | 'boss'
  | 'minion'
  | 'details'
  | 'imageurl'
  | 'username'
  | 'email'
  | 'purpose'
  | 'sizeInBytes'
> &
  Pick<TabulatorProps, 'password' | 'deleted' | 'checked' | 'index'>;

export interface UpdateTextsPayload extends Partial<UpdateTextsFields> {
  id: string;
  modified: boolean;
  metadata?: Metadata;
}

export type TextState = DataRow[];
const initialState: DataRow[] = [];

// Helper function to convert TextRow to ContentItem for utility functions
const textRowToContentItem = (row: DataRow): DataRow => ({
  ...row,
  id: row.id
});

// Helper function to convert ContentItem back to TextRow
const contentItemToTextRow = (item: DataRow): DataRow => ({
  ...item,
  id: item.id.toString()
});

export const textSlice = createSlice({
  name: 'text',
  initialState,
  reducers: {
    updateTexts: (state, action: PayloadAction<UpdateTextsPayload[]>) => {
      return state.map((row) => {
        const match = action.payload.find((texts) => texts.id === row.id);
        if (match === undefined) return row;
        const predicate = (key: string) =>
          match[key] !== undefined && match[key] !== null;
        const updates = Object.keys(match)
          .filter(predicate)
          .reduce((updates, key) => ({ ...updates, [key]: match[key] }), {});
        return updates["modified"] !== undefined &&
          updates["modified"] === false &&
          row["modified"] === true
          ? { ...row, ...updates, sizeInBytes: calcBytes(row) }
          : { ...row, ...updates };
      });
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Handle clearData from rowSlice
      .addCase(clearData, () => {
        console.log("cleared_texts");
        return [];
      })
      // Handle updateIds from rowSlice
      .addCase(updateIds, (state, action) => {
        const ids = action.payload;
        return state.map((row) => {
          const i = ids.findIndex((id: string) => id === row.id);
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
      // Handle appendRowz from rowSlice
      .addCase(appendRowz, (state, action) => {
        const {
          keywords,
          data: { texts },
        } = action.payload;
        const newTexts = texts.map(declare(keywords));
        const pred = (r: DataRow) => newTexts.findIndex((nt: DataRow) => nt.id.toString() === r.id) === -1;
        const nonOverlapedState = state.filter(pred);
        const nonOverlapedData = newTexts.filter((nt: DataRow) => state.findIndex((s) => s.id === nt.id.toString()) === -1);
        
        // Convert to ContentItem format for utility functions
        const stateAsContentItems = state.map(textRowToContentItem);
        const newTextsAsContentItems = newTexts.map((t: DataRow) => ({ ...t, id: t.id }));
        const affirmContentItem = (r: DataRow) => (R: DataRow) => R.id === r.id;
        
        const overlaps = getOverlaps(stateAsContentItems, newTextsAsContentItems, affirmContentItem);
        const unorderedMess = nonOverlapedState.map(textRowToContentItem)
          .concat(overlaps)
          .concat(nonOverlapedData.map((t: DataRow) => ({ ...t, id: t.id })));
        const orderedContentItems = getOrderedTexts(stateAsContentItems, unorderedMess, nonOverlapedData.map((t: DataRow) => ({ ...t, id: t.id })));
        
        // Convert back to TextRow format
        return orderedContentItems.map(contentItemToTextRow);
      })
      // Handle prependRowz from rowSlice
      .addCase(prependRowz, (state, action) => {
        const {
          keywords,
          data: { texts },
        } = action.payload;
        const newTexts = texts.map(declare(keywords));
        const pred = (r: DataRow) => newTexts.findIndex((nt: DataRow) => nt.id.toString() === r.id) === -1;
        const nonOverlapedState = state.filter(pred);
        const nonOverlapedData = newTexts.filter((nt: DataRow) => state.findIndex((s) => s.id === nt.id.toString()) === -1);
        
        // Convert to ContentItem format for utility functions
        const stateAsContentItems = state.map(textRowToContentItem);
        const newTextsAsContentItems = newTexts.map((t: DataRow) => ({ ...t, id: t.id }));
        const affirmContentItem = (r: DataRow) => (R: DataRow) => R.id === r.id;
        
        const overlaps = getOverlaps(stateAsContentItems, newTextsAsContentItems, affirmContentItem);
        const unorderedMess = nonOverlapedData.map((t: DataRow) => ({ ...t, id: t.id }))
          .concat(overlaps)
          .concat(nonOverlapedState.map(textRowToContentItem));
        const orderedContentItems = getOrderedTexts(nonOverlapedData.map((t: DataRow) => ({ ...t, id: t.id })), unorderedMess, stateAsContentItems);
        
        // Convert back to TextRow format
        return orderedContentItems.map(contentItemToTextRow);
      })
      // Handle removeRows from rowSlice
      .addCase(removeRows, (state, action) => {
        const ids = action.payload;
        const pred = (r: DataRow) => (ID: string) => ID === r.id;
        return state.filter((t) => ids.findIndex(pred(t)) === -1);
      })
      // Handle insertMetadata from actions.ts
      .addCase(insertMetadata, (state, action) => {
        const { dest, orig, data: metadatas }  = action.payload;
        const { childID } = getInteractionIDs(orig || '', dest);
        if (!childID) return state;
        return state.map((row) => {
          const id = row.id;
          const metadata = metadatas.filter((m: Metadata) => m[childID] === parseInt(id as string));
          return metadata.length > 0
            ? { ...row, metadata: mergeMetaDatas(textRowToContentItem(row), metadata, orig) }
            : { ...row };
        });
      })
      // Handle updateMetadataId from actions.ts
      .addCase(updateMetadataId, (state, action) => {
        const { ids, entity } = action.payload;
        const numericIds = ids.map((id: string) => parseInt(id));
        return state.map((row) => {
          const i = numericIds.findIndex((id: number) => id.toString() === row.id);
          return i !== -1 && i % 2 === 0
            ? { ...row, metadata: updateMetadataID(textRowToContentItem(row), entity, numericIds[i + 1]) }
            : { ...row };
        });
      });
  },
});

export const { updateTexts } = textSlice.actions;
export default textSlice.reducer; 