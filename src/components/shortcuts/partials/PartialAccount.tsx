import React from 'react';
import { Image } from 'react-bootstrap';
import { convolutionDelay } from '../../../utils';
import { createSearchParams, Link, useLocation } from 'react-router-dom';
import { hydratedThenFetch } from '../../../library/actions';
import { viewRequestSkeletons } from '../../../store/slices/viewSlice';
import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSkeletons } from '../../../library/Thunks';
import { RootState } from '../../../store';
import { buildFetchDataPayload, FetchDataPayload, selectMinimumFeatureModeFlags } from '../../../library/ThunksUtils';
import { useFetchSequence } from '../../../Hooks/useFetchSequence';
import { PartialAccountProps } from '../ShortcutsProps';

const bell = new URL('../../../Images/bell.png', import.meta.url).href;
const exit = new URL('../../../Images/3094700.png', import.meta.url).href;
const account = new URL('../../../Images/user.png', import.meta.url).href;
const gear = new URL('../../../Images/GEAR_DARK.png', import.meta.url).href;
const loading = new URL('../../../Images/loading.gif', import.meta.url).href;
const fetchdata = new URL('../../../Images/fetchdata.png', import.meta.url).href;
const fetchdataRed = new URL('../../../Images/fetchdata_red.png', import.meta.url).href;
const autoUnzipping = new URL('../../../Images/autoUnzipping.png', import.meta.url).href;

const PartialAccount: React.FC<PartialAccountProps> = ({
  webapp,
  convCss,
  formatter,
  showError,
  isNotUnzipping,
  isNotSkeletons,
  authenticated,
  handleSignOut,
  skeletons,
  loading: isLoading,
  styles
}) => {
  const { pathname, search } = useLocation();
  const isRegister = pathname.startsWith('/register');
  const isSettings = pathname.startsWith('/settings');
  const unzipFlags = useSelector(selectMinimumFeatureModeFlags);
  const cssClass = styles.shortcut + ' ' + (styles[convCss] ?? '');
  const container = styles['shortcut-Container'] + ' ' + (styles[convCss] ?? '');
  const dispatch = useDispatch<ThunkDispatch<RootState, unknown, UnknownAction>>();
  const isHydrating = useSelector((state: RootState) => state.session.hydrationQueries > 0);
  const shouldHydrate = useSelector((state: RootState) => state.settings.shouldHydrate);
  const { sequenceQueryHandler, isFsqActive } = useFetchSequence({ webapp, formatter, isLoading, search });
  const isSequencialFetch = isFsqActive && !shouldHydrate;
  const fetchdataIcon = isSequencialFetch ? fetchdataRed : fetchdata;

  const modalHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    showError?.(null);
  };

  const queryHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoading && formatter) {
      const payload = buildFetchDataPayload(unzipFlags, { convolution: formatter, webapp, search });
      dispatch(hydratedThenFetch(payload));
    }
  };

  const skeletonsHandler = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!skeletons && formatter) {
      if (isSequencialFetch) return sequenceQueryHandler(e);
      const payload: FetchDataPayload = { convolution: formatter, webapp, search };
      dispatch(viewRequestSkeletons(true));
      setTimeout(() => dispatch(fetchSkeletons(payload)), convolutionDelay);
    }
  };

  const isNotProccessing = isNotUnzipping && isNotSkeletons;
  const searchParams = createSearchParams({ redirectUrl: pathname + (authenticated ? '' : search) });

  return (
    <React.Fragment>
      {!isSettings && !isRegister && isNotProccessing && !isHydrating && !skeletons && (
        <div
          className={container}
          onClick={queryHandler}
          style={{
            position: 'relative',
            filter: shouldHydrate ? 'none' : 'grayscale(1) brightness(0.65)',
            transition: 'filter 0.2s ease-in-out',
          }}
        >
          <Image className={cssClass} src={autoUnzipping} style={{ top: 0, left: 0, position: 'absolute', opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }} />
          <Image className={cssClass} src={loading} style={{ top: 0, left: 0, position: 'absolute', opacity: isLoading ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }} />
        </div>
      )}
      {!isSettings && !isRegister && isNotProccessing && !isHydrating && !isLoading && (
        <div className={container} onClick={skeletonsHandler} style={{ position: 'relative' }}>
          <Image className={cssClass} src={fetchdataIcon} style={{ top: 0, left: 0, position: 'absolute', opacity: skeletons ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }} />
          <Image className={cssClass} src={loading} style={{ top: 0, left: 0, position: 'absolute', opacity: skeletons ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }} />
        </div>
      )}
      {!isSettings && (
        <div className={container}>
          <Link to="/settings" state={{ goBackUrl: pathname + (search || '') }}>
            <Image className={cssClass} src={gear} />
          </Link>
        </div>
      )}
      <div className={container}>
        <Link to="#" onClick={modalHandler}>
          <Image className={cssClass} src={bell} />
        </Link>
      </div>
      <div className={container} style={{ position: 'relative' }}>
        <Link to={{ pathname: '/login', search: searchParams.toString() }} onClick={(e) => {
          if (authenticated) {
            e.preventDefault();
            handleSignOut(pathname);
          }
        }}>
          <Image className={cssClass} src={account} style={{ top: 0, left: 0, position: 'absolute', opacity: authenticated ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }} />
          <Image className={cssClass} src={exit} style={{ top: 0, left: 0, position: 'absolute', opacity: authenticated ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }} />
        </Link>
      </div>
    </React.Fragment>
  );
};

export default PartialAccount;
