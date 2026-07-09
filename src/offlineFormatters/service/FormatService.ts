import type { Content } from "../middleware/Flattenners";
import { content } from "../middleware/Flattenners";
import { formatContent } from "../middleware/FormatDispacther";
import type {
  CourseFormatterInput,
  FormatterContent,
  IncomingFormatterInput,
  OutgoingFormatterInput,
  PennantFormatterInput,
  QuestionFormatterInput,
  QuizFormatterInput,
  TutorialFormatterInput,
  TutorsFormatterInput,
} from "../model/Inputs";

function recordsFromContent(
  formatterContent: FormatterContent,
): Record<string, unknown> {
  const records = formatterContent.records;
  return (records as Record<string, unknown>) ?? {};
}

function contentFromFormatterContent(formatterContent: FormatterContent): Content {
  return content(recordsFromContent(formatterContent), {});
}

function contentFromFormatterContentNullableRecords(
  formatterContent: FormatterContent,
): Content {
  const recordsData = formatterContent.records;
  const records =
    recordsData != null ? (recordsData as Record<string, unknown>) : {};
  return content(records, {});
}

export function quizFormatter(
  request: QuizFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContent(request.content),
    "quiz",
    "quiz",
    {},
    null,
  );
}

export function courseFormatter(
  request: CourseFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContent(request.content),
    "course",
    "course",
    {},
    null,
  );
}

export function tutorialFormatter(
  request: TutorialFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContent(request.content),
    "tutorial",
    "tutorial",
    {},
    null,
  );
}

export function tutorsFormatter(
  request: TutorsFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContent(request.content),
    "tutors",
    "tutors",
    {},
    null,
  );
}

export function outgoingFormatter(
  request: OutgoingFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContentNullableRecords(request.content),
    "outgoing",
    "outgoing",
    {},
    null,
  );
}

export function incomingFormatter(
  request: IncomingFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContentNullableRecords(request.content),
    "incoming",
    "incoming",
    {},
    request.mailer,
  );
}

export function questionFormatter(
  request: QuestionFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContent(request.content),
    "question",
    "question",
    {},
    null,
  );
}

export function pennantFormatter(
  request: PennantFormatterInput,
): Record<string, unknown> {
  return formatContent(
    contentFromFormatterContent(request.content),
    "pennant",
    "pennant",
    {},
    null,
  );
}
