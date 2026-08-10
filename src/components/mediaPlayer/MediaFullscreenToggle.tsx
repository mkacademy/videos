import React, { useCallback } from 'react';
import { Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setMediaFullscreenOpen } from '../../store/slices/playbackSlice';
import * as styles from '../../styles/mediaPlayer.module.css';

const fullscreenIcon = new URL('../../Images/fullscreen.png', import.meta.url).href;

/** Header control to enter/exit media fullscreen (videos app has no shortcuts strip). */
const MediaFullscreenToggle: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const ready = useSelector((state: RootState) => state.playback.mediaFullscreenReady);
  const open = useSelector((state: RootState) => state.playback.mediaFullscreenOpen);

  const toggle = useCallback(() => {
    dispatch(setMediaFullscreenOpen(!open));
  }, [dispatch, open]);

  if (!ready) return null;

  return (
    <Button
      variant="link"
      className={styles['changeMediaLink']}
      onClick={toggle}
      title={open ? 'Exit fullscreen (Escape)' : 'Fullscreen'}
      aria-label={open ? 'Exit fullscreen' : 'Fullscreen'}
    >
      <img src={fullscreenIcon} alt="" width={20} height={20} />
    </Button>
  );
};

export default MediaFullscreenToggle;
