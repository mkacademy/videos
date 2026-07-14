import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import {  updateSteps } from '../../library/actions';
import { bytesFetcher } from '../../library/Thunks';
import { AppDispatch, RootState } from '../types';
import {
  updateChunkBuffer,
  setChunkFetchInFlight,
} from '../slices/playbackSlice';
import {
  buildQueryParamsForChunkBufferEntry,
  findNextChunkBufferEntryToFetch,
  resolvePlaybackWebapp,
  resumeChunkBufferFetchIfNeeded,
} from './cascadingUnstasherUtils';
import { UpdateTextsPayload } from '../slices/textSlice';

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

        const result = next(action);
        return result;
      };

export default cascadingUnstasher;
