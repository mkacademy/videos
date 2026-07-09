import { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../index';
import { aquireVoucher } from '../../library/actions';
import { jwtDecode } from 'jwt-decode';
import { contentDelay } from '../../constants';
import { userroles } from '../../utils';
import { prependError } from '../slices/errorSlice';
import { viewRequest } from '../slices/viewSlice';
import { mutateSettings, aquiredVoucher } from '../slices/settingsSlice';
import { signedOut, initializedLoading, InitializedLoadingPayload } from '../slices/sessionSlice';
import { mutateMimiced } from '../../library/Thunks';
import { MutateMimicedPayload } from '../../library/types';
import { Tutor } from '../slices/commsSlice';

const errorMessage2 = "Enable Download Voucher first";
const mimicorMessage = "aquiring voucher... please wait";
const errorMessage = "account to mimic not selected (green)";
const errorMessage3 = "Failed to acquire voucher, contact admin";
interface DecodedToken {
  roles: string[];
  quota: number;
  userid: number;
  roleIds: number[];
}

const AccountMimicor: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const dispatch = store.dispatch as AppDispatch;
  const getState = store.getState;

  if (aquireVoucher.match(action)) {
    const state = getState();
    const { requestIsProcessing } = state.view;
    const { dowTok, seconds } = state.settings;

    if (requestIsProcessing) return next(action);

    const { tutors } = state.comms;
    const selected = tutors.find((tutor: Tutor) => tutor.checked === true);

    if (dowTok && selected) {
      const { curToken, mutateRole } = state.session;
      const freight: MutateMimicedPayload = {
        seconds: seconds || 0,
        curToken: curToken || '',
        mutateRole: mutateRole || '',
        member: selected.id,
      };
      const thunkDispatch = dispatch as ThunkDispatch<RootState, unknown, UnknownAction>;
      setTimeout(() => thunkDispatch(mutateMimiced(freight)), contentDelay + 1000);

      return next(viewRequest({
        message: mimicorMessage,
        completed: false,
      }));
    } else {
      const error = !selected ? errorMessage : errorMessage2;
      return next(prependError(error));
    }
  }

  if (mutateMimiced.fulfilled.match(action)) {
    const state = getState();
    const { message, requestIsProcessing } = state.view;

    if (requestIsProcessing && message === mimicorMessage) {
      setTimeout(() => dispatch(aquiredVoucher(action.payload)));
      const { tutors } = state.comms;
      const selected = tutors.find((tutor: Tutor) => tutor.checked === true);
      console.log("aquired_voucher_for:", selected?.title);
      console.log("mutateMimiced.fulfilled.type:", action);

      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (mutateMimiced.rejected.match(action)) {
    const state = getState();
    console.log("mutateMimiced.rejected.type", action);
    const { message, requestIsProcessing } = state.view;
    if (requestIsProcessing && message === mimicorMessage) {
      setTimeout(() => dispatch(prependError(errorMessage3)));
      return next(viewRequest({ completed: true }));
    }
    return next(action);
  }

  if (signedOut.match(action)) {
    const state = getState();
    const { tutors } = state.comms;
    const { voucher } = state.settings;
    const selected = tutors.find((tutor: Tutor) => tutor.checked === true);

    if (voucher) {
      const decoded = jwtDecode<DecodedToken>(voucher);
      const looksLikeToken = voucher.indexOf(".") > -1;

      if (looksLikeToken) {
        const { roles, quota, userid, roleIds } = decoded;
        const baseRole = userroles.findIndex((r: string) => roles.includes(r));
        const roleIndex = roles.findIndex((r: string) => r === userroles[baseRole]);

        const session: InitializedLoadingPayload = {
          quota,
          roles,
          userid,
          roleIds,
          roleIndex,
          isPrivate: true,
          curToken: voucher,
          isIncognito: false,
          fetchRole: roles[roleIndex],
          mutateRole: roles[roleIndex],
          curMailer: roleIds[roleIndex],
          authenticated: looksLikeToken,
          username: selected?.title || '',
        };

        setTimeout(() => {
          console.log("signed_into_mimiced_account:", decoded);
          dispatch(initializedLoading(session));
        }, 1000);
      } else {
        const msg = "invalid voucher auto-login aborted";
        setTimeout(() => dispatch(prependError(msg)));
      }
    }

    const freight = { voucher: undefined };
    setTimeout(() => dispatch(mutateSettings(freight)));
    return next(action);
  }

  return next(action);
};

export default AccountMimicor;
