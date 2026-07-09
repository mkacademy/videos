import { Buffer } from "buffer";
import {
  Banner as TutorialBanner,
  Content as TutorialContent,
  TutorialState,
} from "../store/slices/tutorialSlice";
import {
  Banner as CourseBanner,
  CourseState,
  SlideGroup,
} from "../store/slices/courseSlice";
import { Quiz, QuizState } from "../store/slices/quizSlice";
import { CourseTrees, QuizTrees, TutorialTrees } from "./controlPanelUtils";
import {
  unSignMZip,
  unSignQZip,
  unSignTZip,
} from "./EncodingManagerUtils";

type UnsignFunction<T> = (
  obj: T,
  username: string,
) =>
  | (Partial<TutorialState> & { Trees: TutorialTrees })
  | (Partial<CourseState> & { Trees: CourseTrees })
  | (Partial<QuizState> & { Trees: QuizTrees });

/** Same pipeline as `EncodingManagerUtils.parse` but propagates decode/unsign errors (no fallback empty state). */
export const parseStrict = <
  T = CourseBanner | TutorialBanner | Quiz | SlideGroup | TutorialContent,
>(
  encodedStr: string,
  username: string,
  unsign: UnsignFunction<T>,
):
  | (Partial<TutorialState> & { Trees: TutorialTrees })
  | (Partial<CourseState> & { Trees: CourseTrees })
  | (Partial<QuizState> & { Trees: QuizTrees }) => {
  const obj = JSON.parse(Buffer.from(encodedStr.trim(), "base64").toString());
  return unsign(obj, username);
};

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Arrays and plain objects only (JSON-safe); primitives and null rejected. */
function isArrayOrPlainObject(v: unknown): boolean {
  return Array.isArray(v) || isPlainRecord(v);
}

function isNumberArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === "number" && Number.isFinite(x));
}

/**
 * Every top-level key except `Trees` must map to an array or a plain object
 * (empty `[]` / `{}` allowed). `Trees` is validated separately.
 */
function zipPayloadTopLevelKeysAreContainers(
  obj: Record<string, unknown>,
): boolean {
  for (const [key, val] of Object.entries(obj)) {
    if (key === "Trees") continue;
    if (!isArrayOrPlainObject(val)) return false;
  }
  return true;
}

const TREE_NUMERIC_KEY = /^\d+$/;

/**
 * Non-empty `Trees` with a shape compatible with {@link TutorialTrees}, {@link CourseTrees}, or {@link QuizTrees}.
 * Empty `{}`, primitives, unknown keys, or empty nested objects are invalid.
 */
function isValidZipTrees(trees: unknown): boolean {
  if (!isPlainRecord(trees)) return false;
  if (Object.keys(trees).length === 0) return false;
  return isValidZipTreeNode(trees);
}

function isValidZipTreeNode(node: unknown): boolean {
  if (isNumberArray(node)) return true;
  if (!isPlainRecord(node)) return false;
  if (Object.keys(node).length === 0) return false;

  for (const [k, v] of Object.entries(node)) {
    if (k === "_orphans" || k === "slideGroupItems" || k === "submissions") {
      if (!isNumberArray(v)) return false;
      continue;
    }
    if (k === "banners") {
      if (!isPlainRecord(v) || Object.keys(v).length === 0) return false;
      if (!isValidZipTreeNode(v)) return false;
      continue;
    }
    if (TREE_NUMERIC_KEY.test(k)) {
      if (!isValidZipTreeNode(v)) return false;
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Classifies {@link TutorialTrees} vs {@link CourseTrees} vs {@link QuizTrees} from the **root** `Trees`
 * object only. {@link unSignTZip} / {@link unSignMZip} / {@link unSignQZip} do not validate tree shape when
 * `banners`/`content` are empty, so callers must use this instead of "first unsign that runs".
 *
 * - Tutorial: each numeric id maps to a number[] (step ids per banner).
 * - Course: numeric id maps to a pennant/slide node (object, no `banners` / `submissions` keys).
 * - Quiz: numeric id maps to `{ banners?, submissions? }` wrapping course trees / submission ids.
 *
 * Orphan-only trees `{ "_orphans": [...] }` match both tutorial and course generators; this returns
 * `"tutorial"` for that rare case. Returns `null` when tutorial-style arrays are mixed with course-style objects.
 */
function zipTreesLikelyKind(
  trees: Record<string, unknown>,
): "tutorial" | "course" | "quiz" | null {
  let sawTutorial = false;
  let sawCourse = false;
  let sawQuiz = false;
  for (const [k, v] of Object.entries(trees)) {
    if (k === "_orphans") continue;
    if (!TREE_NUMERIC_KEY.test(k)) return null;
    if (isNumberArray(v)) {
      sawTutorial = true;
      continue;
    }
    if (!isPlainRecord(v)) return null;
    if ("banners" in v || "submissions" in v) {
      sawQuiz = true;
      continue;
    }
    sawCourse = true;
  }
  if (sawQuiz) return "quiz";
  if (sawCourse && sawTutorial) return null;
  if (sawCourse) return "course";
  if (sawTutorial) return "tutorial";
  const topKeys = Object.keys(trees);
  if (topKeys.length > 0 && topKeys.every((k) => k === "_orphans")) {
    return "tutorial";
  }
  return null;
}

/** Tutorial zip: `content` is an array of step rows (each row is an array). */
function isTutorialNestedContent(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) return false;
  return content.every((row) => Array.isArray(row));
}

/** Course zip: `content` is slide groups with a `slides` matrix. */
function isCourseSlideGroupContent(content: unknown): boolean {
  if (!Array.isArray(content) || content.length === 0) return false;
  return content.every(
    (item) =>
      isPlainRecord(item) &&
      Array.isArray(item.slides) &&
      item.slides.every((row: unknown) => Array.isArray(row)),
  );
}

/**
 * If `body` is valid base64 JSON matching a signed tutorial / course / quiz zip,
 * returns the matching comment content kind after {@link parseStrict} + unSign succeeds.
 * Otherwise returns `null` (caller should treat as plain `message`).
 */
export function tryInferZipPayloadCommentType(
  body: string,
  username: string,
): "tutorial" | "course" | "quiz" | null {
  const trimmed = body.trim();
  if (!trimmed) return null;

  let obj: unknown;
  try {
    obj = JSON.parse(Buffer.from(trimmed, "base64").toString());
  } catch {
    return null;
  }

  if (!isPlainRecord(obj) || !zipPayloadTopLevelKeysAreContainers(obj)) {
    return null;
  }
  if ("banners" in obj && !Array.isArray(obj.banners)) return null;
  if ("content" in obj && !Array.isArray(obj.content)) return null;
  if ("quizzes" in obj && !Array.isArray(obj.quizzes)) return null;
  if (!isValidZipTrees(obj.Trees)) {
    return null;
  }

  const content = Array.isArray(obj.content) ? obj.content : [];
  const quizzes = obj.quizzes;
  const hasQuizzes = Array.isArray(quizzes) && quizzes.length > 0;

  if (hasQuizzes) {
    try {
      parseStrict(trimmed, username, (o, u) =>
        unSignQZip(o as unknown as Parameters<typeof unSignQZip>[0], u),
      );
      return "quiz";
    } catch {
      return null;
    }
  }

  const tryTutorial = () =>
    parseStrict(trimmed, username, (o, u) =>
      unSignTZip(o as unknown as Parameters<typeof unSignTZip>[0], u),
    );

  const tryCourse = () =>
    parseStrict(trimmed, username, (o, u) =>
      unSignMZip(o as unknown as Parameters<typeof unSignMZip>[0], u),
    );

  const tryQuiz = () =>
    parseStrict(trimmed, username, (o, u) =>
      unSignQZip(o as unknown as Parameters<typeof unSignQZip>[0], u),
    );

  if (isTutorialNestedContent(content)) {
    try {
      tryTutorial();
      return "tutorial";
    } catch {
      return null;
    }
  }

  if (isCourseSlideGroupContent(content)) {
    const treeKindForContent = zipTreesLikelyKind(
      obj.Trees as Record<string, unknown>,
    );
    if (treeKindForContent === "quiz") {
      try {
        tryQuiz();
        return "quiz";
      } catch {
        /* fall through: treat as course zip */
      }
    }
    try {
      tryCourse();
      return "course";
    } catch {
      return null;
    }
  }

  if (content.length === 0) {
    const treeKind = zipTreesLikelyKind(obj.Trees as Record<string, unknown>);
    if (treeKind === null) return null;
    try {
      if (treeKind === "tutorial") tryTutorial();
      else if (treeKind === "course") tryCourse();
      else tryQuiz();
      return treeKind;
    } catch {
      return null;
    }
  }

  return null;
}

/** One segment: lowercase `t` / `c` / `q` immediately followed by a decimal integer id. */
const BANNER_CLIPBOARD_ID_SEGMENT = /^[tcq]\d+$/;

export type BannerClipboardKind = "tutorial" | "course" | "quiz";

export function formatBannerClipboardToken(
  kind: BannerClipboardKind,
  id: number,
): string {
  const prefix =
    kind === "tutorial" ? "t" : kind === "course" ? "c" : "q";
  return `${prefix}${id}`;
}

/** Parses a single clipboard segment such as `t12` or `q3`; returns null if invalid. */
export function parseBannerClipboardToken(
  segment: string,
): { kind: BannerClipboardKind; id: number } | null {
  const m = segment.trim().match(/^([tcq])(\d+)$/);
  if (!m) return null;
  const id = Number(m[2]);
  if (!Number.isFinite(id)) return null;
  const kind: BannerClipboardKind =
    m[1] === "t" ? "tutorial" : m[1] === "c" ? "course" : "quiz";
  return { kind, id };
}

/**
 * Comma‑separated segments that match {@link BANNER_CLIPBOARD_ID_SEGMENT};
 * non‑matching parts are skipped.
 */
export function parseBannerClipboardIdsFromText(text: string): string[] {
  return text
    .split(",")
    .map((p) => p.trim())
    .filter((p) => BANNER_CLIPBOARD_ID_SEGMENT.test(p));
}

/** True when `clipboardText` contains this banner’s token as a comma‑separated segment (trimmed). */
export function clipboardTextHasBannerToken(
  clipboardText: string,
  kind: BannerClipboardKind,
  id: number,
): boolean {
  const token = formatBannerClipboardToken(kind, id);
  const parts = clipboardText
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.includes(token);
}

/**
 * Clipboard reads are allowed only when the user has consented and (for banner UI) copy icons are enabled.
 */
export function clipboardReadAllowed(
  showCopyIcons: boolean,
  aquiredClipboardConsent: boolean,
): boolean {
  return showCopyIcons && aquiredClipboardConsent;
}

/**
 * Reads the clipboard and checks for {@link formatBannerClipboardToken}.
 * Returns false if unavailable, read fails, `showCopyIcons` is false, or clipboard consent was not given.
 */
export async function getClipboardHasBannerToken(
  kind: BannerClipboardKind,
  id: number,
  showCopyIcons: boolean,
  aquiredClipboardConsent: boolean,
): Promise<boolean> {
  if (!clipboardReadAllowed(showCopyIcons, aquiredClipboardConsent)) {
    return false;
  }
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return false;
  }
  try {
    const text = await navigator.clipboard.readText();
    return clipboardTextHasBannerToken(text, kind, id);
  } catch {
    return false;
  }
}

/**
 * Reads the clipboard, parses banner id tokens ({@link formatBannerClipboardToken}),
 * writes an empty string to clear it, and returns the parsed ids (e.g. `t12`, `c3`).
 * Returns [] if read fails, `navigator.clipboard` is unavailable, `showCopyIcons` is false, or clipboard consent was not given; clear failures are ignored.
 */
export async function readClipboardBannerIdsThenClear(
  showCopyIcons: boolean,
  aquiredClipboardConsent: boolean,
): Promise<string[]> {
  if (!clipboardReadAllowed(showCopyIcons, aquiredClipboardConsent)) {
    return [];
  }
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return [];
  }
  try {
    const text = await navigator.clipboard.readText();
    const ids = parseBannerClipboardIdsFromText(text);
    try {
      if (navigator.clipboard.writeText) {
        await navigator.clipboard.writeText("");
      }
    } catch {
      /* clear failed; ids still returned */
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * True when `text` is a comma‑separated list of {@link formatBannerClipboardToken} segments
 * (optional whitespace around commas). Empty / whitespace‑only is not valid for merging.
 */
export function isValidCommaSeparatedBannerClipboardIds(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((p) => BANNER_CLIPBOARD_ID_SEGMENT.test(p));
}

/**
 * If `existingClipboard` is a valid banner‑id list, appends `newToken` when missing.
 * Otherwise returns only `newToken`.
 */
export function mergeBannerClipboardText(
  existingClipboard: string,
  newToken: string,
): string {
  const trimmed = existingClipboard.trim();
  if (!trimmed || !isValidCommaSeparatedBannerClipboardIds(trimmed)) {
    return newToken;
  }
  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.includes(newToken)) return parts.join(",");
  return [...parts, newToken].join(",");
}

/**
 * Reads the clipboard (when {@link clipboardReadAllowed}), merges {@link formatBannerClipboardToken} for this banner, and writes back.
 * Skips reading the clipboard when reads are not allowed (writes only this banner’s token).
 * No‑ops when `navigator.clipboard` is unavailable (e.g. non‑secure context or SSR).
 */
export async function copyBannerIdToClipboard(
  kind: BannerClipboardKind,
  id: number,
  showCopyIcons: boolean,
  aquiredClipboardConsent: boolean,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }
  const token = formatBannerClipboardToken(kind, id);
  let existing = "";
  if (clipboardReadAllowed(showCopyIcons, aquiredClipboardConsent)) {
    try {
      if (navigator.clipboard.readText) {
        existing = await navigator.clipboard.readText();
      }
    } catch {
      existing = "";
    }
  }
  const merged = mergeBannerClipboardText(existing, token);
  await navigator.clipboard.writeText(merged);
}

/**
 * Reads the clipboard, removes this banner’s token from the comma‑separated list (if present),
 * and writes the remainder back (or an empty string when none left).
 * No‑ops when clipboard reads are not allowed.
 */
export async function removeBannerIdFromClipboard(
  kind: BannerClipboardKind,
  id: number,
  showCopyIcons: boolean,
  aquiredClipboardConsent: boolean,
): Promise<void> {
  if (!clipboardReadAllowed(showCopyIcons, aquiredClipboardConsent)) {
    return;
  }
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard?.readText ||
    !navigator.clipboard?.writeText
  ) {
    return;
  }
  const token = formatBannerClipboardToken(kind, id);
  try {
    const text = await navigator.clipboard.readText();
    const parts = text
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => p !== token);
    await navigator.clipboard.writeText(parts.join(","));
  } catch {
    /* read/write denied or unavailable */
  }
}
