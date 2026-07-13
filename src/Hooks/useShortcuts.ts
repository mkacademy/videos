import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurSkip } from '../library/Thunks';
import { resetChapters } from '../store/slices/courseSlice';
import { toggleDismissed } from '../store/slices/sessionSlice';
import { toggleTutorial } from '../store/slices/tutorialSlice';
import { toggleCourse } from '../store/slices/courseSlice';
import { toggleQuiz } from '../store/slices/quizSlice';
import {
  unzipCoursesTypeSelected,
  unzipQuizzesTypeSelected,
  unzipTutorialsTypeSelected,
} from '../store/slices/settingsSlice';
import { prependWarning } from '../store/slices/errorSlice';
import { AppDispatch } from '../store';
import { RootState } from '../store/types';
import { recordKeyboardShortcutFromChord } from '../library/ShortcutRecording';
import { isFsqEligiblePathname, stripFsqFromSearch } from '../library/convolutionNavSearch';
import {
  registerClearContentShortcut,
  registerSaveContentShortcut,
  registerCreateShortcut,
  registerConnectedAppsAddShortcut,
  registerCurrentRouteSelectShortcut,
  registerCurrentRouteInvertShortcut,
  registerCurrentRouteUnselectShortcut,
  registerCyclePagedRouteShortcut,
  registerShowPagedRoutesShortcut,
  registerStashInventoryNavigateShortcut,
  registerDeleteStashGroupShortcut,
  registerStashInventoryShortcut,
  registerConnectedAppsRemoveShortcut,
  registerDeleteShortcut,
  registerEscrowShortcut,
  registerUnstashShortcut,
  registerStashCommentsShortcut,
  registerUnstashCommentsShortcut,
  registerQueryLimitCycleShortcut,
  registerTabulatorToggleShortcut,
  registerModeSwitchShortcut,
  registerGoBackShortcut,
  registerShowCopyIconsShortcut,
  registerShiftKeyShortcut,
  registerCtrlKeyShortcut,
  registerBlockCtrlClickContextMenu,
  registerAltKeyShortcut,
  registerLeftModifierChordTracking,
  isCtrlShiftChordModifierSidesOk,
  isChaptersCtrlEscapeChordOk,
  registerShouldHydrateShortcut,
  registerEditModeShortcut,
  registerStopQueuedSequentialThunksShortcut,
  registerTabulatorRenderWindowShortcuts,
  registerHandlesToStashShortcut,
  registerExportSelectedStashRoutesShortcut,
  registerImportSelectedStashRoutesShortcut,
  registerWebappNavigateShortcut,
} from '../library/Shortcuts_b';
import {
  registerActivateShortcutsAShortcut,
  registerActivateShortcutsProfileShortcut,
} from '../library/Shortcuts_a';
import {
  registerMigrateServerIdsShortcut,
  registerQuickReferenceShortcut,
  registerInstructionBranchOneReverseShortcut,
  registerCreateCountCycleShortcut,
  registerTakeCountCycleShortcut,
  registerInstructionBranchTwoReverseShortcut,
  registerInstructionSwapImageurlContentShortcut,
  registerActionsExecutorShortcuts,
  registerOptionsCycleShortcut,
  registerMarkTextsModifiedShortcut,
  registerInstructionHalvesMirrorShortcut,
} from '../library/Shortcuts_c';
import {
  registerExportCommentsStashShortcut,
  registerCacheSelectedShortcut,
  registerTimestampRolodex,
  registerReplayKeyboardShortcut,
  registerClearShortcutLogShortcut,
  registerGenerateLinkShortcut,
  registerColTenSettingsCycleShortcut,
} from '../library/Shortcuts_d';
import { getCurAppName } from '../utils';

const IGNORE_ESC_IN = 'input, textarea, select, [contenteditable="true"]';

/** Order: incoming_and_outgoing → incoming → outgoing → … (Ctrl+Shift+↓ forward, Ctrl+Shift+↑ reverse). */
const UNZIP_TYPE_CYCLE = ['incoming_and_outgoing', 'incoming', 'outgoing'] as const;

function stepUnzipType(current: string, direction: 1 | -1): string {
  const idx = UNZIP_TYPE_CYCLE.indexOf(current as (typeof UNZIP_TYPE_CYCLE)[number]);
  const i = idx === -1 ? 0 : idx;
  return UNZIP_TYPE_CYCLE[(i + direction + UNZIP_TYPE_CYCLE.length) % UNZIP_TYPE_CYCLE.length];
}

export type UnzipPagerUnderline = {
  /** Page index to underline, or −1 when no underline. */
  pageIndex: number;
  /** Green underline for incoming, yellow for outgoing; `null` when unzip is both or not a user app. */
  side: 'incoming' | 'outgoing' | null;
};

/**
 * Cycles the current web app’s unzip type (course / tutorial / quiz) with Ctrl+Shift+↑ / Ctrl+Shift+↓,
 * and returns which pager page to underline and whether that mode is incoming or outgoing.
 */
export function useCycleUnzipTypeOnCtrlShiftArrows(): UnzipPagerUnderline {
  const store = useStore<RootState>();
  const curApp = useSelector((s: RootState) => s.session.curApp);
  const unzipCoursesType = useSelector((s: RootState) => s.settings.unzipCoursesType);
  const unzipTutorialsType = useSelector((s: RootState) => s.settings.unzipTutorialsType);
  const unzipQuizzesType = useSelector((s: RootState) => s.settings.unzipQuizzesType);

  const underline = useMemo((): UnzipPagerUnderline => {
    const webapp = getCurAppName(curApp).toLowerCase();
    let unzipType: string;
    if (webapp === 'course') unzipType = unzipCoursesType;
    else if (webapp === 'tutorial') unzipType = unzipTutorialsType;
    else if (webapp === 'quiz') unzipType = unzipQuizzesType;
    else return { pageIndex: -1, side: null };

    if (unzipType === 'incoming_and_outgoing') return { pageIndex: -1, side: null };
    if (unzipType === 'incoming') return { pageIndex: getCurSkip(), side: 'incoming' };
    if (unzipType === 'outgoing') return { pageIndex: getCurSkip(), side: 'outgoing' };
    return { pageIndex: -1, side: null };
  }, [curApp, unzipCoursesType, unzipTutorialsType, unzipQuizzesType]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isCtrlShiftChordModifierSidesOk(e)) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const el = e.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN) || el?.isContentEditable) return;

      const state = store.getState();
      const webapp = getCurAppName(state.session.curApp).toLowerCase();
      if (webapp !== 'course' && webapp !== 'tutorial' && webapp !== 'quiz') return;

      const settings = state.settings;
      let current: string;
      if (webapp === 'course') current = settings.unzipCoursesType;
      else if (webapp === 'tutorial') current = settings.unzipTutorialsType;
      else current = settings.unzipQuizzesType;

      const direction: 1 | -1 = e.key === 'ArrowDown' ? 1 : -1;
      const next = stepUnzipType(current, direction);
      const page = getCurSkip();
      e.preventDefault();
      recordKeyboardShortcutFromChord(store.dispatch, 'Ctrl + Shift + ↑ or ↓', 'b');
      if (webapp === 'course') store.dispatch(unzipCoursesTypeSelected(next));
      else if (webapp === 'tutorial') store.dispatch(unzipTutorialsTypeSelected(next));
      else store.dispatch(unzipQuizzesTypeSelected(next));
      store.dispatch(prependWarning(`Unzip type changed to ${next} on page ${page}.`));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);

  return underline;
}

/** ViewSelector: Ctrl+Shift+← / Ctrl+Shift+→ toggles dismissed state for the current route. */
export function useToggleDismissedOnCtrlShiftArrows(): void {
  const dispatch = useDispatch<AppDispatch>();
  const { pathname } = useLocation();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!isCtrlShiftChordModifierSidesOk(event)) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + ← or → (ViewSelector)', 'b');
      dispatch(toggleDismissed(pathname));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, pathname]);
}


/**
 * Must render under `BrowserRouter` so `useNavigate` is available. Registers Ctrl+Alt+0–9
 * jumps aligned with `constants` webapp keys and `FullNavigation` targets (0 → settings, 9 → tabulator),
 * plus Ctrl+Shift+Q clear content (needs navigate to strip URL query params).
 */
export function WebappNavigateShortcutRegistrar(): null {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    const unregisterWebappNavigate = registerWebappNavigateShortcut(navigate);
    const unregisterSettingsGoBack = registerGoBackShortcut(navigate);
    const unregisterEditorCookToggle = registerTabulatorToggleShortcut(navigate);
    const unregisterFetchSequenceToggle = registerConnectedAppsAddShortcut(dispatch, navigate);
    const unregisterClearContent = registerClearContentShortcut(dispatch, navigate);
    return () => {
      unregisterWebappNavigate();
      unregisterSettingsGoBack();
      unregisterEditorCookToggle();
      unregisterFetchSequenceToggle();
      unregisterClearContent();
    };
  }, [navigate, dispatch]);
  return null;
}
/**
 * Registers app-wide shortcuts from `library/Shortcuts_b` (mode toggle, copy icons, edit mode,
 * clear content, create container, paged route cycle / invert / numpad fetch sequence / numpad destroy overview). Call once near the root.
 */
export function useLibraryGlobalShortcuts(): void {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const unregisterBlockCtrlClickContextMenu = registerBlockCtrlClickContextMenu();
    const unregisterLeftChordModifiers = registerLeftModifierChordTracking();
    const unregisterActivateShortcutsA = registerActivateShortcutsAShortcut(dispatch);
    const unregisterActivateShortcutsProfile = registerActivateShortcutsProfileShortcut(dispatch);
    const unregisterEnter = registerModeSwitchShortcut(dispatch);
    const unregisterCopyIcons = registerShowCopyIconsShortcut(dispatch);
    const unregisterShiftKey = registerShiftKeyShortcut(dispatch);
    const unregisterCtrlKey = registerCtrlKeyShortcut(dispatch);
    const unregisterAltKey = registerAltKeyShortcut(dispatch);
    const unregisterInstructionBranchOneReverseC =
      registerInstructionBranchOneReverseShortcut(dispatch);
    const unregisterQuickReference = registerQuickReferenceShortcut(dispatch);
    const unregisterShouldHydrateB = registerShouldHydrateShortcut(dispatch);
    const unregisterEditModeB = registerEditModeShortcut(dispatch);
    const unregisterStopQueuedSequentialThunksB =
      registerStopQueuedSequentialThunksShortcut(dispatch);
    const unregisterTabulatorRenderWindowB = registerTabulatorRenderWindowShortcuts(dispatch);
    const unregisterHandlesToStashB = registerHandlesToStashShortcut(dispatch);
    const unregisterExportSelectedStashRoutesB = registerExportSelectedStashRoutesShortcut(dispatch);
    const unregisterImportSelectedStashRoutesB = registerImportSelectedStashRoutesShortcut(dispatch);
    const unregisterSaveContent = registerSaveContentShortcut(dispatch);
    const unregisterMigrateServerIdsC = registerMigrateServerIdsShortcut(dispatch);
    const unregisterMarkTextsModifiedC = registerMarkTextsModifiedShortcut(dispatch);
    const unregisterCreateCountCycleC = registerCreateCountCycleShortcut(dispatch);
    const unregisterTakeCountCycleC = registerTakeCountCycleShortcut(dispatch);
    const unregisterInstructionBranchTwoReverseC =
      registerInstructionBranchTwoReverseShortcut(dispatch);
    const unregisterInstructionSwapImageurlContentC =
      registerInstructionSwapImageurlContentShortcut(dispatch);
    const unregisterInstructionHalvesMirrorC = registerInstructionHalvesMirrorShortcut(dispatch);
    const unregisterActionsExecutorC = registerActionsExecutorShortcuts(dispatch);
    const unregisterConnectsCycleC = registerOptionsCycleShortcut(dispatch);
    const unregisterUnstashLatestShortcutUnjoin =
      registerUnstashShortcut(dispatch);
    const unregisterStashCommentsB = registerStashCommentsShortcut(dispatch);
    const unregisterUnstashCommentsB = registerUnstashCommentsShortcut(dispatch);
    const unregisterCacheSelectedD = registerCacheSelectedShortcut(dispatch);
    const unregisterTimestampRolodexD = registerTimestampRolodex(dispatch);
    const unregisterQueryLimitCycleB = registerQueryLimitCycleShortcut(dispatch);
    const unregisterExportCommentsStashD = registerExportCommentsStashShortcut(dispatch);
    const unregisterReplayKeyboardShortcutD = registerReplayKeyboardShortcut(dispatch);
    const unregisterClearShortcutLogD = registerClearShortcutLogShortcut(dispatch);
    const unregisterGenerateLinkD = registerGenerateLinkShortcut(dispatch);
    const unregisterColTenSettingsCycleD = registerColTenSettingsCycleShortcut(dispatch);
    const unregisterCreateContainer = registerCreateShortcut(dispatch);
    const unregisterCyclePagedRoute = registerCyclePagedRouteShortcut(dispatch);
    const unregisterShowPagedRoutes = registerShowPagedRoutesShortcut(dispatch);
    const unregisterStashInventory = registerStashInventoryShortcut(dispatch);
    const unregisterStashInventoryNavigate = registerStashInventoryNavigateShortcut(dispatch);
    const unregisterDeleteStashGroup = registerDeleteStashGroupShortcut(dispatch);
    const unregisterCurrentRouteSelect = registerCurrentRouteSelectShortcut(dispatch);
    const unregisterCurrentRouteUnselect = registerCurrentRouteUnselectShortcut(dispatch);
    const unregisterCyclePagedRouteInvert =
      registerCurrentRouteInvertShortcut(dispatch);
    const unregisterDestroyOverview = registerConnectedAppsRemoveShortcut(dispatch);
    const unregisterJoinUnjoinFinalizeLocal =
      registerDeleteShortcut(dispatch);
    const unregisterEscrowShortcut = registerEscrowShortcut(dispatch);
    return () => {
      unregisterBlockCtrlClickContextMenu();
      unregisterLeftChordModifiers();
      unregisterActivateShortcutsA();
      unregisterActivateShortcutsProfile();
      unregisterEnter();
      unregisterCopyIcons();
      unregisterShiftKey();
      unregisterCtrlKey();
      unregisterAltKey();
      unregisterInstructionBranchOneReverseC();
      unregisterQuickReference();
      unregisterShouldHydrateB();
      unregisterEditModeB();
      unregisterStopQueuedSequentialThunksB();
      unregisterTabulatorRenderWindowB();
      unregisterHandlesToStashB();
      unregisterExportSelectedStashRoutesB();
      unregisterImportSelectedStashRoutesB();
      unregisterSaveContent();
      unregisterMigrateServerIdsC();
      unregisterMarkTextsModifiedC();
      unregisterCreateCountCycleC();
      unregisterTakeCountCycleC();
      unregisterInstructionBranchTwoReverseC();
      unregisterInstructionSwapImageurlContentC();
      unregisterInstructionHalvesMirrorC();
      unregisterActionsExecutorC();
      unregisterConnectsCycleC();
      unregisterUnstashLatestShortcutUnjoin();
      unregisterStashCommentsB();
      unregisterUnstashCommentsB();
      unregisterCacheSelectedD();
      unregisterTimestampRolodexD();
      unregisterQueryLimitCycleB();
      unregisterExportCommentsStashD();
      unregisterReplayKeyboardShortcutD();
      unregisterClearShortcutLogD();
      unregisterGenerateLinkD();
      unregisterColTenSettingsCycleD();
      unregisterCreateContainer();
      unregisterCyclePagedRoute();
      unregisterShowPagedRoutes();
      unregisterStashInventory();
      unregisterStashInventoryNavigate();
      unregisterDeleteStashGroup();
      unregisterCurrentRouteSelect();
      unregisterCurrentRouteUnselect();
      unregisterCyclePagedRouteInvert();
      unregisterDestroyOverview();
      unregisterJoinUnjoinFinalizeLocal();
      unregisterEscrowShortcut();
    };
  }, [dispatch]);
}

/** ArticleSelector: Ctrl+Shift+← / Ctrl+Shift+→ moves tutorial / course / quiz selection. */
export function useArticleNavOnCtrlShiftArrows(
  noArticles: boolean,
  goPrev: () => void,
  goNext: () => void,
): void {
  const dispatch = useDispatch<AppDispatch>();
  const goPrevRef = useRef(goPrev);
  const goNextRef = useRef(goNext);
  goPrevRef.current = goPrev;
  goNextRef.current = goNext;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (noArticles) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!isCtrlShiftChordModifierSidesOk(event)) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + ← or → (ArticleSelector)', 'b');
        goPrevRef.current();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + ← or → (ArticleSelector)', 'b');
        goNextRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [noArticles, dispatch]);
}

/** ChaptersSelector: Ctrl+Escape resets chapters; Ctrl+Shift+← / → changes chapter. */
export function useChaptersOrFollowupsNavKeyboard(
  noArticles: boolean,
  selected: number | undefined,
  goPrev: () => void,
  goNext: () => void,
): void {
  const dispatch = useDispatch<AppDispatch>();
  const goPrevRef = useRef(goPrev);
  const goNextRef = useRef(goNext);
  goPrevRef.current = goPrev;
  goNextRef.current = goNext;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (noArticles || selected === undefined || selected < 0) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (isChaptersCtrlEscapeChordOk(event)) {
        event.preventDefault();
        recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Escape', 'b');
        dispatch(resetChapters());
        return;
      }
      if (!isCtrlShiftChordModifierSidesOk(event)) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + ← or → (Chapters)', 'b');
        goPrevRef.current();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + ← or → (Chapters)', 'b');
        goNextRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [noArticles, selected, dispatch]);
}

/**
 * When a banner / pennant / quiz row is expanded, Escape should mirror the
 * dismiss ("x") control: optional scroll restore, then collapse selection.
 * Call from the screen that already owns `positionY` and Redux `selected`.
 * The latest `onExit` is always used without re-attaching the listener each render.
 */
export function useExitExpandedOnEscape(isExpanded: boolean, onExit: () => void): void {
  const dispatch = useDispatch<AppDispatch>();
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (!isExpanded) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.ctrlKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN)) return;
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Escape', 'b');
      onExitRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded, dispatch]);
}

/**
 * In chapter mode: Escape closes an open chapter first, then exits chapter mode.
 * Call from {@link Chapters} which owns the toggled-open state.
 */
export function useChapterEscape(
  isChapterOpen: boolean,
  onCloseChapter: () => void,
  onExitChapterMode: () => void,
): void {
  const dispatch = useDispatch<AppDispatch>();
  const onCloseRef = useRef(onCloseChapter);
  const onExitRef = useRef(onExitChapterMode);
  const isChapterOpenRef = useRef(isChapterOpen);
  onCloseRef.current = onCloseChapter;
  onExitRef.current = onExitChapterMode;
  isChapterOpenRef.current = isChapterOpen;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.ctrlKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN)) return;
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Escape', 'b');
      if (isChapterOpenRef.current) onCloseRef.current();
      else onExitRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);
}

/**
 * After collapse (selected === -1), a further Escape on a PnC route drops `fsq` from the URL
 * when present — the second step after {@link useExitExpandedOnEscape}.
 */
export function useClearFsqOnEscapeWhenUnselected(isUnselected: boolean): void {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!isUnselected || !isFsqEligiblePathname(pathname)) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.ctrlKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN)) return;

      const nextSearch = stripFsqFromSearch(search || '');
      if (nextSearch === false) return;

      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Escape', 'b');
      navigate({ pathname, search: nextSearch }, { replace: true });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isUnselected, pathname, search, dispatch, navigate]);
}

type RouterSelectionState = {
  selectedT?: number;
  selectedC?: number;
  selectedQ?: number;
};

/**
 * Syncs router-provided selected ids into the three convo sections.
 * Kept async with setTimeout to preserve existing dispatch timing behavior.
 */
export function useApplyRouterSelections(
  hasContent: boolean,
  routerState: unknown,
): void {
  const dispatch = useDispatch();

  useEffect(() => {
    if (
      !hasContent ||
      !routerState ||
      typeof routerState !== 'object' ||
      (!('selectedT' in routerState) && !('selectedC' in routerState) && !('selectedQ' in routerState))
    ) return;
    const { selectedT, selectedC, selectedQ } = routerState as RouterSelectionState;
    if (selectedT !== undefined && selectedT > -1)
      setTimeout(() => dispatch(toggleTutorial({ selectedId: selectedT, canToggle: false })), 500);
    if (selectedC !== undefined && selectedC > -1)
      setTimeout(() => dispatch(toggleCourse({ selectedId: selectedC, canToggle: false })), 500);
    if (selectedQ !== undefined && selectedQ > -1)
      setTimeout(() => dispatch(toggleQuiz({ selectedId: selectedQ, canToggle: false })), 500);
  }, [dispatch, hasContent, routerState]);
}

/**
 * Runs `onToggle` when Ctrl+Shift+J is pressed outside editable fields.
 * Intended for toggling the roots modal visibility from keyboard.
 */
export function useRootsJoinShortcut(onToggle: () => void): void {
  const dispatch = useDispatch<AppDispatch>();
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isCtrlShiftChordModifierSidesOk(event)) return;
      if (event.key !== 'j' && event.key !== 'J') return;
      const el = event.target as HTMLElement | null;
      if (el?.closest(IGNORE_ESC_IN) || el?.isContentEditable) return;
      event.preventDefault();
      recordKeyboardShortcutFromChord(dispatch, 'Ctrl + Shift + J', 'b');
      onToggleRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);
}

