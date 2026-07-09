import { Buffer } from 'buffer';
import useMediaQuery from '../useQueryMedia';
import { useNavigate } from 'react-router-dom';
import { useRef, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Tree, orderEntitiesRootToLeafForWebapp } from '../../utils';
import { userApps, memberApps, adminsApps } from '../../constants';
import { Route, Search } from '../../store/slices/searchSlice';
import { BaseEntity, MenuItem } from '../../components/Core/types';
import { RootState, AppDispatch } from '../../store';
import { navigateConvolutionOrWarn, stickyFsqFromState } from '../../library/convolutionNavSearch';

export interface csObj {
  [key: string]: {
    skip?: number;
    take?: number;
    search: string;
  };
}

interface UseSearchBarProps {
  webapp: string;
  isAdmin: boolean;
  searches: Search[];
  isLoading: boolean;
  searchHistory: Search[];
  setWebApp?: (webapp: string) => void;
  routesRef: { current: Record<string, string>[] };
  insertSearch: (payload: { keyword: string; count: string | number }) => void;
  appendRoutes: (payload: { routes: Record<string, Route>; searches: Search[] }) => void;
  searchManager?: (payload: { searchedRoutes: Search[] }) => void;
  preserveSearches: (encodedData: string) => void;
}

interface UseSearchBarReturn {
  ref: React.RefObject<HTMLInputElement | null>;
  submit: (e: React.FormEvent) => void;
  isMobile: boolean;
  resultsView: (e: React.FormEvent) => void;
  setWebApp: (e: React.MouseEvent, webapp: string) => void;
  webapps: string[];
}

const apps = Object.values(userApps)
  .map((app: string) => app.toLowerCase())
  .filter((_, i) => i > 0);
const userapps = Object.values(memberApps)
  .map((userapp: string) => userapp.toLowerCase())
  .filter((_, i) => i > 0);
const adminapps = Object.values(adminsApps)
  .map((adminapp: string) => adminapp.toLowerCase())
  .filter((_, i) => i > 0);

// @ts-ignore
const landingReducerStateCondenser = ([key, { keywords, index, count }]) => [
  key,
  { keywords, index, count },
];

const useSearchBar = ({
  webapp,
  isAdmin,
  searches,
  setWebApp,
  isLoading,
  routesRef,
  insertSearch,
  appendRoutes,
  searchManager,
  searchHistory,
  preserveSearches,
}: UseSearchBarProps): UseSearchBarReturn => {
  const text = useRef<HTMLInputElement | null>(null);
  const searchesRef = useRef<Search[]>(searches);
  const { screen } = useMediaQuery();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const stickyFsq = useSelector((state: RootState) => stickyFsqFromState(state));
  const isMobile = screen === 0;

  const computedValues = useMemo(() => {
    const webapps = !isAdmin
      ? [...apps, ...userapps]
      : [...apps, ...userapps, ...adminapps];
    const predicate = (entity: BaseEntity) => {
      const { webapps, name: n, menu } = entity;
      return (webapps[webapp] ?? [])
        .map((dsc: string) => {
          const menuItem = menu.find(({ to }: MenuItem) => to === dsc);
          if (!menuItem) return null;
          return {
            ...menuItem,
            entity: dsc,
            parent: n,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    };
    type ExtendedMenuItem = MenuItem & { entity: string; parent: string };
    return {
      approutes: orderEntitiesRootToLeafForWebapp(Tree.entities, webapp)
        .map(predicate)
        .flat()
        .reduce((prev: Record<string, Route>, cur: ExtendedMenuItem) => {
          const { to, from, toIMG, fromIMG, parent, entity } = cur;
          const route = parent + entity;
          return {
            ...prev,
            [route]: {
              index: 0,
              keywords: [],
              to,
              from,
              toIMG,
              fromIMG,
              count: "-",
            },
          };
        }, {}),
      webapps,
    };
  }, [webapp]);
  useEffect(() => {
    appendRoutes({
      searches: searchHistory,
      routes: computedValues.approutes,
    });
  }, [computedValues, searchHistory.length]);


  const resultsView = (e: React.FormEvent) => {
    if (routesRef?.current?.length > 0) {
      const predicate = (p: Record<string, string>, c: Record<string, string>) => ({ ...p, ...c });
      const searchObj = routesRef.current.reduce(predicate, {});
      const pred = (previous: csObj, [k, v]: [string, string]) => ({
        ...previous,
        [k]: { search: v },
      });
      const formated: csObj = Object.entries(searchObj).reduce(pred, {});
      const buffer = Buffer.from(JSON.stringify(formated));
      const encodedData = buffer.toString('base64');
      preserveSearches(encodedData);
      navigateConvolutionOrWarn(dispatch, navigate, '/convolution/' + webapp, encodedData, stickyFsq);
    } else {
      navigateConvolutionOrWarn(dispatch, navigate, '/convolution/' + webapp, undefined, stickyFsq);
    }
    e.preventDefault();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && text.current?.value && text.current.value !== "") {
      insertSearch({ keyword: text.current.value, count: "-" });
      text.current.value = "";
    }
  };

  // Keep ref updated with latest searches value
  useEffect(() => {
    searchesRef.current = searches;
  }, [searches]);

  // Fire only on unmount with latest searches value
  useEffect(() => {
    return () => {
      searchManager?.({ searchedRoutes: [...searchesRef.current] });
    };
  }, []);

  const setActiveWebapp = (e: React.MouseEvent, newWebapp: string) => {
    searchManager?.({ searchedRoutes: searches });
    setTimeout(() => setWebApp?.(newWebapp));
    e.preventDefault();
  };

  return {
    submit,
    isMobile,
    ref: text,
    resultsView,
    setWebApp: setActiveWebapp,
    webapps: computedValues.webapps,
  };
};

export default useSearchBar; 