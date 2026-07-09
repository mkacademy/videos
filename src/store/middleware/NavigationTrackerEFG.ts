import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  initNavigator, selectTraversal, initLoading
} from '../../library/actions';
import {
  viewMenu,
  viewPayload,
} from '../slices/viewSlice';
import {
  initializedLoading,
  mutatePrefix
} from '../slices/sessionSlice';

import { Buffer } from "buffer";
import { Tree as entities, getEntityFromUrl } from "../../utils";
import { clearData as clearReducers } from "../slices/rowSlice";

export interface InitNavigatorPayload {
  encodedData: string;
  entity: string;
  prefix?: string;
}

interface MenuIndexResult {
  selectedTraversal: number;
  selectedMenu: number;
  parent: string;
}

interface ParentData {
  parent: string;
  curApp: number;
  IDs: string[];
}

interface Freight {
  cargo: MenuIndexResult;
  parentData: ParentData;
  entity: string;
}

export const calcMenuIndex = (parent: string | undefined, entity: string, menuSize: number): MenuIndexResult | undefined => {
  if (!parent) {
    console.log("calcMenuIndex: parent is undefined/null");
    return undefined;
  }

  const traversals = entities.getProperty(parent, "menu");
  if (!traversals || !Array.isArray(traversals)) {
    console.log("calcMenuIndex: traversals is undefined/null or not an array", traversals);
    return undefined;
  }

  const selectedNavItemIndex = traversals
    .map((t: { to: string }) => t.to.toLowerCase())
    .indexOf(entity?.toLowerCase());
  if (selectedNavItemIndex > -1) {
    // console.log("navigationParsed_matched", selectedNavItemIndex);
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

const NavigationTracker: Middleware<{}, RootState> = ({ getState, dispatch }) => {
  return (next) => (action) => {

    if (selectTraversal.match(action)) {
      const state = getState();
      const { payload } = action;
      const { selectedTraversal, menuSize } = payload;
      if (selectedTraversal !== undefined) {
        return next(initLoading(payload));
      } else if (menuSize) {
        const pathname = window.location.pathname;
        const entity = getEntityFromUrl(pathname);
        const { parent } = state.view;
        const freight = calcMenuIndex(parent, entity, menuSize);
        if (freight) {
          setTimeout(() => dispatch(viewMenu(freight.selectedMenu)));
          return next(initializedLoading({ ...freight, menuSize }));
        }
        return next(initializedLoading({ menuSize }));
      }
      return next(initializedLoading(payload));
    }

    if (initNavigator.match(action)) {
      const state = getState();
      dispatch(clearReducers());
      let freight: Freight | undefined = undefined;
      const { menuSize } = state.session;
      try {
        const { payload } = action;
        const { encodedData, entity } = payload;
        const params: [string, BufferEncoding] = [encodedData, "base64"];
        const parentData: ParentData = JSON.parse(Buffer.from(...params).toString());
        const cargo = calcMenuIndex(parentData.parent, entity, menuSize);
        if (cargo) freight = { cargo, parentData, entity }; 
      } catch (error) {
        console.log("navigationParse_failed -- ", error);
      } finally {
        if (freight) {
          const { cargo, parentData, entity } = freight;
          dispatch(viewPayload({
            parentData,
            selectedMenu: cargo.selectedMenu,
            parentIndeces: [],
            keywords: [],
            keyids: [],
            entity,
          }));
          const { payload: newPayload } = action;
          if (newPayload.prefix !== undefined)
            dispatch(mutatePrefix({ prefix: newPayload.prefix }));
          return next(initializedLoading({ ...cargo, parentData, isFetching: true }));
        }
        console.log("error_but_continuing");
        return next(initializedLoading({ isFetching: true }));
      }
    }
    return next(action);
  };
};

export default NavigationTracker; 