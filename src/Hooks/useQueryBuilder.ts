import {
  appendRowz,
  prependRowz,
} from "../store/slices/rowSlice";
import {
  appendContentz,
  prependContentz,
} from "../store/slices/contentSlice";
import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { contentDelay } from "../constants";
import { getEntityFromUrl, ADD_ROWS, ABORT } from "../utils";
import { getValidParams } from "../components/Pagination/TableViewPager";

export interface UseQueryBuilderProps {
  isTabled: boolean;
  isAppend: boolean;
  defaultTake: number;
  contentProvider: (params: QueryParams) => void;
  interactionsClearer: (isAbort: boolean) => void;
}

interface QueryParams {
  entity: string;
  isMutating: boolean;
  type?: string;
}

export default function useQueryBuilder(
  props: UseQueryBuilderProps, 
  operation: string
): string {
  const { target } = useParams<{ target?: string }>();
  const { search, pathname, state } = useLocation();
  const entity = target ? target : getEntityFromUrl(pathname);
  const {
    isTabled,
    isAppend,
    defaultTake,
    contentProvider,
    interactionsClearer,
  } = props;

  useEffect(() => {
    const cleanup = (timeoutId?: NodeJS.Timeout) => () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (window.history.state) {
        const { state: action } = window.history.state;
        const isAbort = action && action === ABORT;
        setTimeout(() => interactionsClearer(isAbort), 0);
      }
    };

    window.history.replaceState({}, document.title);
    if (state && state === ABORT) return cleanup();

    const limits = getValidParams(search, defaultTake);
    const isMutating = operation === ADD_ROWS;
    const params: QueryParams = { entity, isMutating, ...limits };

    if (isAppend && isTabled) params["type"] = appendRowz.type;
    else if (!isAppend && isTabled) params["type"] = prependRowz.type;
    else if (!isAppend && !isTabled) params["type"] = prependContentz.type;
    else if (isAppend && !isTabled) params["type"] = appendContentz.type;

    const timeoutId = setTimeout(() => {
      console.log("QueryHook_fired");
      contentProvider(params);
    }, contentDelay);

    return cleanup(timeoutId);
  }, [
    state,
    entity,
    search,
    isTabled,
    isAppend,
    operation,
    defaultTake,
  ]);

  return entity;
}
