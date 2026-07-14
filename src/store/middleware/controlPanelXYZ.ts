import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  initializedLoading,
} from "../slices/sessionSlice";
import { hydrateData, hydratedThenFetch } from '../../library/actions';
import { appendRowz } from "../slices/rowSlice";
import { EntityTypeMap } from '../slices/rowSlice';
import { viewPayload, viewRequest } from '../slices/viewSlice';
import { Tree as entities, ADD_ROWS, getInteractionIDs, getCurAppName, getPlural } from "../../utils";
import { abortIfHydrationDisabled, handleHydrationLogic } from '../../library/hydrationUtils';
import { BaseFormattedData, DataRow } from '../../components/Core/types';
import { setTutorials } from '../slices/tutorialSlice';
import { setCourses } from '../slices/courseSlice';
import { setQuizzes } from '../slices/quizSlice';
import { flushCourseTrees, flushQuizTrees, flushTutorialTrees } from '../../library/controlPanelUtilz';
import { deHydratedRowsDataFetcher } from '../../library/Thunks';
import {
  clearActiveWebapp,
  getActiveWebapp,
  getHydrationLegProgress,
  isBypassShouldHydrateSession,
  isHydrationCancelled,
  onHydrationQueryComplete,
} from './hydrationQueue';
import { flushHydrationStoreBuffer } from './hydrationPayloadBuffer';
import { getHydrationCpanelMessage } from './hydrationLegUtils';
import { cpanelMessage } from '../slices/viewSlice';

import { isDehydrated } from '../../library/controlPanelUtils';
import { prependError } from '../slices/errorSlice';


let queue: QueueItem[] = [];
export interface QueueItem { item: NodeJS.Timeout | DataRow[], curApp: number }
export const setQueue = (item: QueueItem) => {
  queue.push(item);
};
const replaceQueueItem = (item: DataRow[], index: number) => {
  const { curApp } = queue[index];
  queue[index] = { item, curApp };
};
const isTimeout = (curApp: number | undefined): (queueItem: QueueItem) => boolean => {
  return (queueItem: QueueItem) => curApp !== undefined && queueItem.curApp === curApp && typeof queueItem.item === 'number';
};
const isNotTimeout = (queueItem: QueueItem): boolean => {
  return typeof queueItem.item !== 'number';
};
const getCpanelMessage = (webapp: string, remaining: number): string =>
  getHydrationCpanelMessage(webapp, remaining, getHydrationLegProgress());

const controlPanel: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (initializedLoading.match(action)) {
    const { payload } = action;

    const {
      parent,
      entity,
      urlData,
      rootIDS,
      operation,
      insertedRows,
      ...initializeData
    } = payload;

    if (urlData && insertedRows && insertedRows.length > 0) {
      const { parentID, childID } = getInteractionIDs(parent!, entity!);
      const fetchedData = insertedRows.map((row: DataRow, i: number) => ({
        ...row,
        metadata: {
          ordinal: i,
          [childID as string]: row.id,
          [parentID as string]: operation === ADD_ROWS ? [] : rootIDS,
          owner: false,
        },
      }));
      const links = entities.getProperty(entity!, "connections") as string[];
      dispatch(appendRowz({
        operation,
        orig: parent,
        keywords: [],
        GUID: urlData,
        dest: entity ?? '',
        content: entities.getProperty(entity!, "nonFormattedData")?.(fetchedData) as DataRow[],
        data: entities.getProperty(entity!, "formattedData")?.(fetchedData, links) as BaseFormattedData<EntityTypeMap[keyof EntityTypeMap]>,
      }));
    }

    if (parent && entity) {
      return next(initializedLoading({ ...initializeData, entity, parent }));
    } else if (entity) {
      return next(initializedLoading({ ...initializeData, entity }));
    } else if (parent) {
      return next(initializedLoading({ ...initializeData, parent }));
    } else {
      return next(initializedLoading(initializeData));
    }
  }
  if (setTutorials.match(action)) {
    const { Trees, content, banners, TreesId } = action.payload;
    const { content: flushedContent, banners: flushedBanners } = flushTutorialTrees(Trees);
    const newBanners = [...(flushedBanners || []), ...(banners || [])];
    const newContent = [...(flushedContent || []), ...(content || [])];
    return next(setTutorials({ banners: newBanners, content: newContent, Trees, TreesId }));
  }
  if (setCourses.match(action)) {
    const { Trees, content, banners, TreesId } = action.payload;
    const { content: flushedContent, banners: flushedBanners } = flushCourseTrees(Trees);
    const newBanners = [...(flushedBanners || []), ...(banners || [])];
    const newContent = [...(flushedContent || []), ...(content || [])];
    return next(setCourses({ banners: newBanners, content: newContent, Trees, TreesId }));
  }
  if (setQuizzes.match(action)) {
    const { Trees, content, banners, quizzes, TreesId } = action.payload;
    const { quizzes: flushedQuizzes, content: flushedContent, banners: flushedBanners } = flushQuizTrees(Trees);
    const newQuizzes = [...(flushedQuizzes || []), ...(quizzes || [])];
    const newBanners = [...(flushedBanners || []), ...(banners || [])];
    const newContent = [...(flushedContent || []), ...(content || [])];
    return next(setQuizzes({ quizzes: newQuizzes, content: newContent, banners: newBanners, Trees, TreesId }));
  }
  if (viewPayload.match(action)) {
    const { payload: { curApp, ...rest } } = action;
    const { fetchedData } = rest;
    const timeoutIndex = queue.findIndex(isTimeout(curApp));
    if (fetchedData && timeoutIndex !== -1) {
      next(viewPayload({}));
      replaceQueueItem(fetchedData, timeoutIndex);
      const predicate = (queueItem: QueueItem) => isNotTimeout(queueItem);
      const queueItems: QueueItem[] = queue.filter(predicate);
      if (queueItems.length === queue.length) {
        queue.length = 0;
      }
    }
    else next(viewPayload(rest));
  }


  if (hydrateData.match(action) || hydratedThenFetch.match(action)) {
    if (!isBypassShouldHydrateSession() && abortIfHydrationDisabled(getState)) {
      return;
    }
    if (hydrateData.match(action) && getActiveWebapp()) {
      return next(action);
    }
    const webapp = getCurAppName(getState().session.curApp);
    return handleHydrationLogic(
      webapp,
      getState,
      dispatch,
      [isDehydrated],
      next as (action: UnknownAction) => UnknownAction,
      action,
    );
  }
  if (deHydratedRowsDataFetcher.fulfilled.match(action) || deHydratedRowsDataFetcher.rejected.match(action)) {
    onHydrationQueryComplete(dispatch);
    if (getActiveWebapp() && !isHydrationCancelled()) {
      const { session: { hydrationQueries }, view: { requestIsProcessing } } = getState();
      const webapp = getPlural(getActiveWebapp() ?? 'not_set');
      const remaining = hydrationQueries - 1;
      if (remaining > 0 && !requestIsProcessing) {
        dispatch(cpanelMessage(getCpanelMessage(webapp, remaining)));
      } else if (!requestIsProcessing) {
        flushHydrationStoreBuffer();
        clearActiveWebapp();
        dispatch(viewRequest({ completed: true }));
      }
    }
    if (deHydratedRowsDataFetcher.rejected.match(action) && !isHydrationCancelled()) {
      dispatch(prependError(action.error.message ?? "Failed to hydrate data"));
    }
  }

  return next(action);
};
export default controlPanel;

