import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
    setCounts: (state, action: PayloadAction<Record<string, Record<string, number>>>) => {
      const { routes, selectedRoute } = state;
      const { traversal, keywords: aKeywords, index: aIndex } = selectedRoute;

      Object.entries(action.payload).forEach(([key, values]) => {
        const route = key.toLowerCase();
        if (routes[route] && !isNaN(Number(routes[route].count))) {
          const { to, keywords, index } = routes[route];
          if (keywords.length > 0) {
            keywords[index] = {
              ...keywords[index],
              count: values[to],
            };
            if (route === traversal) {
              aKeywords[aIndex] = {
                ...aKeywords[aIndex],
                count: values[to],
              };
            }
          }
        } else if (routes[route]) {
          const { to } = routes[route];
          const To = to.startsWith('higher')
            ? to.replace('higher', '') + 'higher'
            : to.startsWith('lower')
              ? to.replace('lower', '') + 'lower'
              : to;
          routes[route] = {
            ...routes[route],
            count: values[To],
          };
        }
      });

      // Update routesRef
      state.routesRef.current = Object.entries(routes)
        .filter(([_, route]) => {
          const { keywords, count, index } = route;
          return !isNaN(Number(count)) && Number(count) > 0 && keywords[index];
        })
        .map(([key, route]) => {
          const { keywords, index } = route;
          return {
            [key]: keywords[index].keyword,
          };
        });
    },
    matchKeyword: (state, action: PayloadAction<Search>) => {
      const { traversal, keywords } = state.selectedRoute;

      if (traversal) {
        const newRoutes = {
          ...state.routes,
          [traversal]: {
            ...state.routes[traversal],
            keywords: [action.payload, ...keywords],
            index: keywords.length > 0 ? state.selectedRoute.index + 1 : 0,
          },
        };

        // Update routesRef
        state.routesRef.current = Object.entries(newRoutes)
          .filter(([_, route]) => {
            const { keywords, count, index } = route;
            return !isNaN(Number(count)) && Number(count) > 0 && keywords[index];
          })
          .map(([key, route]) => {
            const { keywords, index } = route;
            return {
              [key]: keywords[index].keyword,
            };
          });

        state.routes = newRoutes;
        state.selectedRoute = {
          traversal,
          keywords: [action.payload, ...keywords],
          index: keywords.length > 0 ? state.selectedRoute.index + 1 : 0,
        };
      }
    },
    insertKeyword: (state, action: PayloadAction<Search>) => {
      const {
        routes,
        searches,
        selectedRoute: { traversal, keywords } = {
          traversal: undefined,
          keywords: [],
        },
      } = state;

      if (traversal) {
        const newRoutes = {
          ...routes,
          [traversal]: {
            ...routes[traversal],
            keywords: [action.payload, ...keywords],
            index: keywords.length > 0 ? state.selectedRoute.index + 1 : 0,
          },
        };

        // Update routesRef
        state.routesRef.current = Object.entries(newRoutes)
          .filter(([_, route]) => {
            const { keywords, index, count } = route;
            return !isNaN(Number(count)) && Number(count) > 0 && keywords[index];
          })
          .map(([key, route]) => {
            const { keywords, index } = route;
            return {
              [key]: keywords[index].keyword,
            };
          });

        state.routes = newRoutes;
        state.selectedRoute = {
          traversal,
          keywords: [action.payload, ...keywords],
          index: keywords.length > 0 ? state.selectedRoute.index + 1 : 0,
        };
      }
      const existingSearch = searches.find(({ keyword }) => keyword === action.payload.keyword);
      const filteredSearches = searches.filter(({ keyword }) => keyword !== action.payload.keyword);
      const newSearch = existingSearch ? { ...action.payload, count: existingSearch.count } : action.payload;
      state.searches = [newSearch, ...filteredSearches];
    },
    unmatchKeyword: (state, action: PayloadAction<Search>) => {
      const { keyword } = action.payload;
      const { traversal, keywords, index } = state.selectedRoute;
      if (traversal) {
        const selected = keywords[index]?.keyword;
        const predicate = ({ keyword: k }: { keyword: string }) => k === selected;
        const newKwords = keywords.filter(({ keyword: k }) => k !== keyword);

        const newRoutes = {
          ...state.routes,
          [traversal]: {
            ...state.routes[traversal],
            keywords: newKwords,
            index: newKwords.findIndex(predicate),
          },
        };

        // Update routesRef
        state.routesRef.current = Object.entries(newRoutes)
          .filter(([_, route]) => {
            const { keywords, count, index } = route;
            return !isNaN(Number(count)) && Number(count) > 0 && keywords[index];
          })
          .map(([key, route]) => {
            const { keywords, index } = route;
            return {
              [key]: keywords[index].keyword,
            };
          });

        state.routes = newRoutes;
        state.selectedRoute = {
          traversal,
          keywords: newKwords,
          index: newKwords.findIndex(predicate),
        };
      }
    },
    setSelectedRoute: (state, action: PayloadAction<SelectedRoute | number>) => {
      if (typeof action.payload === 'number') {
        const { routes, selectedRoute } = state;
        const { traversal, keywords } = selectedRoute;
        if (traversal && action.payload > -1 && action.payload < keywords.length) {
          const newRoutes = {
            ...routes,
            [traversal]: { ...routes[traversal], index: action.payload },
          };

          // Update routesRef
          state.routesRef.current = Object.entries(newRoutes)
            .filter(([_, route]) => {
              const { keywords, count, index } = route;
              return !isNaN(Number(count)) && Number(count) > 0 && keywords[index];
            })
            .map(([key, route]) => {
              const { keywords, index } = route ;
              return {
                [key]: keywords[index].keyword,
              };
            });

          state.routes = newRoutes;
          state.selectedRoute = { ...selectedRoute, index: action.payload };
        }
      } else {
        state.selectedRoute = action.payload;
      }
    },
  },
});

export const {
  setCounts,
  matchKeyword,
  insertKeyword,
  unmatchKeyword,
  setSelectedRoute,
} = searchSlice.actions;

export default searchSlice.reducer; 