import { useEffect, useRef } from 'react';

const IGNORE_ESC_IN = 'input, textarea, select, [contenteditable="true"]';

/**
 * On media player / thumbs playback, Escape mirrors the "Change {app}" link
 * (back to the library for the current tab). Latest `onChangeMedia` is used
 * without re-attaching the listener each render.
 */
export function useChangeMediaOnEscape(onChangeMedia: () => void): void {
  const onChangeRef = useRef(onChangeMedia);
  onChangeRef.current = onChangeMedia;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.ctrlKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN)) return;
      event.preventDefault();
      onChangeRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
