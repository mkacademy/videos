import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { contentDelay } from '../../constants';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import { mutateEntity } from '../../library/Thunks';
import { RootState } from '../index';
import { cpanelMessage } from '../slices/viewSlice';
import { countDownMsg, getProccedEntity } from './HarvestManagerUtils';
import { verifyOwnership } from './ownershipManagerUtils';

let ownershipQueue: MutationDataAccumulator[] = [];
let ownershipQueueActive = false;
export let isAsserting: boolean | undefined = undefined;
let ownershipMsgPrefix = '';

export const getOwnershipMsgPrefix = (): string => ownershipMsgPrefix;

export const isOwnershipQueueActive = (): boolean => ownershipQueueActive;

export const getOwnershipQueueLength = (): number => ownershipQueue.length;

export const isOwnershipSession = (
  message: string | null | undefined,
  requestIsProcessing: boolean,
): boolean =>
  requestIsProcessing &&
  ownershipMsgPrefix !== '' &&
  message != null &&
  message.startsWith(ownershipMsgPrefix);

export const getOwnershipProgressMessage = (remaining: number): string =>
  `${ownershipMsgPrefix} ${remaining} remaining`;

export const getOwnershipFailureMessage = (panelMessage: string): string => {
  const entity = getProccedEntity(panelMessage).toLowerCase();
  return `Failed to assert ${entity}, contact admin`;
};

export const ensureOwnershipVerified = (state: RootState): void => {
  verifyOwnership(state);
};

export const clearOwnershipQueue = (): void => {
  ownershipQueue = [];
  ownershipQueueActive = false;
  isAsserting = undefined;
  ownershipMsgPrefix = '';
};

const dispatchQueuedOwnership = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payload: MutationDataAccumulator,
): void => {
  setTimeout(() => dispatch(mutateEntity(payload)), contentDelay + 1000);
};

export const enqueueOwnershipPayloads = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payloads: MutationDataAccumulator[],
  options: { entity: string; asserting: boolean },
): { totalRemaining: number } => {
  if (payloads.length === 0) {
    return { totalRemaining: ownershipQueue.length };
  }

  ownershipMsgPrefix = countDownMsg('asserting', options.entity);
  isAsserting = options.asserting;
  ownershipQueueActive = true;

  ownershipQueue.push(...payloads);
  const next = ownershipQueue.pop()!;
  dispatchQueuedOwnership(dispatch, next);

  return { totalRemaining: ownershipQueue.length + 1 };
};

export const advanceOwnershipQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
): boolean => {
  if (!ownershipQueueActive || ownershipQueue.length === 0) {
    clearOwnershipQueue();
    return false;
  }

  const next = isAsserting ? ownershipQueue.pop()! : ownershipQueue.shift()!;
  dispatchQueuedOwnership(dispatch, next);
  dispatch(cpanelMessage(getOwnershipProgressMessage(ownershipQueue.length + 1)));
  return true;
};
