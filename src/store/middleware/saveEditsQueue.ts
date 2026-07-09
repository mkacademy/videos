import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import {
  saveCourseEdits,
  saveEdits,
  saveEditsPayload,
  SaveEditsKind,
  saveIncomingEdits,
  saveOutgoingEdits,
  saveQuizEdits,
  saveTutorsEdits,
  saveTutorialEdits,
} from '../../library/actions';
import { RootState } from '../index';
import { clearEditSaveQueue } from './editSaveQueue';

export const SAVE_EDITS_KINDS: readonly SaveEditsKind[] = [
  'tutorial',
  'course',
  'quiz',
  'tutors',
  'incoming',
  'outgoing',
];

type SaveEditsPayloadMap = {
  [K in SaveEditsKind]?: Extract<saveEditsPayload, { kind: K }>['payload'];
};

/** Current webapp first, then the remaining five in catalog order. */
export const orderSaveEditsKinds = (currentKind: string): SaveEditsKind[] => {
  const normalized = currentKind.toLowerCase() as SaveEditsKind;
  if (!SAVE_EDITS_KINDS.includes(normalized)) return [...SAVE_EDITS_KINDS];
  return [normalized, ...SAVE_EDITS_KINDS.filter((kind) => kind !== normalized)];
};

/** Enqueue all six webapp saves before the first item runs (avoids 10ms enqueue race). */
export const dispatchSaveEditsForAllWebapps = (
  dispatch: (action: ReturnType<typeof saveEdits>) => void,
  currentKind: string,
  payloads?: SaveEditsPayloadMap,
): void => {
  for (const kind of orderSaveEditsKinds(currentKind)) {
    const payload = payloads?.[kind];
    if (payload !== undefined) {
      dispatch(saveEdits({ kind, payload } as saveEditsPayload));
    } else {
      dispatch(saveEdits({ kind }));
    }
  }
};

let saveEditsQueue: saveEditsPayload[] = [];
let saveEditsSessionActive = false;
let saveEditsContinuing = false;

export const isSaveEditsQueueActive = (): boolean => saveEditsSessionActive;

export const isSaveEditsQueueContinuing = (): boolean => saveEditsContinuing;

/** Stash/insert/delete enrichment skips during an active panel save, except meta-queue handoff. */
export const shouldSkipSaveEditsEnrichment = (requestIsProcessing: boolean): boolean =>
  requestIsProcessing && !isSaveEditsQueueContinuing();

export const getSaveEditsQueueLength = (): number => saveEditsQueue.length;

export const clearSaveEditsQueue = (): void => {
  saveEditsQueue = [];
  saveEditsSessionActive = false;
  saveEditsContinuing = false;
  clearEditSaveQueue();
};

export const saveEditsToAction = (item: saveEditsPayload): UnknownAction => {
  switch (item.kind) {
    case 'tutors':
      return saveTutorsEdits(item.payload ?? {});
    case 'incoming':
      return saveIncomingEdits(item.payload ?? {});
    case 'outgoing':
      return saveOutgoingEdits(item.payload ?? {});
    case 'tutorial':
      return saveTutorialEdits(item.payload ?? {});
    case 'quiz':
      return saveQuizEdits(item.payload ?? {});
    case 'course':
      return saveCourseEdits(item.payload ?? {});
  }
};

export const enqueueSaveEdits = (payload: saveEditsPayload): void => {
  saveEditsQueue = saveEditsQueue.filter((item) => item.kind !== payload.kind);
  saveEditsQueue.push(payload);
};

export const startNextSaveEdits = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
): boolean => {
  if (saveEditsQueue.length === 0) {
    saveEditsSessionActive = false;
    return false;
  }

  saveEditsSessionActive = true;
  const item = saveEditsQueue.shift()!;
  saveEditsContinuing = true;
  dispatch(saveEditsToAction(item));
  saveEditsContinuing = false;
  return true;
};

/** Returns true when the control-panel request should be marked completed. */
export const onSaveEditsItemComplete = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
): boolean => {
  if (!saveEditsSessionActive) return true;

  if (saveEditsQueue.length > 0) {
    startNextSaveEdits(dispatch);
    return false;
  }

  saveEditsSessionActive = false;
  return true;
};

export const onSaveEditsItemFailed = (): void => {
  clearSaveEditsQueue();
};
