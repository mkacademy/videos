import type { RootState } from "../store";
import {
  getCourseTrees,
  getQuizTrees,
  getTutorialTrees,
  type CourseTrees,
  type QuizTrees,
  type TutorialTrees,
} from "./controlPanelUtils";
import type { BannerClipboardKind } from "./EncodingVerifierUtils";
import { parseBannerClipboardToken } from "./EncodingVerifierUtils";
import { insertTextAtTextareaCursor } from "./textareaInsert";

const BANNER_CLIPBOARD_KIND_ORDER: readonly BannerClipboardKind[] = [
  "tutorial",
  "course",
  "quiz",
] as const;

/** True when the merged `trees` object has no keys (nothing to stringify for paste). */
export function treesRecordIsEmpty(
  trees: TutorialTrees | CourseTrees | QuizTrees,
): boolean {
  return Object.keys(trees as Record<string, unknown>).length === 0;
}

/**
 * Shuffles kinds randomly and returns the first whose `trees` are non-empty, or null if all are empty.
 */
export function pickRandomKindWithNonEmptyTrees(
  byKind: ClipboardPasteTreesByKind,
): BannerClipboardKind | null {
  const kinds = [...BANNER_CLIPBOARD_KIND_ORDER];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  for (const k of kinds) {
    if (!treesRecordIsEmpty(byKind[k].trees)) return k;
  }
  return null;
}

/** Kinds other than the one whose trees were pasted; if `null`, all kinds are "remaining". */
export function remainingKindsAfterTreePaste(
  pastedKind: BannerClipboardKind | null,
): BannerClipboardKind[] {
  if (pastedKind === null) return [...BANNER_CLIPBOARD_KIND_ORDER];
  return BANNER_CLIPBOARD_KIND_ORDER.filter((k) => k !== pastedKind);
}

/**
 * Concatenates `resolved` token lists for the given kinds in canonical order (tutorial → course → quiz).
 * Suitable for {@link parseBannerClipboardIdsFromText} / the next paste.
 */
export function mergeResolvedTokensForKinds(
  byKind: ClipboardPasteTreesByKind,
  kinds: BannerClipboardKind[],
): string {
  const want = new Set(kinds);
  const parts: string[] = [];
  for (const k of BANNER_CLIPBOARD_KIND_ORDER) {
    if (!want.has(k)) continue;
    parts.push(...byKind[k].resolved);
  }
  return parts.join(",");
}

/** All unresolved tokens across kinds, comma-separated. */
export function mergeAllUnresolvedTokens(
  byKind: ClipboardPasteTreesByKind,
): string {
  const parts: string[] = [
    ...byKind.tutorial.unresolved,
    ...byKind.course.unresolved,
    ...byKind.quiz.unresolved,
  ];
  return parts.join(",");
}

/** Minimum time Paste buttons stay disabled; if work runs longer, disabled until work finishes too. */
export const BANNER_CLIPBOARD_PASTE_BUTTON_MIN_MS = 1000;

/**
 * Runs `work` in parallel with {@link BANNER_CLIPBOARD_PASTE_BUTTON_MIN_MS}. Resolves only after both
 * complete (fast work still waits the full minimum; slow work extends past it).
 */
export async function awaitBannerClipboardPasteButtonFeedback(
  work: () => Promise<void>,
): Promise<void> {
  await Promise.all([
    work(),
    new Promise<void>((resolve) =>
      setTimeout(resolve, BANNER_CLIPBOARD_PASTE_BUTTON_MIN_MS),
    ),
  ]);
}

/**
 * Pastes one kind’s `trees` as base64(JSON) into the textarea, writes remaining kinds’ resolved tokens
 * to the clipboard for the next paste (if any), and logs merged unresolved tokens when present.
 */
export async function applyBannerClipboardPasteRound(
  byKind: ClipboardPasteTreesByKind,
  textarea: HTMLTextAreaElement | null,
): Promise<void> {
  const pastedKind = pickRandomKindWithNonEmptyTrees(byKind);
  if (pastedKind !== null) {
    const json = JSON.stringify({ Trees: byKind[pastedKind].trees });
    const base64 = Buffer.from(json, "utf8").toString("base64");
    insertTextAtTextareaCursor(textarea, base64);
  }

  const remaining = remainingKindsAfterTreePaste(pastedKind);
  const resolvedMerged = mergeResolvedTokensForKinds(byKind, remaining);
  if (resolvedMerged.length > 0) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(resolvedMerged);
      } catch {
        /* ignore */
      }
    }
  }

  const unresolvedMerged = mergeAllUnresolvedTokens(byKind);
  if (unresolvedMerged.length > 0) {
    console.log(
      "Banner clipboard paste: token(s) not resolved in this project:",
      unresolvedMerged,
    );
  }
}

function sliceTutorialTreesForBanner(
  trees: TutorialTrees,
  bannerId: number,
): TutorialTrees {
  if (Object.prototype.hasOwnProperty.call(trees, bannerId)) {
    const children = trees[bannerId];
    if (Array.isArray(children)) {
      return { [bannerId]: children };
    }
  }
  if (trees._orphans?.includes(bannerId)) {
    return { _orphans: [bannerId] };
  }
  return {};
}

function sliceCourseTreesForBanner(
  trees: CourseTrees,
  bannerId: number,
): CourseTrees {
  if (Object.prototype.hasOwnProperty.call(trees, bannerId)) {
    return { [bannerId]: trees[bannerId] };
  }
  if (trees._orphans?.includes(bannerId)) {
    return { _orphans: [bannerId] };
  }
  return {};
}

function sliceQuizTreesForQuiz(trees: QuizTrees, quizId: number): QuizTrees {
  if (Object.prototype.hasOwnProperty.call(trees, quizId)) {
    return { [quizId]: trees[quizId] };
  }
  if (trees._orphans?.includes(quizId)) {
    return { _orphans: [quizId] };
  }
  return {};
}

function mergeTutorialTrees(a: TutorialTrees, b: TutorialTrees): TutorialTrees {
  const out: Record<number, number[]> = {};
  for (const k of Object.keys(a)) {
    if (k === "_orphans") continue;
    const id = Number(k);
    if (Number.isFinite(id) && Array.isArray((a as Record<string, unknown>)[k])) {
      out[id] = (a as Record<number, number[]>)[id]!;
    }
  }
  for (const k of Object.keys(b)) {
    if (k === "_orphans") continue;
    const id = Number(k);
    if (Number.isFinite(id) && Array.isArray((b as Record<string, unknown>)[k])) {
      out[id] = (b as Record<number, number[]>)[id]!;
    }
  }
  const orphans = [...(a._orphans ?? []), ...(b._orphans ?? [])];
  return orphans.length > 0 ? { ...out, _orphans: orphans } : { ...out };
}

type CourseBannerNode = CourseTrees[number];

function mergeCourseBannerNode(a: CourseBannerNode, b: CourseBannerNode): CourseBannerNode {
  const ar = a as Record<string, unknown>;
  const br = b as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(ar), ...Object.keys(br)]);
  for (const k of keys) {
    if (k === "_orphans" || k === "slideGroupItems") continue;
    const id = Number(k);
    if (!Number.isFinite(id)) continue;
    const av = ar[k];
    const bv = br[k];
    if (Array.isArray(av) && Array.isArray(bv)) {
      out[k] = av.length >= bv.length ? av : bv;
    } else {
      out[k] = Array.isArray(bv) ? bv : av;
    }
  }
  // Drop orphan ids that are also keyed with slides — flushCourseTrees would otherwise
  // create duplicate pennants / slide rows for the same pennant id.
  const orphans = [...((ar._orphans as number[] | undefined) ?? []), ...((br._orphans as number[] | undefined) ?? [])]
    .filter((id) => !Array.isArray(out[String(id)]));
  if (orphans.length > 0) {
    out._orphans = [...new Set(orphans)];
  }
  const sga = ar.slideGroupItems as number[] | undefined;
  const sgb = br.slideGroupItems as number[] | undefined;
  if (sga?.length || sgb?.length) {
    out.slideGroupItems = [...(sga ?? []), ...(sgb ?? [])];
  }
  return out as CourseBannerNode;
}

function mergeCourseTrees(a: CourseTrees, b: CourseTrees): CourseTrees {
  const ids = new Set<number>();
  for (const k of Object.keys(a)) {
    if (k === "_orphans") continue;
    const id = Number(k);
    if (Number.isFinite(id)) ids.add(id);
  }
  for (const k of Object.keys(b)) {
    if (k === "_orphans") continue;
    const id = Number(k);
    if (Number.isFinite(id)) ids.add(id);
  }
  const out: CourseTrees = {};
  for (const id of ids) {
    const av = a[id];
    const bv = b[id];
    if (av !== undefined && bv !== undefined) {
      out[id] = mergeCourseBannerNode(av, bv);
    } else {
      out[id] = (av ?? bv)!;
    }
  }
  const orphans = [...(a._orphans ?? []), ...(b._orphans ?? [])];
  if (orphans.length > 0) out._orphans = orphans;
  return out;
}

function mergeQuizTreeEntry(
  a: QuizTrees[number] | undefined,
  b: QuizTrees[number] | undefined,
): QuizTrees[number] {
  if (!a || Object.keys(a).length === 0) return b ?? {};
  if (!b || Object.keys(b).length === 0) return a;
  const out: QuizTrees[number] = {};
  if (a.banners || b.banners) {
    out.banners = mergeCourseTrees(a.banners ?? {}, b.banners ?? {});
  }
  if (a.submissions?.length || b.submissions?.length) {
    out.submissions = [...(a.submissions ?? []), ...(b.submissions ?? [])];
  }
  return out;
}

function mergeQuizTrees(a: QuizTrees, b: QuizTrees): QuizTrees {
  const ids = new Set<number>();
  for (const k of Object.keys(a)) {
    if (k === "_orphans") continue;
    const id = Number(k);
    if (Number.isFinite(id)) ids.add(id);
  }
  for (const k of Object.keys(b)) {
    if (k === "_orphans") continue;
    const id = Number(k);
    if (Number.isFinite(id)) ids.add(id);
  }
  const out: QuizTrees = {};
  for (const id of ids) {
    const av = a[id];
    const bv = b[id];
    if (av !== undefined && bv !== undefined) {
      out[id] = mergeQuizTreeEntry(av, bv);
    } else {
      out[id] = (av ?? bv)!;
    }
  }
  const orphans = [...(a._orphans ?? []), ...(b._orphans ?? [])];
  if (orphans.length > 0) out._orphans = orphans;
  return out;
}

/** One branch per {@link BannerClipboardKind}: merged trees for all resolved ids, plus token lists. */
export type ClipboardPasteTreesByKind = {
  [K in BannerClipboardKind]: K extends "tutorial"
  ? { trees: TutorialTrees; resolved: string[]; unresolved: string[] }
  : K extends "course"
  ? { trees: CourseTrees; resolved: string[]; unresolved: string[] }
  : { trees: QuizTrees; resolved: string[]; unresolved: string[] };
};

export const emptyClipboardPasteTreesByKind = (): ClipboardPasteTreesByKind => ({
  tutorial: { trees: {}, resolved: [], unresolved: [] },
  course: { trees: {}, resolved: [], unresolved: [] },
  quiz: { trees: {}, resolved: [], unresolved: [] },
});

/** Concat token lists and merge `trees` per kind (for stacking multiple paste operations). */
export function mergeClipboardPasteTreesByKind(
  previous: ClipboardPasteTreesByKind,
  next: ClipboardPasteTreesByKind,
): ClipboardPasteTreesByKind {
  return {
    tutorial: {
      trees: mergeTutorialTrees(previous.tutorial.trees, next.tutorial.trees),
      resolved: [...previous.tutorial.resolved, ...next.tutorial.resolved],
      unresolved: [...previous.tutorial.unresolved, ...next.tutorial.unresolved],
    },
    course: {
      trees: mergeCourseTrees(previous.course.trees, next.course.trees),
      resolved: [...previous.course.resolved, ...next.course.resolved],
      unresolved: [...previous.course.unresolved, ...next.course.unresolved],
    },
    quiz: {
      trees: mergeQuizTrees(previous.quiz.trees, next.quiz.trees),
      resolved: [...previous.quiz.resolved, ...next.quiz.resolved],
      unresolved: [...previous.quiz.unresolved, ...next.quiz.unresolved],
    },
  };
}

/**
 * For each clipboard segment, checks {@link RootState} for a matching tutorial banner, course banner, or quiz,
 * then groups results by kind: merged `trees` for resolved ids, and `resolved` / `unresolved` token lists.
 * Uses `dehydratedOnly: false` so hydrated UI state is included (zip encoding uses skeleton-only rows via `IsDehydrated`).
 * Builds each full tree at most once per kind when any resolved token needs it, then slices and merges per id.
 */
export function buildTreesFromBannerClipboardIds(
  state: RootState,
  segments: string[],
): ClipboardPasteTreesByKind {
  type ResolvedEntry =
    | { token: string; kind: "tutorial"; id: number; resolved: boolean }
    | { token: string; kind: "course"; id: number; resolved: boolean }
    | { token: string; kind: "quiz"; id: number; resolved: boolean };

  const entries: ResolvedEntry[] = [];
  for (const token of segments) {
    const parsed = parseBannerClipboardToken(token);
    if (!parsed) continue;
    if (parsed.kind === "tutorial") {
      entries.push({
        token,
        kind: "tutorial",
        id: parsed.id,
        resolved: state.tutorial.banners.some((b) => b.id === parsed.id),
      });
    } else if (parsed.kind === "course") {
      entries.push({
        token,
        kind: "course",
        id: parsed.id,
        resolved: state.course.banners.some((b) => b.id === parsed.id),
      });
    } else {
      entries.push({
        token,
        kind: "quiz",
        id: parsed.id,
        resolved: state.quiz.quizzes.some((q) => q.id === parsed.id),
      });
    }
  }

  const needTutorial = entries.some((e) => e.kind === "tutorial" && e.resolved);
  const needCourse = entries.some((e) => e.kind === "course" && e.resolved);
  const needQuiz = entries.some((e) => e.kind === "quiz" && e.resolved);

  const tutorialTreesFull = needTutorial
    ? getTutorialTrees(
      {
        banners: state.tutorial.banners,
        content: state.tutorial.content,
      },
      { dehydratedOnly: false },
    )
    : null;
  const courseTreesFull = needCourse
    ? getCourseTrees(
      {
        banners: state.course.banners,
        content: state.course.content,
      },
      { dehydratedOnly: false },
    )
    : null;
  const quizTreesFull = needQuiz
    ? getQuizTrees(
      {
        quizzes: state.quiz.quizzes,
        banners: state.quiz.banners,
        content: state.quiz.content,
      },
      { dehydratedOnly: false },
    )
    : null;

  const result = emptyClipboardPasteTreesByKind();

  for (const e of entries) {
    if (e.kind === "tutorial") {
      if (e.resolved) {
        result.tutorial.resolved.push(e.token);
        if (tutorialTreesFull) {
          const slice = sliceTutorialTreesForBanner(tutorialTreesFull, e.id);
          result.tutorial.trees = mergeTutorialTrees(result.tutorial.trees, slice);
        }
      } else {
        result.tutorial.unresolved.push(e.token);
      }
    } else if (e.kind === "course") {
      if (e.resolved) {
        result.course.resolved.push(e.token);
        if (courseTreesFull) {
          const slice = sliceCourseTreesForBanner(courseTreesFull, e.id);
          result.course.trees = mergeCourseTrees(result.course.trees, slice);
        }
      } else {
        result.course.unresolved.push(e.token);
      }
    } else {
      if (e.resolved) {
        result.quiz.resolved.push(e.token);
        if (quizTreesFull) {
          const slice = sliceQuizTreesForQuiz(quizTreesFull, e.id);
          result.quiz.trees = mergeQuizTrees(result.quiz.trees, slice);
        }
      } else {
        result.quiz.unresolved.push(e.token);
      }
    }
  }

  return result;
}
