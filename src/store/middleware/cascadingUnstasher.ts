import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { enqueueCascadingUnstash, updateSteps } from '../../library/actions';
import { bytesFetcher } from '../../library/Thunks';
import { AppDispatch, RootState } from '../types';
import { prependError as insertError } from '../slices/errorSlice';
import { getStashCellRows } from '../slices/stashSlice';
import {
  updateChunkBuffer,
  setChunkFetchInFlight,
} from '../slices/playbackSlice';
import {
  buildQueryParamsForChunkBufferEntry,
  findNextChunkBufferEntryToFetch,
  resolvePlaybackWebapp,
  resumeChunkBufferFetchIfNeeded,
  chains,
  ChainState,
  createChainId,
  dispatchHighlightForFreight,
  dispatchCascadingUnstash,
  expectedFulfilledType,
  startCascadingLeg,
} from './cascadingUnstasherUtils';
import { UpdateTextsPayload } from '../slices/textSlice';

export { dispatchCascadingUnstash };

const cascadingUnstasher: Middleware<{}, RootState> =
  ({ dispatch, getState }) =>
    (next) =>
      (action: unknown) => {
        if (updateChunkBuffer.match(action)) {
          const result = next(action);
          if (!getState().playback.chunkFetchInFlight) {
            resumeChunkBufferFetchIfNeeded(dispatch, getState);
          }
          return result;
        }
        if (bytesFetcher.fulfilled.match(action)) {
          const result = next(action);
          const updates = action.payload.map(
            ({ instruction, modified, ...step }: UpdateTextsPayload) => ({
              ...step,
              edited: modified,
              title: instruction,
              id: parseInt(step.id),
            })
          );
          dispatch(updateSteps(updates));
          dispatch(setChunkFetchInFlight(false));
          const state = getState();
          const hasChunkBuffer = Object.keys(state.playback.chunkBuffer).length > 0;
          const nextEntry = hasChunkBuffer
            ? findNextChunkBufferEntryToFetch(state, action.meta.arg.query)
            : undefined;
          if (nextEntry) {
            dispatch(setChunkFetchInFlight(true));
            const dispatcher = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
            const webapp = resolvePlaybackWebapp(state);
            const query = buildQueryParamsForChunkBufferEntry(nextEntry, state.session, webapp);
            dispatcher(bytesFetcher({ query }));
          }
          return result;
        }
        if (bytesFetcher.rejected.match(action)) {
          dispatch(setChunkFetchInFlight(false));
          const result = next(action);
          resumeChunkBufferFetchIfNeeded(dispatch as AppDispatch, getState);
          return result;
        }
        if (enqueueCascadingUnstash.match(action)) {
          const { freights, restoreFormatter, postUnstashHydration } = action.payload;
          if (freights.length === 0) return next(action);
          const stash = getState().stash;
          const missing = freights.find(
            ({ approute, timestamp }) => !getStashCellRows(stash[approute]?.[timestamp]).length
          );
          if (missing) {
            const errorMsg = `missing stash segment for ${missing.approute} @ ${missing.timestamp}`;
            return next(insertError(errorMsg));
          }
          const chainId = createChainId();
          const chain: ChainState = { freights, index: 0, restoreFormatter, postUnstashHydration };
          chains.set(chainId, chain);
          startCascadingLeg(dispatch as AppDispatch, getState, chainId, chain);
          return next(action);
        }

        let afterCommit: (() => void) | undefined;
        if (typeof action === 'object' && action !== null && 'type' in action) {
          const fulfilledType = (action as UnknownAction).type;
          for (const [chainId, chain] of chains.entries()) {
            const current = chain.freights[chain.index];
            if (!current) continue;
            const expected = expectedFulfilledType(current);
            if (expected !== fulfilledType) continue;
            const completing = current;
            chain.index += 1;
            afterCommit = () => {
              dispatchHighlightForFreight(dispatch as AppDispatch, getState, completing);
              startCascadingLeg(dispatch as AppDispatch, getState, chainId, chain);
            };
            break;
          }
        }
        const result = next(action);
        if (afterCommit) afterCommit();
        return result;
      };

export default cascadingUnstasher;
