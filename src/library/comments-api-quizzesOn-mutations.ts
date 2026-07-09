/**
 * Comments API – quiz-focused mutation paths and payload types (QuizzesCommentsController).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

export const COMMENTS_MUTATION_PATHS = {
  quiz: {
    setBossQuizzOnQuizzes: '/quiz/set-boss-quizz-on-quizzes',
    setMinionQuizzOnQuizzes: '/quiz/set-minion-quizz-on-quizzes',
    setUnderbossQuizzOnQuizzes: '/quiz/set-underboss-quizz-on-quizzes',
  },
  course: {
    setBossQuizzOnBanners: '/course/set-boss-quizz-on-banners',
    setMinionQuizzOnBanners: '/course/set-minion-quizz-on-banners',
    setUnderbossQuizzOnBanners: '/course/set-underboss-quizz-on-banners',
    setBossQuizzOnCovers: '/course/set-boss-quizz-on-covers',
    setMinionQuizzOnCovers: '/course/set-minion-quizz-on-covers',
    setUnderbossQuizzOnCovers: '/course/set-underboss-quizz-on-covers',
  },
  tutorial: {
    setBossQuizzOnBanners: '/tutorial/set-boss-quizz-on-banners',
    setMinionQuizzOnBanners: '/tutorial/set-minion-quizz-on-banners',
    setUnderbossQuizzOnBanners: '/tutorial/set-underboss-quizz-on-banners',
    setBossQuizzOnSteps: '/tutorial/set-boss-quizz-on-steps',
    setMinionQuizzOnSteps: '/tutorial/set-minion-quizz-on-steps',
    setUnderbossQuizzOnSteps: '/tutorial/set-underboss-quizz-on-steps',
  },
} as const;

export interface CommentContentInputs {
  visibility?: string | null;
  texts?: string[] | null;
  childIds?: number[] | null;
  parentIds?: number[] | null;
  statuses?: number[] | null;
  groups?: number[] | null;
  ordinals?: number[] | null;
}

export interface QuizOnQuizArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersdashboards: CommentContentInputs | null;
  dashboardsRole: CommentContentInputs | null;
  roleDashboards: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface QuizzOnCourseBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftershighersifters: CommentContentInputs | null;
  siftersRole: CommentContentInputs | null;
  roleDashboards: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface QuizzOnCoverArgs {
  quota: number | null;
  siftersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleDashboards: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface QuizzOnTutorialBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersfilters: CommentContentInputs | null;
  filtersRole: CommentContentInputs | null;
  roleDashboards: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface QuizzOnStepArgs {
  quota: number | null;
  siftersfilters: CommentContentInputs | null;
  filtersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleDashboards: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface QuizzesMutationApiRequestArgs {
  quiz: {
    setBossQuizzOnQuizzes: QuizOnQuizArgs;
    setMinionQuizzOnQuizzes: QuizOnQuizArgs;
    setUnderbossQuizzOnQuizzes: QuizOnQuizArgs;
  };
  course: {
    setBossQuizzOnBanners: QuizzOnCourseBannerArgs;
    setMinionQuizzOnBanners: QuizzOnCourseBannerArgs;
    setUnderbossQuizzOnBanners: QuizzOnCourseBannerArgs;
    setBossQuizzOnCovers: QuizzOnCoverArgs;
    setMinionQuizzOnCovers: QuizzOnCoverArgs;
    setUnderbossQuizzOnCovers: QuizzOnCoverArgs;
  };
  tutorial: {
    setBossQuizzOnBanners: QuizzOnTutorialBannerArgs;
    setMinionQuizzOnBanners: QuizzOnTutorialBannerArgs;
    setUnderbossQuizzOnBanners: QuizzOnTutorialBannerArgs;
    setBossQuizzOnSteps: QuizzOnStepArgs;
    setMinionQuizzOnSteps: QuizzOnStepArgs;
    setUnderbossQuizzOnSteps: QuizzOnStepArgs;
  };
}

export type QuizzesMutationPath =
  | (typeof COMMENTS_MUTATION_PATHS.course)[keyof typeof COMMENTS_MUTATION_PATHS.course]
  | (typeof COMMENTS_MUTATION_PATHS.tutorial)[keyof typeof COMMENTS_MUTATION_PATHS.tutorial]
  | (typeof COMMENTS_MUTATION_PATHS.quiz)[keyof typeof COMMENTS_MUTATION_PATHS.quiz];

export type QuizzesMutationPayload =
  | QuizzesMutationApiRequestArgs['course'][keyof QuizzesMutationApiRequestArgs['course']]
  | QuizzesMutationApiRequestArgs['tutorial'][keyof QuizzesMutationApiRequestArgs['tutorial']]
  | QuizzesMutationApiRequestArgs['quiz'][keyof QuizzesMutationApiRequestArgs['quiz']];
