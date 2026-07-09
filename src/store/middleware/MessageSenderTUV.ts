import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import {
  sendOutgoing,
} from '../../library/actions';
import { contentDelay } from '../../constants';
import { outgoingMessage } from '../../utils';
import { sendPackages } from '../../library/Thunks';
import { sendPackagesPayload } from '../../library/types';
import { sendPackage } from '../../library/Thunks';
import { sendPackagePayload } from '../../library/types';
import { viewRequest } from '../slices/viewSlice';
import { RootState } from '../types';
import { prependError } from '../slices/errorSlice';
import { dispatchSaveEditsForAllWebapps } from './saveEditsQueue';

const MessageSender: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const { dispatch, getState } = store;

  if (sendOutgoing.match(action)) {
    const state = getState();
    const { outgoing } = state.comms;
    const { requestIsProcessing } = state.view;
    if (requestIsProcessing) return next(action);
    const modified = outgoing.filter(({ isModified }) => isModified);
    if (modified.length > 0) {
      const { quota, curToken, mutateRole } = state.session;
      if (curToken && mutateRole) {
        const packages: sendPackagesPayload = {
          quota: quota || 0,
          mutateRole,
          modified,
          curToken,
        };
        const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
        setTimeout(() => thunkDispatch(sendPackages(packages)), contentDelay + 1000);
        return next(viewRequest({ message: outgoingMessage, completed: false }));
      }
    }
    dispatchSaveEditsForAllWebapps(dispatch, 'outgoing', {
      outgoing: { sent: undefined },
    });
    return;
  }

  if (sendPackages.fulfilled.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === outgoingMessage) {
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      console.log("sendPackages.fulfilled.type", action);
      const { sent, packages } = action.payload;
      packages.forEach((pakage: sendPackagePayload) => {
        setTimeout(() => thunkDispatch(sendPackage(pakage)), contentDelay + 1000);
      });
      dispatch(viewRequest({ completed: true }));
      dispatchSaveEditsForAllWebapps(dispatch, 'outgoing', {
        outgoing: { sent },
      });
      return next(action);
    }
    return next(action);
  }
  if (sendPackages.rejected.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === outgoingMessage) {
      console.log("sendPackages.rejected.type:", action);
      setTimeout(() => dispatch(prependError('Failed to send packages, contact admin')));
      setTimeout(() => dispatch(viewRequest({ completed: true })));
    }
    return next(action);
  }
  if (sendPackage.rejected.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === outgoingMessage) {
      console.log("sendPackage.rejected.type:", action);
      setTimeout(() => dispatch(prependError('Failed to send package, contact admin')));
      setTimeout(() => dispatch(viewRequest({ completed: true })));
    }
    return next(action);
  }

  return next(action);
};

export default MessageSender;