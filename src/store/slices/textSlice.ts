import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearData } from './rowSlice';

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
    updateTexts: (state, _action: PayloadAction<UpdateTextsPayload[]>) => {
      return state;
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(clearData, () => {
        console.log("cleared_texts");
        return [];
      })
  },
});

export const { updateTexts } = textSlice.actions;
export default textSlice.reducer; 