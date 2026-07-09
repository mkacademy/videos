import { Middleware } from '@reduxjs/toolkit';
import { appendTraversal } from '../slices/traversalSlice';
import { Icons, IconKey } from '../../Hooks/useIconsAssembler';
import { viewPayload as escrowPayload } from '../slices/viewSlice';
import { initializedLoading, setSearchHistory } from '../slices/sessionSlice';
import { Tree, capitalizeFirstLetter, jsonToBase64, getAlias, getCurAppName } from '../../utils';
import { initLoading, InitLoadingPayload, initReloading } from '../../library/actions';
import { clearData as clearReducers } from "../slices/rowSlice";
import { fetchedHandles } from '../slices/errorSlice';
import { cpanelMessage } from '../slices/viewSlice';
import { RootState } from '../types';

const calcMenuIndex = (parent: string, entity: string, menuSize: number) => {
  const traversals = Tree.getProperty(parent, "menu") || [];
  const selectedNavItemIndex = traversals
    .map((t: { to: string }) => t.to.toLowerCase())
    .indexOf(entity.toLowerCase());
  if (selectedNavItemIndex > -1) {
    const selectedTraversal = selectedNavItemIndex % menuSize;
    const selectedMenu = Math.floor(selectedNavItemIndex / menuSize);
    return {
      selectedTraversal,
      selectedMenu,
      parent,
    };
  }
  console.log("navigationPressed_noMatch", selectedNavItemIndex);
  return undefined;
};

const webAppMessages = (payload: InitLoadingPayload, store: RootState, next: (action: unknown) => unknown) => {
  if (payload?.cpanelmessage) {
    const { curApp } = store.session;
    const app = getCurAppName(curApp).toUpperCase();
    return next(cpanelMessage(payload.cpanelmessage + " -" + app + "-"));
  }
  if (payload?.searchedRoutes)
    return next(setSearchHistory(payload.searchedRoutes));
  return undefined;
}

const RequestsTracker: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (initLoading.match(action)) {
    const { payload } = action;
    const message = webAppMessages(payload, getState(), next);
    if (message) return message;
    const {
      entity,
      search,
      prefix,
      parentData,
      contentIds = [],
      selectedTraversal,
      handles,
    } = payload;

    const fromIMG = capitalizeFirstLetter(getAlias(parentData?.parent || '')) as IconKey;
    const toIMG = capitalizeFirstLetter(getAlias(entity || '')) as IconKey;

    const traversalPayload = {
      encodedData: jsonToBase64(parentData),
      urlID: (parentData?.parent || '') + entity,
      from: parentData?.parent,
      fromIMG: Icons[fromIMG],
      toIMG: Icons[toIMG],
      contentIds,
      parentData,
      to: entity,
      prefix,
      search,
    };
    setTimeout(() => { dispatch(appendTraversal(traversalPayload)); });

    dispatch(clearReducers());

    if (handles) setTimeout(() => dispatch(fetchedHandles(handles)));

    if (selectedTraversal) return next(initializedLoading({ isFetching: true, selectedTraversal }));

    const { parent, IDs } = parentData || {};
    const { menuSize } = getState().session;
    const freight = calcMenuIndex(parent || '', entity || '', menuSize);

    if (freight === undefined) {
      console.log("error_thus_hidingMenu");
      return next(initializedLoading({ parent, parentData, isFetching: true, selectedTraversal: -1 }));
    }

    dispatch(escrowPayload({
      selectedMenu: freight.selectedMenu,
      parentData,
      entity,
    }));

    const { insertedRows, urlData, operation } = payload;
    return next(initializedLoading({
      isFetching: true,
      rootIDS: IDs,
      insertedRows,
      parentData,
      parent,
      entity,
      urlData,
      operation,
      selectedTraversal: freight.selectedTraversal,
      selectedMenu: freight.selectedMenu,
    }));
  } else if (initReloading.match(action)) {
    const { payload } = action;
    if (payload.isPrivate !== undefined || payload.isIncognito !== undefined) {
      dispatch(clearReducers());
      return next(initializedLoading({
        ...payload,
        isFetching: true,
      }));
    } else if (payload.isPrivate === undefined) {
      return next(initializedLoading(payload));
    }
  }
  return next(action);
};

export default RequestsTracker; 