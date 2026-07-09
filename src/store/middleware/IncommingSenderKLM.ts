import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import {
  activateTutors,
  hierachyChanged,
} from '../../library/actions';
import { RootState } from '../types';
import { CHIEF, ABORT } from '../../utils';
import { contentDelay } from '../../constants';
import { viewRequest } from '../slices/viewSlice';
import { setSelectedTutors, tutorsModified } from '../slices/commsSlice';
import { mutateAgreements } from '../../library/Thunks';
import { mutateAgreementsPayload } from '../../library/types';

const tutorsMessage = "connecting tutors... please wait";

const IncommingSender: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const { dispatch, getState } = store;

  if (setSelectedTutors.match(action)) {
    const { payload } = action;
    const { roles = [] } = getState().session;
    if (payload.isAble && !roles.includes(CHIEF)) {
      console.log("Admin priviledges required");
      return next({ type: ABORT });
    }
    return next(action);
  }

  if (activateTutors.match(action)) {
    const { tutors } = getState().comms;
    const { requestIsProcessing } = getState().view;

    if (requestIsProcessing) return next(action);

    const connections = tutors
      ?.filter(({ isActive: { isModified } }) => isModified)
      .map(({ isActive: { state }, id }) => ({
        isActive: state,
        tutor: id,
      }));
    const abilities = tutors
      ?.filter(({ isAble: { isModified } }) => isModified)
      .map(({ isAble: { state }, id }) => ({
        isActive: state,
        tutor: id,
      }));

    if (tutors && (connections.length > 0 || abilities.length > 0)) {
      const { curToken, mutateRole } = getState().session;

      if (!curToken || !mutateRole) {
        console.log("Missing token or role");
        return next({ type: ABORT });
      }

      const payload: mutateAgreementsPayload = {
        curToken,
        mutateRole,
        connections,
        abilities,
      };
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(mutateAgreements(payload)), contentDelay + 1000);
      return next(viewRequest({ message: tutorsMessage, completed: false }));
    } else {
      return next(hierachyChanged());
    }
  }

  if (mutateAgreements.fulfilled.match(action)) {
    const { message, requestIsProcessing } = getState().view;
    if (requestIsProcessing && message === tutorsMessage) {
      console.log("mutateAgreements.fulfilled.type:", action);
      setTimeout(() => dispatch(tutorsModified(action.payload)));
      dispatch(viewRequest({ completed: true }));
      return next(hierachyChanged());
    }
    return next(action);
  }

  return next(action);
};

export default IncommingSender;