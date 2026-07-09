import { isEditsSaveMessage } from '../../library/editSaveChunkUtils';
import { isTabulatorSaveMessage } from '../../library/tabulatorSaveChunkUtils';
import { AppDispatch, store } from '../index';
import { clearOnlyWarnings, prependWarning } from '../slices/errorSlice';
import { viewRequest } from '../slices/viewSlice';
import {
  clearEditSaveQueue,
  getEditSaveQueueLength,
} from './editSaveQueue';
import {
  clearSaveEditsQueue,
  getSaveEditsQueueLength,
  isSaveEditsQueueActive,
} from './saveEditsQueue';
import {
  clearTabulatorSaveQueue,
  getTabulatorSaveQueueLength,
} from './tabulatorSaveQueue';
import { getHarvestMsgPrefix, clearHarvestQueue, getHarvestQueueLength } from './harvestSaveQueue';
import { getPublishMsgPrefix, clearPublishQueue, getPublishQueueLength } from './publishSaveQueue';
import { getOwnershipMsgPrefix, clearOwnershipQueue, getOwnershipQueueLength } from './ownershipSaveQueue';
import { visibiltyMsg } from './visibilityManagerUtils';
import {
  clearVisibilityQueue,
  getVisibilityQueueLength,
} from './visibilitySaveQueue';
import {
  clearHydrationQueue,
  getHydrationQueueLength,
  isHydrationQueueActive,
} from './hydrationQueue';

export interface SequentialThunkQueue {
  readonly id: string;
  readonly label: string;
  isSessionActive(message: string | null | undefined, requestIsProcessing: boolean): boolean;
  getPendingCount(): number;
  clear(): void;
}

/**
 * Sequential thunk pipelines (batched dispatches advanced after each fulfilled round-trip).
 * Add new queue modules here so Ctrl+Shift+M can stop them without touching shortcut code.
 */
export const SEQUENTIAL_THUNK_QUEUES: readonly SequentialThunkQueue[] = [
  {
    id: 'saveEdits',
    label: 'save edits',
    isSessionActive: (message, requestIsProcessing) =>
      isSaveEditsQueueActive() && requestIsProcessing && isEditsSaveMessage(message),
    getPendingCount: getSaveEditsQueueLength,
    clear: clearSaveEditsQueue,
  },
  {
    id: 'editSave',
    label: 'edit save',
    isSessionActive: (message, requestIsProcessing) =>
      requestIsProcessing && isEditsSaveMessage(message),
    getPendingCount: getEditSaveQueueLength,
    clear: clearEditSaveQueue,
  },
  {
    id: 'tabulatorSave',
    label: 'tabulator save',
    isSessionActive: (message, requestIsProcessing) =>
      requestIsProcessing && isTabulatorSaveMessage(message),
    getPendingCount: getTabulatorSaveQueueLength,
    clear: clearTabulatorSaveQueue,
  },
  {
    id: 'visibility',
    label: 'visibility update',
    isSessionActive: (message, requestIsProcessing) =>
      requestIsProcessing && message != null && message.startsWith(visibiltyMsg),
    getPendingCount: getVisibilityQueueLength,
    clear: clearVisibilityQueue,
  },
  {
    id: 'harvest',
    label: 'harvest',
    isSessionActive: (message, requestIsProcessing) =>
      requestIsProcessing &&
      getHarvestMsgPrefix() !== '' &&
      message != null &&
      message.startsWith(getHarvestMsgPrefix()),
    getPendingCount: getHarvestQueueLength,
    clear: clearHarvestQueue,
  },
  {
    id: 'publish',
    label: 'publish',
    isSessionActive: (message, requestIsProcessing) =>
      requestIsProcessing &&
      getPublishMsgPrefix() !== '' &&
      message != null &&
      message.startsWith(getPublishMsgPrefix()),
    getPendingCount: getPublishQueueLength,
    clear: clearPublishQueue,
  },
  {
    id: 'ownership',
    label: 'ownership assert',
    isSessionActive: (message, requestIsProcessing) =>
      requestIsProcessing &&
      getOwnershipMsgPrefix() !== '' &&
      message != null &&
      message.startsWith(getOwnershipMsgPrefix()),
    getPendingCount: getOwnershipQueueLength,
    clear: clearOwnershipQueue,
  },
  {
    id: 'hydration',
    label: 'hydration',
    isSessionActive: () => isHydrationQueueActive(),
    getPendingCount: getHydrationQueueLength,
    clear: clearHydrationQueue,
  },
];

export const getActiveSequentialThunkQueues = (
  message: string | null | undefined,
  requestIsProcessing: boolean,
): SequentialThunkQueue[] =>
  SEQUENTIAL_THUNK_QUEUES.filter((queue) => queue.isSessionActive(message, requestIsProcessing));

/** True when {@link stopQueuedSequentialThunks} would stop an in-progress session. */
export const isSequentialThunkQueueSessionActive = (
  message: string | null | undefined,
  requestIsProcessing: boolean,
): boolean => {
  const activeQueues = getActiveSequentialThunkQueues(message, requestIsProcessing);
  if (activeQueues.length === 0) return false;
  const hydrationActive = activeQueues.some((queue) => queue.id === 'hydration');
  return requestIsProcessing || hydrationActive;
};

export const getSequentialThunkQueuePendingCount = (): number =>
  SEQUENTIAL_THUNK_QUEUES.reduce((total, queue) => total + queue.getPendingCount(), 0);

type CancelledPendingSummary = {
  hydrationQueries: number;
  otherPending: number;
};

const summarizeCancelledPending = (
  activeQueues: SequentialThunkQueue[],
): CancelledPendingSummary => {
  const hydrationQueries = activeQueues.some((queue) => queue.id === 'hydration')
    ? store.getState().session.hydrationQueries
    : 0;
  const otherPending = activeQueues
    .filter((queue) => queue.id !== 'hydration')
    .reduce((total, queue) => total + queue.getPendingCount(), 0);
  return { hydrationQueries, otherPending };
};

const formatCancelledPendingMessage = ({
  hydrationQueries,
  otherPending,
}: CancelledPendingSummary): string => {
  const parts: string[] = [];
  if (hydrationQueries > 0) {
    parts.push(`${hydrationQueries} pending quer${hydrationQueries === 1 ? 'y' : 'ies'}`);
  }
  if (otherPending > 0) {
    parts.push(`${otherPending} pending batch${otherPending === 1 ? '' : 'es'}`);
  }
  if (parts.length === 0) return '';
  return ` Cancelled ${parts.join(' and ')}.`;
};

/** Clears every registered queue. Call {@link summarizeCancelledPending} before this to capture counts. */
export const clearAllSequentialThunkQueues = (): void => {
  for (const queue of SEQUENTIAL_THUNK_QUEUES) {
    queue.clear();
  }
};

/**
 * Stops the active sequential-thunk session: clears all registered queue backlogs and completes
 * the control-panel request. Returns false when no registered queue session is in progress.
 */
export const stopQueuedSequentialThunks = (dispatch: AppDispatch): boolean => {
  const { requestIsProcessing, message } = store.getState().view;
  if (!isSequentialThunkQueueSessionActive(message, requestIsProcessing)) return false;

  const activeQueues = getActiveSequentialThunkQueues(message, requestIsProcessing);
  const hydrationActive = activeQueues.some((queue) => queue.id === 'hydration');

  const cancelledPending = summarizeCancelledPending(activeQueues);
  clearAllSequentialThunkQueues();
  if (requestIsProcessing || hydrationActive) {
    dispatch(viewRequest({ completed: true }));
  }

  const queueLabels = activeQueues.map((queue) => queue.label).join(', ');
  const cancelledMessage = formatCancelledPendingMessage(cancelledPending);
  const warning = `Stopped queued ${queueLabels}.${cancelledMessage} The current server request may still complete (check logs).`;

  dispatch(clearOnlyWarnings());
  dispatch(prependWarning(warning));
  return true;
};
