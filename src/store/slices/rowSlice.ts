import { Tree } from '../../utils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { tabledFetcher } from '../../library/Thunks';
import {
  applyReOrderRows,
  type ReOrderRowsPayload,
} from '../middleware/TabulatorOrderingUtils';
import { BaseFormattedData, DataRow, BaseEntity } from '../../components/Core/types';
import Boss from '../../components/Core/Boss';
import Minion from '../../components/Core/Minion';
import Sifter from '../../components/Core/Sifter';
import Filter from '../../components/Core/Filter';
import Underboss from '../../components/Core/Underboss';
import Dashboard from '../../components/Core/Dashboard';
import Instruction from '../../components/Core/Instruction';

// Define a type mapping for entity names to their types
export type EntityTypeMap = {
  bosses: Boss;
  minions: Minion;
  sifters: Sifter;
  filters: Filter;
  underbosses: Underboss;
  dashboards: Dashboard;
  instructions: Instruction;
  foundation: BaseEntity;
}

export type { ReOrderRowsPayload };

// Helper functions
const getOffsetState = (state: Row[], fetched: Row[], affirm: (r: Row) => (R: Row) => boolean) => {
  let offset = 0;
  fetched.forEach((row) => {
    const fetchedRow = state.find(affirm(row));
    if (fetchedRow === undefined) offset++;
  });
  return offset > 0
    ? state.map((row) => {
      return {
        ...row,
        index: row.index + offset,
        order: row.order + offset,
      };
    })
    : state;
};

const appendRowsHelper = (state: Row[], fetched: Row[], affirm: (r: Row) => (R: Row) => boolean) => {
  let i = 0;
  const seen = new Set<string>();
  return fetched.flatMap((row) => {
    if (seen.has(row.id)) return [];
    seen.add(row.id);
    const stateRow = state.find(affirm(row));
    if (stateRow) return [stateRow];
    const correctIndex = state.length + i++;
    return [{
      ...row,
      index: correctIndex,
      order: correctIndex,
    }];
  });
};
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

export const appendRows = <T extends keyof EntityTypeMap>(
  args: ResultPayload & { entity: T }
) => {
  const { entity, parent, payload, keywords = [], isAppend = true } = args;
  const links = Tree.getProperty(entity, "connections") as string[];
  const dataFormatter = Tree.getProperty(entity, "formattedData") as (payload: DataRow[], links: string[]) => BaseFormattedData<EntityTypeMap[T]> | undefined;
  const contentFormatter = Tree.getProperty(entity, "nonFormattedData") as (payload: DataRow[]) => DataRow[] | undefined;

  const formattedPayload: FormattedRowsPayload = {
    keywords,
    dest: entity,
    orig: parent,
    content: contentFormatter?.(payload) ?? [],
    data: dataFormatter?.(payload, links ?? []) ?? { rows: [], statuses: [], descendents: [], texts: [] },
  };
  return isAppend ? appendRowz(formattedPayload) : prependRowz(formattedPayload);
};


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
    reOrderRows: (state, action: PayloadAction<ReOrderRowsPayload>) => {
      return applyReOrderRows(state, action.payload);
    },
    invertSelection: (state) => {
      return state.map((row) => ({
        ...row,
        checked: row.deleted ? row.checked : !row.checked,
      }));
    },
    toggleRow: (state, action: PayloadAction<string>) => {
      return state.map((row) => ({
        ...row,
        checked: action.payload === row.id ? !row.checked : row.checked,
      }));
    },
    selectRows: (state, action: PayloadAction<Partial<Row>[]>) => {
      if (action.payload.length === 0) return state;
      const patchById = new Map(
        action.payload.filter((p): p is Partial<Row> & { id: string } => p.id != null).map((p) => [p.id, p])
      );
      return state.map((row) => {
        const patch = patchById.get(row.id);
        return patch ? { ...row, ...patch } : row;
      });
    },
    unselectAll: (state) => {
      return state.map((r) => ({
        ...r,
        checked: r.frozen ? r.checked : false,
      }));
    },
    selectAll: (state) => {
      return state.map((row) => ({ ...row, checked: true }));
    },
    updateOrdinals: (state, action: PayloadAction<UpdateOrdinalsPayload[]>) => {
      return state.map((row) => {
        const modified = action.payload.find((order: UpdateOrdinalsPayload) => order.id === row.id);
        return modified !== undefined ? { ...row, ...modified } : { ...row };
      });
    },
    prependRowz: (state, action: PayloadAction<FormattedRowsPayload>) => {
      const affirm = (r: Row) => (R: Row) => R.id === r.id;
      if (!action.payload?.data?.rows) return state;
      const prepends = action.payload.data.rows;
      if (state.length === 0) return [...prepends];
      const offsetState = getOffsetState(state, prepends, affirm);
      const existingIds = new Set(offsetState.map((r) => r.id));
      const prependIds = new Set(prepends.map((r) => r.id));
      const visibles = offsetState.filter((row) => !row.deleted);
      const invisibles = offsetState.filter((row) => row.deleted);
      const resetOrder = (r: Row, i: number) => ({ ...r, index: i, order: i });
      return prepends
        .filter((r) => !existingIds.has(r.id))
        .map(resetOrder)
        .concat(visibles)
        .concat(invisibles.filter((r) => !prependIds.has(r.id)));
    },
    appendRowz: (state, action: PayloadAction<FormattedRowsPayload>) => {
      const affirm = (r: Row) => (R: Row) => R.id === r.id;
      if (!action.payload?.data?.rows) return state;
      const rows = action.payload.data.rows;
      if (state.length === 0) return [...rows];
      const visibles = state.filter((row) => !row.deleted);
      const invisibles = state.filter((row) => row.deleted);
      const appended = appendRowsHelper(state, rows, affirm);
      const appendedIds = new Set(appended.map((r) => r.id));
      return visibles
        .filter((r) => !appendedIds.has(r.id))
        .concat(appended)
        .concat(invisibles.filter((r) => !appendedIds.has(r.id)))
        .sort((a, b) => a.order - b.order);
    },
    removeRows: (state, action: PayloadAction<string[]>) => {
      const removeIds = new Set(action.payload);
      const rouws = state.filter((r) => !removeIds.has(r.id));
      return rouws.map((row, i) => ({ ...row, index: i }));
    },
    hideRow: (state, action: PayloadAction<string>) => {
      return state.map((row) => {
        return action.payload === row.id ? { ...row, deleted: true } : { ...row };
      });
    },
    unhideRows: (state) => {
      return state.map((row) => {
        return row.deleted
          ? { ...row, deleted: false, checked: true }
          : { ...row };
      });
    },
    hideRows: (state) => {
      return state.map((row) => {
        return row.checked
          ? { ...row, deleted: true, checked: false }
          : { ...row };
      });
    },
    updateIds: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      return state.map((row) => {
        const i = ids.findIndex((id: string) => id === row.id);
        return i !== -1 && i % 2 === 0
          ? { ...row, ...{ id: ids[i + 1] } }
          : { ...row };
      });
    },
    clearData: () => {
      console.log("cleared_rows");
      return [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(tabledFetcher.rejected, (_, action) => {
        console.log("tabledFetcher.rejected", action);
      })
  },
});

export const {
  reOrderRows,
  invertSelection,
  toggleRow,
  selectRows,
  unselectAll,
  selectAll,
  updateOrdinals,
  prependRowz,
  appendRowz,
  removeRows,
  hideRow,
  unhideRows,
  hideRows,
  updateIds,
  clearData,
} = rowSlice.actions;

export default rowSlice.reducer; 
