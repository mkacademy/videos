import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import {
  setMediaFullscreenOpen,
  setMediaFullscreenReady,
} from '../store/slices/playbackSlice';

/**
 * Advertise whether the active media slot is ready for fullscreen.
 * Clears open/ready on unmount or when `ready` becomes false.
 */
export function useMediaFullscreenReady(ready: boolean): void {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(setMediaFullscreenReady(ready));
    if (!ready) {
      dispatch(setMediaFullscreenOpen(false));
    }
    return () => {
      dispatch(setMediaFullscreenReady(false));
      dispatch(setMediaFullscreenOpen(false));
    };
  }, [dispatch, ready]);
}

/** Read/close the media-skin fullscreen overlay. */
export function useMediaFullscreenOpen(): {
  open: boolean;
  close: () => void;
} {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector((state: RootState) => state.playback.mediaFullscreenOpen);
  const close = useCallback(() => {
    dispatch(setMediaFullscreenOpen(false));
  }, [dispatch]);
  return { open, close };
}
