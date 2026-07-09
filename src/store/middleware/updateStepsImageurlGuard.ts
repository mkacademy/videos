import { Middleware } from '@reduxjs/toolkit';
import { updateSteps } from '../../library/actions';
import { guardUpdateStepsImageurlPayload } from '../../library/updateStepsImageurlUtils';
import { RootState } from '../types';

const updateStepsImageurlGuard: Middleware<{}, RootState> =
  ({ getState }) =>
    (next) =>
      (action) => {
        if (!updateSteps.match(action)) return next(action);

        const { allowMimeOnlyImageurlOverrideOnUpdateSteps } = getState().session;
        const guardedPayload = guardUpdateStepsImageurlPayload(
          action.payload,
          getState(),
          allowMimeOnlyImageurlOverrideOnUpdateSteps,
        );

        if (guardedPayload === action.payload) return next(action);
        return next({ ...action, payload: guardedPayload });
      };

export default updateStepsImageurlGuard;
