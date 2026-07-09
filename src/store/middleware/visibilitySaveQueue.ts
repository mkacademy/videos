import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { contentDelay } from '../../constants';
import { MutateVisibilityPayload } from '../../library/types';
import { mutateVisibility } from '../../library/Thunks';
import { RootState } from '../index';
import { cpanelMessage } from '../slices/viewSlice';
import { getVisibilityProgressMessage } from './visibilityManagerUtils';

let visibilityQueue: MutateVisibilityPayload[] = [];
let visibilityQueueActive = false;

export const isVisibilityQueueActive = (): boolean => visibilityQueueActive;

export const getVisibilityQueueLength = (): number => visibilityQueue.length;

export const clearVisibilityQueue = (): void => {
  visibilityQueue = [];
  visibilityQueueActive = false;
};

const dispatchQueuedVisibility = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payload: MutateVisibilityPayload
): void => {
  setTimeout(() => dispatch(mutateVisibility(payload)), contentDelay + 1000);
};

export const startVisibilityQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payloads: MutateVisibilityPayload[]
): { totalRoutes: number } => {
  clearVisibilityQueue();
  if (payloads.length === 0) return { totalRoutes: 0 };

  visibilityQueueActive = true;
  visibilityQueue = payloads.slice(1);
  dispatchQueuedVisibility(dispatch, payloads[0]!);
  return { totalRoutes: payloads.length };
};

export const advanceVisibilityQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>
): boolean => {
  if (!visibilityQueueActive || visibilityQueue.length === 0) {
    clearVisibilityQueue();
    return false;
  }

  const next = visibilityQueue.shift()!;
  dispatchQueuedVisibility(dispatch, next);
  dispatch(cpanelMessage(getVisibilityProgressMessage(visibilityQueue.length + 1)));
  return true;
};
