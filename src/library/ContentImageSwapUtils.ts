import type { UpdatePayload } from './actions';
import type { Content } from '../store/slices/tutorialSlice';
import type { SlideGroupItem, SlideItem } from '../store/slices/courseSlice';
import type { RootState } from '../store/types';
import {
  getSlideGroupItemsForBanner,
  getSlideGroupItemsForBannerIds,
  getSlideItemsForBanner,
  getSlideItemsForPennantIds,
} from '../components/Formulator/formulatorUtils';
import { ordinalForReorder } from './TutorialUtils';
import { getRoutePairsForCurApp } from './ShortcutsUtils';
import { getCurAppName, isPncUserApp } from '../utils';

export const IMAGEURL_PLACEHOLDER = 'data:image';

type InstructionRow = {
  id: number;
  title: string;
  content: string;
  imageurl: string;
  isHighlighted: boolean;
  ord: number;
};

function str(s: string | undefined): string {
  return s ?? '';
}

function fromContent(c: Content): InstructionRow {
  return {
    id: c.id,
    title: c.title,
    content: str(c.content),
    imageurl: str(c.imageurl),
    isHighlighted: !!c.isHighlighted,
    ord: ordinalForReorder(c),
  };
}

function fromSlide(c: SlideItem | SlideGroupItem): InstructionRow {
  return {
    id: c.id,
    title: c.title,
    content: str(c.content),
    imageurl: str(c.imageurl),
    isHighlighted: !!c.isHighlighted,
    ord: ordinalForReorder(c),
  };
}

function collectInstructionRows(
  state: RootState,
  urlID: string,
):
  | { ok: true; rows: InstructionRow[] }
  | { ok: false; error: string } {
  const webapp = getCurAppName(state.session.curApp).toLowerCase();

  if (webapp === 'tutorial') {
    if (urlID !== 'filtersinstructions') {
      return { ok: false, error: 'error_instruction_halves_route' };
    }
    const sel = state.tutorial.selected;
    if (sel < 0) {
      return { ok: false, error: 'error_instruction_halves_no_selection' };
    }
    const banner = state.tutorial.banners[sel];
    const rows = state.tutorial.content
      .filter((slides) => slides[0]?.bannerId === banner?.id)
      .flat()
      .map(fromContent);
    return { ok: true, rows };
  }

  if (webapp === 'course') {
    const sel = state.course.selected;
    if (sel < 0) {
      return { ok: false, error: 'error_instruction_halves_no_selection' };
    }
    const banner = state.course.banners[sel];
    const bannerId = banner?.id;
    if (bannerId == null) {
      return { ok: false, error: 'error_instruction_halves_no_selection' };
    }
    if (urlID === 'filtersinstructions') {
      const raw = getSlideItemsForBanner(state.course.content, bannerId);
      return { ok: true, rows: raw.map(fromSlide) };
    }
    if (urlID === 'siftersinstructions') {
      const raw = getSlideGroupItemsForBanner(state.course.content, bannerId);
      return { ok: true, rows: raw.map(fromSlide) };
    }
    return { ok: false, error: 'error_instruction_halves_route' };
  }

  if (webapp === 'quiz') {
    const sel = state.quiz.selected;
    if (sel < 0) {
      return { ok: false, error: 'error_instruction_halves_no_selection' };
    }
    const quiz = state.quiz.quizzes[sel];
    const followupId = state.quiz.followupId;
    const bannerIds = state.quiz.banners.filter((b) => b.bannerId === quiz?.id).map((b) => b.id);

    if (urlID === 'siftersinstructions') {
      const raw = getSlideGroupItemsForBannerIds(state.quiz.content, bannerIds);
      return { ok: true, rows: raw.map(fromSlide) };
    }
    if (urlID === 'filtersinstructions') {
      if (followupId === undefined) {
        const raw = getSlideGroupItemsForBannerIds(state.quiz.content, bannerIds);
        return { ok: true, rows: raw.map(fromSlide) };
      }
      const parent = state.quiz.banners.find((b) => b.id === followupId);
      if (!parent || parent.bannerId !== quiz?.id) {
        return { ok: false, error: 'error_instruction_halves_no_selection' };
      }
      const pennantIds = parent.pennants.map((p) => p.id);
      const raw = getSlideItemsForPennantIds(state.quiz.content, pennantIds);
      return { ok: true, rows: raw.map(fromSlide) };
    }
    return { ok: false, error: 'error_instruction_halves_route' };
  }

  return { ok: false, error: 'error_instruction_halves_app' };
}

function firstContiguousHighlighted(sorted: InstructionRow[]): InstructionRow[] {
  let i = 0;
  while (i < sorted.length && !sorted[i].isHighlighted) i += 1;
  if (i >= sorted.length) return [];
  const start = i;
  while (i < sorted.length && sorted[i].isHighlighted) i += 1;
  return sorted.slice(start, i);
}

/** Placeholder imageurl and dot content (non-matching half in either branch). */
function isInstructionNonMatchingRow(r: InstructionRow): boolean {
  return str(r.imageurl) === IMAGEURL_PLACEHOLDER && str(r.content) === '.';
}

/** Branch 1 matching half: full data URLs in both fields. */
function isBranch1MatchingRow(r: InstructionRow): boolean {
  const url = str(r.imageurl);
  return url.startsWith('data:image') && url !== IMAGEURL_PLACEHOLDER && str(r.content).startsWith('data:image');
}

/** Branch 2 matching half: normal imageurl and real text content. */
function isBranch2MatchingRow(r: InstructionRow): boolean {
  return (
    !isInstructionNonMatchingRow(r) &&
    !str(r.imageurl).startsWith('data:image') &&
    str(r.content) !== '.'
  );
}

function isBranch1WorkingSet(rows: InstructionRow[]): boolean {
  return rows.every((r) => isInstructionNonMatchingRow(r) || isBranch1MatchingRow(r));
}

function isBranch2WorkingSet(rows: InstructionRow[]): boolean {
  return rows.every((r) => isInstructionNonMatchingRow(r) || isBranch2MatchingRow(r));
}

function halfNonMatching(rows: InstructionRow[]): boolean {
  return rows.every(isInstructionNonMatchingRow);
}

function halfBranch1Matching(rows: InstructionRow[]): boolean {
  return rows.every(isBranch1MatchingRow);
}

function halfBranch2Matching(rows: InstructionRow[]): boolean {
  return rows.every(isBranch2MatchingRow);
}

function mergeUpdate(
  m: Map<number, UpdatePayload>,
  id: number,
  title: string,
  patch: Partial<UpdatePayload>,
) {
  const prev = m.get(id) ?? { id, title, modified: true as const, edited: true as const };
  m.set(id, { ...prev, ...patch, id, title: prev.title, modified: true, edited: true });
}

type HalvesWorkingSet = {
  working: InstructionRow[];
  top: InstructionRow[];
  bottom: InstructionRow[];
  half: number;
};

function tryCollectInstructionRowsOnInstructionsRoute(
  state: RootState,
): { ok: true; rows: InstructionRow[] } | { ok: false; error: string } {
  const curApp = state.session.curApp;
  if (!isPncUserApp(curApp)) {
    return { ok: false, error: 'error_instruction_halves_app' };
  }

  const current = state.pagination.selectedRoutes[curApp];
  const { routePairs } = getRoutePairsForCurApp(state);
  const currentRoute = routePairs.find((r) => r.urlID === current);
  if (!currentRoute || currentRoute.to !== 'instructions') {
    return { ok: false, error: 'error_instruction_halves_route' };
  }

  return collectInstructionRows(state, currentRoute.urlID);
}

function shouldSwapInstructionImageurlContent(r: InstructionRow): boolean {
  return str(r.imageurl) !== IMAGEURL_PLACEHOLDER || str(r.content) !== '.';
}

/** PNC + instructions route + first contiguous highlighted run + even split into top and bottom halves. */
export function tryGetInstructionHalvesWorkingSet(
  state: RootState,
): { ok: true; data: HalvesWorkingSet } | { ok: false; error: string } {
  const collected = tryCollectInstructionRowsOnInstructionsRoute(state);
  if (!collected.ok) return collected;

  const sorted = [...collected.rows].sort((a, b) => a.ord - b.ord);
  const working = firstContiguousHighlighted(sorted);
  if (working.length === 0) {
    return { ok: false, error: 'error_instruction_halves_no_highlight' };
  }

  const n = working.length;
  if (n % 2 !== 0) {
    return { ok: false, error: 'error_instruction_halves_odd_count' };
  }

  const half = n / 2;
  return {
    ok: true,
    data: {
      working,
      top: working.slice(0, half),
      bottom: working.slice(half),
      half,
    },
  };
}

/**
 * Ctrl+Shift+O: for each index i in the first contiguous highlighted run (top and bottom halves),
 * `top[i].content` ← `bottom[i].imageurl` and `bottom[i].imageurl` ← {@link IMAGEURL_PLACEHOLDER}.
 * Requires an even-length run and no row with `imageurl ===` {@link IMAGEURL_PLACEHOLDER}.
 */
export function tryInstructionBranchOneReverseTransform(
  state: RootState,
): { ok: true; updates: UpdatePayload[] } | { ok: false; error: string } {
  const ws = tryGetInstructionHalvesWorkingSet(state);
  if (!ws.ok) return ws;

  const { top, bottom, half, working } = ws.data;
  if (working.some((r) => str(r.imageurl) === IMAGEURL_PLACEHOLDER)) {
    return { ok: false, error: 'error_instruction_reverse_o_imageurl_placeholder' };
  }

  const m = new Map<number, UpdatePayload>();
  for (let i = 0; i < half; i += 1) {
    const t = top[i];
    const b = bottom[i];
    mergeUpdate(m, t.id, t.title, { content: str(b.imageurl) });
    mergeUpdate(m, b.id, b.title, { imageurl: IMAGEURL_PLACEHOLDER });
  }
  return { ok: true, updates: [...m.values()] };
}

/**
 * Ctrl+Shift+W: for each index i in the first contiguous highlighted run,
 * `top[i].imageurl` ← `bottom[i].content` and `bottom[i].content` ← `"."`.
 * Requires an even-length run and no row with `content === '.'`.
 */
export function tryInstructionBranchTwoReverseTransform(
  state: RootState,
): { ok: true; updates: UpdatePayload[] } | { ok: false; error: string } {
  const ws = tryGetInstructionHalvesWorkingSet(state);
  if (!ws.ok) return ws;

  const { top, bottom, half } = ws.data;
  if (ws.data.working.some((r) => str(r.content) === '.')) {
    return { ok: false, error: 'error_instruction_reverse_w_content_dot' };
  }

  const m = new Map<number, UpdatePayload>();
  for (let i = 0; i < half; i += 1) {
    const t = top[i];
    const b = bottom[i];
    mergeUpdate(m, t.id, t.title, { imageurl: str(b.content) });
    mergeUpdate(m, b.id, b.title, { content: '.' });
  }
  return { ok: true, updates: [...m.values()] };
}

export function tryInstructionHalvesMirrorTransform(
  state: RootState,
): { ok: true; updates: UpdatePayload[] } | { ok: false; error: string } {
  const ws = tryGetInstructionHalvesWorkingSet(state);
  if (!ws.ok) return ws;

  const { working, top, bottom, half } = ws.data;

  const branch1 = isBranch1WorkingSet(working);
  const branch2 = isBranch2WorkingSet(working);
  if (!branch1 && !branch2) {
    return { ok: false, error: 'error_instruction_halves_mixed_branch' };
  }

  const topNm = halfNonMatching(top);
  const botNm = halfNonMatching(bottom);
  if (topNm === botNm) {
    return { ok: false, error: 'error_instruction_halves_half_split' };
  }

  if (branch1) {
    if (topNm) {
      if (!halfBranch1Matching(bottom)) {
        return { ok: false, error: 'error_instruction_halves_matching_half' };
      }
    } else if (!halfBranch1Matching(top)) {
      return { ok: false, error: 'error_instruction_halves_matching_half' };
    }
  } else if (topNm) {
    if (!halfBranch2Matching(bottom)) {
      return { ok: false, error: 'error_instruction_halves_matching_half' };
    }
  } else if (!halfBranch2Matching(top)) {
    return { ok: false, error: 'error_instruction_halves_matching_half' };
  }

  const m = new Map<number, UpdatePayload>();

  if (branch1) {
    for (let i = 0; i < half; i += 1) {
      const t = top[i];
      const b = bottom[i];
      if (topNm) {
        mergeUpdate(m, t.id, t.title, { imageurl: str(b.content) });
        mergeUpdate(m, b.id, b.title, { content: '.' });
      } else {
        mergeUpdate(m, b.id, b.title, { imageurl: str(t.content) });
        mergeUpdate(m, t.id, t.title, { content: '.' });
      }
    }
  } else {
    for (let i = 0; i < half; i += 1) {
      const t = top[i];
      const b = bottom[i];
      if (topNm) {
        mergeUpdate(m, t.id, t.title, { content: str(b.imageurl) });
        mergeUpdate(m, b.id, b.title, { imageurl: IMAGEURL_PLACEHOLDER });
      } else {
        mergeUpdate(m, b.id, b.title, { content: str(t.imageurl) });
        mergeUpdate(m, t.id, t.title, { imageurl: IMAGEURL_PLACEHOLDER });
      }
    }
  }

  return { ok: true, updates: [...m.values()] };
}

/**
 * Ctrl+Shift+F: on the instructions route, every highlighted row swaps `imageurl` and `content`
 * when `imageurl !==` {@link IMAGEURL_PLACEHOLDER} or `content !== "."` (skips bare placeholder+dot rows).
 */
export function tryInstructionSwapImageurlContentTransform(
  state: RootState,
): { ok: true; updates: UpdatePayload[] } | { ok: false; error: string } {
  const collected = tryCollectInstructionRowsOnInstructionsRoute(state);
  if (!collected.ok) return collected;

  const highlighted = collected.rows.filter((r) => r.isHighlighted);
  if (highlighted.length === 0) {
    return { ok: false, error: 'error_instruction_halves_no_highlight' };
  }

  const m = new Map<number, UpdatePayload>();
  for (const r of highlighted) {
    if (!shouldSwapInstructionImageurlContent(r)) continue;
    mergeUpdate(m, r.id, r.title, { imageurl: str(r.content), content: str(r.imageurl) });
  }

  if (m.size === 0) {
    return { ok: false, error: 'error_instruction_swap_no_swappable' };
  }

  return { ok: true, updates: [...m.values()] };
}