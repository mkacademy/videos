import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { memberApps, userApps } from '../../constants';
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
    resetPagination: (state) => {
      const [tutorial] = Object.entries(userApps).find(
        ([_, value]) => "tutorial" === value.toLowerCase()
      ) || [];
      const [course] = Object.entries(userApps).find(
        ([_, value]) => "course" === value.toLowerCase()
      ) || [];
      const [quiz] = Object.entries(userApps).find(
        ([_, value]) => "quiz" === value.toLowerCase()
      ) || [];

      const [tutors] = Object.entries(userApps).find(
        ([_, value]) => "tutors" === value.toLowerCase()
      ) || [];

      const [incoming] = Object.entries(memberApps).find(
        ([_, value]) => "incoming" === value.toLowerCase()
      ) || [];
      const [outgoing] = Object.entries(memberApps).find(
        ([_, value]) => "outgoing" === value.toLowerCase()
      ) || [];

      state.cs = {};
      state.pagedRoutes = {};
      state.curPageGroup = {};
      state.selectedRoutes = {
        ...(tutorial && { [tutorial]: "foundationfilters" }),
        ...(course && { [course]: "foundationsifters" }),
        ...(quiz && { [quiz]: "foundationdashboards" }),
        ...(tutors && { [tutors]: "foundationminions" }),
        ...(outgoing && { [outgoing]: "minionsinstructions" }),
        ...(incoming && { [incoming]: "foundationinstructions" }),
      };
    },
    updateCsObj: (state, action: PayloadAction<[number, string] | string>) => {
      const [app, encodedData] = action.payload as [number, string];
      state.cs[app] = encodedData;
    },
    setPagedRoutes: (state, action: PayloadAction<[number, PagedRoutes]>) => {
      const [app, routes] = action.payload;
      const previousRoutes = state.pagedRoutes[app];
      if (previousRoutes) state.pagedRoutes[app] = { ...previousRoutes, ...routes };
      else state.pagedRoutes[app] = routes;
    },
    setPagedRoute: (state, action: PayloadAction<[number, string] | string>) => {
      const [app, selected] = action.payload as [number, string];
      state.selectedRoutes[app] = selected;
    },
  }, extraReducers: (builder) => {
    builder.addCase(signedOut, (state) => {
      console.log("cleared_pagination");
      paginationSlice.caseReducers.resetPagination(state);
    });
  },
});

export const {
  resetPagination,
  updateCsObj,
  setPagedRoutes,
  setPagedRoute,
} = paginationSlice.actions;

export default paginationSlice.reducer; 