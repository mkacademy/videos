import { type MouseEvent } from 'react';
import { createSearchParams, useLocation } from 'react-router-dom';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { convolutionDelay, getActionFromUrl } from '../utils';
import { setCleared } from '../store/slices/sessionSlice';
import { RootState } from '../store';
import type { FullAccountProps } from '../components/shortcuts/ShortcutsProps';
import { useFetchSequence } from './useFetchSequence';
import { FetchDataPayload } from '../library/ThunksUtils';
import { viewRequestFetching } from '../store/slices/viewSlice';
import { fetchData } from '../library/Thunks';

type UseFullAccountParams = Pick<
  FullAccountProps,
  | 'webapp'
  | 'formatter'
  | 'loading'
  | 'authenticated'
  | 'handleSignOut'
  | 'entity'
  | 'saveRows'
  | 'saveContent'
  | 'clearData'
  | 'showError'
  | 'selectall'
  | 'unSelectall'
  | 'clearSelections'
  | 'invertSelections'
  | 'toggleDismissed'
  | 'clearDismissed'
  | 'dismissals'
  | 'setIsOpen'
  | 'styles'
  | 'convCss'
>;

export function useFullAccount({
  webapp,
  formatter,
  loading: isLoading,
  authenticated,
  handleSignOut,
  entity,
  saveRows,
  saveContent,
  clearData,
  showError,
  selectall,
  unSelectall,
  clearSelections,
  invertSelections,
  toggleDismissed,
  clearDismissed,
  dismissals,
  setIsOpen,
  styles,
  convCss,
}: UseFullAccountParams) {
  const { pathname, search } = useLocation();
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  const { sequenceQueryHandler, isFsqActive } = useFetchSequence({ webapp, formatter, isLoading, search });

  const isApp = pathname.startsWith('/app');
  const isSearch = pathname.indexOf('/search') > -1;
  const isCpanel = pathname.indexOf('/cpanel') > -1;
  const isSettings = pathname.startsWith('/settings');
  const cssClass = styles.shortcut + ' ' + (styles[convCss] ?? '');
  const extras = pathname.match(/(\/verify|\/register|\/pricingplans)$/) || [];
  const container = styles['shortcut-Container'] + ' ' + (styles[convCss] ?? '');
  const dismised = dismissals?.[pathname] ?? false;
  const isExtras = extras.length > 0;

  const modalHandler = (e: MouseEvent) => {
    e.preventDefault();
    showError?.(null);
  };

  const queryHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoading && formatter) {
      dispatch(viewRequestFetching(true));
      const payload: FetchDataPayload = { convolution: formatter, webapp, search };
      setTimeout(() => dispatch(fetchData(payload)), convolutionDelay);
    }
  };


  const clearHandler = (e: MouseEvent) => {
    e.preventDefault();
    dispatch(setCleared(true));
    clearDismissed?.({ pathname, payload: dismised });
  };

  const selectallHandler = (e: MouseEvent) => {
    e.preventDefault();
    selectall?.(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const unselectallHandler = (e: MouseEvent) => {
    e.preventDefault();
    unSelectall?.(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const clearSelectedHandler = (e: MouseEvent) => {
    e.preventDefault();
    clearSelections?.(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const invertselectionHandler = (e: MouseEvent) => {
    e.preventDefault();
    invertSelections?.(pathname);
    setTimeout(() => setIsOpen(true));
  };

  const toggleDismissalsHandler = (e: MouseEvent) => {
    e.preventDefault();
    toggleDismissed?.(pathname);
  };

  const searchParams = createSearchParams({ redirectUrl: pathname + (authenticated ? '' : search) });

  const onSettingsClick = () => {
    if (isApp) {
      if (getActionFromUrl() !== 'view') saveRows(entity);
      else saveContent(entity);
      setTimeout(() => clearData(), 100);
    }
  };

  const onLoginClick = (e: MouseEvent) => {
    if (authenticated) {
      e.preventDefault();
      handleSignOut(pathname);
    }
  };

  return {
    pathname,
    search,
    isApp,
    isSearch,
    isCpanel,
    isSettings,
    isExtras,
    cssClass,
    container,
    modalHandler,
    clearHandler,
    selectallHandler,
    unselectallHandler,
    clearSelectedHandler,
    sequenceQueryHandler,
    isFsqActive,
    shouldHydrate,
    queryHandler,
    invertselectionHandler,
    toggleDismissalsHandler,
    searchParams,
    onSettingsClick,
    onLoginClick,
  };
}
