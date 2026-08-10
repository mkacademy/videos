import { useEffect, useRef } from 'react';
import { useDispatch, useStore } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { setMediaFullscreenOpen } from '../store/slices/playbackSlice';

const IGNORE_ESC_IN = 'input, textarea, select, [contenteditable="true"]';

/**
 * On media player / thumbs / markdown playback, Escape exits fullscreen first,
 * then mirrors the "Change {app}" link (back to the library for the current tab).
 */
export function useChangeMediaOnEscape(onChangeMedia: () => void): void {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const onChangeRef = useRef(onChangeMedia);
  onChangeRef.current = onChangeMedia;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.ctrlKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN)) return;
      if (store.getState().playback.mediaFullscreenOpen) {
        event.preventDefault();
        dispatch(setMediaFullscreenOpen(false));
        return;
      }
      event.preventDefault();
      onChangeRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, store]);
}
