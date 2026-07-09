/**
 * Comments API – tutorial-focused mutation paths and payload types (TutorialsCommentsController).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

export const COMMENTS_MUTATION_PATHS = {
  quiz: {
    setBossTutorialOnQuizzes: '/quiz/set-boss-tutorial-on-quizzes',
    setMinionTutorialOnQuizzes: '/quiz/set-minion-tutorial-on-quizzes',
    setUnderbossTutorialOnQuizzes: '/quiz/set-underboss-tutorial-on-quizzes',
  },
  course: {
    setBossTutorialOnBanners: '/course/set-boss-tutorial-on-banners',
    setMinionTutorialOnBanners: '/course/set-minion-tutorial-on-banners',
    setUnderbossTutorialOnBanners: '/course/set-underboss-tutorial-on-banners',
    setBossTutorialOnCovers: '/course/set-boss-tutorial-on-covers',
    setMinionTutorialOnCovers: '/course/set-minion-tutorial-on-covers',
    setUnderbossTutorialOnCovers: '/course/set-underboss-tutorial-on-covers',
  },
  tutorial: {
    setBossTutorialOnBanners: '/tutorial/set-boss-tutorial-on-banners',
    setMinionTutorialOnBanners: '/tutorial/set-minion-tutorial-on-banners',
    setUnderbossTutorialOnBanners: '/tutorial/set-underboss-tutorial-on-banners',
    setBossTutorialOnSteps: '/tutorial/set-boss-tutorial-on-steps',
    setMinionTutorialOnSteps: '/tutorial/set-minion-tutorial-on-steps',
    setUnderbossTutorialOnSteps: '/tutorial/set-underboss-tutorial-on-steps',
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

export interface TutorialOnTutorialBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersfilters: CommentContentInputs | null;
  filtersRole: CommentContentInputs | null;
  roleFilters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface TutorialOnStepArgs {
  quota: number | null;
  siftersfilters: CommentContentInputs | null;
  filtersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleFilters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface TutorialOnCourseBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftershighersifters: CommentContentInputs | null;
  siftersRole: CommentContentInputs | null;
  roleFilters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface TutorialOnCoverArgs {
  quota: number | null;
  siftersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleFilters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface TutorialOnQuizArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersdashboards: CommentContentInputs | null;
  dashboardsRole: CommentContentInputs | null;
  roleFilters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface TutorialsMutationApiRequestArgs {
  quiz: {
    setBossTutorialOnQuizzes: TutorialOnQuizArgs;
    setMinionTutorialOnQuizzes: TutorialOnQuizArgs;
    setUnderbossTutorialOnQuizzes: TutorialOnQuizArgs;
  };
  course: {
    setBossTutorialOnBanners: TutorialOnCourseBannerArgs;
    setMinionTutorialOnBanners: TutorialOnCourseBannerArgs;
    setUnderbossTutorialOnBanners: TutorialOnCourseBannerArgs;
    setBossTutorialOnCovers: TutorialOnCoverArgs;
    setMinionTutorialOnCovers: TutorialOnCoverArgs;
    setUnderbossTutorialOnCovers: TutorialOnCoverArgs;
  };
  tutorial: {
    setBossTutorialOnBanners: TutorialOnTutorialBannerArgs;
    setMinionTutorialOnBanners: TutorialOnTutorialBannerArgs;
    setUnderbossTutorialOnBanners: TutorialOnTutorialBannerArgs;
    setBossTutorialOnSteps: TutorialOnStepArgs;
    setMinionTutorialOnSteps: TutorialOnStepArgs;
    setUnderbossTutorialOnSteps: TutorialOnStepArgs;
  };
}

export type TutorialsMutationPath =
  | (typeof COMMENTS_MUTATION_PATHS.course)[keyof typeof COMMENTS_MUTATION_PATHS.course]
  | (typeof COMMENTS_MUTATION_PATHS.tutorial)[keyof typeof COMMENTS_MUTATION_PATHS.tutorial]
  | (typeof COMMENTS_MUTATION_PATHS.quiz)[keyof typeof COMMENTS_MUTATION_PATHS.quiz];

export type TutorialsMutationPayload =
  | TutorialsMutationApiRequestArgs['course'][keyof TutorialsMutationApiRequestArgs['course']]
  | TutorialsMutationApiRequestArgs['tutorial'][keyof TutorialsMutationApiRequestArgs['tutorial']]
  | TutorialsMutationApiRequestArgs['quiz'][keyof TutorialsMutationApiRequestArgs['quiz']];
