import type { AppDispatch } from '../store';
import { store } from '../store';
import { appendShortcut } from '../store/slices/errorSlice';
import { SHORTCUT_PROFILE_WARNING_LINES } from './Shortcuts_a';
import { KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE as KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_B } from './Shortcuts_b';
import { KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE as KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_C } from './Shortcuts_c';
import { KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE as KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_D } from './Shortcuts_d';
import { quickReferenceLinesForProfile } from './ShortcutsUtils';

const referenceLinesForProfile = (profile: string): readonly string[] =>
  quickReferenceLinesForProfile(
    profile,
    SHORTCUT_PROFILE_WARNING_LINES,
    KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_B,
    KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_C,
    KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_D,
    'admin',
  );

/** Records the full quick-reference line for `chordPrefix` (text before ` — `) on the active or given profile. */
export const recordKeyboardShortcutFromChord = (
  dispatch: AppDispatch,
  chordPrefix: string,
  profile?: string,
): void => {
  const resolvedProfile = profile ?? store.getState().settings.activeShortcuts;
  const line = referenceLinesForProfile(resolvedProfile).find((entry) =>
    entry.startsWith(`${chordPrefix} —`),
  );
  if (line) dispatch(appendShortcut(line));
};
