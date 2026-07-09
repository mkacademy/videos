import { AppDispatch, store } from '../store';
import { clearOnlyWarnings, prependError, prependWarning, appendWarnings, clearShortcuts } from '../store/slices/errorSlice';
import { modifyTimestamps } from '../store/slices/stashSlice';
import { mutateSettings, setAssertOwnership } from '../store/slices/settingsSlice';
import { isOwnershipQueueActive } from '../store/middleware/ownershipSaveQueue';
import { cacheContent } from './actions';
import {
  IGNORE_WEBAPP_JUMP_IN,
  allQuickReferenceLines,
  buildShortcutStashBoundaryRetimestampPayloads,
  collectNonEmptyStashEntries,
  formatShortcutTimestampWarningLine,
  hierarchyShortcutStashBaseUnixSeconds,
  isEscrowedItemsShortcutStashBase,
  parseHierarchyStampedStashKey,
  sortStashInventoryWarningLines,
  type QuickReferenceLinesByRole,
} from './ShortcutsUtils';
import { exportCommentsStashToFile } from './commentsStashUtils';
import { commentsTimestamp, isPncUserApp } from '../utils';
import { isCtrlShiftChordModifierSidesBaseOk } from './Shortcuts_b';
import { recordKeyboardShortcutFromChord } from './ShortcutRecording';
import { dispatchGenerateLink } from './generateLinkDispatch';

export const KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE: QuickReferenceLinesByRole = {
  anonymous: [
    'Keyboard shortcuts — Quick reference (profile D)',
    '-------------------------------- Handles stash shortcuts --------------------------------',
    'Ctrl + Shift + A — Generate URL link and copy to clipboard',
    'Ctrl + Shift + B — Cache current parent and entity content',
    'Ctrl + Shift + C — Rolodex: newest escrow stash group gets the oldest base timestamp',
    'Ctrl + Shift + D — Export all comments stash routes to Stash_comments_{id}.json',
    'Ctrl + Shift + E — Rolodex: oldest escrow stash group gets the newest base timestamp',
    'Ctrl + Shift + F — Append shortcut log to Activity warnings',
    'Ctrl + Shift + G — Clear shortcut log',
    '-------------------------------- Global UI shortcuts --------------------------------',
    'Ctrl + Shift + L — Show profile D quick reference in Activity warnings',
    'Ctrl + ` — Switch to profile A and list all profiles',
  ],
  member: [
    '-------------------------------- ColTen settings shortcuts (any role) --------------------------------',
    'Ctrl + Shift + Z — Cycles (breath/depth, separate/combine, plant/uproot, ownership, assemble)',
    'Ctrl + Shift + . — Next Ctrl + Shift + Z advances to the next ColTen option type',
  ],
  moderator: [],
  admin: [],
};

/** Full profile D list (all role tiers) for chord recording. */
export const KEYBOARD_QUICK_REFERENCE_WARNING_LINES: readonly string[] =
  allQuickReferenceLines(KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE);

const isActiveShortcutsD = (): boolean =>
  store.getState().settings.activeShortcuts === 'd';

const isCtrlShiftChordModifierSidesOkForD = (event: KeyboardEvent): boolean =>
  isActiveShortcutsD() && isCtrlShiftChordModifierSidesBaseOk(event);

/**
 * Ctrl+Shift+B (profile D only): mirrors Editor stash icon behavior by dispatching
 * `cacheContent(parent + entity)`.
 */
export const registerCacheSelectedShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.key !== 'b' && event.key !== 'B') return;
    if (!window.location.pathname.startsWith('/app')) return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const state = store.getState();
    const entity = state.view.entity;
    const parent = state.view.parentData?.parent;
    if (!entity || !parent) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + B', 'd');
    dispatch(cacheContent(parent + entity));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+C / Ctrl+Shift+E (profile D, PNC only): retimestamp current app escrow shortcut stash
 * hierarchy groups (`Escrowed_items-*` only).
 * - C: newest group gets the oldest base timestamp.
 * - E: oldest group gets the newest base timestamp.
 */
export const registerTimestampRolodex = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    const isMoveToOldest = event.key === 'c' || event.key === 'C';
    const isMoveToLatest = event.key === 'e' || event.key === 'E';
    if (!isMoveToOldest && !isMoveToLatest) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const state = store.getState();
    if (!isPncUserApp(state.session.curApp)) return;
    const payloads = buildShortcutStashBoundaryRetimestampPayloads(
      state,
      isMoveToOldest ? 'oldest' : 'latest'
    );
    if (!payloads?.length) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(
      dispatch,
      isMoveToOldest ? 'Ctrl + Shift + C' : 'Ctrl + Shift + E',
      'd',
    );
    dispatch(modifyTimestamps(payloads));
    const nextState = store.getState();
    const entries = collectNonEmptyStashEntries(nextState.stash).filter(({ timestamp }) => {
      const parsed = parseHierarchyStampedStashKey(timestamp);
      return (
        parsed?.webappIndex === nextState.session.curApp &&
        isEscrowedItemsShortcutStashBase(parsed.base)
      );
    });
    const lines = sortStashInventoryWarningLines(entries);
    const towardOldestSuffix = ' ↑ ';
    const towardLatestSuffix = ' ↓ ';
    const escrowBaseUnixFromFullTimestamp = (timestamp: string): number | null => {
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (!parsed || !isEscrowedItemsShortcutStashBase(parsed.base)) return null;
      return hierarchyShortcutStashBaseUnixSeconds(parsed.base);
    };
    const escrowBaseUnixes = entries
      .map((e) => escrowBaseUnixFromFullTimestamp(e.timestamp))
      .filter((u): u is number => u !== null);
    const minEscrowBaseUnix = escrowBaseUnixes.length ? Math.min(...escrowBaseUnixes) : NaN;
    const maxEscrowBaseUnix = escrowBaseUnixes.length ? Math.max(...escrowBaseUnixes) : NaN;
    const directionSuffixForInventoryLine = (line: string): string => {
      const sep = ' : ';
      const idx = line.lastIndexOf(sep);
      const timestampPart = idx >= 0 ? line.slice(idx + sep.length) : line;
      const u = escrowBaseUnixFromFullTimestamp(timestampPart);
      if (
        u === null ||
        !Number.isFinite(minEscrowBaseUnix) ||
        !Number.isFinite(maxEscrowBaseUnix) ||
        minEscrowBaseUnix === maxEscrowBaseUnix
      ) {
        return isMoveToOldest ? towardOldestSuffix : towardLatestSuffix;
      }
      if (isMoveToOldest) return u === minEscrowBaseUnix ? towardOldestSuffix : towardLatestSuffix;
      return u === maxEscrowBaseUnix ? towardLatestSuffix : towardOldestSuffix;
    };
    const warningLines =
      lines.length === 0
        ? ['Stash empty']
        : lines.map((inventoryLine) => {
          const directionSuffix = directionSuffixForInventoryLine(inventoryLine);
          return formatShortcutTimestampWarningLine(inventoryLine) + directionSuffix;
        });
    dispatch(appendWarnings(warningLines));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+D (profile D only): exports every `comments/*` route at {@link commentsTimestamp}
 * as `Stash_comments_{identifier}.json` (not webapp-specific).
 */
export const registerExportCommentsStashShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.key !== 'd' && event.key !== 'D') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + D', 'd');
    dispatch(clearOnlyWarnings());
    const result = exportCommentsStashToFile(store.getState().stash, dispatch, commentsTimestamp);
    if (result.status === 'no_data') {
      dispatch(prependError('No comments stash data to export (stash comments with Ctrl+Shift+B first).'));
      return;
    }
    dispatch(
      prependWarning(
        `Exporting ${result.entryCount} comment thread${result.entryCount === 1 ? '' : 's'} from ${result.exported} route${result.exported === 1 ? '' : 's'}: ${result.routeLabels.join(', ')}.`
      )
    );
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+F (profile D only): appends this chord to `error.shortcuts`, clears Activity warnings,
 * then spreads the shortcut log into warnings.
 */
export const registerReplayKeyboardShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.key !== 'f' && event.key !== 'F') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + F', 'd');
    const { shortcuts } = store.getState().error;
    dispatch(clearOnlyWarnings());
    dispatch(appendWarnings([...shortcuts]));
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+G (profile D only): clears `error.shortcuts`, records this chord, then warns that the
 * shortcut log was cleared.
 */
export const registerClearShortcutLogShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.key !== 'g' && event.key !== 'G') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    dispatch(clearShortcuts());
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + G', 'd');
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning('shortcut log cleared'));
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

type ColTenCycleStage =
  | 'breath-depth'
  | 'insert-remove'
  | 'ownership'
  | 'assemble';

const COL_TEN_CYCLE_STAGE_ORDER: readonly ColTenCycleStage[] = [
  'breath-depth',
  'insert-remove',
  'ownership',
  'assemble',
];

const COL_TEN_STAGE_LABELS: Record<ColTenCycleStage, string> = {
  'breath-depth': 'breath_selection',
  'insert-remove': 'insert_remove_trees',
  ownership: 'assert_ownership',
  assemble: 'assemble_texts',
};

const NEUTRAL_LABEL = 'Unselected';
const BREATH_DEPTH_LABELS = ['Breath Selection', 'Depth Selection'];
const INSERT_REMOVE_LABELS = ['Plant Trees', 'Uproot Trees'] as const;
const ASSEMBLE_LABELS = ['Assemble Texts', 'Assemble Base64'] as const;
const OWNERSHIP_LABELS = [NEUTRAL_LABEL, 'Assert Ownership', 'Unassert Ownership'];
const OWNERSHIP_ORDER: readonly (boolean | undefined)[] = [undefined, true, false];

const binaryPairIndex = (firstActive: boolean, secondActive: boolean): number => {
  if (firstActive && !secondActive) return 0;
  if (!firstActive && secondActive) return 1;
  return 0;
};

/** neutral → first → second → neutral (breath/depth has no neutral). */
const triStatePairIndex = (firstActive: boolean, secondActive: boolean): number => {
  if (!firstActive && !secondActive) return 0;
  if (firstActive && !secondActive) return 1;
  if (!firstActive && secondActive) return 2;
  return 1;
};

const ownershipOrderIndex = (value: boolean | undefined): number => {
  const idx = OWNERSHIP_ORDER.indexOf(value);
  return idx === -1 ? 0 : idx;
};

const formatBreathDepthWarningLines = (activeIdx: number): string[] =>
  BREATH_DEPTH_LABELS.map((label, idx) => (idx === activeIdx ? `${label}_` : label));

const formatTriStateWarningLines = (
  optionLabels: readonly [string, string],
  activeIdx: number,
): string[] =>
  [NEUTRAL_LABEL, optionLabels[0], optionLabels[1]].map((label, idx) =>
    idx === activeIdx ? `${label}_` : label,
  );

const formatOwnershipWarningLines = (activeIdx: number): string[] =>
  OWNERSHIP_LABELS.map((label, idx) => (idx === activeIdx ? `${label}_` : label));

const nextColTenCycleStage = (stage: ColTenCycleStage): ColTenCycleStage => {
  const idx = COL_TEN_CYCLE_STAGE_ORDER.indexOf(stage);
  return COL_TEN_CYCLE_STAGE_ORDER[(idx + 1) % COL_TEN_CYCLE_STAGE_ORDER.length];
};

const applyBreathDepthOption = (dispatch: AppDispatch, activeIdx: number): void => {
  dispatch(
    mutateSettings(
      activeIdx === 0
        ? { isBreathSelection: true, isDepthSelection: false }
        : { isBreathSelection: false, isDepthSelection: true },
    ),
  );
  dispatch(appendWarnings(formatBreathDepthWarningLines(activeIdx)));
};

const applyInsertRemoveOption = (dispatch: AppDispatch, activeIdx: number): void => {
  dispatch(
    mutateSettings({
      isInsertTrees: activeIdx === 1,
      isRemoveTrees: activeIdx === 2,
    }),
  );
  dispatch(appendWarnings(formatTriStateWarningLines(INSERT_REMOVE_LABELS, activeIdx)));
};

const applyOwnershipOption = (dispatch: AppDispatch, activeIdx: number): void => {
  if (isOwnershipQueueActive()) return;
  dispatch(setAssertOwnership(OWNERSHIP_ORDER[activeIdx]));
  dispatch(appendWarnings(formatOwnershipWarningLines(activeIdx)));
};

const applyAssembleOption = (dispatch: AppDispatch, activeIdx: number): void => {
  dispatch(
    mutateSettings({
      isAssembleTexts: activeIdx === 1,
      isAssembleBase64: activeIdx === 2,
    }),
  );
  dispatch(appendWarnings(formatTriStateWarningLines(ASSEMBLE_LABELS, activeIdx)));
};

/**
 * Ctrl+Shift+Z / Ctrl+Shift+. (profile D only): staged cycle for ColTen settings pairs
 * (breath/depth → plant/uproot → ownership → assemble). Z cycles within
 * the active type (wraps at list end). Period arms the next Z to advance stage. Any role.
 * All option types default to neutral except breath/depth (always one of the two).
 */
export const registerColTenSettingsCycleShortcut = (dispatch: AppDispatch) => {
  let stage: ColTenCycleStage = 'breath-depth';
  let advanceStageOnNextZ = false;

  const advanceToNextStage = (): void => {
    stage = nextColTenCycleStage(stage);
    if (stage === 'breath-depth') {
      applyBreathDepthOption(dispatch, 0);
      return;
    }
    if (stage === 'insert-remove') {
      applyInsertRemoveOption(dispatch, 0);
      return;
    }
    if (stage === 'ownership') {
      applyOwnershipOption(dispatch, 0);
      return;
    }
    applyAssembleOption(dispatch, 0);
  };

  const cycleHandler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.key !== 'z' && event.key !== 'Z') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    dispatch(clearOnlyWarnings());

    if (advanceStageOnNextZ) {
      advanceStageOnNextZ = false;
      advanceToNextStage();
      return;
    }

    const settings = store.getState().settings;
    if (stage === 'breath-depth') {
      const current = binaryPairIndex(settings.isBreathSelection, settings.isDepthSelection);
      const next = (current + 1) % BREATH_DEPTH_LABELS.length;
      applyBreathDepthOption(dispatch, next);
      return;
    }

    if (stage === 'insert-remove') {
      const current = triStatePairIndex(settings.isInsertTrees, settings.isRemoveTrees);
      const next = (current + 1) % 3;
      applyInsertRemoveOption(dispatch, next);
      return;
    }

    if (stage === 'ownership') {
      const current = ownershipOrderIndex(settings.assertOwnership);
      const next = (current + 1) % OWNERSHIP_ORDER.length;
      applyOwnershipOption(dispatch, next);
      return;
    }

    const current = triStatePairIndex(settings.isAssembleTexts, settings.isAssembleBase64);
    const next = (current + 1) % 3;
    applyAssembleOption(dispatch, next);
  };

  const armAdvanceStageHandler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.code !== 'Period') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    dispatch(clearOnlyWarnings());

    const nextStage = nextColTenCycleStage(stage);
    advanceStageOnNextZ = true;
    dispatch(
      prependWarning(
        `Next Ctrl + Shift + Z will advance from ${COL_TEN_STAGE_LABELS[stage]} to ${COL_TEN_STAGE_LABELS[nextStage]}`,
      ),
    );
  };

  const cycleWithRecording = (event: KeyboardEvent) => {
    const preventedBefore = event.defaultPrevented;
    cycleHandler(event);
    if (!preventedBefore && event.defaultPrevented) {
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Z', 'd');
    }
  };

  const armWithRecording = (event: KeyboardEvent) => {
    const preventedBefore = event.defaultPrevented;
    armAdvanceStageHandler(event);
    if (!preventedBefore && event.defaultPrevented) {
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + .', 'd');
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
 * Ctrl+Shift+A (profile D only): builds a shareable URL from open tutorial/course/quiz
 * selections and copies it to the clipboard (`dispatchGenerateLink`).
 */
export const registerGenerateLinkShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOkForD(event)) return;
    if (event.key !== 'a' && event.key !== 'A') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + A', 'd');
    dispatchGenerateLink(dispatch, store.getState());
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};
