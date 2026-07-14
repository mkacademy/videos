import { createSlice } from '@reduxjs/toolkit';
import { signedOut } from './sessionSlice';

interface PagedRoute {
  search?: string;
  skip: number;
  take: number;
}

export interface PagedRoutes {
  [key: string]: PagedRoute;
}

export interface PaginationState {
  cs: Record<string, string>;
  curPageGroup: Record<string, number>;
  selectedRoutes: Record<number, string>;
  pagedRoutes: Record<number, PagedRoutes>;
}

// Initialize with empty state first
const initialState: PaginationState = {
  cs: {},
  pagedRoutes: {},
  curPageGroup: {},
  selectedRoutes: {},
};

export const paginationSlice = createSlice({
  name: 'pagination',
  initialState,
  reducers: {

  }, extraReducers: (builder) => {
    builder.addCase(signedOut, (_state) => {
      console.log("cleared_pagination");
    });
  },
});

export const {
} = paginationSlice.actions;

export default paginationSlice.reducer; 