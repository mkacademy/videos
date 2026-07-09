import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { contentDelay } from '../../constants';
import { MutationDataAccumulator } from '../../Hooks/useSaveMutations';
import { mutateEntity } from '../../library/Thunks';
import { RootState } from '../index';
import { cpanelMessage } from '../slices/viewSlice';
import { countDownMsg, getProccedEntity } from './HarvestManagerUtils';

let harvestQueue: MutationDataAccumulator[] = [];
let harvestQueueActive = false;
export let isUprooting: boolean | undefined = undefined;
let harvestMsgPrefix = '';

export const getHarvestMsgPrefix = (): string => harvestMsgPrefix;

export const isHarvestQueueActive = (): boolean => harvestQueueActive;

export const getHarvestQueueLength = (): number => harvestQueue.length;

export const isHarvestSession = (
  message: string | null | undefined,
  requestIsProcessing: boolean,
): boolean =>
  requestIsProcessing &&
  harvestMsgPrefix !== '' &&
  message != null &&
  message.startsWith(harvestMsgPrefix);

export const getHarvestProgressMessage = (remaining: number): string =>
  `${harvestMsgPrefix} ${remaining} remaining`;

export const getHarvestFailureMessage = (panelMessage: string): string => {
  const entity = getProccedEntity(panelMessage).toLowerCase();
  const action = isUprooting ? 'uproot' : 'plant';
  return `Failed to ${action} ${entity}, contact admin`;
};

export const clearHarvestQueue = (): void => {
  harvestQueue = [];
  harvestQueueActive = false;
  isUprooting = undefined;
  harvestMsgPrefix = '';
};

const dispatchQueuedHarvest = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payload: MutationDataAccumulator,
): void => {
  setTimeout(() => dispatch(mutateEntity(payload)), contentDelay + 1000);
};

export const enqueueHarvestPayloads = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
  payloads: MutationDataAccumulator[],
  options: { harvestType: string; entity: string; uprooting: boolean },
): { totalRemaining: number } => {
  if (payloads.length === 0) {
    return { totalRemaining: harvestQueue.length };
  }

  harvestMsgPrefix = countDownMsg(options.harvestType, options.entity);
  isUprooting = options.uprooting;
  harvestQueueActive = true;

  harvestQueue.push(...payloads);
  const next = harvestQueue.pop()!;
  dispatchQueuedHarvest(dispatch, next);

  return { totalRemaining: harvestQueue.length + 1 };
};

export const advanceHarvestQueue = (
  dispatch: ThunkDispatch<RootState, unknown, UnknownAction>,
): boolean => {
  if (!harvestQueueActive || harvestQueue.length === 0) {
    clearHarvestQueue();
    return false;
  }

  const next = isUprooting ? harvestQueue.pop()! : harvestQueue.shift()!;
  dispatchQueuedHarvest(dispatch, next);
  dispatch(cpanelMessage(getHarvestProgressMessage(harvestQueue.length + 1)));
  return true;
};
