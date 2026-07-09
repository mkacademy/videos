/**
 * Formatter request payloads — mirrors `ca.mkcademy.gateway.model.Inputs` formatter records.
 */
export interface FormatterContent {
  records?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface QuizFormatterInput {
  content: FormatterContent;
}

export interface CourseFormatterInput {
  content: FormatterContent;
}

export interface QuestionFormatterInput {
  content: FormatterContent;
}

export interface PennantFormatterInput {
  content: FormatterContent;
}

export interface TutorialFormatterInput {
  content: FormatterContent;
}

export interface TutorsFormatterInput {
  content: FormatterContent;
}

export interface OutgoingFormatterInput {
  content: FormatterContent;
}

export interface IncomingFormatterInput {
  content: FormatterContent;
  mailer: number | null;
}
