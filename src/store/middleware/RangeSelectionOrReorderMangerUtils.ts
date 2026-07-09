import type { Banner, CourseState, CourseStartId } from '../../library/CourseUtils';
import { findCourseSlideRowForSlideId } from '../../library/CourseUtils';
import { createCourseStartIdInitial } from '../../library/CourseUtils';
import type { CommsState, CommsStartId } from '../slices/commsSlice';
import type { QuizStartId, QuizState } from '../slices/quizSlice';
import type { TutorialStartId, TutorialState } from '../../library/TutorialUtils';

type Ordinalish = { ordinal?: number; contiguousOrdinal?: number };

export type RangeResult<T> = { ids: T[]; direction: boolean };

export function sortOrdinalKey(x: Ordinalish): number {
  if (typeof x.contiguousOrdinal === 'number') return x.contiguousOrdinal;
  return x.ordinal ?? 0;
}

function idsBetweenSortedNodes<T extends { id: number }>(
  nodes: T[],
  idA: number,
  idB: number,
  ord: (n: T) => number,
): RangeResult<number> {
  const a = nodes.find((n) => n.id === idA);
  const b = nodes.find((n) => n.id === idB);
  if (!a || !b) return { ids: Array.from(new Set([idA, idB])), direction: true };
  const oa = ord(a);
  const ob = ord(b);
  const lo = Math.min(oa, ob);
  const hi = Math.max(oa, ob);
  const ids = nodes.filter((n) => {
    const o = ord(n);
    return o >= lo && o <= hi;
  }).map((n) => n.id);
  return { ids, direction: oa < ob };
}

function pennantCompositeNodes(course: CourseState): { id: number; sort: number }[] {
  const out: { id: number; sort: number }[] = [];
  for (const b of course.banners) {
    const bo = sortOrdinalKey(b);
    for (const p of b.pennants ?? []) {
      out.push({ id: p.id, sort: bo * 1_000_000 + sortOrdinalKey(p) });
    }
  }
  return out;
}

function coverIdNodes(course: CourseState): { id: number; ord: number }[] {
  const selected = course.selected;
  const bannerIds =
    selected === -1
      ? course.banners.map((b) => b.id)
      : course.banners[selected]
        ? [course.banners[selected].id]
        : [];
  const out: { id: number; ord: number }[] = [];
  for (const group of course.content) {
    const bid = group[0]?.bannerId;
    if (bid == null || !bannerIds.includes(bid)) continue;
    for (const [k, v] of Object.entries(group)) {
      if (k === 'slides') continue;
      if (typeof v !== 'object' || v === null || !('id' in v)) continue;
      const it = v as { id: number } & Ordinalish;
      out.push({ id: it.id, ord: sortOrdinalKey(it) });
    }
  }
  return out;
}

function tutorialContentNodes(tutorial: TutorialState): { id: number; ord: number }[] {
  const selected = tutorial.selected;
  const bannerIds =
    selected === -1
      ? tutorial.banners.map((b) => b.id)
      : tutorial.banners[selected]
        ? [tutorial.banners[selected].id]
        : [];
  const out: { id: number; ord: number }[] = [];
  for (const row of tutorial.content) {
    const bid = row[0]?.bannerId;
    if (bid == null || !bannerIds.includes(bid)) continue;
    for (const c of row) {
      out.push({ id: c.id, ord: sortOrdinalKey(c) });
    }
  }
  return out;
}

function tutorialContentRowForId(tutorial: TutorialState, contentId: number) {
  for (const row of tutorial.content) {
    if (row.some((c) => c.id === contentId)) return row;
  }
  return null;
}

function quizAttemptNodes(quiz: QuizState): { id: number; sort: number }[] {
  const out: { id: number; sort: number }[] = [];
  for (const q of quiz.quizzes) {
    const qo = sortOrdinalKey(q);
    for (const p of q.pennants ?? []) {
      out.push({ id: p.id, sort: qo * 1_000_000 + sortOrdinalKey(p) });
    }
  }
  return out;
}

function quizQuestionBannerPool(quiz: QuizState): Banner[] {
  const { quizzes, selected, banners } = quiz;
  const quizIds =
    selected === -1 ? quizzes.map((q) => q.id) : selected > -1 && quizzes[selected] ? [quizzes[selected].id] : [];
  return banners.filter(
    (b) => typeof b.bannerId === 'number' && quizIds.includes(b.bannerId as number),
  );
}

function commsKeyNodes(
  rows: Array<{ id: number; type: string } & Ordinalish>,
): { key: string; ord: number; type: string }[] {
  return rows.map((r) => ({
    key: `${r.id}${r.type}`,
    ord: sortOrdinalKey(r),
    type: r.type,
  }));
}

/** Ordinal range within a single `type`; ignores other types that may sit between by global ordinal order. */
function keysBetween(
  nodes: { key: string; ord: number; type: string }[],
  keyA: string,
  keyB: string,
): RangeResult<string> {
  const a = nodes.find((n) => n.key === keyA);
  const b = nodes.find((n) => n.key === keyB);
  if (!a || !b) return { ids: Array.from(new Set([keyA, keyB])), direction: true };
  if (a.type !== b.type) return { ids: Array.from(new Set([keyA, keyB])), direction: true };
  const lo = Math.min(a.ord, b.ord);
  const hi = Math.max(a.ord, b.ord);
  const ids = nodes
    .filter((n) => n.type === a.type && n.ord >= lo && n.ord <= hi)
    .map((n) => n.key);
  return { ids, direction: a.ord < b.ord };
}

function keysOfCourseStartId(): (keyof CourseStartId)[] {
  return Object.keys(createCourseStartIdInitial()) as (keyof CourseStartId)[];
}

/** Same `selected: -1` course shape as {@link applyCourseReducer} for shared course highlighters on quiz. */
export function quizStateAsCourseStateForHighlightExpand(quiz: QuizState): CourseState {
  return {
    content: quiz.content,
    banners: quiz.banners,
    selected: -1,
    chapters: [],
    couplings: {},
    noCourses: true,
    startId: createCourseStartIdInitial(),
    modifiedOrdinals: quiz.modifiedOrdinals,
  };
}

export function expandCourseHighlightRange(
  course: CourseState,
  lane: keyof CourseStartId,
  startId: number,
  endId: number,
): RangeResult<number> {
  switch (lane) {
    case 'courseBreath':
    case 'courseDepth':
      return idsBetweenSortedNodes(course.banners, startId, endId, sortOrdinalKey);
    case 'pennantBreath':
    case 'pennantDepth':
      return idsBetweenSortedNodes(pennantCompositeNodes(course), startId, endId, (n) => n.sort);
    case 'coversBreath':
      return idsBetweenSortedNodes(coverIdNodes(course), startId, endId, (n) => n.ord);
    case 'slideBreath': {
      const rowA = findCourseSlideRowForSlideId(course.content, startId);
      const rowB = findCourseSlideRowForSlideId(course.content, endId);
      if (!rowA || rowA !== rowB) return { ids: Array.from(new Set([startId, endId])), direction: true };
      return idsBetweenSortedNodes(rowA, startId, endId, sortOrdinalKey);
    }
    default:
      return { ids: Array.from(new Set([startId, endId])), direction: true };
  }
}

export function expandTutorialHighlightRange(
  tutorial: TutorialState,
  lane: keyof TutorialStartId,
  startId: number,
  endId: number,
): RangeResult<number> {
  switch (lane) {
    case 'tutorialBreath':
      return idsBetweenSortedNodes(tutorial.banners, startId, endId, sortOrdinalKey);
    case 'tutorialDepth':
      if (tutorial.selected > -1) {
        const row =
          tutorialContentRowForId(tutorial, startId) ?? tutorialContentRowForId(tutorial, endId);
        if (!row) return { ids: Array.from(new Set([startId, endId])), direction: true };
        return idsBetweenSortedNodes(row, startId, endId, sortOrdinalKey);
      }
      return idsBetweenSortedNodes(tutorial.banners, startId, endId, sortOrdinalKey);
    case 'contentBreath':
      return idsBetweenSortedNodes(tutorialContentNodes(tutorial), startId, endId, (n) => n.ord);
    default:
      return { ids: Array.from(new Set([startId, endId])), direction: true };
  }
}

export function expandQuizHighlightRange(
  quiz: QuizState,
  lane: keyof QuizStartId,
  startId: number | string,
  endId: number | string,
): RangeResult<number | string> {
  switch (lane) {
    case 'quizBreath':
    case 'quizDepth':
      if (typeof startId !== 'number' || typeof endId !== 'number')
        return { ids: Array.from(new Set([startId, endId])), direction: true };
      return idsBetweenSortedNodes(quiz.quizzes, startId, endId, sortOrdinalKey);
    case 'attemptBreath': {
      if (typeof startId !== 'number' || typeof endId !== 'number')
        return { ids: Array.from(new Set([startId, endId])), direction: true };
      return idsBetweenSortedNodes(quizAttemptNodes(quiz), startId, endId, (n) => n.sort);
    }
    case 'questionBreath':
    case 'questionDepth': {
      if (typeof startId !== 'number' || typeof endId !== 'number')
        return { ids: Array.from(new Set([startId, endId])), direction: true };
      if (quiz.selected > -1 && quiz.followupId !== undefined) {
        const fb = quiz.banners.find((b) => b.id === quiz.followupId);
        const pennants = (fb?.pennants ?? []) as Array<{ id: number } & Ordinalish>;
        return idsBetweenSortedNodes(pennants, startId, endId, sortOrdinalKey);
      }
      const pool = quizQuestionBannerPool(quiz);
      return idsBetweenSortedNodes(pool, startId, endId, sortOrdinalKey);
    }
    default: {
      if (keysOfCourseStartId().includes(lane as keyof CourseStartId)) {
        if (typeof startId !== 'number' || typeof endId !== 'number')
          return { ids: Array.from(new Set([startId, endId])), direction: true };
        return expandCourseHighlightRange(
          quizStateAsCourseStateForHighlightExpand(quiz),
          lane as keyof CourseStartId,
          startId,
          endId,
        );
      }
      return { ids: Array.from(new Set([startId, endId])), direction: true };
    }
  }
}

/** Inclusive keys between endpoints by ordinal, restricted to rows sharing the endpoints' `type`. */
export function expandCommsOutlineRange(
  comms: CommsState,
  lane: keyof CommsStartId,
  startKey: string,
  endKey: string,
): RangeResult<string> {
  switch (lane) {
    case 'tutorOutline':
      return keysBetween(commsKeyNodes(comms.tutors), startKey, endKey);
    case 'outgoingOutline':
      return keysBetween(commsKeyNodes(comms.outgoing), startKey, endKey);
    case 'incomingOutline':
      return keysBetween(commsKeyNodes(comms.incoming), startKey, endKey);
    default:
      return { ids: Array.from(new Set([startKey, endKey])), direction: true };
  }
}

function commsOutlineRowsForLane(
  comms: CommsState,
  lane: keyof CommsStartId,
): ReadonlyArray<{ id: number; type: string }> {
  if (lane === 'tutorOutline') return comms.tutors;
  if (lane === 'outgoingOutline') return comms.outgoing;
  if (lane === 'incomingOutline') return comms.incoming;
  return [];
}

/** True when both keys resolve to rows and those rows use different `type` values. */
export function commsOutlineEndpointTypesDiffer(
  comms: CommsState,
  lane: keyof CommsStartId,
  keyA: string,
  keyB: string,
): boolean {
  const rows = commsOutlineRowsForLane(comms, lane);
  if (rows.length === 0) return false;
  const typeByKey = new Map<string, string>(rows.map((r) => [`${r.id}${r.type}`, r.type]));
  const ta = typeByKey.get(keyA);
  const tb = typeByKey.get(keyB);
  return ta !== undefined && tb !== undefined && ta !== tb;
}

/**
 * Returns true if any two rows referenced by `keys` (formatted `${id}${type}`)
 * in the outline lane's underlying collection have different `type` values.
 * Keys with no matching row are ignored.
 */
export function commsOutlineRangeHasDifferentTypes(
  comms: CommsState,
  lane: keyof CommsStartId,
  keys: string[],
): boolean {
  const rows = commsOutlineRowsForLane(comms, lane);
  if (rows.length === 0) return false;
  const typeByKey = new Map<string, string>(rows.map((r) => [`${r.id}${r.type}`, r.type]));
  const seen = new Set<string>();
  for (const k of keys) {
    const t = typeByKey.get(k);
    if (t === undefined) continue;
    seen.add(t);
    if (seen.size > 1) return true;
  }
  return false;
}

// --- RangeSelectionOrReorderManger ordinal-range shared helpers ---

export type OrdinalModifierRangeFlags = {
  shiftOrdinalRange: boolean;
  ctrlOrdinalRange: boolean;
  altOrdinalRange: boolean;
};

/** Mutually exclusive modifier “ordinal range” modes used by `RangeSelectionOrReorderManger` (not active in edit mode). */
export function ordinalModifierRangeFlags(settings: {
  editMode: boolean;
  shiftKeyDown: boolean;
  ctrlKeyDown: boolean;
  altKeyDown: boolean;
}): OrdinalModifierRangeFlags {
  if (settings.editMode) {
    return {
      shiftOrdinalRange: false,
      ctrlOrdinalRange: false,
      altOrdinalRange: false,
    };
  }
  const { shiftKeyDown, ctrlKeyDown, altKeyDown } = settings;
  return {
    shiftOrdinalRange: shiftKeyDown && !ctrlKeyDown && !altKeyDown,
    ctrlOrdinalRange: ctrlKeyDown && !shiftKeyDown && !altKeyDown,
    altOrdinalRange: altKeyDown && !ctrlKeyDown && !shiftKeyDown,
  };
}

/** `payload.ids` must be a single numeric id (tutorial / course highlight actions). */
export function extractSingleNumericPayloadId(action: { payload?: { ids?: number[] } }): number | null {
  const ids = action.payload?.ids;
  if (!Array.isArray(ids) || ids.length !== 1) return null;
  return ids[0];
}

/** `payload.ids` must be a single string key (comms outline actions). */
export function extractSingleStringPayloadId(action: { payload?: { ids?: string[] } }): string | null {
  const ids = action.payload?.ids;
  if (!Array.isArray(ids) || ids.length !== 1) return null;
  return ids[0];
}

/** `payload.ids` must be a single id (quiz highlight actions allow number | string). */
export function extractSingleQuizHighlightRawId(
  action: { payload?: { ids?: (number | string)[] } },
): number | string | null {
  const ids = action.payload?.ids;
  if (!Array.isArray(ids) || ids.length !== 1) return null;
  return ids[0];
}

export function clearTutorialBreathDepthStartAnchors(
  dispatchClear: (payload: { lane: keyof TutorialStartId; id: null }) => void,
): void {
  dispatchClear({ lane: 'tutorialBreath', id: null });
  dispatchClear({ lane: 'tutorialDepth', id: null });
}

export function clearQuizBreathDepthPairedStartAnchors(
  dispatchClear: (payload: { lane: keyof QuizStartId; id: null }) => void,
): void {
  dispatchClear({ lane: 'quizBreath', id: null });
  dispatchClear({ lane: 'quizDepth', id: null });
}

export function clearQuizQuestionBreathDepthPairedStartAnchors(
  dispatchClear: (payload: { lane: keyof QuizStartId; id: null }) => void,
): void {
  dispatchClear({ lane: 'questionBreath', id: null });
  dispatchClear({ lane: 'questionDepth', id: null });
}

/** Clears each listed course highlighter anchor lane (`id: null`). */
export function clearCourseHighlightStartLanes(
  lanes: readonly (keyof CourseStartId)[],
  dispatchClear: (payload: { lane: keyof CourseStartId; id: null }) => void,
): void {
  for (const lane of lanes) {
    dispatchClear({ lane, id: null });
  }
}

// --- RangeSelectionOrReorderManger: pure ordinal resolutions (middleware applies dispatches / `next`) ---

export type OrdinalCtrlAltMode = 'ctrl' | 'alt';

export type TutorialOrdinalCtrlAltResolved =
  | { tag: 'none' }
  | { tag: 'set_anchor'; lane: keyof TutorialStartId; id: number }
  | { tag: 'ctrl_reorder_tutorial'; ids: number[]; direction: boolean }
  | { tag: 'ctrl_reorder_content'; ids: number[]; direction: boolean }
  | { tag: 'alt_reorder_tutorial'; ids: number[]; direction: boolean }
  | { tag: 'alt_reorder_content'; ids: number[]; direction: boolean };

export function resolveTutorialCtrlAltOrdinalEffect(
  mode: OrdinalCtrlAltMode,
  tutorial: TutorialState,
  lane: keyof TutorialStartId,
  id: number,
): TutorialOrdinalCtrlAltResolved {
  if (lane === 'tutorialBreath' || lane === 'tutorialDepth') {
    const { startId } = tutorial;
    const cur = startId.tutorialBreath ?? startId.tutorialDepth;
    if (cur === null || cur === id) return { tag: 'set_anchor', lane, id };
    const expandLane: keyof TutorialStartId =
      startId.tutorialBreath != null ? 'tutorialBreath' : 'tutorialDepth';
    const { ids: expanded, direction } = expandTutorialHighlightRange(tutorial, expandLane, cur, id);
    const reorderSlides =
      tutorial.selected > -1 &&
      (lane === 'tutorialDepth' || expandLane === 'tutorialDepth');
    if (mode === 'ctrl') {
      return reorderSlides
        ? { tag: 'ctrl_reorder_content', ids: expanded, direction }
        : { tag: 'ctrl_reorder_tutorial', ids: expanded, direction };
    }
    return reorderSlides
      ? { tag: 'alt_reorder_content', ids: expanded, direction }
      : { tag: 'alt_reorder_tutorial', ids: expanded, direction };
  }
  if (lane === 'contentBreath') {
    const cur = tutorial.startId.contentBreath;
    if (cur === null || cur === id) return { tag: 'set_anchor', lane, id };
    const { ids: expanded, direction } = expandTutorialHighlightRange(tutorial, lane, cur, id);
    if (mode === 'ctrl') return { tag: 'ctrl_reorder_content', ids: expanded, direction };
    return { tag: 'alt_reorder_content', ids: expanded, direction };
  }
  return { tag: 'none' };
}

export type CourseShiftOrdinalHighlightResolved =
  | { tag: 'set_anchor_quiz'; lane: keyof QuizStartId; id: number }
  | { tag: 'set_anchor_course'; lane: keyof CourseStartId; id: number }
  | { tag: 'expand_highlight'; ids: number[] };

export function resolveCourseShiftOrdinalHighlightEffect(
  useQuizSharedCourseHighlighterLanes: boolean,
  course: CourseState,
  quiz: QuizState,
  lane: keyof CourseStartId,
  id: number,
  cur: number | null,
): CourseShiftOrdinalHighlightResolved {
  if (cur === null || cur === id) {
    if (useQuizSharedCourseHighlighterLanes) {
      return { tag: 'set_anchor_quiz', lane: lane as keyof QuizStartId, id };
    }
    return { tag: 'set_anchor_course', lane, id };
  }
  const expanded = useQuizSharedCourseHighlighterLanes
    ? expandQuizHighlightRange(quiz, lane as keyof QuizStartId, cur, id).ids
    : expandCourseHighlightRange(course, lane, cur, id).ids;
  return { tag: 'expand_highlight', ids: expanded as number[] };
}

export type CourseCtrlAltOrdinalLaneResolved =
  | { tag: 'none' }
  | { tag: 'anchor'; lane: keyof CourseStartId; id: number }
  | {
    tag: 'ctrl_reorder_slide';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId];
  }
  | {
    tag: 'ctrl_reorder_covers';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId];
  }
  | {
    tag: 'ctrl_reorder_course';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId, keyof CourseStartId];
  }
  | {
    tag: 'ctrl_reorder_pennant';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId, keyof CourseStartId];
  }
  | {
    tag: 'alt_reorder_slide';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId];
  }
  | {
    tag: 'alt_reorder_covers';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId];
  }
  | {
    tag: 'alt_reorder_course';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId, keyof CourseStartId];
  }
  | {
    tag: 'alt_reorder_pennant';
    ids: number[];
    direction: boolean;
    clearLanes: readonly [keyof CourseStartId, keyof CourseStartId];
  };

export function resolveCourseCtrlAltOrdinalLaneEffect(
  mode: OrdinalCtrlAltMode,
  startIdContainer: CourseStartId,
  lane: keyof CourseStartId,
  id: number,
  expandCourseLane: (expandLane: keyof CourseStartId, curId: number) => RangeResult<number>,
): CourseCtrlAltOrdinalLaneResolved {
  if (lane === 'slideBreath') {
    const cur = startIdContainer.slideBreath;
    if (cur === null || cur === id) return { tag: 'anchor', lane: 'slideBreath', id };
    const { ids: expanded, direction } = expandCourseLane('slideBreath', cur);
    if (mode === 'ctrl') return { tag: 'ctrl_reorder_slide', ids: expanded, direction, clearLanes: ['slideBreath'] };
    return { tag: 'alt_reorder_slide', ids: expanded, direction, clearLanes: ['slideBreath'] };
  }
  if (lane === 'coversBreath') {
    const cur = startIdContainer.coversBreath;
    if (cur === null || cur === id) return { tag: 'anchor', lane: 'coversBreath', id };
    const { ids: expanded, direction } = expandCourseLane('coversBreath', cur);
    if (mode === 'ctrl') return { tag: 'ctrl_reorder_covers', ids: expanded, direction, clearLanes: ['coversBreath'] };
    return { tag: 'alt_reorder_covers', ids: expanded, direction, clearLanes: ['coversBreath'] };
  }
  if (lane === 'courseBreath' || lane === 'courseDepth') {
    const cur = startIdContainer.courseBreath ?? startIdContainer.courseDepth;
    if (cur === null || cur === id) return { tag: 'anchor', lane, id };
    const expandLane: keyof CourseStartId =
      startIdContainer.courseBreath != null ? 'courseBreath' : 'courseDepth';
    const { ids: expanded, direction } = expandCourseLane(expandLane, cur);
    if (mode === 'ctrl') {
      return {
        tag: 'ctrl_reorder_course',
        ids: expanded,
        direction,
        clearLanes: ['courseBreath', 'courseDepth'],
      };
    }
    return {
      tag: 'alt_reorder_course',
      ids: expanded,
      direction,
      clearLanes: ['courseBreath', 'courseDepth'],
    };
  }
  if (lane === 'pennantBreath' || lane === 'pennantDepth') {
    const cur = startIdContainer.pennantBreath ?? startIdContainer.pennantDepth;
    if (cur === null || cur === id) return { tag: 'anchor', lane, id };
    const expandLane: keyof CourseStartId =
      startIdContainer.pennantBreath != null ? 'pennantBreath' : 'pennantDepth';
    const { ids: expanded, direction } = expandCourseLane(expandLane, cur);
    if (mode === 'ctrl') {
      return {
        tag: 'ctrl_reorder_pennant',
        ids: expanded,
        direction,
        clearLanes: ['pennantBreath', 'pennantDepth'],
      };
    }
    return {
      tag: 'alt_reorder_pennant',
      ids: expanded,
      direction,
      clearLanes: ['pennantBreath', 'pennantDepth'],
    };
  }
  return { tag: 'none' };
}

export type QuizOrdinalCtrlAltResolved =
  | { tag: 'none' }
  | { tag: 'invalid_number_id' }
  | { tag: 'set_anchor'; lane: keyof QuizStartId; id: number }
  | { tag: 'ctrl_reorder_quiz'; ids: number[]; direction: boolean }
  | { tag: 'ctrl_reorder_question'; ids: number[]; direction: boolean }
  | { tag: 'alt_reorder_quiz'; ids: number[]; direction: boolean }
  | { tag: 'alt_reorder_question'; ids: number[]; direction: boolean };

export function resolveQuizCtrlAltOrdinalBreathDepthEffect(
  mode: OrdinalCtrlAltMode,
  quiz: QuizState,
  lane: keyof QuizStartId,
  rawId: number | string,
): QuizOrdinalCtrlAltResolved {
  if (lane === 'quizBreath' || lane === 'quizDepth') {
    if (typeof rawId !== 'number') return { tag: 'invalid_number_id' };
    const id = rawId;
    const { startId } = quiz;
    const cur = startId.quizBreath ?? startId.quizDepth;
    if (cur === null || cur === id) return { tag: 'set_anchor', lane, id };
    const expandLane: keyof QuizStartId =
      startId.quizBreath != null ? 'quizBreath' : 'quizDepth';
    const { ids: expanded, direction } = expandQuizHighlightRange(quiz, expandLane, cur, id);
    if (mode === 'ctrl') {
      return { tag: 'ctrl_reorder_quiz', ids: expanded as number[], direction };
    }
    return { tag: 'alt_reorder_quiz', ids: expanded as number[], direction };
  }
  if (lane === 'questionBreath' || lane === 'questionDepth') {
    if (typeof rawId !== 'number') return { tag: 'invalid_number_id' };
    const id = rawId;
    const { startId } = quiz;
    const cur = startId.questionBreath ?? startId.questionDepth;
    if (cur === null || cur === id) return { tag: 'set_anchor', lane, id };
    const expandLane: keyof QuizStartId =
      startId.questionBreath != null ? 'questionBreath' : 'questionDepth';
    const { ids: expanded, direction } = expandQuizHighlightRange(quiz, expandLane, cur, id);
    if (mode === 'ctrl') {
      return { tag: 'ctrl_reorder_question', ids: expanded as number[], direction };
    }
    return { tag: 'alt_reorder_question', ids: expanded as number[], direction };
  }
  return { tag: 'none' };
}
