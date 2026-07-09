import type { Content, FlattenResult } from "./Flattenners";
import { content } from "./Flattenners";
import { QuizPncFlattener } from "./Flattenners/QuizPncFlattener";
import { CpanelFormatter } from "./Formatters/CpanelFormatter";
import { CourseFormatter } from "./Formatters/CourseFormatter";
import { IncoimngFormatter } from "./Formatters/IncoimngFormatter";
import { OutgoingFormatter } from "./Formatters/OutgoingFormatter";
import { PennantFormatter } from "./Formatters/PennantFormatter";
import { QuestionFormatter } from "./Formatters/QuestionFormatter";
import { QuizFormatter } from "./Formatters/QuizFormatter";
import { TutorialFormater } from "./Formatters/TutorialFormater";
import { TutorsFormatter } from "./Formatters/TutorsFormatter";

const TRAILING_DIGITS = /^(.+?)(\d+)$/;

export function formatContentWithAliasedKeys(
  input: Content,
  convolution: string,
  formatter: string,
): Record<string, unknown> {
  const conv = formatter?.toLowerCase() ?? "";
  if (conv !== "tutorial" && conv !== "course" && conv !== "quiz") {
    throw new Error(
      `formatContentWithAliasedKeys only supports tutorial, course, quiz: ${formatter}`,
    );
  }
  const merged = mergeDisambiguatedContent(input);
  const webapp = convolution?.toLowerCase() ?? "";
  switch (conv) {
    case "tutorial":
      return formatAliasedTutorial(webapp, merged);
    case "course":
      return formatAliasedCourse(webapp, merged);
    case "quiz":
      return formatAliasedQuiz(webapp, merged);
    default:
      throw new Error(
        `formatContentWithAliasedKeys only supports tutorial, course, quiz: ${formatter}`,
      );
  }
}

function formatAliasedTutorial(
  webapp: string,
  merged: Content,
): Record<string, unknown> {
  const cpanel = CpanelFormatter.format(webapp, merged);
  const r = TutorialFormater.format(
    content(cpanel.content, cpanel.counts),
  );
  return {
    content: r.content,
    banners: r.banners,
    counts: r.counts,
  };
}

function formatAliasedCourse(
  webapp: string,
  merged: Content,
): Record<string, unknown> {
  const cpanel = CpanelFormatter.format(webapp, merged);
  const r = CourseFormatter.format(
    CourseFormatter.FormatOptions.of(content(cpanel.content, cpanel.counts)),
  );
  return {
    content: r.content,
    banners: r.banners,
    counts: r.counts,
  };
}

function formatAliasedQuiz(
  webapp: string,
  merged: Content,
): Record<string, unknown> {
  const cpanelResult = CpanelFormatter.format(webapp, merged);
  const records = cpanelResult.content;
  const counts = cpanelResult.counts;
  const preFlattened = QuizPncFlattener.preFlatten(content(records, counts));
  const combinedRecords = { ...records, ...preFlattened.records };
  const newContent = content(combinedRecords, counts);
  const course = CourseFormatter.format(CourseFormatter.FormatOptions.of(newContent));
  const quiz = QuizFormatter.format(newContent);
  return {
    content: course.content,
    banners: course.banners,
    quizzes: quiz.quizzes,
    counts: combineMaps(course.counts, quiz.counts),
  };
}

function mergeDisambiguatedContent(input: Content): Content {
  const records = input.records ?? {};
  const counts = input.counts ?? {};
  const mergedRecords = mergeDisambiguatedBranches(records) as Record<string, unknown>;
  const mergedCounts = mergeDisambiguatedBranches(counts) as Record<string, unknown>;
  return content(mergedRecords, mergedCounts);
}

function mergeDisambiguatedBranches(obj: unknown): unknown {
  if (obj != null && typeof obj === "object" && !Array.isArray(obj)) {
    const rawMap = obj as Record<string, unknown>;
    const step: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawMap)) {
      step[key] = mergeDisambiguatedBranches(value);
    }
    return mergeGroupedResolverSiblings(step);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => mergeDisambiguatedBranches(item));
  }
  return obj;
}

function mergeGroupedResolverSiblings(
  map: Record<string, unknown>,
): Record<string, unknown> {
  const basesToMerge = new Set<string>();
  for (const key of Object.keys(map)) {
    const base = resolverBaseFromDisambiguatedKey(key);
    if (base != null) {
      basesToMerge.add(base);
    }
  }
  const out: Record<string, unknown> = {};
  const consumedKeys = new Set<string>();
  for (const base of basesToMerge) {
    const parts: unknown[] = [];
    for (const [k, value] of Object.entries(map)) {
      if (k === base || base === resolverBaseFromDisambiguatedKey(k)) {
        parts.push(value);
        consumedKeys.add(k);
      }
    }
    out[base] = mergeDeepList(parts);
  }
  for (const [k, value] of Object.entries(map)) {
    if (!consumedKeys.has(k)) {
      out[k] = value;
    }
  }
  return out;
}

function resolverBaseFromDisambiguatedKey(key: string | null | undefined): string | null {
  if (key == null || key === "") {
    return null;
  }
  const m = key.match(TRAILING_DIGITS);
  if (!m) {
    return null;
  }
  const base = m[1];
  return base === "" ? null : base;
}

function mergeDeepList(parts: unknown[]): unknown {
  let acc: unknown = null;
  for (const p of parts) {
    acc = deepMergeValues(acc, p);
  }
  return acc ?? {};
}

function deepMergeValues(a: unknown, b: unknown): unknown {
  if (b == null) {
    return a;
  }
  if (a == null) {
    return b;
  }
  if (
    a != null &&
    typeof a === "object" &&
    !Array.isArray(a) &&
    b != null &&
    typeof b === "object" &&
    !Array.isArray(b)
  ) {
    const merged: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
      merged[k] = v;
    }
    for (const [k, v] of Object.entries(b as Record<string, unknown>)) {
      if (k in merged) {
        merged[k] = deepMergeValues(merged[k], v);
      } else {
        merged[k] = v;
      }
    }
    return merged;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...a, ...b];
  }
  return b;
}

export function formatContent(
  input: Content,
  webapp: string,
  formatter: string,
  executedQueries: Record<string, unknown>,
  mailer: number | null | undefined,
): Record<string, unknown> {
  switch (formatter) {
    case "quiz": {
      const cpanelResult = CpanelFormatter.format(webapp, input);
      const records = cpanelResult.content;
      const counts = cpanelResult.counts;
      const preFlattened = QuizPncFlattener.preFlatten(content(records, counts));
      const combinedRecords = { ...records, ...preFlattened.records };
      const newContent = content(combinedRecords, counts);
      const course = CourseFormatter.format(CourseFormatter.FormatOptions.of(newContent));
      const quiz = QuizFormatter.format(newContent);
      return {
        quizzes: quiz.quizzes,
        banners: course.banners,
        content: course.content,
        counts: combineMaps(course.counts, quiz.counts),
        handlers: combineMaps(course.handlers, quiz.handlers),
        executedQueries,
      };
    }
    case "tutorial": {
      const cpanelResult = CpanelFormatter.format(webapp, input);
      const result = TutorialFormater.format(
        content(cpanelResult.content, cpanelResult.counts),
      );
      return {
        handlers: result.handlers,
        banners: result.banners,
        content: result.content,
        counts: result.counts,
        executedQueries,
      };
    }
    case "course": {
      const cpanelResult = CpanelFormatter.format(webapp, input);
      const result = CourseFormatter.format(
        CourseFormatter.FormatOptions.of(
          content(cpanelResult.content, cpanelResult.counts),
        ),
      );
      return {
        handlers: result.handlers,
        banners: result.banners,
        content: result.content,
        counts: result.counts,
        executedQueries,
      };
    }
    case "cpanel": {
      const result: FlattenResult = CpanelFormatter.format(webapp, input);
      return {
        counts: result.counts,
        content: result.content,
        executedQueries,
        handlers: CpanelFormatter.handlers(webapp, result),
      };
    }
    case "incoming": {
      const result = IncoimngFormatter.format(input, mailer ?? null);
      return {
        content: result.content,
        counts: result.counts,
        executedQueries,
      };
    }
    case "outgoing": {
      const result = OutgoingFormatter.format(input);
      return {
        content: result.content,
        handlers: result.handlers,
        counts: result.counts,
        executedQueries,
      };
    }
    case "tutors": {
      const result = TutorsFormatter.format(input);
      return {
        content: result.content,
        counts: result.counts,
        executedQueries,
      };
    }
    case "question": {
      const result = QuestionFormatter.formatFromContent(input);
      return {
        banners: result.banners,
        handlers: result.handlers,
        executedQueries,
      };
    }
    case "pennant": {
      const result = PennantFormatter.formatFromContent(input);
      return {
        handlers: result.handlers,
        banners: result.banners,
        content: result.content,
        executedQueries,
      };
    }
    default:
      throw new Error(`No webapp formatter for ${webapp}`);
  }
}

function combineMaps(
  map1: Record<string, unknown> | null | undefined,
  map2: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return { ...(map1 ?? {}), ...(map2 ?? {}) };
}
