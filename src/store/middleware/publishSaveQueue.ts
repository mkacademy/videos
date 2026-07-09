import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { contentDelay } from '../../constants';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import { mutateEntity } from '../../library/Thunks';
import { RootState } from '../index';
import { cpanelMessage } from '../slices/viewSlice';
import { countDownMsg, getProccedEntity } from './HarvestManagerUtils';

let publishQueue: MutationDataAccumulator[] = [];
let publishQueueActive = false;
export let isPublishing: boolean | undefined = undefined;
let publishMsgPrefix = '';

export const getPublishMsgPrefix = (): string => publishMsgPrefix;

export const isPublishQueueActive = (): boolean => publishQueueActive;

export const getPublishQueueLength = (): number => publishQueue.length;

export const isPublishSession = (
  message: string | null | undefined,
  requestIsProcessing: boolean,
): boolean =>
  requestIsProcessing &&
  publishMsgPrefix !== '' &&
  message != null &&
  message.startsWith(publishMsgPrefix);

export const getPublishProgressMessage = (remaining: number): string =>
  `${publishMsgPrefix} ${remaining} remaining`;

export const getPublishFailureMessage = (panelMessage: string): string => {
  const entity = getProccedEntity(panelMessage).toLowerCase();
  return `Failed to publish ${entity}, contact admin`;
};

export const clearPublishQueue = (): void => {
  publishQueue = [];
  publishQueueActive = false;
  isPublishing = undefined;
  publishMsgPrefix = '';
};

const dispatchQueuedPublish = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payload: MutationDataAccumulator,
): void => {
  setTimeout(() => dispatch(mutateEntity(payload)), contentDelay + 1000);
};

export const enqueuePublishPayloads = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payloads: MutationDataAccumulator[],
  entity: string,
): { totalRemaining: number } => {
  if (payloads.length === 0) {
    return { totalRemaining: publishQueue.length };
  }

  publishMsgPrefix = countDownMsg('publishing', entity);
  isPublishing = true;
  publishQueueActive = true;

  publishQueue.push(...payloads);
  const next = publishQueue.pop()!;
  dispatchQueuedPublish(dispatch, next);

  return { totalRemaining: publishQueue.length + 1 };
};

export const advancePublishQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
): boolean => {
  if (!publishQueueActive || publishQueue.length === 0) {
    clearPublishQueue();
    return false;
  }

  const next = publishQueue.pop()!;
  dispatchQueuedPublish(dispatch, next);
  dispatch(cpanelMessage(getPublishProgressMessage(publishQueue.length + 1)));
  return true;
};
