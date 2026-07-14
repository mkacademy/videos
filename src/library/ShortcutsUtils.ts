import type { ActionCreatorWithoutPayload } from '@reduxjs/toolkit';
import type { Freight } from './actions';
import { AppDispatch, RootState, store } from '../store';
import { buildConvolutionNavigateTo, isConvolutionNavCancelled, type ConvolutionNavigateTo, type StickyFsqOptions } from './convolutionNavSearch';
import {
  appendWarnings,
  clearOnlyWarnings,
  prependError,
  prependWarning,
} from '../store/slices/errorSlice';
import {
  approveCourseTrees,
  approveQuizTrees,
  approveTutorialTrees,
  aquireVoucher,
  contentVisibility,
  deleteOrphans,
  escrowConvolution,
  exportTexts,
  importStash,
  mutateAbilities,
  mutateHierachies,
  mutateQuotas,
  persistCourses,
  persistQuizzes,
  persistSteps,
  persistTutorials,
  saveCourseOwnership,
  saveCourseTrees,
  saveQuizOwnership,
  saveQuizTrees,
  saveTutorialOwnership,
  saveTutorialTrees,
  type ExtractContentPayload,
} from './actions';
import {
  connectsAliases,
  deltionSizes,
  deletedTimestamp,
  escrowTimestamp,
  getCurAppName,
  getInteractionIDs,
  getRouteAlias,
  incrementID,
  isPncUserApp,
  orderEntitiesRootToLeafForWebapp,
  CHIEF,
  MOD,
  quotaOptions,
  sessionSizes,
  Tree,
} from '../utils';
import type { DataRow, MenuItem, Metadata } from '../components/Core/types';
import {
  connectSelecteds,
  mutateSettings,
  orphansSizeSelected,
  quotaSelected,
  secondsSelected,
  setStatus,
} from '../store/slices/settingsSlice';
import {
  appendRoutes,
  getStashCellRows,
  normalizeStashCell,
  readStashInventoryNavUnixSeconds,
  removeTimestamp,
  type StashPayload,
  type StashState,
} from '../store/slices/stashSlice';
import IdentitiesExtractor, { overrideSelector } from './IdentitiesExtractor';
import {
  newShortcutEscrowStashTimestamp,
  withHierarchyStamp,
} from '../store/middleware/UiuxManager';
import { initFileManager, viewExports } from '../store/slices/viewSlice';
import { isMinimumFeatureMode } from './clearContentDispatch';
import type { GenericDiscriminatorPredicate } from './hydrationUtils';
import type { SlideGroup, SlideGroupItem, SlideItem } from './CourseUtils';
import { contentDelay } from '../constants';
import {
  parseHierarchyStampedStashKey,
  hierarchyShortcutStashBaseUnixSeconds,
  isEscrowedItemsShortcutStashBase,
  isUnstashEligibleShortcutStashBase,
  isDeleteEligibleShortcutStashBase,
  shortcutUnstashStashBaseSortKey,
} from './hierarchyShortcutStashKeys';

export {
  parseHierarchyStampedStashKey,
  hierarchyShortcutStashBaseUnixSeconds,
  isUnjoinedItemsShortcutStashBase,
  isJoinedItemsShortcutStashBase,
  isEscrowedItemsShortcutStashBase,
  isUnstashEligibleShortcutStashBase,
  isDeleteEligibleShortcutStashBase,
  shortcutUnstashStashBaseSortKey,
} from './hierarchyShortcutStashKeys';
/** `settings.activeShortcuts === 'c'` (profile C list shortcuts). */
export const isActiveShortcutsC = (): boolean =>
  store.getState().settings.activeShortcuts === 'c';

export const tabulatorVisibleCount = (state: ReturnType<typeof store.getState>): number =>
  state.row.filter((row) => !row.deleted).length;

/**
 * `connects-select` option values are {@link connectsAliases} keys (see ColSeven / `useSettings`
 * `connectSelecteds`). Order matches object insertion order, same as the dropdown.
 */
export const CONNECTS_ORDER = Object.keys(connectsAliases);

/** Resolve `settings.connects` to an alias key (handles legacy rows that store the value string). */
export const normalizeConnectsKey = (connects: string): string => {
  if (Object.prototype.hasOwnProperty.call(connectsAliases, connects)) return connects;
  const entry = Object.entries(connectsAliases).find(([, value]) => value === connects);
  return entry?.[0] ?? CONNECTS_ORDER[0] ?? connects;
};

/** Matches settings pending / approved / rejected buttons (`setStatus`). */
export const STATUS_ORDER = [0, 1, 2] as const;

export const STATUS_LABELS: Record<number, string> = {
  0: 'PENDING',
  1: 'APPROVED',
  2: 'REJECTED',
};

/** Matches enable / disable selected buttons (`toggleAbility` / ColNine). */
export const ABILITY_CYCLE_STATES = [
  { isEnabled: false, isDisabled: false, label: 'NONE' },
  { isEnabled: true, isDisabled: false, label: 'DERESTRICT_SELECTED' },
  { isEnabled: false, isDisabled: true, label: 'RESTRICT_SELECTED' },
] as const;

export const abilityCycleIndex = (isEnabled: boolean, isDisabled: boolean): number => {
  if (isDisabled) return 2;
  if (isEnabled) return 1;
  return 0;
};

export const connectsOrderIndex = (connectsKey: string): number => {
  const i = CONNECTS_ORDER.indexOf(connectsKey);
  return i === -1 ? 0 : i;
};

export const statusOrderIndex = (status: number | undefined): number => {
  const v = status ?? STATUS_ORDER[0];
  const i = STATUS_ORDER.indexOf(v as (typeof STATUS_ORDER)[number]);
  return i === -1 ? 0 : i;
};

export const formatConnectsWarningLines = (activeKey: string): string[] =>
  CONNECTS_ORDER.map((key) => (key === activeKey ? `${key}_` : key));

export const formatStatusWarningLines = (activeStatus: (typeof STATUS_ORDER)[number]): string[] =>
  STATUS_ORDER.map((status) =>
    status === activeStatus ? `${STATUS_LABELS[status]}_` : STATUS_LABELS[status],
  );

export const formatAbilityWarningLines = (activeAbilityIdx: number): string[] =>
  ABILITY_CYCLE_STATES.map((entry, idx) => (idx === activeAbilityIdx ? `${entry.label}_` : entry.label));

export const QUOTA_ORDER = Object.keys(quotaOptions).map(Number);
export const DELETION_ORDER = Object.keys(deltionSizes).map(Number);
export const SESSION_ORDER = Object.keys(sessionSizes).map(Number);

export const quotaOrderIndex = (quota: number | undefined): number => {
  const v = quota ?? QUOTA_ORDER[0];
  const i = QUOTA_ORDER.indexOf(v);
  return i === -1 ? 0 : i;
};

export const deletionOrderIndex = (deletedOrphans: number | undefined): number => {
  const v = deletedOrphans ?? DELETION_ORDER[0];
  const i = DELETION_ORDER.indexOf(v);
  return i === -1 ? 0 : i;
};

export const sessionOrderIndex = (seconds: number | undefined): number => {
  const v = seconds ?? SESSION_ORDER[0];
  const i = SESSION_ORDER.indexOf(v);
  return i === -1 ? 0 : i;
};

export const formatQuotaWarningLines = (activeQuota: number): string[] =>
  QUOTA_ORDER.map((quota) => (quota === activeQuota ? `${quotaOptions[quota]}_` : quotaOptions[quota]));

export const formatDeletionWarningLines = (activeDeletion: number): string[] =>
  DELETION_ORDER.map((size) => (size === activeDeletion ? `${deltionSizes[size]}_` : deltionSizes[size]));

export const formatSessionWarningLines = (activeSession: number): string[] =>
  SESSION_ORDER.map((session) =>
    session === activeSession ? `${sessionSizes[session]}_` : sessionSizes[session],
  );

export type ConnectsCycleShortcutStage =
  | 'connects'
  | 'status'
  | 'ability'
  | 'quota'
  | 'deletion'
  | 'session';

type OptionsCycleRoleKey = 'member' | 'moderator' | 'admin';

const OPTIONS_CYCLE_STAGE_LABELS: Record<ConnectsCycleShortcutStage, string> = {
  connects: 'connects',
  status: 'status',
  ability: 'ability',
  quota: 'quota_size',
  deletion: 'deletion_size',
  session: 'session_len',
};

const nextOptionsCycleStage = (
  stage: ConnectsCycleShortcutStage,
  roleKey: OptionsCycleRoleKey,
): ConnectsCycleShortcutStage | null => {
  if (stage === 'connects') return roleKey === 'member' ? null : 'status';
  if (stage === 'status') return roleKey === 'admin' ? 'ability' : 'connects';
  if (stage === 'ability') return roleKey === 'admin' ? 'quota' : 'connects';
  if (stage === 'quota') return 'deletion';
  if (stage === 'deletion') return 'session';
  return 'connects';
};

/**
 * Ctrl+Shift+Z staged cycle (profile C): connects → status (mod/admin) → ability (admin) →
 * quota / deletion / session (admin). Stage depth uses {@link CHIEF} / {@link MOD} in
 * `session.roles`, not the active `mutateRole`. Within a stage, values wrap at the list end;
 * use {@link createOptionsCycleShortcutHandlers}'s arm handler (Ctrl+Shift+.) so the next Z
 * advances stage instead of wrapping. `isChordOk` should match profile C modifier rules.
 */
export const createOptionsCycleShortcutHandlers = (
  dispatch: AppDispatch,
  isChordOk: (event: KeyboardEvent) => boolean,
): {
  cycleHandler: (event: KeyboardEvent) => void;
  armAdvanceStageHandler: (event: KeyboardEvent) => void;
} => {
  let stage: ConnectsCycleShortcutStage = 'connects';
  let roleStageKey: OptionsCycleRoleKey = 'member';
  let advanceStageOnNextZ = false;

  const syncRoleStage = (): OptionsCycleRoleKey => {
    const { roles = [] } = store.getState().session;
    const isAdmin = roles.includes(CHIEF);
    const isModerator = roles.includes(MOD);
    const roleKey: OptionsCycleRoleKey = isAdmin
      ? 'admin'
      : isModerator
        ? 'moderator'
        : 'member';
    if (roleKey !== roleStageKey) {
      roleStageKey = roleKey;
      stage = 'connects';
      advanceStageOnNextZ = false;
    }
    return roleKey;
  };

  const advanceToNextStage = (): void => {
    if (stage === 'connects') {
      stage = 'status';
      const firstStatus = STATUS_ORDER[0];
      dispatch(setStatus(firstStatus));
      dispatch(appendWarnings(formatStatusWarningLines(firstStatus)));
      return;
    }

    if (stage === 'status') {
      if (roleStageKey === 'admin') {
        stage = 'ability';
        const firstAbility = ABILITY_CYCLE_STATES[0];
        dispatch(
          mutateSettings({
            isEnabled: firstAbility.isEnabled,
            isDisabled: firstAbility.isDisabled,
          }),
        );
        dispatch(appendWarnings(formatAbilityWarningLines(0)));
        return;
      }

      stage = 'connects';
      const firstConnectsKey = CONNECTS_ORDER[0];
      dispatch(connectSelecteds(firstConnectsKey));
      dispatch(appendWarnings(formatConnectsWarningLines(firstConnectsKey)));
      return;
    }

    if (stage === 'ability') {
      if (roleStageKey === 'admin') {
        stage = 'quota';
        const firstQuota = QUOTA_ORDER[0];
        dispatch(quotaSelected(firstQuota));
        dispatch(appendWarnings(formatQuotaWarningLines(firstQuota)));
        return;
      }

      stage = 'connects';
      const firstConnectsKey = CONNECTS_ORDER[0];
      dispatch(connectSelecteds(firstConnectsKey));
      dispatch(appendWarnings(formatConnectsWarningLines(firstConnectsKey)));
      return;
    }

    if (stage === 'quota') {
      stage = 'deletion';
      const firstDeletion = DELETION_ORDER[0];
      dispatch(orphansSizeSelected(firstDeletion));
      dispatch(appendWarnings(formatDeletionWarningLines(firstDeletion)));
      return;
    }

    if (stage === 'deletion') {
      stage = 'session';
      const firstSession = SESSION_ORDER[0];
      dispatch(secondsSelected(firstSession));
      dispatch(appendWarnings(formatSessionWarningLines(firstSession)));
      return;
    }

    stage = 'connects';
    const firstConnectsKey = CONNECTS_ORDER[0];
    dispatch(connectSelecteds(firstConnectsKey));
    dispatch(appendWarnings(formatConnectsWarningLines(firstConnectsKey)));
  };

  const cycleHandler = (event: KeyboardEvent) => {
    if (!isChordOk(event)) return;
    if (event.key !== 'z' && event.key !== 'Z') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;
    const L = CONNECTS_ORDER.length;
    if (!L) return;
    event.preventDefault();
    dispatch(clearOnlyWarnings());

    syncRoleStage();

    if (advanceStageOnNextZ) {
      advanceStageOnNextZ = false;
      advanceToNextStage();
      return;
    }

    const { connects, status, isEnabled, isDisabled, quota, deletedOrphans, seconds } =
      store.getState().settings;
    const connectsKey = normalizeConnectsKey(connects);
    const ci = connectsOrderIndex(connectsKey);
    const si = statusOrderIndex(status);
    const ai = abilityCycleIndex(isEnabled, isDisabled);
    const qi = quotaOrderIndex(quota);
    const di = deletionOrderIndex(deletedOrphans);
    const tsi = sessionOrderIndex(seconds);

    if (stage === 'connects') {
      const nextConnectsKey = CONNECTS_ORDER[(ci + 1) % L];
      dispatch(connectSelecteds(nextConnectsKey));
      dispatch(appendWarnings(formatConnectsWarningLines(nextConnectsKey)));
      return;
    }

    if (stage === 'status') {
      const nextStatus = STATUS_ORDER[(si + 1) % STATUS_ORDER.length];
      dispatch(setStatus(nextStatus));
      dispatch(appendWarnings(formatStatusWarningLines(nextStatus)));
      return;
    }

    if (stage === 'ability') {
      const nextAbilityIdx = (ai + 1) % ABILITY_CYCLE_STATES.length;
      const ability = ABILITY_CYCLE_STATES[nextAbilityIdx];
      dispatch(
        mutateSettings({
          isEnabled: ability.isEnabled,
          isDisabled: ability.isDisabled,
        }),
      );
      dispatch(appendWarnings(formatAbilityWarningLines(nextAbilityIdx)));
      return;
    }

    if (stage === 'quota') {
      const nextQuota = QUOTA_ORDER[(qi + 1) % QUOTA_ORDER.length];
      dispatch(quotaSelected(nextQuota));
      dispatch(appendWarnings(formatQuotaWarningLines(nextQuota)));
      return;
    }

    if (stage === 'deletion') {
      const nextDeletion = DELETION_ORDER[(di + 1) % DELETION_ORDER.length];
      dispatch(orphansSizeSelected(nextDeletion));
      dispatch(appendWarnings(formatDeletionWarningLines(nextDeletion)));
      return;
    }

    const nextSession = SESSION_ORDER[(tsi + 1) % SESSION_ORDER.length];
    dispatch(secondsSelected(nextSession));
    dispatch(appendWarnings(formatSessionWarningLines(nextSession)));
  };

  const armAdvanceStageHandler = (event: KeyboardEvent) => {
    if (!isChordOk(event)) return;
    if (event.code !== 'Period') return;
    const el = event.target as HTMLElement | null;
    if (el?.closest(IGNORE_WEBAPP_JUMP_IN) || el?.isContentEditable) return;

    event.preventDefault();
    dispatch(clearOnlyWarnings());

    const roleKey = syncRoleStage();
    const nextStage = nextOptionsCycleStage(stage, roleKey);
    if (!nextStage) {
      dispatch(
        prependWarning('No next option type from connects (member role); Ctrl + Shift + Z keeps cycling connects'),
      );
      return;
    }

    advanceStageOnNextZ = true;
    dispatch(
      prependWarning(
        `Next Ctrl + Shift + Z will advance from ${OPTIONS_CYCLE_STAGE_LABELS[stage]} to ${OPTIONS_CYCLE_STAGE_LABELS[nextStage]}`,
      ),
    );
  };

  return { cycleHandler, armAdvanceStageHandler };
};

/** @deprecated Use {@link createOptionsCycleShortcutHandlers} and its `cycleHandler`. */
export const createOptionsCycleShortcutHandler = (
  dispatch: AppDispatch,
  isChordOk: (event: KeyboardEvent) => boolean,
): ((event: KeyboardEvent) => void) => createOptionsCycleShortcutHandlers(dispatch, isChordOk).cycleHandler;

export type QuickReferenceRoleKey = 'anonymous' | 'member' | 'moderator' | 'admin';

export type QuickReferenceLinesByRole = Record<QuickReferenceRoleKey, readonly string[]>;

const QUICK_REFERENCE_ROLE_TIER_ORDER: readonly QuickReferenceRoleKey[] = [
  'anonymous',
  'member',
  'moderator',
  'admin',
];

/** Resolves the highest quick-reference tier for the current session (admin > moderator > member > anonymous). */
export const quickReferenceRoleKeyFromSession = (
  roles: string[] | undefined,
  authenticated: boolean,
): QuickReferenceRoleKey => {
  if (!authenticated) return 'anonymous';
  const resolvedRoles = roles ?? [];
  if (resolvedRoles.includes(CHIEF)) return 'admin';
  if (resolvedRoles.includes(MOD)) return 'moderator';
  return 'member';
};

/** Concatenates anonymous through the given role tier (member = anonymous + member, etc.). */
export const flattenQuickReferenceLinesForRole = (
  byRole: QuickReferenceLinesByRole,
  roleKey: QuickReferenceRoleKey,
): readonly string[] => {
  const maxIdx = QUICK_REFERENCE_ROLE_TIER_ORDER.indexOf(roleKey);
  const parts: string[] = [];
  for (let i = 0; i <= maxIdx; i += 1) {
    parts.push(...byRole[QUICK_REFERENCE_ROLE_TIER_ORDER[i]!]);
  }
  return parts;
};

/** Full quick-reference list (admin tier) for chord recording and backward-compatible exports. */
export const allQuickReferenceLines = (
  byRole: QuickReferenceLinesByRole,
): readonly string[] => flattenQuickReferenceLinesForRole(byRole, 'admin');

export const quickReferenceLinesForProfile = (
  profile: string,
  profileALines: readonly string[],
  profileBLinesByRole: QuickReferenceLinesByRole,
  profileCLinesByRole: QuickReferenceLinesByRole,
  profileDLinesByRole: QuickReferenceLinesByRole,
  roleKey: QuickReferenceRoleKey,
): readonly string[] => {
  if (profile === 'a') return profileALines;
  if (profile === 'b') return flattenQuickReferenceLinesForRole(profileBLinesByRole, roleKey);
  if (profile === 'c') return flattenQuickReferenceLinesForRole(profileCLinesByRole, roleKey);
  if (profile === 'd') return flattenQuickReferenceLinesForRole(profileDLinesByRole, roleKey);
  return [];
};

/** Profile C Ctrl+Shift+letter → ActionsExecutor action (excludes `mutateMyAbility`). */
export const ACTIONS_EXECUTOR_SHORTCUTS: Record<string, ActionCreatorWithoutPayload> = {
  e: mutateQuotas,
  f: deleteOrphans,
  g: contentVisibility,
  j: aquireVoucher,
  k: mutateHierachies,
  m: mutateAbilities,
  n: saveTutorialTrees,
  o: saveCourseTrees,
  p: saveQuizTrees,
  r: approveTutorialTrees,
  s: approveCourseTrees,
  t: approveQuizTrees,
  v: saveTutorialOwnership,
  w: saveCourseOwnership,
  x: saveQuizOwnership,
};

/** Same admin batch as {@link useAdminSettingsBtns} / `Administrator` settings apply. */
export const ACTIONS_EXECUTOR_ADMIN_KEYS = new Set(['e', 'f', 'j', 'k', 'm']);

/** Same moderator batch as {@link useModeratorSettingsBtns} / `Moderator` settings apply. */
export const ACTIONS_EXECUTOR_MODERATOR_KEYS = new Set(['r', 's', 't']);

/** Convolution webapps for Ctrl+Shift+B stash listing order (see {@link sortStashInventoryWarningLines}). */
export const STASH_LIST_WEBAPP_ORDER = [
  'tutorial',
  'course',
  'quiz',
  'tutors',
  'incoming',
  'outgoing',
  'cpanel',
  'other',
] as const;

/**
 * Maps a stash `approute` (`from`+`to`) to a convolution webapp bucket for grouping stash inventory lines.
 */
export const convolutionWebappBucketForApproute = (approute: string): (typeof STASH_LIST_WEBAPP_ORDER)[number] => {
  const lower = approute.toLowerCase();
  for (const webapp of STASH_LIST_WEBAPP_ORDER) {
    if (webapp === 'other') break;
    const pairs = orderEntitiesRootToLeafForWebapp(Tree.entities, webapp).flatMap((entity) => {
      const routes = (entity.webapps?.[webapp] ?? []).map((dsc: string) => entity.name + dsc);
      return entity.menu
        .filter(({ from, to }: MenuItem) => routes.includes(from + to))
        .map(({ from, to }) => (from + to).toLowerCase());
    });
    if (pairs.some((id) => id === lower)) return webapp;
  }
  return 'other';
};

export const collectNonEmptyStashEntries = (
  stash: StashState
): Array<{ approute: string; timestamp: string }> => {
  const out: Array<{ approute: string; timestamp: string }> = [];
  for (const approute of Object.keys(stash)) {
    const routeStash = stash[approute];
    if (!routeStash) continue;
    for (const timestamp of Object.keys(routeStash)) {
      if (getStashCellRows(routeStash[timestamp]).length === 0) continue;
      out.push({ approute, timestamp });
    }
  }
  return out;
};

/**
 * Bare stash `approute` keys from {@link ../store/middleware/cascadingStasher} that appear under more than one
 * convolution webapp; `convolutionWebappBucketForApproute` can pick the wrong app. Hierarchy timestamps carry
 * `webappIndex` for the correct {@link ../utils.getRouteAlias} lookup (ambiguous routes in `utils`).
 */
const CASCADE_APPROUTES_USE_HIERARCHY_WEBAPP = new Set([
  'siftersfilters',
  'siftersinstructions',
  'filtersinstructions',
]);

export const formatStashInventoryLine = (approute: string, timestamp: string): string => {
  const bucket = convolutionWebappBucketForApproute(approute);
  let appName: string = bucket === 'other' ? 'tutorial' : bucket;
  const lower = approute.toLowerCase();
  if (CASCADE_APPROUTES_USE_HIERARCHY_WEBAPP.has(lower)) {
    const parsed = parseHierarchyStampedStashKey(timestamp);
    if (parsed) appName = getCurAppName(parsed.webappIndex);
  }
  const alias = getRouteAlias(approute, appName);
  return `${alias} : ${timestamp}`;
};

const SHORTCUT_STASH_WARNING_TS =
  /\b(Joined_items|Unjoined_items|Escrowed_items)-(\d+)(?=(?:-\d+-\d+)?\b)/g;

const HANDLES_STASH_WARNING_TS = /\bhandles-(\d+)\b/g;

const to24HourTimeFromUnixSeconds = (unixSeconds: string): string => {
  const sec = Number(unixSeconds);
  if (!Number.isFinite(sec) || sec < 0) return unixSeconds;
  const date = new Date(sec * 1000);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const toDatetimeFromUnixMs = (unixMs: string): string => {
  const ms = Number(unixMs);
  if (!Number.isFinite(ms) || ms < 0) return unixMs;
  const date = new Date(ms);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

/** Replaces embedded unix in stash warning lines: hierarchy keys → `HH:MM:SS`, handles keys → datetime. */
export const formatShortcutTimestampWarningLine = (line: string): string =>
  line
    .replace(SHORTCUT_STASH_WARNING_TS, (_match, prefix: string, unixSeconds: string) => {
      const time24h = to24HourTimeFromUnixSeconds(unixSeconds);
      return `${prefix}-${time24h}`;
    })
    .replace(HANDLES_STASH_WARNING_TS, (_match, unixMs: string) => {
      const datetime = toDatetimeFromUnixMs(unixMs);
      return `handles-${datetime}`;
    });

export type StashInventoryEntry = { approute: string; timestamp: string };

/** Same unix + hierarchy: escrow rows before unjoin before join (not `localeCompare` on timestamp). */
const hierarchyStashFlavorRankForSort = (timestamp: string): number => {
  const p = parseHierarchyStampedStashKey(timestamp);
  if (!p) return 3;
  const m = p.base.match(/^(Joined_items|Unjoined_items|Escrowed_items)-/i);
  if (!m) return 3;
  const flavor = m[1].toLowerCase();
  if (flavor === 'escrowed_items') return 0;
  if (flavor === 'unjoined_items') return 1;
  return 2;
};

const stashInventoryAppRankAscending = (e: StashInventoryEntry): number => {
  const p = parseHierarchyStampedStashKey(e.timestamp);
  if (p) {
    const name = getCurAppName(p.webappIndex);
    const i = STASH_LIST_WEBAPP_ORDER.indexOf(
      name as (typeof STASH_LIST_WEBAPP_ORDER)[number]
    );
    return i === -1 ? STASH_LIST_WEBAPP_ORDER.length : i;
  }
  const b = convolutionWebappBucketForApproute(e.approute);
  const i = STASH_LIST_WEBAPP_ORDER.indexOf(b);
  return i === -1 ? STASH_LIST_WEBAPP_ORDER.length : i;
};

/**
 * Within the same app, group rows from one PNC hierarchy operation (`Joined_items|Unjoined_items|Escrowed_items-<unix>-…`).
 * Ascending on this key ⇒ newer operations first (`-unix`); plain cells last (`+∞`).
 */
const stashInventoryOperationGroupKey = (e: StashInventoryEntry): number => {
  const p = parseHierarchyStampedStashKey(e.timestamp);
  if (!p) return Number.POSITIVE_INFINITY;
  return -hierarchyShortcutStashBaseUnixSeconds(p.base);
};

/** Ascending hierarchy index; plain cells use +∞ so hierarchy rows precede plain within the same app. */
const stashInventoryHierarchyAscKey = (e: StashInventoryEntry): number => {
  const p = parseHierarchyStampedStashKey(e.timestamp);
  return p ? p.hierarchyIndex : Number.POSITIVE_INFINITY;
};

/**
 * Stable id for one PNC shortcut hierarchy operation in inventory order; `null` for plain stash cells.
 * Includes full `base` (`Escrowed_items|…` vs `Joined_items|…`) so same-second escrow/join stay separate.
 */
export const stashInventoryHierarchyNavGroupId = (e: StashInventoryEntry): string | null => {
  const p = parseHierarchyStampedStashKey(e.timestamp);
  if (!p) return null;
  return `${stashInventoryAppRankAscending(e)}|${p.base}`;
};

export type StashInventoryHierarchyNavGroup = {
  key: string;
  hierarchyUnix: number;
  members: StashInventoryEntry[];
};

/** Ordered nav groups (same sequence as {@link sortStashInventoryEntries}) for Ctrl+Shift+V / N. */
export const buildStashInventoryHierarchyNavGroups = (
  sortedEntries: StashInventoryEntry[]
): StashInventoryHierarchyNavGroup[] => {
  const order: string[] = [];
  const byKey = new Map<string, StashInventoryEntry[]>();
  for (const e of sortedEntries) {
    const gid = stashInventoryHierarchyNavGroupId(e);
    if (!gid) continue;
    if (!byKey.has(gid)) {
      byKey.set(gid, []);
      order.push(gid);
    }
    byKey.get(gid)!.push(e);
  }
  return order.map((key) => {
    const members = byKey.get(key)!;
    const p = parseHierarchyStampedStashKey(members[0]!.timestamp);
    const hierarchyUnix = p ? hierarchyShortcutStashBaseUnixSeconds(p.base) : 0;
    return { key, hierarchyUnix, members };
  });
};

/** Nav group whose cells are marked with `unixSeconds === currentNav` (precise selection cursor). */
const findStashInventoryNavGroupForCursor = (
  stash: StashState,
  navGroups: StashInventoryHierarchyNavGroup[],
  currentNav: number | null
): StashInventoryHierarchyNavGroup | null => {
  if (currentNav == null) return null;
  const marked = navGroups.filter((group) =>
    group.members.some(
      (m) => normalizeStashCell(stash[m.approute]?.[m.timestamp]).unixSeconds === currentNav
    )
  );
  if (marked.length === 1) return marked[0]!;
  if (marked.length > 1) return marked[0]!;
  return navGroups.find((group) => group.hierarchyUnix === currentNav) ?? null;
};

/**
 * Orders stash inventory / escrow warning lines: convolution **app ascending** ({@link STASH_LIST_WEBAPP_ORDER},
 * using hierarchy `webappIndex` when present), then **one shortcut stash operation at a time** (shared hierarchy
 * `base`, newer unix first), then **hierarchy index ascending** within that operation, then **PNC stash flavor**
 * `Escrowed_items` → `Unjoined_items` → `Joined_items` (avoids lexicographic timestamp tiebreak `Joined` before
 * `Unjoined`). Plain (non-hierarchy) cells sort after hierarchy rows for that app. {@link Shortcuts_b.ts} prepends
 * in reverse so `lines[0]` is the topmost toast.
 */
/** Same ordering as {@link sortStashInventoryWarningLines} but returns entry objects. */
export const sortStashInventoryEntries = (
  entries: StashInventoryEntry[]
): StashInventoryEntry[] =>
  [...entries].sort((a, b) => {
    const ra = stashInventoryAppRankAscending(a);
    const rb = stashInventoryAppRankAscending(b);
    if (ra !== rb) return ra - rb;
    const oa = stashInventoryOperationGroupKey(a);
    const ob = stashInventoryOperationGroupKey(b);
    if (oa !== ob) return oa - ob;
    const ha = stashInventoryHierarchyAscKey(a);
    const hb = stashInventoryHierarchyAscKey(b);
    if (ha !== hb) return ha - hb;
    const fa = hierarchyStashFlavorRankForSort(a.timestamp);
    const fb = hierarchyStashFlavorRankForSort(b.timestamp);
    if (fa !== fb) return fa - fb;
    return a.approute.localeCompare(b.approute) || a.timestamp.localeCompare(b.timestamp);
  });

export const sortStashInventoryWarningLines = (
  entries: Array<{ approute: string; timestamp: string }>
): string[] =>
  sortStashInventoryEntries(entries).map((e) => formatStashInventoryLine(e.approute, e.timestamp));

export type StashInventoryNavigateDirection = 'next' | 'prev';

export type StashInventoryNavigateEffect =
  | { kind: 'stash_empty' }
  | { kind: 'inventory_only'; warningMessages: string[] }
  | {
    kind: 'navigate';
    warningMessages: string[];
    stashNav: { hierarchyUnix: number; members: StashInventoryEntry[] };
  };

/**
 * Computes Ctrl+Shift+P stash inventory warning strings and marks the currently selected hierarchy
 * group (if any) with the same suffix used by Ctrl+Shift+V / Ctrl+Shift+N.
 */
export const computeStashInventoryListMessages = (state: RootState): string[] => {
  const stash = state.stash;
  const entries = collectCurAppNonEmptyStashEntries(state);
  if (entries.length === 0) return [];
  const sortedEntries = sortStashInventoryEntries(entries);
  const lines = sortedEntries.map((e) => formatStashInventoryLine(e.approute, e.timestamp));
  if (lines.length === 0) return [];

  const navGroups = buildStashInventoryHierarchyNavGroups(sortedEntries);
  const currentNav = readStashInventoryNavUnixSeconds(stash);
  const selectedGroup = findStashInventoryNavGroupForCursor(stash, navGroups, currentNav);
  const selectedMemberSet = new Set(
    (selectedGroup?.members ?? []).map((m) => `${m.approute}\x00${m.timestamp}`)
  );
  const suffixForSelectedGroup = ' ← ';

  const warningMessages: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const entry = sortedEntries[i]!;
    const isSelectedMember = selectedMemberSet.has(`${entry.approute}\x00${entry.timestamp}`);
    warningMessages.push(
      formatShortcutTimestampWarningLine(line) + (isSelectedMember ? suffixForSelectedGroup : '')
    );
  }
  return warningMessages;
};

/**
 * Computes Ctrl+Shift+V / Ctrl+Shift+N stash inventory navigation: warning strings in UI display order
 * (top-to-bottom, same as `state.error.warnings` after `appendWarning` from `stashSlice`),
 * and optional stash cursor update.
 */
export const computeStashInventoryNavigateEffect = (
  state: RootState,
  direction: StashInventoryNavigateDirection
): StashInventoryNavigateEffect => {
  const stash = state.stash;
  const entries = collectCurAppNonEmptyStashEntries(state);
  if (entries.length === 0) return { kind: 'stash_empty' };

  const sortedEntries = sortStashInventoryEntries(entries);
  const lines = sortedEntries.map((e) => formatStashInventoryLine(e.approute, e.timestamp));
  if (lines.length === 0) return { kind: 'stash_empty' };

  const navGroups = buildStashInventoryHierarchyNavGroups(sortedEntries);
  if (navGroups.length === 0) {
    const warningMessages = lines.map((line) => formatShortcutTimestampWarningLine(line));
    return { kind: 'inventory_only', warningMessages };
  }

  const isNext = direction === 'next';
  const currentNav = readStashInventoryNavUnixSeconds(stash);
  let curGroupIdx = -1;
  if (currentNav != null) {
    curGroupIdx = navGroups.findIndex((g) =>
      g.members.some(
        (m) => normalizeStashCell(stash[m.approute]?.[m.timestamp]).unixSeconds === currentNav
      )
    );
    if (curGroupIdx === -1) {
      const subs = String(currentNav);
      curGroupIdx = navGroups.findIndex((g) =>
        g.members.some((m) => formatStashInventoryLine(m.approute, m.timestamp).includes(subs))
      );
    }
  }

  const dir = isNext ? 1 : -1;
  const nextIdx =
    curGroupIdx === -1
      ? isNext
        ? 0
        : navGroups.length - 1
      : (curGroupIdx + dir + navGroups.length) % navGroups.length;
  const target = navGroups[nextIdx]!;
  const suffixForTarget = ' ← ';
  const memberSet = new Set(
    target.members.map((m) => `${m.approute}\x00${m.timestamp}`)
  );

  const warningMessages: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const entry = sortedEntries[i]!;
    const isMember = memberSet.has(`${entry.approute}\x00${entry.timestamp}`);
    warningMessages.push(
      formatShortcutTimestampWarningLine(line) + (isMember ? suffixForTarget : '')
    );
  }

  return {
    kind: 'navigate',
    warningMessages,
    stashNav: { hierarchyUnix: target.hierarchyUnix, members: target.members },
  };
};

export const freightsForCompleteUnjoinStashGroup = (
  byHierarchy: Map<number, { approute: string; timestamp: string }>,
  destination: string
): Freight[] | null => {
  const hs = [...byHierarchy.keys()].sort((a, b) => a - b);
  if (hs.length === 0 || hs[0] !== 0) return null;
  for (let i = 0; i < hs.length; i += 1) {
    if (hs[i] !== i) return null;
  }
  return hs.map((i) => {
    const { approute, timestamp } = byHierarchy.get(i)!;
    return {
      timestamp,
      approute,
      destination,
      selecttype: true,
    };
  });
};

export const getRoutePairsForCurApp = (state: RootState, webappIndex?: number) => {
  const curApp = webappIndex ?? state.session.curApp;
  const webapp = getCurAppName(curApp);
  const routeOrder =
    SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER[
      webapp as keyof typeof SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER
    ] ?? [];
  const routeOrderIndex = new Map<string, number>(
    routeOrder.map((approute, index): [string, number] => [approute, index])
  );
  const routePairs = orderEntitiesRootToLeafForWebapp(Tree.entities, webapp)
    .map(({ webapps, name, menu }) => {
      const routes = (webapps?.[webapp] ?? []).map((dsc: string) => name + dsc);
      return menu
        .filter(({ from, to }: MenuItem) => routes.includes(from + to))
        .map(({ from, to }: MenuItem) => ({ urlID: from + to, from, to }));
    })
    .flat()
    .filter(
      (route, index, arr) =>
        arr.findIndex(({ urlID }) => urlID === route.urlID) === index
    )
    .sort((a, b) => {
      const aRank = routeOrderIndex.get(a.urlID.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const bRank = routeOrderIndex.get(b.urlID.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  return { curApp, routePairs };
};

/**
 * Non-empty stash cells scoped to the current webapp — same app boundary as Ctrl+Shift+X.
 * PNC: hierarchy rows for `curApp`, plus plain cells on current-app routes.
 * Other webapps: `deletedTimestamp` / `escrowTimestamp` on current-app routes only.
 */
export const collectCurAppNonEmptyStashEntries = (
  state: RootState
): StashInventoryEntry[] => {
  const { curApp, routePairs } = getRoutePairsForCurApp(state);
  const curAppRouteSet = new Set(routePairs.map((r) => r.urlID.toLowerCase()));
  return collectNonEmptyStashEntries(state.stash).filter((e) => {
    const parsed = parseHierarchyStampedStashKey(e.timestamp);
    if (parsed) {
      return parsed.webappIndex === curApp;
    }
    if (!curAppRouteSet.has(e.approute.toLowerCase())) return false;
    if (isPncUserApp(curApp)) return true;
    return e.timestamp === deletedTimestamp || e.timestamp === escrowTimestamp;
  });
};

export type SharedPagedRouteShortcutContext = {
  state: RootState;
  curApp: number;
  routePairs: ReturnType<typeof getRoutePairsForCurApp>['routePairs'];
  selected: Record<string, number[]>;
  urlIDs: string[];
};

export type BuildSharedPagedRouteShortcutContextOptions = {
  /**
   * When false, `IdentitiesExtractor` runs without the temporary `dismissOnly`
   * `overrideSelector` pair (default true for other paged-route shortcuts).
   */
  useDismissOnlyOverride?: boolean;
  /**
   * When true, context is built even in minimum-feature mode (default false).
   * Use for shortcuts that should run in both modes, e.g. Ctrl+Shift+5 invert.
   */
  allowInMinimumFeatureMode?: boolean;
  /** When set, route pairs and selection use this webapp instead of `session.curApp`. */
  webappIndex?: number;
};

/** Convolution URL path for `IdentitiesExtractor` / dismissals, from webapp index (not browser URL). */
export const convolutionPathForWebappIndex = (webappIndex: number): string =>
  `/convolution/${getCurAppName(webappIndex).toLowerCase()}`;

/**
 * Shared prefix for paged-route keyboard shortcuts: optional full-feature check, route pairs for
 * the current webapp, optional dismissOnly `IdentitiesExtractor` snapshot, and deduped `urlIDs`.
 * Returns `null` when the shortcut should no-op: no routes for the current webapp, or minimum
 * feature mode without `allowInMinimumFeatureMode` (then also dispatches `prependError` with a hint).
 */
export const buildSharedPagedRouteShortcutContext = (
  options?: BuildSharedPagedRouteShortcutContextOptions
): SharedPagedRouteShortcutContext | null => {
  const useDismissOnlyOverride = options?.useDismissOnlyOverride !== false;
  const state = store.getState();
  if (!options?.allowInMinimumFeatureMode && isMinimumFeatureMode(state)) {
    store.dispatch(prependError(MINIMUM_FEATURE_SHORTCUT_DISABLED_MESSAGE));
    return null;
  }
  const curApp = options?.webappIndex ?? state.session.curApp;
  const { routePairs } = getRoutePairsForCurApp(state, curApp);
  const params = { curApp, state, path: convolutionPathForWebappIndex(curApp) };
  let selected: Record<string, number[]>;
  if (useDismissOnlyOverride) {
    overrideSelector({ selector: 'dismissOnly', value: true });
    ({ selected } = IdentitiesExtractor(params));
    overrideSelector({ selector: 'dismissOnly', value: false });
  } else {
    ({ selected } = IdentitiesExtractor(params));
  }
  const urlIDs = routePairs.map(({ urlID }) => urlID);
  if (urlIDs.length === 0) return null;
  return { state, curApp, routePairs, selected, urlIDs };
};

export type PagedRouteFromTo = { from: string; to: string };

/**
 * Builds shared paged-route context, resolves the current route, dispatches
 * `escrowConvolution` for its selection, then runs `followup` after `followupDelayMs`.
 * Returns whether anything was dispatched (caller should `preventDefault` when true).
 */
export const tryEscrowCurrentPagedRouteThen = (
  dispatch: AppDispatch,
  followup: (d: AppDispatch, route: PagedRouteFromTo) => void,
  followupDelayMs = 30,
  contextOptions?: BuildSharedPagedRouteShortcutContextOptions
): boolean => {
  const ctx = buildSharedPagedRouteShortcutContext(contextOptions);
  if (!ctx) return false;
  const { state, curApp, routePairs, selected } = ctx;
  const current = state.pagination.selectedRoutes[curApp];
  const currentRoute = routePairs.find(({ urlID }) => urlID === current);
  if (!currentRoute) return false;
  const contentIds = selected[current] ?? [];
  dispatch(
    escrowConvolution({
      from: currentRoute.from,
      to: currentRoute.to,
      contentIds,
      curApp,
    })
  );
  setTimeout(() => followup(dispatch, currentRoute), followupDelayMs);
  return true;
};

/**
 * Non-PNC webapps: purge stash uses a single key per route — `deletedTimestamp` in
 * `state.stash[approute]` — matching `CrudsManager123` `destroyOverview`. Returns an
 * `extractContent` payload for the content-extractor middleware when that segment exists.
 */
export const findMemberDeletedStashExtractPayload = (
  state: RootState
): ExtractContentPayload | null => {
  const curApp = state.session.curApp;
  const { routePairs } = getRoutePairsForCurApp(state);
  const current = state.pagination.selectedRoutes[curApp];
  const currentRoute = routePairs.find(({ urlID }) => urlID === current);
  const stash = state.stash;
  const destination = getCurAppName(curApp);
  const basePayload = (approute: string): ExtractContentPayload => ({
    destination,
    approute,
    timestamp: deletedTimestamp,
    selecttype: true,
  });
  if (currentRoute) {
    const approute = currentRoute.from + currentRoute.to;
    if (getStashCellRows(stash[approute]?.[deletedTimestamp]).length) {
      return basePayload(approute);
    }
  }
  const candidates = Object.keys(stash).filter(
    (approute) => getStashCellRows(stash[approute]?.[deletedTimestamp]).length > 0
  );
  if (candidates.length === 0) return null;
  candidates.sort();
  return basePayload(candidates[candidates.length - 1]!);
};

type ShortcutStashFreightResolveOptions = {
  isEligibleBase: (base: string) => boolean;
  baseSortKey: (base: string) => number;
};

const findLatestShortcutStashFreights = (
  state: RootState,
  { isEligibleBase, baseSortKey }: ShortcutStashFreightResolveOptions,
  webappIndex?: number
): Freight[] | null => {
  const curApp = webappIndex ?? state.session.curApp;
  if (!isPncUserApp(curApp)) return null;
  const stash = state.stash;
  const groups = new Map<string, Map<number, { approute: string; timestamp: string }>>();
  const destination = getCurAppName(curApp);

  for (const approute of Object.keys(stash)) {
    const routeStash = stash[approute];
    if (!routeStash) continue;
    for (const timestamp of Object.keys(routeStash)) {
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (!parsed) continue;
      if (parsed.webappIndex !== curApp) continue;
      if (!isEligibleBase(parsed.base)) continue;

      let g = groups.get(parsed.base);
      if (!g) {
        g = new Map();
        groups.set(parsed.base, g);
      }
      if (g.has(parsed.hierarchyIndex)) continue;
      g.set(parsed.hierarchyIndex, { approute, timestamp });
    }
  }

  let best: { key: number; freights: Freight[] } | null = null;
  for (const [base, byH] of groups) {
    const freights = freightsForCompleteUnjoinStashGroup(byH, destination);
    if (!freights) continue;
    const key = baseSortKey(base);
    if (!best || key > best.key) {
      best = { key, freights };
    }
  }
  return best?.freights ?? null;
};

/**
 * PNC (tutorial, course, quiz) only: finds the newest complete shortcut stash from
 * Ctrl+Shift+D (`Unjoined_items-…`) or Ctrl+Shift+Y (`Escrowed_items-…`), by unix seconds,
 * and returns ordered `Freight`s for `dispatchCascadingUnstash`, or `null` if none / incomplete chain.
 * Ctrl+Shift+Z prefers {@link findSelectedOrLatestStashFreights} (selected inventory group first).
 * Non-PNC: use {@link findMemberDeletedStashExtractPayload} and `extractContent` instead.
 */
export const findLatestUnjoinShortcutStashFreights = (state: RootState): Freight[] | null =>
  findLatestShortcutStashFreights(state, {
    isEligibleBase: isUnstashEligibleShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

const collectSelectedShortcutStashGroups = (
  state: RootState,
  isEligibleBase: (base: string) => boolean,
  webappIndex?: number
): {
  groups: Map<string, Map<number, { approute: string; timestamp: string }>>;
  destination: string;
} | null => {
  const curApp = webappIndex ?? state.session.curApp;
  if (!isPncUserApp(curApp)) return null;
  const stash = state.stash;
  const selectedUnix = readStashInventoryNavUnixSeconds(stash);
  if (selectedUnix == null) return null;
  const destination = getCurAppName(curApp);

  const selectedBases = new Set<string>();
  for (const approute of Object.keys(stash)) {
    const routeStash = stash[approute];
    if (!routeStash) continue;
    for (const timestamp of Object.keys(routeStash)) {
      const cell = normalizeStashCell(routeStash[timestamp]);
      if (cell.unixSeconds !== selectedUnix) continue;
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (!parsed || parsed.webappIndex !== curApp) continue;
      if (!isEligibleBase(parsed.base)) continue;
      selectedBases.add(parsed.base);
    }
  }
  if (selectedBases.size === 0) return null;

  const groups = new Map<string, Map<number, { approute: string; timestamp: string }>>();
  for (const approute of Object.keys(stash)) {
    const routeStash = stash[approute];
    if (!routeStash) continue;
    for (const timestamp of Object.keys(routeStash)) {
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (!parsed || parsed.webappIndex !== curApp) continue;
      if (!selectedBases.has(parsed.base)) continue;
      let byH = groups.get(parsed.base);
      if (!byH) {
        byH = new Map();
        groups.set(parsed.base, byH);
      }
      if (!byH.has(parsed.hierarchyIndex)) {
        byH.set(parsed.hierarchyIndex, { approute, timestamp });
      }
    }
  }

  return { groups, destination };
};

const findAllSelectedStashFreightChainsWith = (
  state: RootState,
  options: ShortcutStashFreightResolveOptions,
  webappIndex?: number
): Freight[][] | null => {
  const collected = collectSelectedShortcutStashGroups(state, options.isEligibleBase, webappIndex);
  if (!collected) return null;
  const chains: Freight[][] = [];
  for (const byH of collected.groups.values()) {
    const freights = freightsForCompleteUnjoinStashGroup(byH, collected.destination);
    if (freights) chains.push(freights);
  }
  return chains.length ? chains : null;
};

const findSelectedStashFreightsWith = (
  state: RootState,
  options: ShortcutStashFreightResolveOptions,
  webappIndex?: number
): Freight[] | null => {
  const chains = findAllSelectedStashFreightChainsWith(state, options, webappIndex);
  if (!chains?.length) return null;

  let best: Freight[] | null = null;
  let bestKey = -1;
  for (const freights of chains) {
    const parsed = parseHierarchyStampedStashKey(freights[0]!.timestamp);
    if (!parsed) continue;
    const key = options.baseSortKey(parsed.base);
    if (!best || key > bestKey) {
      bestKey = key;
      best = freights;
    }
  }
  return best;
};

const findSelectedOrLatestStashFreightsWith = (
  state: RootState,
  options: ShortcutStashFreightResolveOptions,
  webappIndex?: number
): Freight[] | null =>
  findSelectedStashFreightsWith(state, options, webappIndex) ??
  findLatestShortcutStashFreights(state, options, webappIndex);

/**
 * PNC only: every complete `Unjoined_items` / `Escrowed_items` chain for the inventory-selected
 * hierarchy group (`unixSeconds` from Ctrl+Shift+N/V). Returns `null` when nothing is selected or
 * no complete chain exists (no fallback to latest).
 */
export const findAllSelectedStashFreightChains = (state: RootState): Freight[][] | null =>
  findAllSelectedStashFreightChainsWith(state, {
    isEligibleBase: isUnstashEligibleShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

/**
 * PNC only: complete `Unjoined_items` / `Escrowed_items` stash chain for the inventory-selected
 * hierarchy group (`unixSeconds` from Ctrl+Shift+N/V). Returns `null` when nothing is selected or
 * the selection does not form a complete chain (no fallback to latest). When multiple complete
 * chains share the selection, returns the newest by {@link shortcutUnstashStashBaseSortKey}.
 */
export const findSelectedStashFreights = (state: RootState): Freight[] | null =>
  findSelectedStashFreightsWith(state, {
    isEligibleBase: isUnstashEligibleShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

/**
 * PNC only: complete `Escrowed_items` stash chain for the inventory-selected hierarchy group
 * (`unixSeconds` from Ctrl+Shift+N/V). Returns `null` when nothing is selected, the selection is
 * not escrow, or the chain is incomplete (no fallback to latest).
 */
export const findSelectedEscrowStashFreights = (state: RootState): Freight[] | null =>
  findSelectedStashFreightsWith(state, {
    isEligibleBase: isEscrowedItemsShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

/**
 * PNC only: resolves unstash target for Ctrl+Shift+Z by trying the currently selected stash
 * inventory hierarchy group first (when it is an Unjoined/Escrowed complete chain), then
 * falling back to {@link findLatestUnjoinShortcutStashFreights}.
 */
export const findSelectedOrLatestStashFreights = (state: RootState): Freight[] | null =>
  findSelectedOrLatestStashFreightsWith(state, {
    isEligibleBase: isUnstashEligibleShortcutStashBase,
    baseSortKey: shortcutUnstashStashBaseSortKey,
  });

/** PNC only: same as {@link findSelectedOrLatestStashFreights} scoped to a specific webapp index. */
export const findSelectedOrLatestStashFreightsForWebapp = (
  state: RootState,
  webappIndex: number
): Freight[] | null =>
  findSelectedOrLatestStashFreightsWith(
    state,
    {
      isEligibleBase: isUnstashEligibleShortcutStashBase,
      baseSortKey: shortcutUnstashStashBaseSortKey,
    },
    webappIndex
  );

const DELETE_STASH_FREIGHT_RESOLVE_OPTIONS: ShortcutStashFreightResolveOptions = {
  isEligibleBase: isDeleteEligibleShortcutStashBase,
  baseSortKey: hierarchyShortcutStashBaseUnixSeconds,
};

/**
 * PNC only: resolves delete target for Ctrl+Shift+X — selected inventory hierarchy group first
 * (`Unjoined_items`, `Escrowed_items`, or `Joined_items` complete chain), then latest eligible group.
 */
export const findSelectedOrLatestStashFreightsForDelete = (state: RootState): Freight[] | null =>
  findSelectedOrLatestStashFreightsWith(state, DELETE_STASH_FREIGHT_RESOLVE_OPTIONS);

const SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER = {
  tutorial: ['foundationfilters', 'filtersinstructions'],
  course: ['foundationsifters','siftersinstructions', 'siftersfilters',  'filtersinstructions'],
  quiz: [
    'foundationdashboards',
    'dashboardsfilters',
    'dashboardssifters',
    'siftersinstructions',
    'siftersfilters',
    'filtersinstructions',
  ],
} as const;

/**
 * Builds per-query hydration discriminators from shortcut unstash freights.
 * Each predicate accepts rows whose IDs exist in the matching stash slice:
 * `state.stash[freight.approute][freight.timestamp]`, including already-hydrated rows
 * (re-hydration). Attempted seek ids are excluded per session in {@link handleHydrationLogic}.
 */
export const discriminatorsGenerator = (
  getState: () => RootState,
  freights: Freight[],
): GenericDiscriminatorPredicate[] => {
  if (freights.length === 0) return [];
  const destination = freights[0]?.destination as keyof typeof SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER;
  const order = SHORTCUT_HYDRATION_DISCRIMINATOR_ORDER[destination];
  if (!order) return [];
  const stash = getState().stash;
  const idSetsByApproute = new Map<string, Set<number>>();
  for (const { approute, timestamp } of freights) {
    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    idSetsByApproute.set(
      approute.toLowerCase(),
      new Set(
        rows
          .map(({ id }) => Number(id))
          .filter((id) => Number.isFinite(id))
      )
    );
  }
  return order.map((approute) => {
    const ids = idSetsByApproute.get(approute);
    if (!ids) return () => false;
    // Stash may hold local ids (< 0); skip server hydration for those rows.
    return (item) => isServerId(item.id) && ids.has(item.id);
  });
};

type ShortcutStashBoundary = 'oldest' | 'latest';

/**
 * Builds `modifyTimestamp` payloads for the current app's escrow shortcut hierarchy stash groups.
 * - `oldest`: retimestamps the newest base group to the oldest base key.
 * - `latest`: retimestamps the oldest base group to the newest base key.
 *
 * Returns `null` when there are fewer than 2 distinct escrow base groups for this app.
 */
export const buildShortcutStashBoundaryRetimestampPayloads = (
  state: RootState,
  target: ShortcutStashBoundary
): Array<{ approute: string; oldtimestamp: string; newtimestamp: string }> | null => {
  if (!isPncUserApp(state.session.curApp)) return null;
  const curApp = state.session.curApp;
  const stash = state.stash;
  const byBase = new Map<
    string,
    Array<{ approute: string; timestamp: string; hierarchyIndex: number }>
  >();

  for (const approute of Object.keys(stash)) {
    const routeStash = stash[approute];
    if (!routeStash) continue;
    for (const timestamp of Object.keys(routeStash)) {
      const parsed = parseHierarchyStampedStashKey(timestamp);
      if (!parsed) continue;
      if (parsed.webappIndex !== curApp) continue;
      if (!isEscrowedItemsShortcutStashBase(parsed.base)) continue;
      const rows = getStashCellRows(routeStash[timestamp]);
      if (rows.length === 0) continue;
      const current = byBase.get(parsed.base) ?? [];
      current.push({ approute, timestamp, hierarchyIndex: parsed.hierarchyIndex });
      byBase.set(parsed.base, current);
    }
  }

  const bases = [...byBase.keys()].sort(
    (a, b) => hierarchyShortcutStashBaseUnixSeconds(a) - hierarchyShortcutStashBaseUnixSeconds(b)
  );
  if (bases.length < 2) return null;

  const oldestBase = bases[0];
  const latestBase = bases[bases.length - 1];
  if (!oldestBase || !latestBase || oldestBase === latestBase) return null;

  const shift = target === 'oldest' ? 1 : -1;
  const baseDestination = new Map<string, string>();
  for (let i = 0; i < bases.length; i += 1) {
    const sourceBase = bases[i]!;
    const destinationIndex = (i + shift + bases.length) % bases.length;
    const destinationBase = bases[destinationIndex]!;
    baseDestination.set(sourceBase, destinationBase);
  }

  const payloads: Array<{ approute: string; oldtimestamp: string; newtimestamp: string }> = [];
  for (const sourceBase of bases) {
    const destinationBase = baseDestination.get(sourceBase);
    if (!destinationBase) continue;
    const sourceEntries = [...(byBase.get(sourceBase) ?? [])].sort(
      (a, b) => a.hierarchyIndex - b.hierarchyIndex || a.approute.localeCompare(b.approute)
    );
    for (const { approute, timestamp } of sourceEntries) {
      const parsed = parseHierarchyStampedStashKey(timestamp)!;
      payloads.push({
        approute,
        oldtimestamp: timestamp,
        newtimestamp: `${destinationBase}-${curApp}-${parsed.hierarchyIndex}`,
      });
    }
  }

  return payloads.length ? payloads : null;
};

export const MINIMUM_FEATURE_SHORTCUT_DISABLED_MESSAGE =
  'shortcut disabled in minimum feature mode. Press Ctrl+Backspace to enable.';

type ConvolutionNavTarget = {
  pathname: string;
  csKey?: number | string;
};

const CONVOLUTION_CTRL_ALT_NAV: Partial<Record<number, ConvolutionNavTarget>> = {
  1: { pathname: '/convolution/tutorial', csKey: 4 },
  2: { pathname: '/convolution/course', csKey: 3 },
  3: { pathname: '/convolution/quiz', csKey: 1 },
  4: { pathname: '/convolution/tutors', csKey: 2 },
  5: { pathname: '/convolution/incoming', csKey: 5 },
  6: { pathname: '/convolution/outgoing', csKey: 6 },
  7: { pathname: '/convolution/cpanel' },
  8: { pathname: '/convolution/search' },
};

export type ConvolutionCtrlAltNavResult =
  | ConvolutionNavigateTo
  | 'disabled'
  | 'cancelled'
  | null;

/** Ctrl+Alt+1…8 convolution jumps; digits 4–8 return `disabled` in minimum feature mode. */
export const resolveConvolutionCtrlAltNav = (
  digit: number,
  cs: RootState['pagination']['cs'],
  curApp: RootState['session']['curApp'],
  minimumFeatureMode: boolean,
  stickyFsq: StickyFsqOptions,
): ConvolutionCtrlAltNavResult => {
  if (minimumFeatureMode && digit > 3) return 'disabled';

  const target = CONVOLUTION_CTRL_ALT_NAV[digit];
  if (!target) return null;

  const csKey = digit === 7 ? String(curApp) : target.csKey;
  const q = csKey !== undefined ? cs[csKey] : undefined;
  if (isConvolutionNavCancelled(q, stickyFsq)) return 'cancelled';
  return buildConvolutionNavigateTo(target.pathname, q, stickyFsq);
};

export const IGNORE_WEBAPP_JUMP_IN = 'input, textarea, select, [contenteditable="true"]';

export const digitFromCtrlAltNumberKey = (event: KeyboardEvent): number | null => {
  if (event.code.startsWith('Digit')) {
    const n = Number(event.code.slice('Digit'.length));
    return n >= 0 && n <= 9 ? n : null;
  }
  if (event.code.startsWith('Numpad')) {
    const rest = event.code.slice('Numpad'.length);
    const n = Number(rest);
    return Number.isInteger(n) && n >= 0 && n <= 9 ? n : null;
  }
  if (/^[0-9]$/.test(event.key)) return Number(event.key);
  return null;
};

/** Child entity suffixes longest-first so `approute` parses as `{parent}{child}`. */
const CHILD_ENTITY_SUFFIXES = [
  'lowerlowerunderbosses',
  'lowerhigherunderbosses',
  'lowerlowersifters',
  'lowerhighersifters',
  'higherunderbosses',
  'lowerunderbosses',
  'highersifters',
  'lowersifters',
  'instructions',
  'underbosses',
  'dashboards',
  'foundation',
  'filters',
  'sifters',
  'minions',
  'bosses',
] as const;

const idsEqual = (a: string | number, b: string | number): boolean =>
  Number(a) === Number(b) || String(a) === String(b);

/** Server-assigned ids are positive; local `incrementID()` values are zero or negative. */
export const isServerId = (id: DataRow['id']): boolean => Number(id) > 0;

export const parseApprouteInteractionIds = (
  approute: string
): { parentID: string; childID: string } | null => {
  const lower = approute.toLowerCase();
  for (const child of CHILD_ENTITY_SUFFIXES) {
    if (!lower.endsWith(child)) continue;
    const parent = approute.slice(0, approute.length - child.length);
    try {
      const { parentID, childID } = getInteractionIDs(parent, child);
      if (!parentID || !childID) continue;
      return { parentID, childID };
    } catch {
      continue;
    }
  }
  return null;
};

export const parseApprouteChildMetadataKey = (approute: string): string | null =>
  parseApprouteInteractionIds(approute)?.childID ?? null;

/** Child entity name suffix on a stash `approute` (`from`+`to`), e.g. `instructions`. */
export const parseApprouteChildEntity = (approute: string): string | null => {
  const lower = approute.toLowerCase();
  for (const child of CHILD_ENTITY_SUFFIXES) {
    if (lower.endsWith(child)) return child;
  }
  return null;
};

export const metadataChildMatchesRowId = (
  rowId: DataRow['id'],
  childKey: string,
  metadata: Metadata
): boolean => {
  const val = metadata[childKey as keyof Metadata];
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.some((v) => idsEqual(v, rowId));
  return idsEqual(val as string | number, rowId);
};

export const metadataWithChildId = (
  metadata: Metadata,
  childKey: string,
  newId: number,
  oldRowId: DataRow['id']
): Metadata => {
  const val = metadata[childKey as keyof Metadata];
  if (Array.isArray(val)) {
    return {
      ...metadata,
      [childKey]: val.map((v) => (idsEqual(v, oldRowId) ? newId : v)),
    };
  }
  return { ...metadata, [childKey]: newId };
};

export const metadataWithParentId = (
  metadata: Metadata,
  parentKey: string,
  parentId: number
): Metadata => {
  const val = metadata[parentKey as keyof Metadata];
  if (Array.isArray(val)) {
    return { ...metadata, [parentKey]: [parentId] };
  }
  return { ...metadata, [parentKey]: parentId };
};

const remapIdThroughMap = (id: number, idMap: Map<number, number>): number => {
  const n = Number(id);
  if (!Number.isFinite(n)) return id;
  return idMap.get(n) ?? n;
};

const EMPTY_ID_MAP = new Map<number, number>();

/** Parent-key ids are remapped through the ancestor approute whose child entity owns that key. */
const resolveIdMapForParentKey = (
  freights: Freight[],
  idMapsByApproute: Map<string, Map<number, number>>,
  beforeLevel: number,
  parentKey: string,
): Map<number, number> => {
  for (let i = 0; i < beforeLevel; i += 1) {
    const freight = freights[i]!;
    const ids = parseApprouteInteractionIds(freight.approute);
    if (ids?.childID === parentKey) {
      return idMapsByApproute.get(freight.approute) ?? EMPTY_ID_MAP;
    }
  }
  return EMPTY_ID_MAP;
};

/** Remaps `metadata[parentKey]` and top-level `bannerId` after a parent approute id migration. */
const stashRowWithRemappedParentIds = (
  row: DataRow,
  parentKey: string,
  idMap: Map<number, number>
): DataRow => {
  if (!idMap.size) return row;
  const extended = row as StashRowWithBanner;
  let next: DataRow = row;
  if (row.metadata) {
    const val = row.metadata[parentKey as keyof Metadata];
    let metadata = row.metadata;
    if (val != null) {
      if (Array.isArray(val)) {
        metadata = {
          ...metadata,
          [parentKey]: val.map((x) => remapIdThroughMap(Number(x), idMap)),
        };
      } else {
        metadata = {
          ...metadata,
          [parentKey]: remapIdThroughMap(Number(val), idMap),
        };
      }
    }
    if (metadata !== row.metadata) {
      next = { ...next, metadata, modified: true };
    }
  }
  if (extended.bannerId != null) {
    const bannerId = remapIdThroughMap(Number(extended.bannerId), idMap);
    if (bannerId !== Number(extended.bannerId)) {
      next = { ...next, bannerId, modified: true } as DataRow;
    }
  }
  return next;
};

type StashRowWithBanner = DataRow & { bannerId?: number };

const buildDefaultStashRowMetadata = (
  childKey: string,
  localId: number,
  parentKey: string | null,
  parentLinkId: number | null
): Metadata => {
  const base = {
    owner: true as const,
    ordinal: 0,
    [childKey]: localId,
  };
  if (!parentKey || parentLinkId == null) return base as Metadata;
  return { ...base, [parentKey]: [parentLinkId] } as Metadata;
};

/**
 * When `metadata` is missing but `id` and `bannerId` are set, builds
 * `{ [parentId]: [parentLinkId], [childId]: localId, ordinal: 0, owner: true }`
 * from the stash `approute` interaction keys. `parentLinkId` overrides `bannerId` when provided.
 */
export const ensureStashRowMetadata = (
  row: DataRow,
  approute: string,
  parentLinkId: number | null
): DataRow => {
  if (row.metadata != null) return row;
  const extended = row as StashRowWithBanner;
  if (extended.id == null) return row;
  const ids = parseApprouteInteractionIds(approute);
  if (!ids?.childID) return row;

  const localId = Number(extended.id);
  const parentId =
    extended.bannerId != null
      ? Number(extended.bannerId)
      : parentLinkId;

  const metadata = buildDefaultStashRowMetadata(
    ids.childID,
    localId,
    parentId != null ? ids.parentID : null,
    parentId
  );

  return {
    ...row,
    metadata,
    ...(parentId != null ? { bannerId: parentId } : {}),
    modified: true,
  } as DataRow;
};

const resolveStashLevelLinkId = (rows: DataRow[], approute: string): number | null => {
  const ids = parseApprouteInteractionIds(approute);
  if (!ids) return rows[0] != null ? Number(rows[0].id) : null;
  const anchor = rows.find(
    (row) => row.metadata && metadataChildMatchesRowId(row.id, ids.childID, row.metadata)
  );
  if (anchor) return Number(anchor.id);
  const first = rows[0];
  return first != null ? Number(first.id) : null;
};

/** Stash row at a child hierarchy level: parent metadata key and top-level `bannerId`. */
export const stashRowWithParentLinkId = (
  row: DataRow,
  parentKey: string,
  parentId: number,
  approute: string
): DataRow => {
  if (!row.metadata) return ensureStashRowMetadata(row, approute, parentId);

  const nextMeta = metadataWithParentId(row.metadata, parentKey, parentId);
  return {
    ...row,
    bannerId: parentId,
    modified: true,
    metadata: nextMeta,
  } as DataRow;
};

export type MigrateServerIdsResult =
  | { status: 'not_pnc'; approutesUpdated: 0; rowsMigrated: 0 }
  | { status: 'no_selection'; approutesUpdated: 0; rowsMigrated: 0 }
  | { status: 'incomplete_selection'; approutesUpdated: 0; rowsMigrated: 0 }
  | { status: 'empty_chain'; emptyApproutes: string[]; approutesUpdated: 0; rowsMigrated: 0 }
  | { status: 'not_server_ids'; approutes: string[]; approutesUpdated: 0; rowsMigrated: 0 }
  | { status: 'no_matches'; approutesUpdated: 0; rowsMigrated: 0 }
  | { status: 'success'; approutesUpdated: number; rowsMigrated: number };

const validateSelectedPncStashFreightChain = (
  stash: RootState['stash'],
  freights: Freight[],
  emptyApproutes: string[],
  notServerIdApproutes: string[]
): void => {
  for (const { approute, timestamp } of freights) {
    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    if (!rows.length) {
      emptyApproutes.push(approute);
      continue;
    }
    const ids = parseApprouteInteractionIds(approute);
    if (!ids) continue;
    const hasServerRows = rows.some((row) => isServerId(row.id));
    const anchorAlreadyLocal = rows.some(
      (row) =>
        row.metadata &&
        metadataChildMatchesRowId(row.id, ids.childID, row.metadata) &&
        !isServerId(row.id)
    );
    if (anchorAlreadyLocal && hasServerRows) notServerIdApproutes.push(approute);
  }
};

const migrateOneSelectedPncStashFreightChain = (
  stash: RootState['stash'],
  freights: Freight[],
  dispatch: AppDispatch
): { approutesUpdated: number; rowsMigrated: number; appendPayloads: StashPayload[] } => {
  let approutesUpdated = 0;
  let rowsMigrated = 0;
  const appendPayloads: StashPayload[] = [];
  const idMapsByApproute = new Map<string, Map<number, number>>();

  for (let level = 0; level < freights.length; level += 1) {
    const { approute, timestamp } = freights[level]!;
    const ids = parseApprouteInteractionIds(approute);
    if (!ids) continue;

    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    if (!rows.some((row) => isServerId(row.id))) {
      continue;
    }

    const parentIdMap =
      level > 0
        ? resolveIdMapForParentKey(freights, idMapsByApproute, level, ids.parentID)
        : EMPTY_ID_MAP;
    const routeIdMap = new Map<number, number>();
    let routeChanged = false;

    let migratedRows = rows.map((row) => {
      const oldId = Number(row.id);
      if (!isServerId(row.id)) {
        return level > 0 && parentIdMap.size
          ? stashRowWithRemappedParentIds(row, ids.parentID, parentIdMap)
          : row;
      }

      const newId = incrementID();
      if (Number.isFinite(oldId)) routeIdMap.set(oldId, newId);
      rowsMigrated += 1;
      routeChanged = true;

      const metadata = row.metadata;
      const isAnchor = Boolean(
        metadata && metadataChildMatchesRowId(row.id, ids.childID, metadata)
      );

      let nextRow: DataRow = { ...row, id: newId, modified: true };
      if (!metadata) {
        nextRow = ensureStashRowMetadata(nextRow, approute, null);
      } else if (isAnchor) {
        nextRow = {
          ...nextRow,
          metadata: metadataWithChildId(metadata, ids.childID, newId, row.id),
        };
      }

      return nextRow;
    });

    if (level > 0 && parentIdMap.size) {
      migratedRows = migratedRows.map((row) =>
        stashRowWithRemappedParentIds(row, ids.parentID, parentIdMap)
      );
      routeChanged = true;
    }

    if (routeIdMap.size) {
      idMapsByApproute.set(approute, routeIdMap);
    }

    if (routeChanged) {
      approutesUpdated += 1;
      dispatch(removeTimestamp({ approute, timestamp }));
      appendPayloads.push({ approute, timestamp, content: migratedRows });
    }

  }

  return { approutesUpdated, rowsMigrated, appendPayloads };
};

/**
 * PNC (tutorial, course, quiz) only: cascades server → local ids on the **selected** shortcut stash
 * hierarchy group ({@link findAllSelectedStashFreightChains}). Every approute in each complete chain
 * is updated; all rows with server ids (`id` > 0) are remapped. Anchor rows also refresh
 * `metadata[childId]`; deeper levels remap each row’s `metadata[parentId]` / `bannerId` through the
 * ancestor approute id map that owns the parent entity (separate maps per approute so colliding
 * server ids across entity types, e.g. filter 4 vs instruction 4, do not overwrite each other).
 * Rows with `id` and `bannerId` but no `metadata` get default metadata (`owner`, `ordinal`, parent/child ids).
 */
export const migrateSelectedPncStashServerIdsToLocal = (
  state: RootState,
  dispatch: AppDispatch
): MigrateServerIdsResult => {
  if (!isPncUserApp(state.session.curApp)) {
    return { status: 'not_pnc', approutesUpdated: 0, rowsMigrated: 0 };
  }

  const chains = findAllSelectedStashFreightChains(state);
  if (!chains) {
    const selectedUnix = readStashInventoryNavUnixSeconds(state.stash);
    return {
      status: selectedUnix == null ? 'no_selection' : 'incomplete_selection',
      approutesUpdated: 0,
      rowsMigrated: 0,
    };
  }

  const stash = state.stash;
  const emptyApproutes: string[] = [];
  const notServerIdApproutes: string[] = [];
  let approutesUpdated = 0;
  let rowsMigrated = 0;
  const appendPayloads: StashPayload[] = [];

  for (const freights of chains) {
    validateSelectedPncStashFreightChain(stash, freights, emptyApproutes, notServerIdApproutes);
  }

  if (emptyApproutes.length) {
    return { status: 'empty_chain', emptyApproutes, approutesUpdated: 0, rowsMigrated: 0 };
  }
  if (notServerIdApproutes.length) {
    return {
      status: 'not_server_ids',
      approutes: notServerIdApproutes,
      approutesUpdated: 0,
      rowsMigrated: 0,
    };
  }

  for (const freights of chains) {
    const chainResult = migrateOneSelectedPncStashFreightChain(stash, freights, dispatch);
    approutesUpdated += chainResult.approutesUpdated;
    rowsMigrated += chainResult.rowsMigrated;
    appendPayloads.push(...chainResult.appendPayloads);
  }

  if (appendPayloads.length) dispatch(appendRoutes(appendPayloads));

  if (rowsMigrated === 0) {
    return { status: 'no_matches', approutesUpdated: 0, rowsMigrated: 0 };
  }

  return { status: 'success', approutesUpdated, rowsMigrated };
};

type PncPersistKind = 'quizzes' | 'courses' | 'tutorials' | 'steps';

const PNC_PERSIST_ACTION = {
  quizzes: persistQuizzes,
  courses: persistCourses,
  tutorials: persistTutorials,
  steps: persistSteps,
} as const;

/** Maps stash `approute` suffix to the persist action used by {@link UpdateManager9ABC}. */
const persistKindForApproute = (approute: string): PncPersistKind | null => {
  const route = approute.toLowerCase();
  if (route.endsWith('lowersifters')) return null;
  if (route.endsWith('dashboards')) return 'quizzes';
  if (route.endsWith('sifters')) return 'courses';
  if (route.endsWith('filters')) return 'tutorials';
  if (route.endsWith('instructions')) return 'steps';
  return null;
};

type PncEditableSliceRow = {
  id: number;
  label: string;
  edited?: boolean;
  collection: string;
};

const sliceRowLabel = (row: { title?: string; quote?: string; content?: string; id: number }): string => {
  const text = (row.title ?? row.quote ?? row.content ?? '').trim();
  return text ? text.slice(0, 48) : `id ${row.id}`;
};

const stashRowLabel = (row: DataRow): string => {
  const text = row.filter ?? row.instruction ?? row.dashboard ?? row.sifter ?? '';
  const trimmed = String(text).trim();
  return trimmed ? trimmed.slice(0, 48) : `id ${row.id}`;
};

const pushEditableSliceRow = (
  out: PncEditableSliceRow[],
  ids: Set<number>,
  row: { id: number; title?: string; quote?: string; content?: string; edited?: boolean },
  collection: string
): void => {
  if (!ids.has(row.id)) return;
  out.push({
    id: row.id,
    label: sliceRowLabel(row),
    edited: row.edited,
    collection,
  });
};

const collectCourseLikeContentSliceRows = (
  out: PncEditableSliceRow[],
  ids: Set<number>,
  content: SlideGroup[],
  collectionPrefix: string
): void => {
  for (const group of content) {
    for (const [key, value] of Object.entries(group)) {
      if (key === 'slides') {
        for (const slideRows of value as SlideItem[][]) {
          for (const item of slideRows) {
            pushEditableSliceRow(out, ids, item, `${collectionPrefix}.slides`);
          }
        }
        continue;
      }
      if (value && typeof value === 'object' && 'id' in value) {
        pushEditableSliceRow(out, ids, value as SlideGroupItem, collectionPrefix);
      }
    }
  }
};

const findPncSliceRowsForPersistKind = (
  state: RootState,
  webapp: 'tutorial' | 'course' | 'quiz',
  kind: PncPersistKind,
  ids: Set<number>
): PncEditableSliceRow[] => {
  const refs: PncEditableSliceRow[] = [];

  if (kind === 'quizzes' && webapp === 'quiz') {
    for (const quiz of state.quiz.quizzes) {
      pushEditableSliceRow(refs, ids, quiz, 'quiz.quizzes');
    }
    return refs;
  }

  if (kind === 'courses' && webapp === 'course') {
    for (const banner of state.course.banners) {
      pushEditableSliceRow(refs, ids, banner, 'course.banners');
    }
    return refs;
  }

  if (kind === 'tutorials') {
    if (webapp === 'tutorial') {
      for (const banner of state.tutorial.banners) {
        pushEditableSliceRow(refs, ids, banner, 'tutorial.banners');
      }
    } else if (webapp === 'course') {
      for (const banner of state.course.banners) {
        for (const pennant of banner.pennants) {
          pushEditableSliceRow(refs, ids, pennant, 'course.banners.pennants');
        }
      }
    } else {
      for (const quiz of state.quiz.quizzes) {
        for (const pennant of quiz.pennants) {
          pushEditableSliceRow(refs, ids, pennant, 'quiz.quizzes.pennants');
        }
      }
      for (const banner of state.quiz.banners) {
        for (const pennant of banner.pennants) {
          pushEditableSliceRow(refs, ids, pennant, 'quiz.banners.pennants');
        }
      }
    }
    return refs;
  }

  if (kind === 'steps') {
    if (webapp === 'tutorial') {
      for (const rows of state.tutorial.content) {
        for (const step of rows) {
          pushEditableSliceRow(refs, ids, step, 'tutorial.content');
        }
      }
    } else if (webapp === 'course') {
      collectCourseLikeContentSliceRows(refs, ids, state.course.content, 'course.content');
    } else {
      collectCourseLikeContentSliceRows(refs, ids, state.quiz.content, 'quiz.content');
    }
  }

  return refs;
};

export type PncStashSliceCompareRow = {
  id: number;
  approute: string;
  stashLabel: string;
  sliceLabel?: string;
  sliceCollection?: string;
  sliceEditedBefore?: boolean;
  outcome: 'marked' | 'already_edited' | 'no_slice_match';
};

export type MarkSelectedStashTextsModifiedResult =
  | { status: 'not_pnc'; itemsMarked: 0 }
  | { status: 'no_selection'; itemsMarked: 0 }
  | { status: 'incomplete_selection'; itemsMarked: 0 }
  | { status: 'empty_chain'; emptyApproutes: string[]; itemsMarked: 0 }
  | { status: 'unsupported_approutes'; approutes: string[]; itemsMarked: 0 }
  | { status: 'no_matches'; itemsMarked: 0; comparison: PncStashSliceCompareRow[] }
  | { status: 'success'; itemsMarked: number; comparison: PncStashSliceCompareRow[] };

/**
 * PNC (tutorial, course, quiz) only: reads ids from the **selected** shortcut stash hierarchy group
 * ({@link findSelectedStashFreights}), marks matching rows in the active content slice `edited: true`
 * via `persistQuizzes` / `persistCourses` / `persistTutorials` / `persistSteps`. Requires a selected
 * group (Ctrl+Shift+N/V); does not fall back to latest.
 */
export const markSelectedPncStashTextsModified = (
  state: RootState,
  dispatch: AppDispatch
): MarkSelectedStashTextsModifiedResult => {
  if (!isPncUserApp(state.session.curApp)) {
    return { status: 'not_pnc', itemsMarked: 0 };
  }

  const freights = findSelectedStashFreights(state);
  if (!freights) {
    const selectedUnix = readStashInventoryNavUnixSeconds(state.stash);
    return {
      status: selectedUnix == null ? 'no_selection' : 'incomplete_selection',
      itemsMarked: 0,
    };
  }

  const webapp = getCurAppName(state.session.curApp) as 'tutorial' | 'course' | 'quiz';
  const stash = state.stash;
  const emptyApproutes: string[] = [];
  const unsupportedApproutes: string[] = [];
  const comparison: PncStashSliceCompareRow[] = [];
  const idsByKind = new Map<PncPersistKind, Set<number>>();

  for (const { approute, timestamp } of freights) {
    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    if (!rows.length) {
      emptyApproutes.push(approute);
      continue;
    }

    const kind = persistKindForApproute(approute);
    if (!kind) {
      unsupportedApproutes.push(approute);
      continue;
    }

    let idSet = idsByKind.get(kind);
    if (!idSet) {
      idSet = new Set();
      idsByKind.set(kind, idSet);
    }

    for (const row of rows) {
      if (row.deleted) continue;
      const id = Number(row.id);
      if (!Number.isFinite(id)) continue;
      idSet.add(id);

      const sliceMatches = findPncSliceRowsForPersistKind(state, webapp, kind, new Set([id]));
      const sliceMatch = sliceMatches[0];
      comparison.push({
        id,
        approute,
        stashLabel: stashRowLabel(row),
        sliceLabel: sliceMatch?.label,
        sliceCollection: sliceMatch?.collection,
        sliceEditedBefore: sliceMatch?.edited,
        outcome: !sliceMatch
          ? 'no_slice_match'
          : sliceMatch.edited === true
            ? 'already_edited'
            : 'marked',
      });
    }
  }

  if (emptyApproutes.length) {
    return { status: 'empty_chain', emptyApproutes, itemsMarked: 0 };
  }

  if (unsupportedApproutes.length && idsByKind.size === 0) {
    return { status: 'unsupported_approutes', approutes: unsupportedApproutes, itemsMarked: 0 };
  }

  let itemsMarked = 0;
  for (const [kind, ids] of idsByKind) {
    const sliceRefs = findPncSliceRowsForPersistKind(state, webapp, kind, ids);
    const payload = [...ids].map((id) => ({ id: String(id), modified: true }));
    if (payload.length) dispatch(PNC_PERSIST_ACTION[kind](payload));
    itemsMarked += sliceRefs.filter((ref) => ref.edited !== true).length;
  }

  if (itemsMarked === 0 && comparison.every((row) => row.outcome === 'no_slice_match')) {
    return { status: 'no_matches', itemsMarked: 0, comparison };
  }

  return { status: 'success', itemsMarked, comparison };
};

/** Selected stash row count at or above which Ctrl+Shift+U defers work and shows please wait first. */
export const MARK_PNC_CONTENT_EDITED_ROW_WAIT_THRESHOLD = 1000;

const MARK_PNC_CONTENT_EDITED_WAIT_MSG =
  'Marking content edited from selected stash ids… please wait.';

export const countStashRowsInFreights = (
  stash: StashState,
  freights: Freight[]
): number => {
  let total = 0;
  for (const { approute, timestamp } of freights) {
    total += getStashCellRows(stash[approute]?.[timestamp]).length;
  }
  return total;
};

/**
 * Ctrl+Shift+U entry: fast-fails synchronously; when the selected stash group has
 * {@link MARK_PNC_CONTENT_EDITED_ROW_WAIT_THRESHOLD}+ rows, shows please wait in Activity then
 * runs {@link markSelectedPncStashTextsModified} on the next task so the UI can paint first.
 */
export const beginMarkSelectedPncStashTextsModified = (
  dispatch: AppDispatch,
  getState: () => RootState = () => store.getState()
): void => {
  const state = getState();

  if (!isPncUserApp(state.session.curApp)) {
    dispatchMarkTextsModifiedActivityFeedback(dispatch, { status: 'not_pnc', itemsMarked: 0 });
    return;
  }

  const freights = findSelectedStashFreights(state);
  if (!freights) {
    const selectedUnix = readStashInventoryNavUnixSeconds(state.stash);
    dispatchMarkTextsModifiedActivityFeedback(dispatch, {
      status: selectedUnix == null ? 'no_selection' : 'incomplete_selection',
      itemsMarked: 0,
    });
    return;
  }

  const run = (): void => {
    const result = markSelectedPncStashTextsModified(getState(), dispatch);
    dispatchMarkTextsModifiedActivityFeedback(dispatch, result);
  };

  if (countStashRowsInFreights(state.stash, freights) < MARK_PNC_CONTENT_EDITED_ROW_WAIT_THRESHOLD) {
    run();
    return;
  }

  dispatch(clearOnlyWarnings());
  dispatch(prependWarning(MARK_PNC_CONTENT_EDITED_WAIT_MSG));
  setTimeout(run, contentDelay);
};

/** Clears Activity warnings, then prepends the message for a {@link MigrateServerIdsResult}. */
export const dispatchMigrateServerIdsActivityFeedback = (
  dispatch: AppDispatch,
  result: MigrateServerIdsResult
): void => {
  dispatch(clearOnlyWarnings());

  switch (result.status) {
    case 'not_pnc':
      dispatch(
        prependError(
          'Convert server IDs to local IDs is only available for tutorial, course, and quiz.'
        )
      );
      return;
    case 'no_selection':
      dispatch(
        prependError(
          'Select a PNC stash inventory group (Ctrl+Shift+N / Ctrl+Shift+V) before converting server ids.'
        )
      );
      return;
    case 'incomplete_selection':
      dispatch(
        prependError(
          'Selected stash group is not a complete Unjoined_items or Escrowed_items hierarchy chain.'
        )
      );
      return;
    case 'empty_chain':
      dispatch(
        prependError(
          `Selected stash chain has empty cells for: ${result.emptyApproutes.join(', ')}.`
        )
      );
      return;
    case 'not_server_ids':
      dispatch(
        prependError(
          `Selected stash rows on ${result.approutes.join(', ')} already use local ids (ids must be > 0).`
        )
      );
      return;
    case 'no_matches':
      dispatch(
        prependWarning(
          'Selected stash has rows, but none had server ids to convert (ids must be > 0).'
        )
      );
      return;
    case 'success':
      dispatch(
        prependWarning(
          `Converted ${result.rowsMigrated} server id${result.rowsMigrated === 1 ? '' : 's'} to local ids across ${result.approutesUpdated} approute${result.approutesUpdated === 1 ? '' : 's'} in the selected stash group.`
        )
      );
      return;
  }
};

const formatPncStashSliceNoMatchLine = (row: PncStashSliceCompareRow): string => {
  const stashPart = `${row.approute} id=${row.id} "${row.stashLabel}"`;
  return `stash: ${stashPart} → slice: (no match)`;
};

const summarizePncStashSliceCompareIds = (rows: PncStashSliceCompareRow[]): string => {
  const ids = [...new Set(rows.map((r) => r.id))].sort((a, b) => a - b);
  if (ids.length <= 12) return ids.join(', ');
  return `${ids.slice(0, 12).join(', ')} … +${ids.length - 12} more`;
};

const prependPncStashSliceComparisonFeedback = (
  dispatch: AppDispatch,
  comparison: PncStashSliceCompareRow[]
): void => {
  const marked = comparison.filter((r) => r.outcome === 'marked');
  const alreadyEdited = comparison.filter((r) => r.outcome === 'already_edited');
  const noMatch = comparison.filter((r) => r.outcome === 'no_slice_match');

  if (marked.length) {
    dispatch(
      prependWarning(
        `Matched & marked edited: true — ${marked.length} row${marked.length === 1 ? '' : 's'} (ids: ${summarizePncStashSliceCompareIds(marked)}).`
      )
    );
  }
  if (alreadyEdited.length) {
    dispatch(
      prependWarning(
        `Matched, already edited: true — ${alreadyEdited.length} row${alreadyEdited.length === 1 ? '' : 's'} (ids: ${summarizePncStashSliceCompareIds(alreadyEdited)}).`
      )
    );
  }
  if (noMatch.length) {
    dispatch(
      prependWarning(
        `No slice match — ${noMatch.length} row${noMatch.length === 1 ? '' : 's'} (detail):`
      )
    );
    for (let i = noMatch.length - 1; i >= 0; i -= 1) {
      dispatch(prependWarning(formatPncStashSliceNoMatchLine(noMatch[i]!)));
    }
  }
};

/** Clears Activity warnings, then prepends the message for a {@link MarkSelectedStashTextsModifiedResult}. */
export const dispatchMarkTextsModifiedActivityFeedback = (
  dispatch: AppDispatch,
  result: MarkSelectedStashTextsModifiedResult
): void => {
  dispatch(clearOnlyWarnings());

  switch (result.status) {
    case 'not_pnc':
      dispatch(
        prependError(
          'Mark content edited is only available for tutorial, course, and quiz.'
        )
      );
      return;
    case 'no_selection':
      dispatch(
        prependError(
          'Select a PNC stash inventory group (Ctrl+Shift+N / Ctrl+Shift+V) before marking content edited.'
        )
      );
      return;
    case 'incomplete_selection':
      dispatch(
        prependError(
          'Selected stash group is not a complete Unjoined_items or Escrowed_items hierarchy chain.'
        )
      );
      return;
    case 'empty_chain':
      dispatch(
        prependError(
          `Selected stash chain has empty cells for: ${result.emptyApproutes.join(', ')}.`
        )
      );
      return;
    case 'unsupported_approutes':
      dispatch(
        prependError(
          `Selected stash chain has unsupported approutes for marking edited: ${result.approutes.join(', ')}.`
        )
      );
      return;
    case 'no_matches':
      dispatch(
        prependWarning(
          'Selected stash rows did not match any content slice items.'
        )
      );
      prependPncStashSliceComparisonFeedback(dispatch, result.comparison);
      return;
    case 'success': {
      const newlyMarked = result.itemsMarked;
      dispatch(
        prependWarning(
          newlyMarked > 0
            ? `Marked ${newlyMarked} content slice row${newlyMarked === 1 ? '' : 's'} edited: true from selected stash ids.`
            : 'Selected stash ids matched slice rows; all were already edited: true.'
        )
      );
      prependPncStashSliceComparisonFeedback(dispatch, result.comparison);
      return;
    }
  }
};

export type ExportSelectedStashRoutesResult =
  | { status: 'no_selection'; exported: 0 }
  | { status: 'incomplete_selection'; exported: 0 }
  | { status: 'no_stash_data'; exported: 0 }
  | { status: 'empty_chain'; emptyApproutes: string[]; exported: 0 }
  | { status: 'success'; exported: number; routeLabels: string[] };

/**
 * Non-PNC webapps: `{ [approute]: DataRow[] }` for every current-app route that has stash
 * at {@link escrowTimestamp} (same key as Ctrl+Shift+Y / member import).
 */
export const collectCurAppStashExportDatas = (
  state: RootState
): { exportedDatas: Record<string, DataRow[]>; routeLabels: string[] } => {
  const stash = state.stash;
  const webapp = getCurAppName(state.session.curApp);
  const { routePairs } = getRoutePairsForCurApp(state);
  const exportedDatas: Record<string, DataRow[]> = {};
  const routeLabels: string[] = [];

  for (const { urlID } of routePairs) {
    const rows = getStashCellRows(stash[urlID]?.[escrowTimestamp]);
    if (!rows.length) continue;
    routeLabels.push(getRouteAlias(urlID, webapp));
    exportedDatas[urlID] = rows;
  }

  return { exportedDatas, routeLabels };
};

/**
 * PNC (tutorial, course, quiz): exports each route in the inventory-selected cascading stash chain
 * (`findSelectedStashFreights`). Other webapps: exports all routes with stash for the current app
 * (`collectCurAppStashExportDatas`). Uses {@link viewExports} / `StashFileManager` (profile C only).
 */
export const exportSelectedCascadingStashRoutes = (
  state: RootState,
  dispatch: AppDispatch
): ExportSelectedStashRoutesResult => {
  if (!isPncUserApp(state.session.curApp)) {
    const { routePairs } = getRoutePairsForCurApp(state);
    if (routePairs.length === 0) {
      return { status: 'no_stash_data', exported: 0 };
    }
    const { exportedDatas, routeLabels } = collectCurAppStashExportDatas(state);
    const exported = Object.keys(exportedDatas).length;
    if (exported === 0) {
      return { status: 'no_stash_data', exported: 0 };
    }
    dispatch(
      viewExports({
        actionType: exportTexts.type,
        exportedDatas,
      })
    );
    return { status: 'success', exported, routeLabels };
  }

  const freights = findSelectedStashFreights(state);
  if (!freights) {
    const selectedUnix = readStashInventoryNavUnixSeconds(state.stash);
    return {
      status: selectedUnix == null ? 'no_selection' : 'incomplete_selection',
      exported: 0,
    };
  }

  const stash = state.stash;
  const webapp = getCurAppName(state.session.curApp);
  const emptyApproutes: string[] = [];
  const routeLabels: string[] = [];
  const exportedDatas: Record<string, DataRow[]> = {};

  for (const { approute, timestamp } of freights) {
    const rows = getStashCellRows(stash[approute]?.[timestamp]);
    if (!rows.length) {
      emptyApproutes.push(approute);
      continue;
    }
    routeLabels.push(getRouteAlias(approute, webapp));
    exportedDatas[approute] = rows;
  }

  if (emptyApproutes.length) {
    return { status: 'empty_chain', emptyApproutes, exported: 0 };
  }
  const exported = Object.keys(exportedDatas).length;
  if (exported === 0) {
    return { status: 'empty_chain', emptyApproutes: freights.map((f) => f.approute), exported: 0 };
  }

  dispatch(
    viewExports({
      actionType: exportTexts.type,
      exportedDatas,
    })
  );

  return { status: 'success', exported, routeLabels };
};

/** Clears Activity warnings, then prepends the message for a {@link ExportSelectedStashRoutesResult}. */
export const dispatchExportSelectedStashRoutesFeedback = (
  dispatch: AppDispatch,
  result: ExportSelectedStashRoutesResult
): void => {
  dispatch(clearOnlyWarnings());

  switch (result.status) {
    case 'no_stash_data':
      dispatch(
        prependError('No stash data to export for the current app routes.')
      );
      return;
    case 'no_selection':
      dispatch(
        prependError(
          'Select a PNC stash inventory group (Ctrl+Shift+N / Ctrl+Shift+V) before exporting stash routes.'
        )
      );
      return;
    case 'incomplete_selection':
      dispatch(
        prependError(
          'Selected stash group is not a complete Unjoined_items or Escrowed_items hierarchy chain.'
        )
      );
      return;
    case 'empty_chain':
      dispatch(
        prependError(
          `Selected stash chain has empty cells for: ${result.emptyApproutes.join(', ')}.`
        )
      );
      return;
    case 'success':
      dispatch(
        prependWarning(
          `Exporting ${result.exported} stash route${result.exported === 1 ? '' : 's'}: ${result.routeLabels.join(', ')}.`
        )
      );
      return;
  }
};

/** Fixed stash keys used by non-PNC purge / escrow flows (`destroyOverview`, draft outgoing, etc.). */
export const MEMBER_APP_FIXED_STASH_TIMESTAMPS = [deletedTimestamp, escrowTimestamp] as const;

export type ImportSelectedStashRoutesResult =
  | { status: 'ready'; mode: 'pnc' | 'member' };

/**
 * Non-PNC: every current-app route that has stash under {@link MEMBER_APP_FIXED_STASH_TIMESTAMPS}.
 */
export const collectCurAppMemberStashCellsToClear = (
  state: RootState
): Array<{ approute: string; timestamp: string }> => {
  const stash = state.stash;
  const { routePairs } = getRoutePairsForCurApp(state);
  const out: Array<{ approute: string; timestamp: string }> = [];
  for (const { urlID } of routePairs) {
    for (const timestamp of MEMBER_APP_FIXED_STASH_TIMESTAMPS) {
      if (getStashCellRows(stash[urlID]?.[timestamp]).length) {
        out.push({ approute: urlID, timestamp });
      }
    }
  }
  return out;
};

export type StashImportRowFilter = (entity: string, rows: DataRow[]) => DataRow[];

/**
 * Builds a new `Escrowed_items` hierarchy group (same pattern as Ctrl+Shift+Y
 * {@link dispatchShortcutEscrowStashRemoved}) from `{ [approute]: DataRow[] }` file data.
 * Rows with `id` and `bannerId` but no `metadata` receive default interaction metadata per approute.
 */
export const buildEscrowStashImportFromRoutesData = (
  state: RootState,
  routesData: Record<string, DataRow[]>,
  filterRows: StashImportRowFilter,
  targetWebappIndex?: number
):
  | { ok: true; appendPayloads: StashPayload[]; stashNav: { hierarchyUnix: number; members: Array<{ approute: string; timestamp: string }> }; importedRows: number; totalRows: number; routeLabels: string[] }
  | { ok: false; error: string } => {
  const webappIndex = targetWebappIndex ?? state.session.curApp;
  const { routePairs } = getRoutePairsForCurApp(state, webappIndex);
  const routeRank = new Map(routePairs.map((route, index) => [route.urlID.toLowerCase(), index]));
  const fileApproutes = Object.keys(routesData).sort((a, b) => {
    const aRank = routeRank.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bRank = routeRank.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.localeCompare(b);
  });

  if (!fileApproutes.length) {
    return { ok: false, error: 'Stash import file has no routes.' };
  }

  const unknownApproutes = fileApproutes.filter((approute) => !routeRank.has(approute.toLowerCase()));
  if (unknownApproutes.length) {
    return {
      ok: false,
      error: `Stash import has unknown routes for this webapp: ${unknownApproutes.join(', ')}.`,
    };
  }

  const baseTimestamp = newShortcutEscrowStashTimestamp();
  const hierarchyUnix = hierarchyShortcutStashBaseUnixSeconds(baseTimestamp);
  const webapp = getCurAppName(webappIndex);
  const appendPayloads: StashPayload[] = [];
  const members: Array<{ approute: string; timestamp: string }> = [];
  const routeLabels: string[] = [];
  let totalRows = 0;
  let importedRows = 0;
  const invalidApproutes: string[] = [];
  let parentLinkId: number | null = null;

  fileApproutes.forEach((fileKey, hierarchyIndex) => {
    const canonicalApproute =
      routePairs.find((route) => route.urlID.toLowerCase() === fileKey.toLowerCase())?.urlID ?? fileKey;
    const rawRows = routesData[fileKey];
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      invalidApproutes.push(canonicalApproute);
      return;
    }
    totalRows += rawRows.length;
    const routeEntity = parseApprouteChildEntity(canonicalApproute);
    if (!routeEntity) {
      invalidApproutes.push(canonicalApproute);
      return;
    }
    const filtered = filterRows(routeEntity, rawRows);
    if (!filtered.length) {
      invalidApproutes.push(canonicalApproute);
      return;
    }
    const content = filtered.map((row) =>
      ensureStashRowMetadata(
        { ...row, checked: row.checked ?? true },
        canonicalApproute,
        (row as StashRowWithBanner).bannerId != null ? null : parentLinkId
      )
    );
    importedRows += content.length;
    parentLinkId = resolveStashLevelLinkId(content, canonicalApproute);
    const timestamp = withHierarchyStamp(baseTimestamp, webappIndex, hierarchyIndex);
    appendPayloads.push({ approute: canonicalApproute, timestamp, content });
    members.push({ approute: canonicalApproute, timestamp });
    routeLabels.push(getRouteAlias(canonicalApproute, webapp));
  });

  if (invalidApproutes.length) {
    return {
      ok: false,
      error: `Stash import missing or invalid rows for: ${invalidApproutes.join(', ')}.`,
    };
  }
  if (!appendPayloads.length) {
    return { ok: false, error: 'file is empty or incorrect Format!' };
  }

  return {
    ok: true,
    appendPayloads,
    stashNav: { hierarchyUnix, members },
    importedRows,
    totalRows,
    routeLabels,
  };
};

/**
 * Non-PNC: `{ [approute]: DataRow[] }` import into {@link escrowTimestamp} per route (replaces each
 * cell — same keys as export / Ctrl+Shift+Y).
 */
export const buildMemberStashImportFromRoutesData = (
  state: RootState,
  routesData: Record<string, DataRow[]>,
  filterRows: StashImportRowFilter
):
  | {
      ok: true;
      appendPayloads: StashPayload[];
      importedRows: number;
      totalRows: number;
      routeLabels: string[];
    }
  | { ok: false; error: string } => {
  const { routePairs } = getRoutePairsForCurApp(state);
  const routeRank = new Map(routePairs.map((route, index) => [route.urlID.toLowerCase(), index]));
  const fileApproutes = Object.keys(routesData).sort((a, b) => {
    const aRank = routeRank.get(a.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bRank = routeRank.get(b.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.localeCompare(b);
  });

  if (!fileApproutes.length) {
    return { ok: false, error: 'Stash import file has no routes.' };
  }

  const unknownApproutes = fileApproutes.filter((approute) => !routeRank.has(approute.toLowerCase()));
  if (unknownApproutes.length) {
    return {
      ok: false,
      error: `Stash import has unknown routes for this webapp: ${unknownApproutes.join(', ')}.`,
    };
  }

  const webapp = getCurAppName(state.session.curApp);
  const appendPayloads: StashPayload[] = [];
  const routeLabels: string[] = [];
  let totalRows = 0;
  let importedRows = 0;
  const invalidApproutes: string[] = [];

  fileApproutes.forEach((fileKey) => {
    const canonicalApproute =
      routePairs.find((route) => route.urlID.toLowerCase() === fileKey.toLowerCase())?.urlID ?? fileKey;
    const rawRows = routesData[fileKey];
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      invalidApproutes.push(canonicalApproute);
      return;
    }
    totalRows += rawRows.length;
    const routeEntity = parseApprouteChildEntity(canonicalApproute);
    const filtered = routeEntity ? filterRows(routeEntity, rawRows) : rawRows;
    if (!filtered.length) {
      invalidApproutes.push(canonicalApproute);
      return;
    }
    const content = filtered.map((row) => ({ ...row, checked: row.checked ?? true }));
    importedRows += content.length;
    appendPayloads.push({
      approute: canonicalApproute,
      timestamp: escrowTimestamp,
      content,
    });
    routeLabels.push(getRouteAlias(canonicalApproute, webapp));
  });

  if (invalidApproutes.length) {
    return {
      ok: false,
      error: `Stash import missing or invalid rows for: ${invalidApproutes.join(', ')}.`,
    };
  }
  if (!appendPayloads.length) {
    return { ok: false, error: 'file is empty or incorrect Format!' };
  }

  return { ok: true, appendPayloads, importedRows, totalRows, routeLabels };
};

/**
 * Opens stash JSON import (`initFileManager` / `StashFileManager`). PNC: new `Escrowed_items` group;
 * other webapps: replace per-route `escrowTimestamp` cells.
 */
export const beginImportSelectedStashRoutes = (
  state: RootState,
  dispatch: AppDispatch
): ImportSelectedStashRoutesResult => {
  dispatch(initFileManager(importStash.type));
  return {
    status: 'ready',
    mode: isPncUserApp(state.session.curApp) ? 'pnc' : 'member',
  };
};

/** Clears Activity warnings, then prepends the message for a {@link ImportSelectedStashRoutesResult}. */
export const dispatchImportSelectedStashRoutesFeedback = (
  dispatch: AppDispatch,
  result: ImportSelectedStashRoutesResult
): void => {
  dispatch(clearOnlyWarnings());

  switch (result.status) {
    case 'ready':
      dispatch(
        prependWarning(
          result.mode === 'pnc'
            ? 'Import stash JSON: creates a new Escrowed_items group (like Ctrl+Shift+Y). Choose a file.'
            : 'Import stash JSON: replaces escrow stash per route for this webapp. Choose a file.'
        )
      );
      return;
  }
};
