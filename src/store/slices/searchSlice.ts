import { createSlice } from '@reduxjs/toolkit';

export interface Route {
  count: string | number;
  keywords: Search[];
  fromIMG?: string;
  toIMG?: string;
  index: number;
  to: string;
  from: string;
  name?: string;
  path?: string;
}

export interface Search {
  keyword: string;
  count: string | number;
}

export interface SelectedRoute {
  traversal: string;
  keywords: Search[];
  index: number;
}

export interface SearchState {
  searches: Search[];
  routes: Record<string, Route>;
  selectedRoute: SelectedRoute;
  routesRef: { current: Record<string, string>[] };
}

const initialState: SearchState = {
  routes: {},
  searches: [],
  selectedRoute: {
    traversal: '',
    keywords: [],
    index: 0,
  },
  routesRef: { current: [] },
};

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {

  },
});

export const {
} = searchSlice.actions;

export default searchSlice.reducer; 