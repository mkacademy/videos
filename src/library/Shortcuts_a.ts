import { AppDispatch, store } from '../store';
import { mutateSettings } from '../store/slices/settingsSlice';
import { clearOnlyWarnings, prependWarning } from '../store/slices/errorSlice';
import { isCtrlOnlyChordLeftControlOk } from './Shortcuts_b';
import { recordKeyboardShortcutFromChord } from './ShortcutRecording';
import { IGNORE_WEBAPP_JUMP_IN } from './ShortcutsUtils';

/** Shown when activating profile A via Ctrl+` (no `activeShortcuts` gate on that chord). */
export const SHORTCUT_PROFILE_WARNING_LINES: readonly string[] = [
  '-------------------- Profile switcher (Ctrl+` → (A| B| C| D)); -----------------------',
  'B — First set of application shortcuts (Ctrl+Shift, Ctrl+Alt)',
  'C — Second set of application shortcuts (Ctrl+Shift, Ctrl+Alt)',
  'D — Third set of application shortcuts (Ctrl+Shift, Ctrl+Alt)',
];

const isCtrlBackquoteKey = (event: KeyboardEvent): boolean =>
  event.key === '`' || event.code === 'Backquote';

const shouldIgnoreShortcutTarget = (event: KeyboardEvent): boolean => {
  const el = event.target as HTMLElement | null;
  return !!(el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable);
};

const prependProfileList = (dispatch: AppDispatch) => {
  dispatch(clearOnlyWarnings());
  for (let i = SHORTCUT_PROFILE_WARNING_LINES.length - 1; i >= 0; i -= 1) {
    dispatch(prependWarning(SHORTCUT_PROFILE_WARNING_LINES[i]));
  }
};

/**
 * Ctrl+` (any profile): switches to profile A and lists all shortcut profiles in Activity.
 */
export const registerActivateShortcutsAShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlOnlyChordLeftControlOk(event)) return;
    if (!isCtrlBackquoteKey(event)) return;
    if (shouldIgnoreShortcutTarget(event)) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + `', 'b');
    dispatch(clearOnlyWarnings());
    dispatch(mutateSettings({ activeShortcuts: 'a' }));
    if (store.getState().settings.activeShortcuts !== 'a')
      dispatch(prependWarning(msgProfileSwitched('A')));
    prependProfileList(dispatch);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

const msgProfileSwitched = (profile: string) =>
  `Keyboard shortcuts profile switched to ${profile} — Ctrl+Shift and Ctrl+Alt shortcuts are now enabled.`;

const PROFILE_BY_SWITCH_KEY: Partial<Record<string, 'b' | 'c' | 'd'>> = {
  b: 'b',
  B: 'b',
  c: 'c',
  C: 'c',
  d: 'd',
  D: 'd',
};

/**
 * Ctrl+B / Ctrl+C (profile A only): switches to B or C. No-op when already on that profile or
 * when not on A so profile B/C Ctrl+Shift chords (e.g. stash rolodex, copy icons) still work.
 * Register before copy-icons so leaving profile B via C does not toggle copy icons.
 */
export const registerActivateShortcutsProfileShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlOnlyChordLeftControlOk(event)) return;
    const profile = PROFILE_BY_SWITCH_KEY[event.key];
    if (!profile) return;
    if (shouldIgnoreShortcutTarget(event)) return;
    if (store.getState().settings.activeShortcuts === profile
      || store.getState().settings.activeShortcuts !== 'a') return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, profile.toUpperCase(), 'a');
    dispatch(clearOnlyWarnings());
    dispatch(mutateSettings({ activeShortcuts: profile }));
    dispatch(prependWarning(msgProfileSwitched(profile.toUpperCase())));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};
