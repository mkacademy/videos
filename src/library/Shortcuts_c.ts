import { AppDispatch, store } from '../store';
import { appendWarnings, clearOnlyWarnings, prependError, prependWarning } from '../store/slices/errorSlice';
import { initializedLoading } from '../store/slices/sessionSlice';
import {
  appendSelected,
  takeSelected,
} from '../store/slices/settingsSlice';
import {
  isCtrlShiftChordModifierSidesBaseOk,
  KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE as KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_B,
} from './Shortcuts_b';
import { SHORTCUT_PROFILE_WARNING_LINES as KEYBOARD_QUICK_REFERENCE_WARNING_LINES_A } from './Shortcuts_a';
import { KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE as KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_D } from './Shortcuts_d';
import {
  beginMarkSelectedPncStashTextsModified,
  dispatchMigrateServerIdsActivityFeedback,
  migrateSelectedPncStashServerIdsToLocal,
  ACTIONS_EXECUTOR_ADMIN_KEYS,
  ACTIONS_EXECUTOR_MODERATOR_KEYS,
  ACTIONS_EXECUTOR_SHORTCUTS,
  createOptionsCycleShortcutHandlers,
  isActiveShortcutsC,
  buildSharedPagedRouteShortcutContext,
  quickReferenceLinesForProfile,
  quickReferenceRoleKeyFromSession,
  allQuickReferenceLines,
  type QuickReferenceLinesByRole,
  IGNORE_WEBAPP_JUMP_IN,
} from './ShortcutsUtils';
import { updateSteps } from './actions';
import {
  tryInstructionHalvesMirrorTransform,
  tryInstructionBranchOneReverseTransform,
  tryInstructionBranchTwoReverseTransform,
  tryInstructionSwapImageurlContentTransform,
} from './ContentImageSwapUtils';
import { takeAliases } from '../utils';
import { CHIEF, MOD, createAliases } from '../utils';
import { recordKeyboardShortcutFromChord } from './ShortcutRecording';

const sortedAliasCounts = (aliases: Record<number, string>): number[] =>
  Object.keys(aliases)
    .map((k) => Number(k))
    .sort((a, b) => a - b);

/** Numeric create-count options in ascending order (matches settings `create-select`). */
const CREATE_COUNT_ORDER = sortedAliasCounts(createAliases);

/** Numeric take-count options in ascending order (matches settings `take-select`). */
const TAKE_COUNT_ORDER = sortedAliasCounts(takeAliases);

const nextOrderedSelectValue = (order: number[], current: number | undefined): number => {
  if (!order.length) return 1;
  if (current === undefined) return order[0];
  const idx = order.indexOf(current);
  const base = idx === -1 ? 0 : idx + 1;
  return order[base % order.length];
};

/** Ctrl+Shift+* chords when `settings.activeShortcuts === 'c'`. */
export const isCtrlShiftChordModifierSidesOkForC = (event: KeyboardEvent): boolean =>
  isActiveShortcutsC() && isCtrlShiftChordModifierSidesBaseOk(event);

export const KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE: QuickReferenceLinesByRole = {
  anonymous: [
    'Keyboard shortcuts — Quick reference (profile C)',
    '-------------------------------- PNC content shortcuts --------------------------------',
    'Ctrl + Shift + C — Top imageurl from bottom content; bottom content to dot',
    'Ctrl + Shift + D — Swap imageurl and content on each highlighted instruction row',
    'Ctrl + Shift + I — convert server IDs to local IDs on selected stash group (tutorial, course, quiz)',
    'Ctrl + Shift + U — mark content slice edited from selected stash ids (tutorial, course, quiz)',
    '-------------------------------- Tabulator or settings shortcuts --------------------------------',
    'Ctrl + Shift + Q — Halves mirror on highlighted instruction pairs',
    'Ctrl + Shift + H — Top content from bottom image; bottom image to data:image placeholder',
    'Ctrl + Shift + A — Next take-count option; list take aliases as warnings (current with trailing underscore)',
    'Ctrl + Shift + B — Next create-count option; list create aliases as warnings (current with trailing underscore)',
    'Ctrl + Shift + Z — Cycles within the active option type (wraps at list end)',
    'Ctrl + Shift + . — Next Ctrl + Shift + Z advances to the next option type (connects → status → …)',
    '-------------------------------- Global UI shortcuts --------------------------------',
    'Ctrl + Shift + L — Show profile C quick reference in Activity warnings',
    'Ctrl + ` — Switch to profile A and list all profiles',
  ],
  member: [
    '--------------------------------ActionsExecutor (any role) --------------------------------',
    'Ctrl + Shift + G — Publish content visibility (`contentVisibility`)',
    'Ctrl + Shift + N — Save tutorial trees (`saveTutorialTrees`)',
    'Ctrl + Shift + O — Save course trees (`saveCourseTrees`)',
    'Ctrl + Shift + P — Save quiz trees (`saveQuizTrees`)',
    'Ctrl + Shift + V — Save tutorial ownership (`saveTutorialOwnership`)',
    'Ctrl + Shift + W — Save course ownership (`saveCourseOwnership`)',
    'Ctrl + Shift + X — Save quiz ownership (`saveQuizOwnership`)',
  ],
  moderator: [
    '--------------------------------ActionsExecutor (moderator ) --------------------------------',
    'Ctrl + Shift + R — Approve tutorial trees (`approveTutorialTrees`)',
    'Ctrl + Shift + S — Approve course trees (`approveCourseTrees`)',
    'Ctrl + Shift + T — Approve quiz trees (`approveQuizTrees`)',
  ],
  admin: [
    '--------------------------------ActionsExecutor (admin) --------------------------------',
    'Ctrl + Shift + E — Save quotas (`mutateQuotas`)',
    'Ctrl + Shift + F — Remove orphans (`deleteOrphans`)',
    'Ctrl + Shift + J — Get voucher (`aquireVoucher`)',
    'Ctrl + Shift + K — Save hierarchies (`mutateHierachies`)',
    'Ctrl + Shift + M — Save abilities (`mutateAbilities`)',
  ],
};

/** Full profile C list (all role tiers) for chord recording. */
export const KEYBOARD_QUICK_REFERENCE_WARNING_LINES: readonly string[] =
  allQuickReferenceLines(KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE);

/**
 * Ctrl+Shift+L (profiles A, B, C, and D): clears warnings, then prepends the quick reference for
 * the current `settings.activeShortcuts` profile.
 */
export const registerQuickReferenceShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesBaseOk(event)) return;
    if (event.key !== 'l' && event.key !== 'L') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const { settings, session } = store.getState();
    const profile = settings.activeShortcuts;
    const roleKey = quickReferenceRoleKeyFromSession(session.roles, session.authenticated);
    const lines = quickReferenceLinesForProfile(
      profile,
      KEYBOARD_QUICK_REFERENCE_WARNING_LINES_A,
      KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_B,
      KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE,
      KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE_D,
      roleKey,
    );
    if (!lines.length) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + L');
    dispatch(clearOnlyWarnings());
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      dispatch(prependWarning(lines[i]));
    }
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+I (profile C only): on tutorial, course, and quiz, cascades server → local ids on the
 * stash inventory–selected `Unjoined_items` / `Escrowed_items` hierarchy group
 * ({@link migrateSelectedPncStashServerIdsToLocal}) on every approute in each complete chain
 * (deeper levels: `metadata[parentId]` and `bannerId` ← parent link id).
 * Requires a selected group (Ctrl+Shift+N/V);
 * does not fall back to latest.
 */
export const registerMigrateServerIdsShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'i' && event.key !== 'I') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + I', 'c');
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning('Converting server IDs to local IDs...'));
    setTimeout(() => {
      const result = migrateSelectedPncStashServerIdsToLocal(store.getState(), dispatch);
      dispatchMigrateServerIdsActivityFeedback(dispatch, result);
    }, 500);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+C (profile C only): first contiguous highlighted instructions — per index i,
 * top[i].imageurl ← bottom[i].content; bottom[i].content ← ".".
 */
export const registerInstructionBranchTwoReverseShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'c' && event.key !== 'C') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const ctx = buildSharedPagedRouteShortcutContext({ allowInMinimumFeatureMode: true });
    if (!ctx) return;
    const result = tryInstructionBranchTwoReverseTransform(ctx.state);
    if (!result.ok) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + C', 'c');
      dispatch(prependError(result.error));
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + C', 'c');
    dispatch(updateSteps(result.updates));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+D (profile C only): on the instructions route, swap `imageurl` and `content` on every
 * highlighted row except rows where both are the bare placeholder (`data:image`) and dot.
 */
export const registerInstructionSwapImageurlContentShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'd' && event.key !== 'D') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const ctx = buildSharedPagedRouteShortcutContext({ allowInMinimumFeatureMode: true });
    if (!ctx) return;
    const result = tryInstructionSwapImageurlContentTransform(ctx.state);
    if (!result.ok) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + D', 'c');
      dispatch(prependError(result.error));
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + D', 'c');
    dispatch(updateSteps(result.updates));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+U (profile C only): on tutorial, course, and quiz, marks matching content slice rows
 * `edited: true` using ids from the stash inventory–selected `Unjoined_items` / `Escrowed_items`
 * hierarchy group ({@link beginMarkSelectedPncStashTextsModified}). Requires a selected group
 * (Ctrl+Shift+N/V); does not fall back to latest.
 */
export const registerMarkTextsModifiedShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'u' && event.key !== 'U') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + U', 'c');
    beginMarkSelectedPncStashTextsModified(dispatch);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+Q (profile C only): on a tutorial, course, or quiz paged route whose `to` is
 * `instructions`, applies the instruction-halves mirror transform to the first contiguous
 * highlighted run (see {@link tryInstructionHalvesMirrorTransform}).
 */
export const registerInstructionHalvesMirrorShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'q' && event.key !== 'Q') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const ctx = buildSharedPagedRouteShortcutContext({ allowInMinimumFeatureMode: true });
    if (!ctx) return;
    const result = tryInstructionHalvesMirrorTransform(ctx.state);
    if (!result.ok) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Q', 'c');
      dispatch(prependError(result.error));
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Q', 'c');
    dispatch(updateSteps(result.updates));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+H (profile C only): first contiguous highlighted instructions — per index i,
 * top[i].content ← bottom[i].imageurl; bottom[i].imageurl ← data:image placeholder.
 */
export const registerInstructionBranchOneReverseShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'h' && event.key !== 'H') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const ctx = buildSharedPagedRouteShortcutContext({ allowInMinimumFeatureMode: true });
    if (!ctx) return;
    const result = tryInstructionBranchOneReverseTransform(ctx.state);
    if (!result.ok) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + H', 'c');
      dispatch(prependError(result.error));
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + H', 'c');
    dispatch(updateSteps(result.updates));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+A (profile C only): advances `settings.take` to the next value in {@link takeAliases}
 * (wraps), then replaces Activity warnings with every alias string, marking the new selection with
 * a trailing underscore.
 */
export const registerTakeCountCycleShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'a' && event.key !== 'A') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    if (!TAKE_COUNT_ORDER.length) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + A', 'c');
    dispatch(clearOnlyWarnings());
    const current = store.getState().settings.take;
    const next = nextOrderedSelectValue(TAKE_COUNT_ORDER, current);
    dispatch(takeSelected(next));
    dispatch(initializedLoading({ defaultTake: next }));
    const labels = TAKE_COUNT_ORDER.map((count) => {
      const alias = takeAliases[count];
      return count === next ? `${alias}_` : alias;
    });
    dispatch(appendWarnings(labels.slice().reverse()));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+B (profile C only): advances `settings.creates` to the next value in
 * {@link createAliases} (wraps), then replaces Activity warnings with every alias string, marking
 * the new selection with a trailing underscore.
 */
export const registerCreateCountCycleShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    if (event.key !== 'b' && event.key !== 'B') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    if (!CREATE_COUNT_ORDER.length) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + B', 'c');
    dispatch(clearOnlyWarnings());
    const current = store.getState().settings.creates;
    const next = nextOrderedSelectValue(CREATE_COUNT_ORDER, current);
    dispatch(initializedLoading({ addCount: next }));
    dispatch(appendSelected(next));
    const labels = CREATE_COUNT_ORDER.map((count) => {
      const alias = createAliases[count];
      return count === next ? `${alias}_` : alias;
    });
    dispatch(appendWarnings(labels.slice().reverse()));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+Z / Ctrl+Shift+. (profile C only): staged cycle with separate warning lists.
 * Z cycles within the active type (wraps at list end). Period arms the next Z to advance stage.
 * Members: connects only. Moderators: connects then status. Admins: full chain through session_len.
 */
export const registerOptionsCycleShortcut = (dispatch: AppDispatch) => {
  const { cycleHandler, armAdvanceStageHandler } = createOptionsCycleShortcutHandlers(
    dispatch,
    isCtrlShiftChordModifierSidesOkForC,
  );
  const cycleWithRecording = (event: KeyboardEvent) => {
    const preventedBefore = event.defaultPrevented;
    cycleHandler(event);
    if (!preventedBefore && event.defaultPrevented) {
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Z', 'c');
    }
  };
  const armWithRecording = (event: KeyboardEvent) => {
    const preventedBefore = event.defaultPrevented;
    armAdvanceStageHandler(event);
    if (!preventedBefore && event.defaultPrevented) {
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + .', 'c');
    }
  };
  window.addEventListener('keydown', cycleWithRecording);
  window.addEventListener('keydown', armWithRecording);
  return () => {
    window.removeEventListener('keydown', cycleWithRecording);
    window.removeEventListener('keydown', armWithRecording);
  };
};

/**
 * Ctrl+Shift+letter (profile C only): dispatches ActionsExecutor `actionMap` actions except
 * `mutateMyAbility` and `mutateImageUrl`. Admin keys require {@link CHIEF} in `session.roles`;
 * approve-tree keys require {@link MOD} in `session.roles`.
 */
export const registerActionsExecutorShortcuts = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForC(event)) return;
    const key = event.key.toLowerCase();
    const actionCreator = ACTIONS_EXECUTOR_SHORTCUTS[key];
    if (!actionCreator) return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    const { roles = [] } = store.getState().session;
    const chordPrefix = `Ctrl + Shift + ${key.toUpperCase()}`;
    if (ACTIONS_EXECUTOR_ADMIN_KEYS.has(key) && !roles.includes(CHIEF)) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, chordPrefix, 'c');
      dispatch(clearOnlyWarnings());
      dispatch(prependWarning('admin role required, action aborted'));
      return;
    }
    if (ACTIONS_EXECUTOR_MODERATOR_KEYS.has(key) && !roles.includes(MOD)) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, chordPrefix, 'c');
      dispatch(clearOnlyWarnings());
      dispatch(prependWarning('moderator role required, action aborted'));
      return;
    }

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, chordPrefix, 'c');
    dispatch(actionCreator());
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};