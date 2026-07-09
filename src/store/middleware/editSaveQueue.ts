import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { contentDelay } from '../../constants';
import {
  chunkEditsPayload,
  ChunkableEditsPayload,
  EditsFormatter,
  getEditsBatchProgressMessage,
} from '../../library/editSaveChunkUtils';
import { mergeIdSyncPairs, remapQueuedEditSavePayload } from '../../library/editSaveQueueRemap';
import { cpanelMessage } from '../slices/viewSlice';
import {
  mutateCourse,
  mutateOutgoing,
  mutateQuiz,
  mutateTutorial,
} from '../../library/Thunks';

type EditSaveThunk =
  | typeof mutateOutgoing
  | typeof mutateTutorial
  | typeof mutateQuiz
  | typeof mutateCourse;

interface QueuedEditSave {
  payload: ChunkableEditsPayload;
  thunk: EditSaveThunk;
}

type GetState = () => RootState;

const withCurrentQuota = (
  payload: ChunkableEditsPayload,
  getState: GetState,
): ChunkableEditsPayload => {
  const { quota } = getState().session;
  if (quota === undefined) return payload;
  return { ...payload, quota };
};

let editSaveQueue: QueuedEditSave[] = [];
let editSaveChunked = false;
let editSaveFormatter: EditsFormatter | null = null;
let editSaveBatchInFlight = false;
let editSavePreparePending = false;
const editSaveIdMap = new Map<number, number>();

export const isEditSaveChunkedSession = (): boolean => editSaveChunked;

export const isEditSaveQueueActive = (): boolean => editSaveChunked && editSaveQueue.length > 0;

/** True while chunk prep, mutate dispatch delay, HTTP round-trip, or more chunks remain. */
export const isEditSaveBatchesPending = (): boolean =>
  isEditSaveQueueActive() || editSaveBatchInFlight || editSavePreparePending;

export const markEditSavePreparePending = (): void => {
  editSavePreparePending = true;
};

export const clearEditSavePreparePending = (): void => {
  editSavePreparePending = false;
};

export const markEditSaveBatchDispatched = (): void => {
  editSavePreparePending = false;
  editSaveBatchInFlight = true;
};

export const markEditSaveBatchComplete = (): void => {
  editSaveBatchInFlight = false;
};

export const getEditSaveQueueLength = (): number => editSaveQueue.length;

export const clearEditSaveQueue = (): void => {
  editSaveQueue = [];
  editSaveChunked = false;
  editSaveFormatter = null;
  editSaveBatchInFlight = false;
  editSavePreparePending = false;
  editSaveIdMap.clear();
};

const remapQueuedPayloads = (): void => {
  if (editSaveIdMap.size === 0 || !editSaveFormatter || editSaveFormatter === 'outgoing') return;

  editSaveQueue = editSaveQueue.map(({ payload, thunk }) => ({
    thunk,
    payload: remapQueuedEditSavePayload(payload, editSaveIdMap, editSaveFormatter!),
  }));
};

export const recordEditSaveIdMappings = (syncPayload: string[]): void => {
  if (!editSaveChunked || !editSaveFormatter) return;

  mergeIdSyncPairs(editSaveIdMap, syncPayload);
  remapQueuedPayloads();
};

const dispatchQueuedPayload = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: GetState,
  { payload, thunk }: QueuedEditSave,
): void => {
  editSaveBatchInFlight = true;
  setTimeout(() => {
    const fresh = withCurrentQuota(payload, getState);
    switch (thunk) {
      case mutateOutgoing:
        dispatch(mutateOutgoing(fresh as Parameters<typeof mutateOutgoing>[0]));
        break;
      case mutateTutorial:
        dispatch(mutateTutorial(fresh as Parameters<typeof mutateTutorial>[0]));
        break;
      case mutateQuiz:
        dispatch(mutateQuiz(fresh as Parameters<typeof mutateQuiz>[0]));
        break;
      case mutateCourse:
        dispatch(mutateCourse(fresh as Parameters<typeof mutateCourse>[0]));
        break;
    }
  }, contentDelay + 1000);
};

export const startEditSaveQueue = <T extends ChunkableEditsPayload>(
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: GetState,
  thunk: EditSaveThunk,
  payload: T,
  formatter: EditsFormatter,
): { chunked: boolean; totalBatches: number } => {
  clearEditSaveQueue();

  const chunks = chunkEditsPayload(payload, formatter);

  if (chunks.length <= 1) {
    dispatchQueuedPayload(dispatch, getState, { payload: chunks[0] ?? payload, thunk });
    return { chunked: false, totalBatches: 1 };
  }

  editSaveChunked = true;
  editSaveFormatter = formatter;
  editSaveQueue = chunks.slice(1).map((chunk) => ({ payload: chunk, thunk }));
  dispatchQueuedPayload(dispatch, getState, { payload: chunks[0], thunk });
  return { chunked: true, totalBatches: chunks.length };
};

export const advanceEditSaveQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  getState: GetState,
): boolean => {
  if (!editSaveChunked || editSaveQueue.length === 0) {
    editSaveChunked = false;
    editSaveFormatter = null;
    editSaveIdMap.clear();
    return false;
  }

  const next = editSaveQueue.shift()!;
  dispatchQueuedPayload(dispatch, getState, next);
  dispatch(cpanelMessage(getEditsBatchProgressMessage(editSaveQueue.length + 1)));
  return true;
};
