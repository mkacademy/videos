import { RootState } from '../index';
import { mutateQuotas } from '../../library/actions';
import { contentDelay } from '../../constants';
import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { COMPLETED_MESSAGE, viewRequest, cpanelMessage } from '../slices/viewSlice';
import { mutateQuota } from '../../library/Thunks';
import { MutateQuotaPayload } from '../../library/types';
import { quotaSelected } from '../slices/settingsSlice';
import { prependError } from '../slices/errorSlice';
import { Tutor } from '../slices/commsSlice';

const quotaMessage = "updating quotas... please wait";

const QuotaManager: Middleware<{}, RootState> = ({ dispatch, getState }) => (next) => (action) => {
  if (mutateQuotas.match(action)) {
    const state = getState();
    const { tutors } = state.comms;
    const { quota } = state.settings;
    const { requestIsProcessing } = state.view;

    if (requestIsProcessing) return next(action);

    const pred = (tutor: Tutor) => tutor.isHighlighted === true;
    const selected = tutors?.filter(pred).map((tutor) => tutor.id);

    if (quota && selected && selected.length > 0) {
      const { curToken, mutateRole } = state.session;
      const freight: MutateQuotaPayload = { ids: selected, curToken: curToken ?? '', mutateRole: mutateRole ?? '', quota };
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(mutateQuota(freight)), contentDelay + 1000);
      return next(viewRequest({
        message: quotaMessage,
        completed: false,
      }));
    } else {
      const error = "noboby or zero selected hence no quotas to update";
      console.log("error -> " + error + " :");
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }
  }

  if (mutateQuota.fulfilled.match(action)) {
    const state = getState();
    const { quota } = state.settings;
    const { payload: ids } = action;
    const { message, requestIsProcessing } = state.view;

    if (requestIsProcessing && message === quotaMessage) {
      setTimeout(() => dispatch(quotaSelected(0)));
      console.log("updated_quotas_for:", quota, ids);
      return next(viewRequest({ completed: true }));
    }

    return next(action);
  }

  if (mutateQuota.rejected.match(action)) {
    const state = getState();
    console.log("mutateQuota.rejected.type", action);
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === quotaMessage) {
      setTimeout(() => dispatch(prependError('Failed to update quotas, contact admin')));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  return next(action);
};

export default QuotaManager;
