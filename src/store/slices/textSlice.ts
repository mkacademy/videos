import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearData } from './rowSlice';

import { calcBytes } from '../../utils';
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
  },
});

export const { updateTexts } = textSlice.actions;
export default textSlice.reducer; 