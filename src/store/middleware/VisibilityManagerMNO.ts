import { Middleware, MiddlewareAPI, Dispatch, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { contentVisibility, discardPayloads, mutateRows as mutateRowz, linkRows as linkRowz } from "../../library/actions";
import { COMPLETED_MESSAGE, viewRequest, cpanelMessage } from "../slices/viewSlice";
import { isValidPermission } from "../../utils";
import { commentsCreator, commentsUpdater, mutateEntity, mutateVisibility } from "../../library/Thunks";
import { MutateEntityResponse, MutateEntitiesResponse } from "../../library/types";
import { mutateRows, quotaUsed, linkRows } from '../slices/sessionSlice';
import { prependError, prependWarning } from '../slices/errorSlice';
import { isHarvestQueueActive } from './harvestSaveQueue';
import { isOwnershipQueueActive } from './ownershipSaveQueue';
import { isPublishQueueActive } from './publishSaveQueue';
import {
  advanceTabulatorSaveQueue,
  clearTabulatorSaveQueue,
  isTabulatorSaveQueueActive,
} from './tabulatorSaveQueue';
import { isTabulatorSaveMessage } from '../../library/tabulatorSaveChunkUtils';
import {
  buildVisibilityPayloadFromFetchedData,
  buildVisibilityPayloadsFromSelectedStash,
  getVisibilityProgressMessage,
  visibiltyMsg,
} from './visibilityManagerUtils';
import {
  advanceVisibilityQueue,
  clearVisibilityQueue,
  isVisibilityQueueActive,
  startVisibilityQueue,
} from './visibilitySaveQueue';
import { findSelectedStashFreights } from '../../library/ShortcutsUtils';
const INVALID_VISIBILITY_WARNING =
  'Invalid visibility or nothing selected.';
const EMPTY_STASH_VISIBILITY_WARNING =
  'Selected stash group has no rows to update visibility for.';

const isTerminate = () =>
  !isHarvestQueueActive() &&
  !isPublishQueueActive() &&
  !isOwnershipQueueActive() &&
  !isTabulatorSaveQueueActive();

const isVisibilitySession = (message: string | undefined, requestIsProcessing: boolean): boolean =>
  requestIsProcessing && message != null && message.startsWith(visibiltyMsg);

const VisibilityManager: Middleware<{}, RootState> = (store: MiddlewareAPI<Dispatch, RootState>) => (next) => (action) => {
  const { dispatch, getState } = store;
  const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;

  if (contentVisibility.match(action)) {
    const state = getState();
    const { connects } = state.settings;
    const isValid = isValidPermission(connects);
    const { requestIsProcessing } = state.view;
    if (requestIsProcessing) return next(action);
    const { curToken, mutateRole, curMailer, quota } = state.session;

    if (!isValid || !curToken || !mutateRole) {
      dispatch(prependWarning(INVALID_VISIBILITY_WARNING));
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }

    const session = {
      quota: quota || 0,
      curToken,
      curMailer,
      mutateRole,
      connects,
    };

    const selectedStashFreights = findSelectedStashFreights(state);
    if (selectedStashFreights) {
      const payloads = buildVisibilityPayloadsFromSelectedStash(state, session);
      if (payloads.length === 0) {
        dispatch(prependWarning(EMPTY_STASH_VISIBILITY_WARNING));
        return next(cpanelMessage(COMPLETED_MESSAGE));
      }

      const { totalRoutes } = startVisibilityQueue(thunkDispatch, payloads);
      return next(viewRequest({
        message: getVisibilityProgressMessage(totalRoutes),
        completed: false,
      }));
    }

    const payload = buildVisibilityPayloadFromFetchedData(state, session);
    if (payload) {
      startVisibilityQueue(thunkDispatch, [payload]);
      return next(viewRequest({ message: visibiltyMsg, completed: false }));
    }

    dispatch(prependWarning(INVALID_VISIBILITY_WARNING));
    return next(cpanelMessage(COMPLETED_MESSAGE));
  }

  if (mutateVisibility.fulfilled.match(action)) {
    console.log("mutateVisibility.fulfilled.type", action.meta.arg);
    const { requestIsProcessing, message } = getState().view;
    if (isVisibilitySession(message, requestIsProcessing)) {
      if (advanceVisibilityQueue(thunkDispatch)) return next(action);
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (mutateVisibility.rejected.match(action)) {
    const state = getState();
    console.log("mutateVisibility.rejected.type", action);
    const { message, requestIsProcessing } = state.view;
    if (isVisibilitySession(message, requestIsProcessing)) {
      if (isVisibilityQueueActive()) clearVisibilityQueue();
      setTimeout(() => dispatch(prependError('Failed to update visibility, contact admin')));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (discardPayloads.match(action)) {
    if (isVisibilityQueueActive()) clearVisibilityQueue();
    return next(viewRequest({ completed: true }));
  }

  if (mutateEntity.fulfilled.match(action)) {
    const { payload } = action;
    const responseCount = payload.length;
    payload.forEach((response: MutateEntitiesResponse, index: number) => {
      setTimeout(() => {
        switch (response.type) {
          case 'quota_used': {
            const parsed = parseInt(response.payload as string, 10);
            dispatch(quotaUsed(parsed));
            break;
          }
          case 'mutate_rows':
            dispatch(mutateRows(response.payload as MutateEntityResponse));
            break;
          case 'link_rows':
            dispatch(linkRows(response.payload as MutateEntityResponse));
            break;
          case 'error':
            const reply = response.payload as MutateEntityResponse | string;
            const messageText = typeof reply === 'string' ? reply : reply.reply;
            dispatch(prependError(messageText ?? null));
            break;
          case 'terminate_recursion':
            if (isTerminate()) dispatch(viewRequest({ completed: true }));
            if (!isTabulatorSaveQueueActive()) {
              dispatch(mutateRows('completed'));
              dispatch(linkRows('completed'));
            }
            break;
          default:
            console.log("invalid response:", response);
            break;
        }
      }, index * 100);
    });

    const { message, requestIsProcessing } = getState().view;
    if (requestIsProcessing && isTabulatorSaveMessage(message)) {
      const advanceDelay = responseCount > 0 ? responseCount * 100 : 100;
      setTimeout(() => advanceTabulatorSaveQueue(thunkDispatch, getState), advanceDelay);
    }

    return next(action);
  }

  if (commentsCreator.fulfilled.match(action)
    || commentsUpdater.fulfilled.match(action)) {
    const { payload } = action;
    console.log("commentsMutation.fulfilled.type", action.meta.arg);
    payload.forEach((response: MutateEntitiesResponse, index: number) => {
      setTimeout(() => {
        switch (response.type) {
          case 'quota_used': {
            const parsed = parseInt(response.payload as string, 10);
            dispatch(quotaUsed(parsed));
            break;
          }
          case 'mutate_rows':
            dispatch(mutateRowz(response.payload as MutateEntityResponse));
            break;
          case 'link_rows':
            dispatch(linkRowz(response.payload as MutateEntityResponse));
            break;
          case 'error':
            const reply = response.payload as MutateEntityResponse | string;
            const messageText = typeof reply === 'string' ? reply : reply.reply;
            dispatch(prependError(messageText ?? null));
            break;
          case 'terminate_recursion':
            console.log("terminate_recursion commentsCreator.fulfilled");
            break;
          default:
            console.log("invalid response:", response);
            break;
        }
      }, index * 100);
    });
    return next(action);
  }

  if (mutateEntity.rejected.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (requestIsProcessing && isTabulatorSaveMessage(message)) {
      clearTabulatorSaveQueue();
      setTimeout(() => dispatch(prependError('Failed to save tabulator, contact admin')));
      setTimeout(() => dispatch(viewRequest({ completed: true })));
    }
    dispatch(mutateRows('completed'));
    dispatch(linkRows('completed'));
    return next(action);
  }

  return next(action);
};

export default VisibilityManager;
