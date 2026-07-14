import { createSlice } from '@reduxjs/toolkit';
import { BaseFormattedData, DataRow, BaseEntity } from '../../components/Core/types';


// Define a type mapping for entity names to their types
export type EntityTypeMap = {
  foundation: BaseEntity;
}





export interface ResultPayload {
  entity: string;
  payload: DataRow[];
  isAppend?: boolean;
  keywords?: string[];
  parent: string | undefined;
}

export interface FormattedRowsPayload {
  data: BaseFormattedData<EntityTypeMap[keyof EntityTypeMap]>;
  keywords?: string[];
  operation?: string;
  content: DataRow[];
  dest?: string;
  orig?: string;
  GUID?: string;
}

export interface UpdateOrdinalsPayload {
  id: string;
  modified: boolean;
}




export interface Row {
  id: string;
  index: number;
  order: number;
  frozen: boolean;
  checked: boolean;
  deleted: boolean;
  modified: boolean;
}
export type RowState = Row[];
const initialState: RowState = [];
// Create slice
export const rowSlice = createSlice({
  name: 'row',
  initialState,
  reducers: {
    clearData: () => {
      console.log("cleared_rows");
      return [];
    },
  },
});

export const {
  clearData,
} = rowSlice.actions;

export default rowSlice.reducer; 
