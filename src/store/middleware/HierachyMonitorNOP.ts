import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { hierachyChanged } from '../../library/actions';
import { motionsCompleted } from '../slices/commsSlice';
import { executeMotions } from '../../library/Thunks';
import { viewRequest } from '../slices/viewSlice';
import { contentDelay } from '../../constants';
import { RootState } from '../types';
import { prependError } from '../slices/errorSlice';
import { dispatchSaveEditsForAllWebapps } from './saveEditsQueue';

const motionsMessage = "saving tutors motions... please wait";

const HierachyMonitor: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (hierachyChanged.match(action)) {
    const state = getState();
    const { tutors } = state.comms;
    const { requestIsProcessing } = state.view;
    const { quota, curMailer, roles, curToken, mutateRole } = state.session;

    if (requestIsProcessing) return next(action);

    const modified = tutors?.filter(({ motion }) => motion);
    if (modified && modified.length > 0 && roles && roles.length > 2) {
      const updates = {
        mutateRole: mutateRole!,
        curMailer: curMailer!,
        curToken: curToken!,
        quota: quota!,
        modified,
      };
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(executeMotions(updates)), contentDelay + 1000);
      return next(viewRequest({ message: motionsMessage, completed: false }));
    } else {
      dispatchSaveEditsForAllWebapps(dispatch, 'tutors');
      return;
    }
  }

  if (executeMotions.fulfilled.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;
    const { payload } = action;
    console.log("executeMotions.fulfilled.type", payload);
    if (requestIsProcessing && message === motionsMessage) {
      dispatch(viewRequest({ completed: true }));
      setTimeout(() => dispatch(motionsCompleted()));
      dispatchSaveEditsForAllWebapps(dispatch, 'tutors');
      return next(action);
    }
    return next(action);
  }

  if (executeMotions.rejected.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;
    console.log("executeMotions.rejected.type", action);
    if (requestIsProcessing && message === motionsMessage) {
      setTimeout(() => dispatch(prependError('Failed to save motions, contact admin')));
      dispatch(viewRequest({ completed: true }));
      dispatchSaveEditsForAllWebapps(dispatch, 'tutors');
      return next(action);
    }
    return next(action);
  }

  return next(action);
};

export default HierachyMonitor;