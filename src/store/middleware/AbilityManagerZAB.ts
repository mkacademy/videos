import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import {
  mutateAbilities,
  mutateMyAbility,
} from '../../library/actions';
import { contentDelay } from '../../constants';
import { signOut } from '../../utils';
import { COMPLETED_MESSAGE, viewRequest, cpanelMessage, clearEscrow } from '../slices/viewSlice';
import { clearData as clearReducers } from '../slices/rowSlice';
import { mutateSettings } from '../slices/settingsSlice';
import { abilityMutated } from '../slices/commsSlice';
import { mutateAbility } from '../../library/Thunks';
import { MutateAbilityPayload } from '../../library/types';
import { prependError } from '../slices/errorSlice';

const disableMessage = "restricting account... please wait";
const abilitiesMessage = "updating restrictions... please wait";
const restrictionMessage = "account restriction failed, please contact administrator";

const AbilityManager: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const dispatch = store.dispatch;
  const getState = store.getState;

  if (mutateMyAbility.match(action)) {
    const state = getState() ;
    const { requestIsProcessing } = state.view;
    const { delaccount } = state.settings;
    if (requestIsProcessing) return next(action);
    const { userid } = state.session;
    if (delaccount && userid) {
      const { curToken, mutateRole } = state.session;
      if (!curToken || !mutateRole) return next(action);
      const freight = {
        curToken,
        mutateRole,
        enabled: false,
        candidates: [Number(userid)],
      } as MutateAbilityPayload;
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(mutateAbility(freight)), contentDelay + 1000);
      return next(viewRequest({ message: disableMessage, completed: false }));
    } else {
      const error = "account restriction not selected";
      console.log("error -> " + error + ":");
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }
  }

  if (mutateAbilities.match(action)) {
    const state = getState() ;
    const { requestIsProcessing } = state.view;
    const { isDisabled, isEnabled } = state.settings;
    if (requestIsProcessing) return next(action);
    const { seltype, dismisstype } = state.settings;
    const predicate = seltype
      ? ({ isHighlighted }: { isHighlighted: boolean }) => isHighlighted === dismisstype
      : ({ isDismissed }: { isDismissed: boolean }) => isDismissed === dismisstype;
    const notIsValid = isDisabled === false && isEnabled === false;
    const { tutors } = state.comms;
    const selected = tutors.filter(predicate).map(({ id }: { id: number }) => id);
    if (!notIsValid && selected.length > 0) {
      const { curToken, mutateRole } = state.session;
      if (!curToken || !mutateRole) return next(action);
      const freight = {
        curToken,
        mutateRole,
        enabled: isEnabled,
        candidates: selected,
      } as MutateAbilityPayload;
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(mutateAbility(freight)), contentDelay + 1000);
      return next(viewRequest({ message: abilitiesMessage, completed: false }));
    } else {
      const error = "no tutors selected, hence no abilities to update";
      console.log("error -> " + error + " :");
      return next(cpanelMessage(COMPLETED_MESSAGE));
    }
  }

  if (mutateAbility.fulfilled.match(action)) {
    const state = getState() ;
    const { message, requestIsProcessing } = state.view;
    const pauseFetchers = state.session.pauseFetchers;
    if (requestIsProcessing && message === abilitiesMessage) {
      const freight = { isDisabled: false, isEnabled: false };
      setTimeout(() => dispatch(mutateSettings(freight)));
      setTimeout(() => dispatch(abilityMutated(action.payload)));
      console.log("updated_abilities_for:", action);
      return next(viewRequest({ completed: true }));
    } else if (requestIsProcessing && message === disableMessage) {
      console.log("restricted_account_for:", action.payload);
      const { candidates } = action.payload;
      if (candidates.length !== 0) {
        setTimeout(() => {
          dispatch(clearEscrow());
          dispatch(clearReducers());
          dispatch({ type: signOut(pauseFetchers) })
        })
      } else dispatch(prependError(restrictionMessage));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (mutateAbility.rejected.match(action)) {
    const state = getState();
    console.log("mutateAbility.rejected.type", action);
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === abilitiesMessage) {
      setTimeout(() => dispatch(prependError('Failed to update abilities, contact admin')));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  return next(action);
};

export default AbilityManager;
