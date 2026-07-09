import { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { ThunkDispatch } from 'redux-thunk';
import { RootState } from '../index';
import {
  mutateHierachies,
} from '../../library/actions';
import { contentDelay } from '../../constants';
import { mutateSettings } from '../slices/settingsSlice';
import { mutateHierachy } from '../../library/Thunks';
import { MutateHierachyPayload } from '../../library/types';
import { hierachyMutated } from '../slices/commsSlice';
import { COMPLETED_MESSAGE, viewRequest, cpanelMessage } from '../slices/viewSlice';
import { B, M, U } from '../../library/commsUtils';
import { prependError } from '../slices/errorSlice';

const ranks = [M, U, B];
const hierachyMessage = "updating hierachies... please wait";

interface Candidate {
  id: number;
  type: number;
}

const HierachyManager: Middleware<{}, RootState> = ({ dispatch, getState }) => {
  return (next) => (action) => {
    if (mutateHierachies.match(action)) {
      const state = getState();
      const { requestIsProcessing } = state.view;

      if (requestIsProcessing) return next(action);

      const { isDemoted, isPromoted, seltype, dismisstype } = state.settings;

      const predicate = seltype
        ? ({ isHighlighted }: { isHighlighted: boolean }) => isHighlighted === dismisstype
        : ({ isDismissed }: { isDismissed: boolean }) => isDismissed === dismisstype;

      const notIsValid = isDemoted === false && isPromoted === false;
      const { tutors } = state.comms;

      const selected: Candidate[] = tutors
        .filter(predicate)
        .map(({ id, type }) => ({ id, type: ranks.indexOf(type) }));

      if (!notIsValid && selected.length > 0) {
        const { curToken, mutateRole } = state.session;

        const freight: MutateHierachyPayload = {
          curToken: curToken!,
          candidates: selected,
          mutateRole: mutateRole!,
          selector: isDemoted ? "demotions" : "promotions",
        };

        const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
        setTimeout(() => thunkDispatch(mutateHierachy(freight)), contentDelay + 1000);

        return next(viewRequest({
          message: hierachyMessage,
          completed: false,
        }));
      } else {
        const error = "no tutors selected, hence no hierachies to update";
        console.log("error -> " + error + " :");
        return next(cpanelMessage(COMPLETED_MESSAGE));
      }
    }

    if (mutateHierachy.fulfilled.match(action)) {
      const state = getState();
      const { payload } = action;
      const { message, requestIsProcessing } = state.view;

      if (requestIsProcessing && message === hierachyMessage) {
        const freight = { isDemoted: false, isPromoted: false };
        setTimeout(() => dispatch(mutateSettings(freight)));
        setTimeout(() => dispatch(hierachyMutated(payload)));
        console.log("updated_hierachies_for:", payload);

        return next(viewRequest({ completed: true }));
      }
      return next(action);
    }

    if (mutateHierachy.rejected.match(action)) {
      const state = getState();
      console.log("mutateHierachy.rejected.type", action);
      const { message, requestIsProcessing } = state.view;
      if (requestIsProcessing && message === hierachyMessage) {
        setTimeout(() => dispatch(prependError('Failed to update hierachies, contact admin')));
        return next(viewRequest({ completed: true }));
      }
      return next(action);
    }

    return next(action);
  };
};

export default HierachyManager;
