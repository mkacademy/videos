import type { MouseEvent as ReactMouseEvent } from 'react';
import { navigateConvolutionOrWarn, stickyFsqFromState, syncConvolutionUrlFsq, toggleFetchSequenceConfiguration, warnConvolutionCsFsqConflict } from './convolutionNavSearch';
import type { NavigateFunction } from 'react-router-dom';
import { TABULATOR_RENDER_CAP } from '../constants';
import { AppDispatch, store } from '../store';
import {
  switchToMinimunFeature,
  switchToMaximunFeature,
  toggleFormatter as setFormatters,
  toggleShowCopyIcons,
  toggleShouldHydrate,
  toggleEditMode,
  toggleShouldDelete,
  queryLimitSelected,
  setShiftKeyDown,
  setCtrlKeyDown,
  setAltKeyDown,
} from '../store/slices/settingsSlice';
import {
  dispatchConvolutionClearFetched,
  dispatchSettingsClearContent,
  isMinimumFeatureMode,
} from './clearContentDispatch';
import {
  destroyOverview,
  escrowContents,
  escrowRows,
  extractMocks,
  initLoading,
  simpleSelector,
  simpleUnselector,
  simpleInverter,
  extractContent,
  fetchedClearers,
} from './actions';
import {
  cookIngredients,
  getActionFromUrl,
  getCurAppName,
  getRouteAlias,
  getInteractionIDs,
  isPncUserApp,
  queryLimits,
  commentsTimestamp,
  Tree,
} from '../utils';
import { setPagedRoute } from '../store/slices/paginationSlice';
import { clearData } from '../store/slices/rowSlice';
import { clearEscrow } from '../store/slices/viewSlice';
import { reEncodeData } from './IdentitiesExtractor';
import { ParentData } from '../store/slices/viewSlice';
import { setProgrammaticNavigation } from '../Hooks/useQueryMedia';
import { clearOnlyWarnings, prependError, prependWarning, appendWarnings } from '../store/slices/errorSlice';
import { mutatePrefix, shiftTabulatorRenderWindow } from '../store/slices/sessionSlice';
import {
  dispatchShortcutEscrowStashRemoved,
  dispatchShortcutMemberEscrowStashRemoved,
  dispatchShortcutUnjoinClearAndStashRemoved,
} from '../store/middleware/UiuxManager';
import { dispatchCascadingUnstash } from '../store/middleware/cascadingUnstasher';
import {
  buildSharedPagedRouteShortcutContext,
  BuildSharedPagedRouteShortcutContextOptions,
  digitFromCtrlAltNumberKey,
  findMemberDeletedStashExtractPayload,
  IGNORE_WEBAPP_JUMP_IN,
  MINIMUM_FEATURE_SHORTCUT_DISABLED_MESSAGE,
  resolveConvolutionCtrlAltNav,
  collectCurAppNonEmptyStashEntries,
  computeStashInventoryListMessages,
  computeStashInventoryNavigateEffect,
  formatShortcutTimestampWarningLine,
  sortStashInventoryWarningLines,
  type StashInventoryNavigateDirection,
  tryEscrowCurrentPagedRouteThen,
  type PagedRouteFromTo,
  findSelectedOrLatestStashFreights,
  findSelectedOrLatestStashFreightsForDelete,
  findSelectedOrLatestStashFreightsForWebapp,
  collectCurAppMemberStashCellsToClear,
  tabulatorVisibleCount,
  beginImportSelectedStashRoutes,
  dispatchExportSelectedStashRoutesFeedback,
  dispatchImportSelectedStashRoutesFeedback,
  exportSelectedCascadingStashRoutes,
  allQuickReferenceLines,
  type QuickReferenceLinesByRole,
} from './ShortcutsUtils';
import {
  combineTutorialTreesStash,
  convertCoursesToTutorialsStash,
  resolveConvertStashDirection,
  separateTutorialTreesStash,
} from './stashConvertUtils';
import { stopQueuedSequentialThunks } from '../store/middleware/sequentialThunkQueues';
import { dispatchSaveEditsForAllWebapps } from '../store/middleware/saveEditsQueue';
import { recordKeyboardShortcutFromChord } from './ShortcutRecording';
import { restoreCommentsStash } from '../store/slices/commentsSlice';
import {
  buildCommentsStashPayloadsFromState,
  collectCommentsStashExportDatas,
  commentsStashRoutesToState,
  countCommentsStashEntries,
  listCommentsStashApproutes,
} from './commentsStashUtils';
import { appendRoute, appendRoutes, removeTimestamp, setStashInventoryNavSelection } from '../store/slices/stashSlice';
import type { Handler } from '../store/slices/errorSlice';
import type { DataRow, Metadata } from '../components/Core/types';
export type {
  BuildSharedPagedRouteShortcutContextOptions,
  PagedRouteFromTo,
  SharedPagedRouteShortcutContext,
} from './ShortcutsUtils';
export { buildSharedPagedRouteShortcutContext } from './ShortcutsUtils';

const QUERY_LIMIT_ORDER = Object.keys(queryLimits)
  .map(Number)
  .sort((a, b) => a - b);

const nextQueryLimitValue = (current: number | undefined): number => {
  if (!QUERY_LIMIT_ORDER.length) return 50;
  if (current === undefined) return QUERY_LIMIT_ORDER[0];
  const idx = QUERY_LIMIT_ORDER.indexOf(current);
  const base = idx === -1 ? 0 : idx + 1;
  return QUERY_LIMIT_ORDER[base % QUERY_LIMIT_ORDER.length];
};

const HANDLE_PARENT_TO_ROW_FIELD: Record<string, keyof DataRow> = {
  underbosses: 'underboss',
  dashboards: 'dashboard',
  filters: 'filter',
  sifters: 'sifter',
  minions: 'minion',
  bosses: 'boss',
};

const parseHandleParent = (key: string): string | null => {
  const match = key.match(/^handles(.+)$/i);
  if (!match) return null;
  return match[1]?.toLowerCase() ?? null;
};

const buildRowFromHandle = (
  rowField: keyof DataRow,
  handler: Handler,
  metadata: Metadata
): DataRow => ({
  id: handler.id,
  [rowField]: handler.keyword,
  metadata,
  descendentsSums: {},
  sizeInBytes: 0,
  status: 0,
  checked: true,
  frozen: false,
  modified: true,
});

/**
 * Avoid raw URL slashes in strings (see `splitter` in `errorSlice`).
 * Each tier holds only that role's shortcuts; display merges anonymous → member → moderator → admin.
 */
export const KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE: QuickReferenceLinesByRole = {
  anonymous: [
    'Keyboard shortcuts — Quick reference (profile B)',
    '-------------------------------- Navigation shortcuts --------------------------------',
    'Ctrl + ` — Switch to profile A and list all profiles',
    'Ctrl + Alt + 0 — Open settings',
    'Ctrl + Alt + 1..8 — Jump to convolution webapps',
    'Ctrl + Alt + 9 — Open tabulator when not already in Tabulator',
    'Ctrl + Alt + NumpadDecimal — Go back or leave app and settings flows',
    'Ctrl + Alt + NumpadMultiply — Toggle tabulator rows vs content views flow',
    '-------------------------------- Global UI shortcuts --------------------------------',
    'Ctrl + Backspace — Toggle feature mode (minimum vs maximum)',
    'Ctrl + Shift + C — Toggle copy icons',
    'Ctrl + Shift + J — Toggle Roots modal',
    'Ctrl + Shift + L — Show profile B quick reference in Activity warnings',
    '-------------------------------- content shortcuts --------------------------------',
    'Ctrl + Shift + Q — Clear content for current context',
    'Ctrl + Shift + G — Save content for current webapp',
    '-------------------------------- Paged routes shortcuts --------------------------------',
    'Ctrl + Shift + 4 or 6 — Previous or next paged route',
    'Ctrl + Shift + R — List paged routes; current route marked with trailing underscore',
    '-------------------------------- Current route shortcuts --------------------------------',
    'Ctrl + Shift + S — Extract Ids of current route, then select',
    'Ctrl + Shift + U — Extract Ids of current route, then unselect',
    'Ctrl + Shift + I — Extract Ids of current route, then invert selection',
    'Ctrl + Shift + NumpadSubtract — Toggle deletion guard (`settings.shouldDelete`)',
    '-------------------------------- Settings batches shortcuts --------------------------------',
    'Ctrl + Shift + M — Stop queued sequential thunk actions (edit/tabulator saves, visibility updates, …)',
    'Ctrl + Shift + E — Tabulator: previous row window (up to 1000 rows)',
    'Ctrl + Shift + H — Toggle hydration (`settings.shouldHydrate`)',
    'Ctrl + Shift + K — Tabulator: next row window (up to 1000 rows)',
    'Ctrl + Shift + NumpadDivide — Cycle max pending hydration queries (50 → 100 → 150 → 250 → 500 → 1000)',
    '-------------------------------- Contextual view shortcuts --------------------------------',
    'Ctrl + Escape — Reset chapters (Chapters selector)',
    'Ctrl + Shift + ← or → (ArticleSelector) — Previous or next article',
    'Ctrl + Shift + ← or → (Chapters) — Previous or next chapter group',
    'Ctrl + Shift + ← or → (ViewSelector) — Toggle dismissed for current route',
    'Ctrl + Shift + ↑ or ↓ — Cycle unzip types (course, tutorial, quiz)',
    'Escape — Exit expanded row or card view',
    '-------------------------------- Right-only modifiers shortcuts --------------------------------',
    'Right Shift — Range-select: first click sets anchor, second click expands ordinal range',
    'Right Control — Reorder selection between anchor and clicked highlight',
    'Right Alt — Group-reorder between anchor and clicked highlight',
  ],
  member: [
    '-------------------------------- Mocks shortcuts --------------------------------',
    'Ctrl + Shift + A — Create "to" mocks for current route',
    'Ctrl + Shift + NumpadAdd — Toggle fetch sequence configuration (and sync fsq in URL on PnC routes)',
    '-------------------------------- PNC stash shortcuts --------------------------------',
    'Ctrl + Shift + P — List non-empty stash cells for the current webapp as warnings',
    'Ctrl + Shift + N — Stash inventory: previous hierarchy group (current webapp)',
    'Ctrl + Shift + V — Stash inventory: next hierarchy group (current webapp)',
    'Ctrl + Shift + X — PNC: delete selected stash group; other apps: clear deleted/escrow stash on all routes',
    'Ctrl + Shift + B — Stash all comments into comments stash timestamp',
    'Ctrl + Shift + T — Unstash comments stash into comments slice',
    '-------------------------------- PNC join and unstash shortcuts --------------------------------',
    'Ctrl + Shift + D — PNC: local unjoin finalize; other apps: destroy overview',
    'Ctrl + Shift + Y — Escrow stash without UI unjoin clear (PNC: Escrowed_items; other apps: escrowTimestamp)',
    'Ctrl + Shift + Z — PNC: unstash selected stash inventory group (Unjoined/Escrowed), else latest; non-PNC: deleted stash',
    '-------------------------------- PNC instructions route shortcuts --------------------------------',
    'Ctrl + Shift + O — Build stash rows from error handles and append by foundation route',
    'Ctrl + Shift + W — Export selected cascading stash group as one JSON file',
    'Ctrl + Shift + F — Import stash JSON (PNC: new Escrowed_items group; other apps: escrowTimestamp per route)',
    'Ctrl + Shift + . — Toggle settings edit mode (PNC, authenticated)',
  ],
  moderator: [],
  admin: [],
};

/** Full profile B list (all role tiers) for chord recording. */
export const KEYBOARD_QUICK_REFERENCE_WARNING_LINES: readonly string[] =
  allQuickReferenceLines(KEYBOARD_QUICK_REFERENCE_WARNING_LINES_BY_ROLE);

/**
 * Registers a global keyboard shortcut for Ctrl + Backspace that toggles
 * between `switchToMinimunFeature` and `switchToMaximunFeature` on each press.
 *
 * Call this once (e.g. in your root component) and store/execute the
 * cleanup function it returns on unmount.
 */
export const registerModeSwitchShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    // Only react to Ctrl + Backspace
    if (event.key !== 'Backspace' || !isCtrlOnlyChordLeftControlOk(event)) return;
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Backspace');
    if (isMinimumFeatureMode(store.getState())) dispatch(switchToMaximunFeature());
    else dispatch(switchToMinimunFeature());
  };
  window.addEventListener('keydown', handler);
  // Return an unsubscribe function for cleanup
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Registers a global keyboard shortcut for Ctrl + Shift + C that toggles
 * visibility of copy-to-clipboard icons (`toggleShowCopyIcons`).
 *
 * Call this once (e.g. in your root component) and run the returned
 * cleanup on unmount.
 */
export const registerShowCopyIconsShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'c' && event.key !== 'C') return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + C');
    dispatch(toggleShowCopyIcons());
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+M (profile B only): stops the active sequential-thunk queue session via
 * {@link stopQueuedSequentialThunks}. New batched pipelines register in
 * `store/middleware/sequentialThunkQueues.ts`.
 */
export const registerStopQueuedSequentialThunksShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'm' && event.key !== 'M') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    if (!stopQueuedSequentialThunks(dispatch)) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + M');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+O (profile B only): converts `error.handles` buckets into stash rows and appends each
 * mapped parent bucket under `foundation{parent}` with timestamp `handles-<unixMs>`.
 */
export const performHandlesToStashShortcut = (dispatch: AppDispatch): void => {
  const handlesByKey = store.getState().error.handles;
  if (!handlesByKey || Object.keys(handlesByKey).length === 0) {
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning('No handles found in error state.'));
    return;
  }

  const timestamp = `handles-${Date.now()}`;
  let routeCount = 0;
  let rowCount = 0;

  for (const [key, handles] of Object.entries(handlesByKey)) {
    const parent = parseHandleParent(key);
    if (!parent) continue;
    const rowField = HANDLE_PARENT_TO_ROW_FIELD[parent];
    if (!rowField) continue;
    if (!Array.isArray(handles) || handles.length === 0) continue;

    let ids: { parentID: string; childID: string } | null = null;
    try {
      const resolvedIds = getInteractionIDs('foundation', parent);
      if (!resolvedIds.parentID || !resolvedIds.childID) continue;
      ids = {
        parentID: resolvedIds.parentID,
        childID: resolvedIds.childID,
      };
    } catch {
      continue;
    }
    if (!ids) continue;
    const { parentID, childID } = ids;

    const dataRows = handles.map((entry, index) => {
      const metadata: Metadata = {
        owner: true,
        ordinal: index + 1,
        [childID]: entry.id,
        [parentID]: [],
      };
      return buildRowFromHandle(rowField, entry, metadata);
    });
    if (dataRows.length === 0) continue;

    const approute = `foundation${parent}`;
    dispatch(appendRoute({ approute, timestamp, content: dataRows }));
    routeCount += 1;
    rowCount += dataRows.length;
  }

  dispatch(clearOnlyWarnings());
  if (rowCount === 0) {
    const warning = 'No supported handles buckets found (Dashboards, Filters, Minions, Underbosses, Bosses, Sifters).';
    dispatch(prependWarning(warning));
    return;
  }
  const message = formatShortcutTimestampWarningLine(
    `Inserted ${rowCount} handle row${rowCount === 1 ? '' : 's'} into stash across ${routeCount} route${routeCount === 1 ? '' : 's'} (timestamp: ${timestamp}).`
  );
  dispatch(prependWarning(message));
};

/**
 * Settings Convert Stash: direction from `isCoursesToQuizzes` × `isTutorialsToCourses` toggles.
 * Courses → tutorials is implemented; other directions show a not-implemented warning.
 */
export const performConvertStashShortcut = (dispatch: AppDispatch): void => {
  const state = store.getState();
  const { isCoursesToQuizzes, isTutorialsToCourses } = state.settings;
  const direction = resolveConvertStashDirection(isCoursesToQuizzes, isTutorialsToCourses);

  dispatch(clearOnlyWarnings());

  switch (direction) {
    case 'courses-to-tutorials': {
      const result = convertCoursesToTutorialsStash(state);
      if (!result.ok) {
        dispatch(prependWarning(result.error));
        return;
      }
      dispatch(appendRoutes([...result.escrowAppendPayloads, ...result.joinAppendPayloads]));
      dispatch(setStashInventoryNavSelection(result.stashNav));
      const message = formatShortcutTimestampWarningLine(
        `Converted course stash to tutorial Escrowed_items (${result.escrowRouteLabels.join(', ')}) and Joined_items (${result.joinRouteLabels.join(', ')}) groups.`
      );
      dispatch(prependWarning(message));
      return;
    }
    case 'tutorials-to-courses':
      dispatch(prependWarning('conversion not implemented yet for tutorials -> course'));
      return;
    case 'courses-to-quizzes':
      dispatch(prependWarning('conversion not implemented yet for courses -> quiz'));
      return;
    case 'quizzes-to-courses':
      dispatch(prependWarning('conversion not implemented yet for quizzes -> course'));
      return;
  }
};

/**
 * Settings Combine Trees: tutorial only — merges stash `filtersinstructions` under one new
 * `foundationfilters` row in new Escrowed_items / Joined_items groups. Other apps log a stub.
 */
export const performCombineTreesShortcut = (dispatch: AppDispatch): void => {
  const state = store.getState();
  const webappIndex = state.session.curApp;
  const appName = getCurAppName(webappIndex);

  dispatch(clearOnlyWarnings());

  if (appName !== 'tutorial') {
    console.log('not implemented yet');
    return;
  }

  const result = combineTutorialTreesStash(state);
  if (!result.ok) {
    dispatch(prependWarning(result.error));
    return;
  }

  dispatch(appendRoutes([...result.escrowAppendPayloads, ...result.joinAppendPayloads]));
  dispatch(setStashInventoryNavSelection(result.stashNav));
  const message = formatShortcutTimestampWarningLine(
    `Combined tutorial trees into Escrowed_items (${result.escrowRouteLabels.join(', ')}) and Joined_items (${result.joinRouteLabels.join(', ')}) groups.`
  );
  dispatch(prependWarning(message));
};

/**
 * Settings Separate Trees: tutorial only — splits stash `filtersinstructions` at checked row
 * breakpoints into multiple `foundationfilters` trees in new Escrowed_items / Joined_items groups.
 * Other apps log a stub.
 */
export const performSeparateTreesShortcut = (dispatch: AppDispatch): void => {
  const state = store.getState();
  const webappIndex = state.session.curApp;
  const appName = getCurAppName(webappIndex);

  dispatch(clearOnlyWarnings());

  if (appName !== 'tutorial') {
    console.log('not implemented yet');
    return;
  }

  const result = separateTutorialTreesStash(state);
  if (!result.ok) {
    dispatch(prependWarning(result.error));
    return;
  }

  dispatch(appendRoutes([...result.escrowAppendPayloads, ...result.joinAppendPayloads]));
  dispatch(setStashInventoryNavSelection(result.stashNav));
  const childSummary = result.segmentChildCounts.join(', ');
  const message = formatShortcutTimestampWarningLine(
    `Separated tutorial trees (${childSummary} children) into Escrowed_items (${result.escrowRouteLabels.join(', ')}) and Joined_items (${result.joinRouteLabels.join(', ')}) groups.`
  );
  dispatch(prependWarning(message));
};

export const registerHandlesToStashShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'o' && event.key !== 'O') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    performHandlesToStashShortcut(dispatch);
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + O');
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+W (profile B only): exports stash rows to JSON — PNC uses the inventory-selected
 * cascading stash chain; other webapps export all current-app routes with stash.
 */
export const registerExportSelectedStashRoutesShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'w' && event.key !== 'W') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + W');
    const result = exportSelectedCascadingStashRoutes(store.getState(), dispatch);
    dispatchExportSelectedStashRoutesFeedback(dispatch, result);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+F (profile B only): imports stash JSON — PNC creates a new `Escrowed_items` hierarchy
 * group; other webapps replace `escrowTimestamp` per route.
 */
export const registerImportSelectedStashRoutesShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'f' && event.key !== 'F') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + F');
    const result = beginImportSelectedStashRoutes(store.getState(), dispatch);
    dispatchImportSelectedStashRoutesFeedback(dispatch, result);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Tracks the right Shift key only (`code === 'ShiftRight'`): sets `settings.shiftKeyDown` true on
 * keydown and false on that key’s keyup (left Shift does not affect the flag).
 * Resets to false on window blur so the flag does not stick after alt-tab.
 */
export const registerShiftKeyShortcut = (dispatch: AppDispatch) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Shift' || event.code !== 'ShiftRight') return;
    recordKeyboardShortcutFromChord(dispatch, 'Right Shift');
    dispatch(setShiftKeyDown(true));
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code !== 'ShiftRight') return;
    dispatch(setShiftKeyDown(false));
  };
  const onBlur = () => {
    dispatch(setShiftKeyDown(false));
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
};

/**
 * Tracks the right Control key only (`code === 'ControlRight'`): sets `settings.ctrlKeyDown` true on
 * keydown and false on that key’s keyup (left Control does not affect the flag).
 * Resets to false on window blur so the flag does not stick after alt-tab.
 */
export const registerCtrlKeyShortcut = (dispatch: AppDispatch) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Control' || event.code !== 'ControlRight') return;
    recordKeyboardShortcutFromChord(dispatch, 'Right Control');
    dispatch(setCtrlKeyDown(true));
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code !== 'ControlRight') return;
    dispatch(setCtrlKeyDown(false));
  };
  const onBlur = () => {
    dispatch(setCtrlKeyDown(false));
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
};

const IGNORE_CTRL_CONTEXT_MENU_IN = 'input, textarea, select, [contenteditable="true"]';

/**
 * Prevents macOS Control+click from opening the browser context menu app-wide.
 * Listens on `contextmenu` only (not `mousedown`) so Control+drag on scrollbars still works.
 */
export const registerBlockCtrlClickContextMenu = (): (() => void) => {
  const onContextMenu = (event: MouseEvent) => {
    if (!event.ctrlKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest(IGNORE_CTRL_CONTEXT_MENU_IN)) return;
    event.preventDefault();
  };
  document.addEventListener('contextmenu', onContextMenu, { capture: true });
  return () => document.removeEventListener('contextmenu', onContextMenu, { capture: true });
};

const isLayoutCellCtrlPointer = (event: ReactMouseEvent) =>
  event.ctrlKey || store.getState().settings.ctrlKeyDown;

/**
 * Spread onto clickable layout cells. macOS Control+click does not fire `click`; selection runs on
 * `mousedown` when Control is active (`event.ctrlKey` or right Control held in settings). Normal
 * clicks use `click` only (avoids double dispatch).
 */
export const layoutCellPointerHandlers = (onSelect: (event: ReactMouseEvent) => void) => ({
  onMouseDown: (event: ReactMouseEvent) => {
    if (!isLayoutCellCtrlPointer(event)) return;
    event.preventDefault();
    onSelect(event);
  },
  onClick: (event: ReactMouseEvent) => {
    if (isLayoutCellCtrlPointer(event)) return;
    onSelect(event);
  },
});

/** Right Alt / AltGr: `AltLeft` is ignored. Uses `location === RIGHT` when `code` is `AltLeft` but the key is physically right (e.g. some Mac Option layouts). */
const isRightPhysicalAltKey = (event: KeyboardEvent): boolean =>
  event.code === 'AltRight' ||
  event.key === 'AltGraph' ||
  (event.key === 'Alt' && event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT);

/**
 * Tracks the right Alt key only (`AltRight`, `AltGraph`, or `Alt` with `location === RIGHT`): sets
 * `settings.altKeyDown` true on keydown and false on that key’s keyup (left Alt does not affect the flag).
 * Resets to false on window blur so the flag does not stick after alt-tab.
 */
export const registerAltKeyShortcut = (dispatch: AppDispatch) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isRightPhysicalAltKey(event)) return;
    recordKeyboardShortcutFromChord(dispatch, 'Right Alt');
    dispatch(setAltKeyDown(true));
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (!isRightPhysicalAltKey(event)) return;
    dispatch(setAltKeyDown(false));
  };
  const onBlur = () => {
    dispatch(setAltKeyDown(false));
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
};

/** Physical left modifiers for global chords (right Control/Shift/Alt are tracked separately for other UX). */
let leftControlChordDown = false;
let leftShiftChordDown = false;
let leftAltChordDown = false;

const syncLeftChordModifierSideFromEvent = (event: KeyboardEvent, down: boolean) => {
  switch (event.code) {
    case 'ControlLeft':
      leftControlChordDown = down;
      break;
    case 'ShiftLeft':
      leftShiftChordDown = down;
      break;
    case 'AltLeft':
      leftAltChordDown = down;
      break;
    default:
      break;
  }
};

/**
 * Listens for `ControlLeft` / `ShiftLeft` / `AltLeft` keydown/keyup and resets on `window` blur.
 * Chord handlers use {@link isCtrlShiftChordModifierSidesOk} / {@link isCtrlAltChordModifierSidesOk} /
 * {@link isCtrlOnlyChordLeftControlOk}; call this once near the root (e.g. `useLibraryGlobalShortcuts`).
 */
export const registerLeftModifierChordTracking = () => {
  const onKeyDown = (event: KeyboardEvent) => {
    syncLeftChordModifierSideFromEvent(event, true);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    syncLeftChordModifierSideFromEvent(event, false);
  };
  const onBlur = () => {
    leftControlChordDown = false;
    leftShiftChordDown = false;
    leftAltChordDown = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
};

const isActiveShortcutsB = (): boolean =>
  store.getState().settings.activeShortcuts === 'b';

/** Left Control + left Shift chord shape only (no Alt/Meta); no `activeShortcuts` gate. */
export const isCtrlShiftChordModifierSidesBaseOk = (event: KeyboardEvent): boolean =>
  !!event.ctrlKey &&
  !!event.shiftKey &&
  !event.altKey &&
  !event.metaKey &&
  leftControlChordDown &&
  leftShiftChordDown;

/** Ctrl+Shift+* global chords: left Control + left Shift only (no Alt/Meta); requires `settings.activeShortcuts === 'b'`. */
export const isCtrlShiftChordModifierSidesOk = (event: KeyboardEvent): boolean =>
  isActiveShortcutsB() && isCtrlShiftChordModifierSidesBaseOk(event);

/** Ctrl+Alt+* global chords: left Control + left Alt only (no Shift/Meta); requires `settings.activeShortcuts === 'b'`. */
export const isCtrlAltChordModifierSidesOk = (event: KeyboardEvent): boolean =>
  isActiveShortcutsB() &&
  !!event.ctrlKey &&
  !!event.altKey &&
  !event.shiftKey &&
  !event.metaKey &&
  leftControlChordDown &&
  leftAltChordDown;

/** Ctrl+* without Shift/Alt/Meta: left Control only (e.g. Ctrl+Backspace). */
export const isCtrlOnlyChordLeftControlOk = (event: KeyboardEvent): boolean =>
  !!event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey &&
  !event.metaKey &&
  leftControlChordDown;

/** Chapters: Ctrl+Escape with left Control only. */
export const isChaptersCtrlEscapeChordOk = (event: KeyboardEvent): boolean =>
  event.key === 'Escape' &&
  !!event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey &&
  !event.metaKey &&
  leftControlChordDown;

/**
 * Ctrl+Shift+. (profile B only): toggles settings `editMode` (`toggleEditMode` in `settingsSlice`),
 * same flag as the Settings column “Edit Mode” control.
 */
export const registerEditModeShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.code !== 'Period') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + .');
    const state = store.getState();
    if (!state.session.authenticated) {
      dispatch(clearOnlyWarnings());
      return dispatch(prependWarning('not authenticated, action aborted'));
    }
    if (!isPncUserApp(state.session.curApp)) {
      dispatch(clearOnlyWarnings());
      return dispatch(prependWarning('not a PNC app, action aborted'));
    }
    dispatch(clearOnlyWarnings());
    if (state.settings.editMode) dispatch(prependWarning('Edit mode disabled'));
    else dispatch(prependWarning('Edit mode enabled'));
    dispatch(toggleEditMode());
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+H (profile B only): toggles `settings.shouldHydrate` (hydration gate).
 */
export const registerShouldHydrateShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'h' && event.key !== 'H') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + H');
    const wasEnabled = store.getState().settings.shouldHydrate;
    const off = 'Hydration disabled (shouldHydrate: false).';
    const on = 'Hydration enabled (shouldHydrate: true).';
    dispatch(toggleShouldHydrate());
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning(wasEnabled ? off : on));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+Q: in partial convolution mode (any of `isUnzipCourses`, `isUnzipQuizzes`,
 * `isUnzipTutorials` in settings), runs the same clear pipeline as the Settings clear button.
 * In full feature mode, dispatches `setCleared(true)` then `clearFetched` for the current
 * convolution path using the `fetchedClearers` map in `actions.ts` (same as FullAccount).
 */
export const registerClearContentShortcut = (dispatch: AppDispatch, navigate: NavigateFunction) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'q' && event.key !== 'Q') return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Q');
    const state = store.getState();
    dispatch(clearOnlyWarnings());
    if (isMinimumFeatureMode(state)) {
      const webapp = state.settings.clearContentType;
      dispatchSettingsClearContent(dispatch, store.getState, navigate);
      dispatch(prependWarning(`cleared ${webapp} trees and URL params`));
    } else {
      const pathname = window.location.pathname;
      const matched = (Object.keys(fetchedClearers) as (keyof typeof fetchedClearers)[]).find(
        (p) => pathname === p || pathname.endsWith(p),
      );
      if (!matched) return;
      const webapp = matched.split('/').pop() ?? getCurAppName(state.session.curApp).toLowerCase();
      dispatchConvolutionClearFetched(dispatch, store.getState, navigate);
      dispatch(prependWarning(`cleared ${webapp} stats and URL params`));
    }
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+G: persists content for the current webapp — same dispatches as
 * `saveEdits` for all six webapps (current app first, then the rest via the save queue).
 */
export const registerSaveContentShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'g' && event.key !== 'G') return;
    const webapp = getCurAppName(store.getState().session.curApp).toLowerCase();
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + G');
    dispatchSaveEditsForAllWebapps(dispatch, webapp);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+A: in full feature mode, dispatches `extractMocks` from foundation
 * to a target entity based on the current webapp.
 */
export const registerCreateShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'a' && event.key !== 'A') return;
    const state = store.getState();
    if (!state.session.authenticated) {
      dispatch(clearOnlyWarnings());
      return dispatch(prependWarning("not authenticated, action aborted"));
    }
    const options: BuildSharedPagedRouteShortcutContextOptions = {
      allowInMinimumFeatureMode: true,
    };
    const ctx = buildSharedPagedRouteShortcutContext(options);
    if (!ctx) return;
    const { curApp, routePairs } = ctx;
    const current = state.pagination.selectedRoutes[curApp];
    const createdItemsRoute = routePairs.find(({ urlID }) => urlID === current);
    if (!createdItemsRoute) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + A');
    dispatch(extractMocks({ from: createdItemsRoute.from, to: createdItemsRoute.to }));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+4 / Ctrl+Shift+6:
 * Cycles to previous/next paged route (`selectedRoutes[curApp]`) for current webapp,
 * then shows a warning that selection highlight is not synced between pages (no escrow / selector).
 */
export const registerCyclePagedRouteShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== '4' && event.key !== '6') return;
    const options: BuildSharedPagedRouteShortcutContextOptions = {
      allowInMinimumFeatureMode: true,
    };
    const ctx = buildSharedPagedRouteShortcutContext(options);
    if (!ctx) return;
    const { state, curApp, routePairs, urlIDs } = ctx;
    const current = state.pagination.selectedRoutes[curApp];
    const currentIndex = urlIDs.indexOf(current);
    const normalizedIndex = currentIndex > -1 ? currentIndex : 0;
    const isNext = event.key === '6';
    const nextIndex = isNext
      ? (normalizedIndex + 1) % urlIDs.length
      : (normalizedIndex - 1 + urlIDs.length) % urlIDs.length;
    const currentRoute = routePairs.find(({ urlID }) => urlID === current);
    const nextRoute = routePairs.find(({ urlID }) => urlID === urlIDs[nextIndex]);
    if (!currentRoute || !nextRoute) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + 4 or 6');
    dispatch(setPagedRoute([curApp, urlIDs[nextIndex]]));
    const appName = getCurAppName(curApp);
    const nextRouteAlias = getRouteAlias(nextRoute.urlID, appName);
    const warning = `${appName} route changed (To: ${nextRouteAlias}).`;
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning(warning));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+R:
 * Shows all paged routes for current webapp as warnings and marks the current route with asterisks.
 */
export const registerShowPagedRoutesShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'r' && event.key !== 'R') return;
    const options: BuildSharedPagedRouteShortcutContextOptions = {
      allowInMinimumFeatureMode: true,
    };
    const ctx = buildSharedPagedRouteShortcutContext(options);
    if (!ctx) return;
    const { state, curApp, routePairs } = ctx;
    const current = state.pagination.selectedRoutes[curApp];
    if (!routePairs.length) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + R');
    const appName = getCurAppName(curApp);
    const labels = routePairs.map((route) => {
      const alias = getRouteAlias(route.urlID, appName);
      return route.urlID === current ? `${alias}_` : alias;
    });
    dispatch(appendWarnings(labels.slice().reverse()));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+E / Ctrl+Shift+K (profile B): step the tabulator render window by
 * {@link TABULATOR_RENDER_CAP} rows while Redux keeps the full accumulated list.
 */
export const registerTabulatorRenderWindowShortcuts = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    const key = event.key.toLowerCase();
    if (key !== 'e' && key !== 'k') return;
    if (!window.location.pathname.startsWith('/app')) return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    const state = store.getState();
    const total = tabulatorVisibleCount(state);
    if (total === 0) return;

    const offset = state.session.tabulatorRenderOffset;
    const maxOffset = Math.max(0, total - TABULATOR_RENDER_CAP);
    const direction = key === 'e' ? 'prev' : 'next';
    const canPrev = offset > 0;
    const canNext = offset < maxOffset;

    if (direction === 'prev' && !canPrev) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + E');
      dispatch(clearOnlyWarnings());
      dispatch(prependWarning('Already at the first rows.'));
      return;
    }
    if (direction === 'next' && !canNext) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + K');
      dispatch(clearOnlyWarnings());
      dispatch(prependWarning('Already at the last rows.'));
      return;
    }
    if (total <= TABULATOR_RENDER_CAP) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(
      dispatch,
      direction === 'prev' ? 'Ctrl + Shift + E' : 'Ctrl + Shift + K',
    );
    dispatch(shiftTabulatorRenderWindow(direction));
    const nextOffset =
      direction === 'prev'
        ? Math.max(0, offset - TABULATOR_RENDER_CAP)
        : Math.min(maxOffset, offset + TABULATOR_RENDER_CAP);
    const from = nextOffset + 1;
    const to = Math.min(nextOffset + TABULATOR_RENDER_CAP, total);
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning(`Showing rows ${from}–${to} of ${total}.`));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+P: lists every non-empty stash cell as warnings (`routeAlias : timestamp`),
 * ordered by app ascending, then one hierarchy operation at a time (newer unix first), then hierarchy index ascending
 * ({@link sortStashInventoryWarningLines}).
 */
export const performStashInventoryShortcut = (dispatch: AppDispatch): void => {
  const messages = computeStashInventoryListMessages(store.getState());
  dispatch(appendWarnings(messages.length === 0 ? ['Stash empty'] : messages));
};

export const registerStashInventoryShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'p' && event.key !== 'P') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + P');
    performStashInventoryShortcut(dispatch);
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+V (next) / Ctrl+Shift+N (previous):
 * Replaces warnings, lists stash like Ctrl+Shift+P, highlights the next or previous PNC hierarchy operation
 * (same ordering as the inventory) with a suffix on those lines, and stores that group's base unix in
 * `stash[..][..].unixSeconds` via {@link setStashInventoryNavSelection}.
 */
export const performStashInventoryNavigateShortcut = (
  dispatch: AppDispatch,
  direction: StashInventoryNavigateDirection
): void => {
  const effect = computeStashInventoryNavigateEffect(store.getState(), direction);
  if (effect.kind === 'stash_empty') {
    dispatch(appendWarnings(['Stash empty']));
    return;
  }

  dispatch(appendWarnings(effect.warningMessages));
  if (effect.kind === 'navigate') {
    dispatch(setStashInventoryNavSelection(effect.stashNav));
  }
};

export const registerStashInventoryNavigateShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    const isNext = event.key === 'v' || event.key === 'V';
    const isPrev = event.key === 'n' || event.key === 'N';
    if (!isNext && !isPrev) return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    const direction = isNext ? 'next' : 'prev';
    const effect = computeStashInventoryNavigateEffect(store.getState(), direction);
    if (effect.kind === 'stash_empty') {
      event.preventDefault();
      recordKeyboardShortcutFromChord(
        dispatch,
        isNext ? 'Ctrl + Shift + V' : 'Ctrl + Shift + N',
      );
      dispatch(appendWarnings(['Stash empty']));
      return;
    }

    performStashInventoryNavigateShortcut(dispatch, direction);
    event.preventDefault();
    recordKeyboardShortcutFromChord(
      dispatch,
      isNext ? 'Ctrl + Shift + V' : 'Ctrl + Shift + N',
    );
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+X / settings: delete selected stash group (PNC) or clear member stash cells.
 * Returns whether anything was deleted.
 */
export const performDeleteStashGroupShortcut = (dispatch: AppDispatch): boolean => {
  const state = store.getState();

  if (!isPncUserApp(state.session.curApp)) {
    const cells = collectCurAppMemberStashCellsToClear(state);
    if (!cells.length) return false;
    dispatch(clearOnlyWarnings());
    for (const { approute, timestamp } of cells) {
      dispatch(removeTimestamp({ approute, timestamp }));
    }
    const nextEntries = collectCurAppNonEmptyStashEntries(store.getState());
    const nextLines = sortStashInventoryWarningLines(nextEntries);
    dispatch(
      appendWarnings(
        nextLines.length === 0
          ? ['Stash empty']
          : nextLines.map((line) => formatShortcutTimestampWarningLine(line))
      )
    );
    return true;
  }

  const freights = findSelectedOrLatestStashFreightsForDelete(state);
  if (!freights?.length) return false;

  dispatch(clearOnlyWarnings());
  for (const { approute, timestamp } of freights) {
    dispatch(removeTimestamp({ approute, timestamp }));
  }
  const nextEntries = collectCurAppNonEmptyStashEntries(store.getState());
  const nextLines = sortStashInventoryWarningLines(nextEntries);
  dispatch(
    appendWarnings(
      nextLines.length === 0
        ? ['Stash empty']
        : nextLines.map((line) => formatShortcutTimestampWarningLine(line))
    )
  );
  return true;
};

/**
 * Ctrl+Shift+X:
 * PNC: deletes the currently selected shortcut stash hierarchy group (`Unjoined_items`, `Escrowed_items`,
 * or `Joined_items`; fallback: latest eligible group).
 * Other webapps: clears {@link MEMBER_APP_FIXED_STASH_TIMESTAMPS} on every route for the current app.
 * Then relists remaining stash inventory (without selection suffixes).
 */
export const registerDeleteStashGroupShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'x' && event.key !== 'X') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    if (!performDeleteStashGroupShortcut(dispatch)) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + X');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+S:
 * Same escrow-then-followup path as connected-app shortcuts, but dispatches `simpleSelector`
 * for the current paged route.
 */
export const registerCurrentRouteSelectShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 's' && event.key !== 'S') return;
    if (
      !tryEscrowCurrentPagedRouteThen(
        dispatch,
        (d, route) => {
          d(simpleSelector({ from: route.from, to: route.to }));
        },
        30,
        { allowInMinimumFeatureMode: true }
      )
    ) {
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + S');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+U:
 * Same escrow-then-followup path as connected-app shortcuts, but dispatches `simpleUnselector`
 * for the current paged route.
 */
export const registerCurrentRouteUnselectShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'u' && event.key !== 'U') return;
    if (
      !tryEscrowCurrentPagedRouteThen(
        dispatch,
        (d, route) => {
          d(simpleUnselector({ from: route.from, to: route.to }));
        },
        30,
        { allowInMinimumFeatureMode: true }
      )
    ) {
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + U');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+I:
 * Same `IdentitiesExtractor` / dismissOnly setup and `escrowConvolution` on the current
 * paged route as the cycle shortcut, then `simpleInverter` for that route (no pager
 * change, no unselector/selector on another route). Runs in minimum- and full-feature mode
 * (`tryEscrowCurrentPagedRouteThen` with `allowInMinimumFeatureMode: true`).
 */
export const registerCurrentRouteInvertShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'i' && event.key !== 'I') return;
    if (
      !tryEscrowCurrentPagedRouteThen(
        dispatch,
        (d, route) => {
          d(simpleInverter({ from: route.from, to: route.to }));
        },
        30,
        { allowInMinimumFeatureMode: true }
      )
    ) {
      return;
    }
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + I');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+NumpadAdd only:
 * Toggles fetch-sequence configuration (same as settings Configure/UnConfigure Fetch Sequence).
 * On PnC convolution routes, immediately adds or removes `fsq` in the URL.
 */
export const registerConnectedAppsAddShortcut = (
  dispatch: AppDispatch,
  navigate: NavigateFunction,
) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.code !== 'NumpadAdd') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + NumpadAdd');
    const { shouldHydrate, fsq } = store.getState().settings;
    toggleFetchSequenceConfiguration(dispatch, { shouldHydrate, fsq });
    const nextSettings = store.getState().settings;
    syncConvolutionUrlFsq(
      dispatch,
      navigate,
      window.location.pathname,
      window.location.search,
      { shouldHydrate: nextSettings.shouldHydrate, fsq: nextSettings.fsq },
    );
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+NumpadSubtract (numpad `-` only, not the main keyboard hyphen):
 * toggles settings `shouldDelete` (`toggleShouldDelete` in `settingsSlice`),
 * which `DeletionManager1234` reads before applying stashed deletes or row purge handling.
 */
export const registerConnectedAppsRemoveShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.code !== 'NumpadSubtract') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + NumpadSubtract');
    dispatch(clearOnlyWarnings());
    const state = store.getState();
    if (state.settings.shouldDelete) dispatch(prependWarning('Deletion disabled'));
    else dispatch(prependWarning('Deletion enabled'));
    dispatch(toggleShouldDelete());
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+D (tutorial, course, quiz only for the local path):
 * Same escrow snapshot as other paged-route shortcuts, then a local unjoin finalize path
 * (no `finalizeUnjoin` action and no cpanel extract/unstash tail).
 * On other webapps, Ctrl+Shift+D dispatches `destroyOverview` (see `CrudsManager123`).
 *
 * D: clears joined children like `finalizeUnjoin` in `UiuxManager`, then stashes removed
 * child rows, then `clearEscrow`. `parentData` for parent ids is omitted (empty) on this path.
 */
export const registerDeleteShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    const key = event.key;
    const isUnjoin = key === 'd' || key === 'D';
    if (!isUnjoin) return;

    const state = store.getState();
    if (!state.session.authenticated) {
      dispatch(clearOnlyWarnings());
      return dispatch(prependWarning("not authenticated, action aborted"));
    }
    const curApp = state.session.curApp;
    if (!isPncUserApp(curApp)) {
      if (!isUnjoin) return;
      if (
        !tryEscrowCurrentPagedRouteThen(
          dispatch,
          (d, route) => {
            d(destroyOverview({ from: route.from, to: route.to }));
          },
          30,
          {
            useDismissOnlyOverride: false,
            allowInMinimumFeatureMode: true
          }
        )
      ) {
        return;
      }
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + D');
      return;
    }

    const followup = (d: AppDispatch, route: PagedRouteFromTo) => {
      const state = store.getState();
      const childData = state.view.fetchedData ?? [];
      if (childData.length === 0) return;
      dispatchShortcutUnjoinClearAndStashRemoved(d, state, {
        childData,
        parentData: [],
        from: route.from,
        to: route.to,
      });
    };

    if (!tryEscrowCurrentPagedRouteThen(dispatch, followup, 30, {
      useDismissOnlyOverride: false,
      allowInMinimumFeatureMode: true
    })) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + D');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

export type PerformEscrowStashShortcutOptions = {
  /** When set, resolves routes for this webapp instead of `session.curApp`. */
  webappIndex?: number;
};

/**
 * Ctrl+Shift+Y / settings stash buttons: escrow stash without UI clear.
 * Selection and route context follow `curApp` (or `webappIndex`), not the browser URL.
 * Returns whether the escrow pipeline was started.
 */
export const performEscrowStashShortcut = (
  dispatch: AppDispatch,
  options?: PerformEscrowStashShortcutOptions
): boolean => {
  const state = store.getState();
  const webappIndex = options?.webappIndex ?? state.session.curApp;

  const contextOptions = {
    useDismissOnlyOverride: false,
    allowInMinimumFeatureMode: true,
    webappIndex,
  };

  if (!isPncUserApp(webappIndex)) {
    const followup = (d: AppDispatch, route: PagedRouteFromTo) => {
      const nextState = store.getState();
      const childData = nextState.view.fetchedData ?? [];
      if (childData.length === 0) return;
      const entries = dispatchShortcutMemberEscrowStashRemoved(d, {
        childData,
        parentData: [],
        from: route.from,
        to: route.to,
      });
      const lines = sortStashInventoryWarningLines(entries);
      d(
        appendWarnings(lines.map((line) => formatShortcutTimestampWarningLine(line)))
      );
    };
    return tryEscrowCurrentPagedRouteThen(dispatch, followup, 30, contextOptions);
  }

  const followup = (d: AppDispatch, route: PagedRouteFromTo) => {
    const nextState = store.getState();
    const childData = nextState.view.fetchedData ?? [];
    if (childData.length === 0) return;
    const entries = dispatchShortcutEscrowStashRemoved(d, nextState, {
      childData,
      parentData: [],
      from: route.from,
      to: route.to,
    });
    const lines = sortStashInventoryWarningLines(entries);
    d(
      appendWarnings(lines.map((line) => formatShortcutTimestampWarningLine(line)))
    );
  };

  return tryEscrowCurrentPagedRouteThen(dispatch, followup, 30, contextOptions);
};

export type PerformUnstashStashShortcutOptions = {
  /** When set, resolves stash freight for this webapp instead of `session.curApp`. */
  webappIndex?: number;
};

/**
 * Ctrl+Shift+Z / settings unstash buttons: restore selected or latest eligible stash.
 * Returns whether an unstash was started.
 */
export const performUnstashStashShortcut = (
  dispatch: AppDispatch,
  options?: PerformUnstashStashShortcutOptions
): boolean => {
  const state = store.getState();
  if (state.settings.editMode) {
    dispatch(clearOnlyWarnings());
    dispatch(prependWarning('unstashing not allowed in edit mode, action aborted'));
    return false;
  }

  const webappIndex = options?.webappIndex ?? state.session.curApp;

  if (isPncUserApp(webappIndex)) {
    const freights = options?.webappIndex != null
      ? findSelectedOrLatestStashFreightsForWebapp(state, webappIndex)
      : findSelectedOrLatestStashFreights(state);
    if (!freights?.length) return false;
    const { formatters } = state.settings;
    dispatch(setFormatters('app'));
    setTimeout(
      () => dispatchCascadingUnstash(dispatch, freights, formatters, true),
      10
    );
    return true;
  }

  if (options?.webappIndex != null) return false;

  const extractPayload = findMemberDeletedStashExtractPayload(state);
  if (!extractPayload) return false;
  dispatch(setFormatters('app'));
  setTimeout(() => dispatch(extractContent(extractPayload)), 10);
  return true;
};

/**
 * Ctrl+Shift+Y:
 * Same escrow snapshot as {@link registerDeleteShortcut}, then stashes without `clearSelected`.
 * PNC: `Escrowed_items-<unixSeconds>` hierarchy ({@link dispatchShortcutEscrowStashRemoved}).
 * Other webapps: replaces `escrowTimestamp` on the route ({@link dispatchShortcutMemberEscrowStashRemoved}).
 */
export const registerEscrowShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    const key = event.key;
    const isEscrow = key === 'y' || key === 'Y';
    if (!isEscrow) return;

    if (!performEscrowStashShortcut(dispatch)) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Y');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+Z:
 * PNC: {@link findSelectedOrLatestStashFreights} — first the stash inventory–selected hierarchy
 * group (Ctrl+Shift+N/V `unixSeconds` cursor) when it is a complete `Unjoined_items-…`
 * (Ctrl+Shift+D) or `Escrowed_items-…` (Ctrl+Shift+Y) chain; otherwise the latest complete
 * eligible group by unix seconds (`Joined_items` excluded). Then `setFormatters('app')` and
 * {@link dispatchCascadingUnstash} (join stash–only style).
 * Other webapps: per-route stash keyed by {@link deletedTimestamp} — dispatches `extractContent`
 * (see `ContentExtractorJKL`) for the current route, or the last route with deleted stash.
 */
export const registerUnstashShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'z' && event.key !== 'Z') return;

    if (!performUnstashStashShortcut(dispatch)) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + Z');
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+B (profile B only): serializes the full comments slice into stash routes
 * `comments/{course|tutorial|quiz}` at {@link commentsTimestamp}.
 */
export const registerStashCommentsShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 'b' && event.key !== 'B') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    const commentsState = store.getState().comments;
    const entryCount = countCommentsStashEntries(commentsState);
    if (entryCount === 0) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + B');
      dispatch(clearOnlyWarnings());
      dispatch(prependWarning('No comments in slice to stash.'));
      return;
    }

    const payloads = buildCommentsStashPayloadsFromState(commentsState, commentsTimestamp);
    if (!payloads.length) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + B');
      dispatch(clearOnlyWarnings());
      dispatch(prependWarning('No comments in slice to stash.'));
      return;
    }

    for (const approute of listCommentsStashApproutes(store.getState().stash)) {
      dispatch(removeTimestamp({ approute, timestamp: commentsTimestamp }));
    }

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + B');
    dispatch(clearOnlyWarnings());
    dispatch(appendRoutes(payloads));
    const routeCount = payloads.length;
    dispatch(
      prependWarning(
        `Stashed ${entryCount} comment thread${entryCount === 1 ? '' : 's'} across ${routeCount} route${routeCount === 1 ? '' : 's'} (timestamp: ${commentsTimestamp}).`
      )
    );
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+T (profile B only): restores {@link commentsTimestamp} stash rows into `commentsSlice`.
 */
export const registerUnstashCommentsShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.key !== 't' && event.key !== 'T') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    const exportedDatas = collectCommentsStashExportDatas(
      store.getState().stash,
      commentsTimestamp
    );
    const routeLabels = Object.keys(exportedDatas);
    if (!routeLabels.length) {
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + T');
      dispatch(clearOnlyWarnings());
      dispatch(prependError('No comments stash data to unstash (stash or import comments first).'));
      return;
    }

    const partial = commentsStashRoutesToState(exportedDatas);
    const entryCount = routeLabels.reduce(
      (sum, route) => sum + (exportedDatas[route]?.length ?? 0),
      0
    );

    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + T');
    dispatch(clearOnlyWarnings());
    dispatch(restoreCommentsStash(partial));
    dispatch(
      prependWarning(
        `Unstashed ${entryCount} comment thread${entryCount === 1 ? '' : 's'} into comments slice from ${routeLabels.length} route${routeLabels.length === 1 ? '' : 's'}.`
      )
    );
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Shift+NumpadDivide (profile B only): advances `settings.queryLimit` through
 * {@link queryLimits} (wraps). Sets max hydration queries per leg.
 */
export const registerQueryLimitCycleShortcut = (dispatch: AppDispatch) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlShiftChordModifierSidesOk(event)) return;
    if (event.code !== 'NumpadDivide') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    if (!QUERY_LIMIT_ORDER.length) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + NumpadDivide');
    dispatch(clearOnlyWarnings());
    const current = store.getState().settings.queryLimit;
    const next = nextQueryLimitValue(current);
    dispatch(queryLimitSelected(next));
    const labels = QUERY_LIMIT_ORDER.map((limit) => {
      const alias = queryLimits[limit];
      return limit === next ? `${alias}_` : alias;
    });
    dispatch(appendWarnings(labels.slice().reverse()));
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Maps Ctrl+Alt+0–9 to the same destinations as {@link ../components/shortcuts/complete/FullNavigation}
 * (0 opens settings with `goBackUrl` like the gear link in {@link ../components/shortcuts/complete/FullAccount},
 * including on `/app` routes `escrowRows` / `escrowContents` from `view.entity` then `clearData` after 100ms;
 * 1–7 align with `userApps` / `memberApps` / `adminsApps` in `constants.ts`; 8 opens search;
 * 9 runs `tryEscrowCurrentPagedRouteThen` with `useDismissOnlyOverride: false`, then builds a traversal
 * like `showAlgorithm` in `DismissalsManagerOPQ.ts` (`IdentitiesExtractor`, `reEncodeData`), dispatches
 * `initLoading` as in {@link ../components/DisplayedTags/RootTags/RootTag}, and navigates
 * `prefix + to + '/' + encodedData + search`.
 * Skips navigation when the browser is already on that pathname and search (settings compares pathname only).
 */
export const registerWebappNavigateShortcut = (navigate: NavigateFunction) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlAltChordModifierSidesOk(event)) return;
    const digit = digitFromCtrlAltNumberKey(event);
    if (digit === null) return;

    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    const curPath = window.location.pathname;
    const curSearch = window.location.search;

    if (digit === 0) {
      if (curPath === '/settings') return;
      event.preventDefault();
      recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Alt + 0');
      if (curPath.startsWith('/app')) {
        const entity = store.getState().view.entity;
        if (getActionFromUrl() !== 'view') store.dispatch(escrowRows(entity));
        else store.dispatch(escrowContents(entity));
        setTimeout(() => store.dispatch(clearData()), 100);
      }
      const navState: { goBackUrl: string } = { goBackUrl: curPath + (curSearch || '') };
      navigate('/settings', { state: navState });
      return;
    }

    if (digit === 9) {
      if (curPath.startsWith('/app')) return;
      const dispatched = tryEscrowCurrentPagedRouteThen(
        store.dispatch,
        (_d, route) => {
          const s = store.getState();
          const { curApp } = s.session;
          const parentData: ParentData = {
            parent: route.from,
            IDs: [],
            curApp,
          };
          const encodedData = reEncodeData(curApp, parentData);
          store.dispatch(
            initLoading({
              parentData,
              entity: route.to,
              search: undefined,
              prefix: 'app/tabulator/',
            })
          );
          const nextUrl = 'app/tabulator/' + route.to + '/' + encodedData;
          navigate(nextUrl);
        },
        30,
        { useDismissOnlyOverride: false }
      );
      if (!dispatched) return;
      event.preventDefault();
      recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Alt + 9');
      return;
    }

    const state = store.getState();
    const cs = state.pagination.cs;
    const curApp = state.session.curApp;

    const resolved = resolveConvolutionCtrlAltNav(
      digit,
      cs,
      curApp,
      isMinimumFeatureMode(state),
      stickyFsqFromState(state),
    );
    if (resolved === null) return;
    if (resolved === 'disabled') {
      store.dispatch(prependError(MINIMUM_FEATURE_SHORTCUT_DISABLED_MESSAGE));
      return;
    }
    if (resolved === 'cancelled') {
      warnConvolutionCsFsqConflict(store.dispatch);
      return;
    }
    const { pathname, search } = resolved;

    if (curPath === pathname && curSearch === (search ?? '')) return;

    event.preventDefault();
    recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Alt + 1..8');
    navigate({ pathname, search });
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Alt+NumpadDecimal:
 * only on `/settings*`, mirrors anonymous settings fallback navigation:
 * navigate to `goBackUrl` from router state when present, otherwise
 * set programmatic navigation and go back one history entry.
 */
export const registerGoBackShortcut = (navigate: NavigateFunction) => {
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlAltChordModifierSidesOk(event)) return;
    if (event.code !== 'NumpadDecimal') return;
    const pathname = window.location.pathname;
    event.preventDefault();
    if (pathname.startsWith('/app')) {
      recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Alt + NumpadDecimal');
      const webapp = store.getState().session.curApp;
      if (webapp > 0) {
        const app = getCurAppName(webapp);
        setTimeout(() => store.dispatch(clearData()), 100);
        navigateConvolutionOrWarn(
          store.dispatch,
          navigate,
          '/convolution/' + app,
          undefined,
          stickyFsqFromState(store.getState()),
        );
        store.dispatch(clearEscrow());
      }
      return;
    }
    if (!pathname.startsWith('/settings')) return;
    recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Alt + NumpadDecimal');
    const historyState = window.history.state as { usr?: { goBackUrl?: string } } | null;
    const goBackUrl = historyState?.usr?.goBackUrl;
    if (goBackUrl) {
      navigate(goBackUrl);
    } else {
      setProgrammaticNavigation();
      navigate(-1);
    }
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};

/**
 * Ctrl+Alt+NumpadMultiply:
 * alternates between Editor's "save rows" and "save content" cook+navigate flows
 * from the two first icons, but never calls `toggle()`.
 */
export const registerTabulatorToggleShortcut = (navigate: NavigateFunction) => {
  let useRowsNext = false;
  const handler = (event: KeyboardEvent) => {
    if (!isCtrlAltChordModifierSidesOk(event)) return;
    if (event.code !== 'NumpadMultiply') return;
    if (!window.location.pathname.startsWith('/app')) return;
    const state = store.getState();
    const entity = state.view.entity;
    if (!entity) return;
    const hasTarget = Boolean(state.view.params?.target);
    if (hasTarget) useRowsNext = true;
    const parentData = state.view.parentData;
    if (!parentData) return;
    const result = cookIngredients({
      toggle: true,
      defaultTake: state.session.defaultTake,
      parentData: {
        IDs: parentData.IDs?.map((id) => id.toString()) || [],
        curApp: parentData.curApp || 0,
        parent: parentData.parent || '',
      },
      entity,
      search: window.location.search,
    });
    if (!result) return;
    event.preventDefault();
    recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Alt + NumpadMultiply');
    if (useRowsNext) {
      if (!Tree.isEntity(entity)) {
        store.dispatch(prependError('error_unknown_entity'));
      } else {
        setTimeout(() => store.dispatch(escrowRows(entity)));
        store.dispatch(mutatePrefix(result.pfx));
        navigate(result.url);
      }
    } else {
      setTimeout(() => store.dispatch(escrowContents(entity)));
      store.dispatch(mutatePrefix(result.pfx));
      navigate(result.url);
    }
    useRowsNext = !useRowsNext;
  };
  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
};