import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearEscrow } from '../store/slices/viewSlice';
import { clearData as clearReducers } from '../store/slices/rowSlice';
import { RootState } from '../store';
import { signOut as signOutAction } from '../utils';

export function useSignOut() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pauseFetchers = useSelector((state: RootState) => state.session.pauseFetchers);

  return useCallback((redirectUrl?: string) => {
    const loginPath = redirectUrl != null
      ? `/login?redirectUrl=${encodeURIComponent(redirectUrl)}`
      : '/login';
    navigate(loginPath, { replace: true });
    setTimeout(() => {
      dispatch(clearReducers());
      dispatch(clearEscrow());
      dispatch({ type: signOutAction(pauseFetchers) });
    }, 500);
  }, [dispatch, navigate, pauseFetchers]);
}
