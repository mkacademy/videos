import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useSearchParams } from 'react-router-dom';
import { RootState } from '../../store';
import { COMPLETED_MESSAGE, cpanelMessage } from '../../store/slices/viewSlice';
import * as styles from '../../styles/roletoggler.module.css';

const MEDIA_PLAYER_PATH = '/media-player';
const WEBAPP_TABS = ['tutorial', 'course', 'quiz'] as const;

const isHydrationMessage = (message: string | undefined): boolean =>
  !!message?.startsWith('hydrating');

/** Editor RoleToggler parity: non-hydration `view.message` status on the media player. */
const MediaPlayerStatusBar: React.FC = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const message = useSelector((state: RootState) => state.view.message);
  const isRequestProcessing = useSelector((state: RootState) => state.view.requestIsProcessing);

  const tab = searchParams.get('tab');
  const convCss = WEBAPP_TABS.includes(tab as (typeof WEBAPP_TABS)[number]) ? tab! : undefined;

  const refs = useRef({ isRequestProcessing, message });
  useEffect(() => {
    refs.current = { isRequestProcessing, message };
  }, [isRequestProcessing, message]);

  // Clear the message once the request settles (or reports completion).
  useEffect(() => {
    const { isRequestProcessing: processing, message: current } = refs.current;
    if (!processing || current === COMPLETED_MESSAGE) {
      const timeoutId = setTimeout(() => {
        const latest = refs.current;
        if (!latest.isRequestProcessing || latest.message === COMPLETED_MESSAGE) {
          dispatch(cpanelMessage(''));
        }
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [message, isRequestProcessing, dispatch]);

  const onMediaPlayer = pathname === MEDIA_PLAYER_PATH || pathname.endsWith(MEDIA_PLAYER_PATH);

  if (!onMediaPlayer || !convCss || !message || isHydrationMessage(message)) return null;

  return (
    <div className={`${styles['notRolePicker']} ${convCss}`}>
      <div className={`role ${styles['role']}`}>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default MediaPlayerStatusBar;
