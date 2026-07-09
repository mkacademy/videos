import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { contentDelay } from '../../constants';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import {
  chunkTabulatorPayload,
  getTabulatorBatchProgressMessage,
} from '../../library/tabulatorSaveChunkUtils';
import { cpanelMessage } from '../slices/viewSlice';
import { mutateEntity } from '../../library/Thunks';

let tabulatorSaveQueue: MutationDataAccumulator[] = [];
let tabulatorSaveChunked = false;

type GetState = () => RootState;

const withCurrentQuota = (
  payload: MutationDataAccumulator,
  getState: GetState,
): MutationDataAccumulator => {
  const { quota } = getState().session;
  if (quota === undefined) return payload;
  return { ...payload, quota };
};

export const isTabulatorSaveChunkedSession = (): boolean => tabulatorSaveChunked;

export const isTabulatorSaveQueueActive = (): boolean =>
  tabulatorSaveChunked && tabulatorSaveQueue.length > 0;

export const getTabulatorSaveQueueLength = (): number => tabulatorSaveQueue.length;

export const clearTabulatorSaveQueue = (): void => {
  tabulatorSaveQueue = [];
  tabulatorSaveChunked = false;
};

const dispatchQueuedPayload = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: GetState,
  payload: MutationDataAccumulator,
): void => {
  setTimeout(() => {
    dispatch(mutateEntity(withCurrentQuota(payload, getState)));
  }, contentDelay);
};

export const startTabulatorSaveQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: GetState,
  payload: MutationDataAccumulator,
): { chunked: boolean; totalBatches: number } => {
  clearTabulatorSaveQueue();

  const chunks = chunkTabulatorPayload(payload);

  if (chunks.length <= 1) {
    dispatchQueuedPayload(dispatch, getState, chunks[0] ?? payload);
    return { chunked: false, totalBatches: 1 };
  }

  tabulatorSaveChunked = true;
  tabulatorSaveQueue = chunks.slice(1);
  dispatchQueuedPayload(dispatch, getState, chunks[0]);
  return { chunked: true, totalBatches: chunks.length };
};

export const advanceTabulatorSaveQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: GetState,
): boolean => {
  if (!tabulatorSaveChunked || tabulatorSaveQueue.length === 0) {
    tabulatorSaveChunked = false;
    return false;
  }

  const next = tabulatorSaveQueue.shift()!;
  dispatchQueuedPayload(dispatch, getState, next);
  dispatch(cpanelMessage(getTabulatorBatchProgressMessage(tabulatorSaveQueue.length + 1)));
  return true;
};
