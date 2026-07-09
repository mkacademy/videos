/**
 * Comments API – single-chain query paths and payload types (QuizzesCommentsController).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

export const COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS = {
  filtersInstructionsBosses: { quizCommentsOnSteps: '/filters-instructions-bosses/quiz-comments-on-steps' },
  filtersInstructionsMinions: { quizCommentsOnSteps: '/filters-instructions-minions/quiz-comments-on-steps' },
  filtersInstructionsUnderbosses: { quizCommentsOnSteps: '/filters-instructions-underbosses/quiz-comments-on-steps' },
  siftersDashboardsBosses: { quizCommentsOnQuizzes: '/sifters-dashboards-bosses/quiz-comments-on-quizzes' },
  siftersDashboardsMinions: { quizCommentsOnQuizzes: '/sifters-dashboards-minions/quiz-comments-on-quizzes' },
  siftersDashboardsUnderbosses: { quizCommentsOnQuizzes: '/sifters-dashboards-underbosses/quiz-comments-on-quizzes' },
  siftersFiltersBosses: { quizCommentsOnBanners: '/sifters-filters-bosses/quiz-comments-on-banners' },
  siftersFiltersMinions: { quizCommentsOnBanners: '/sifters-filters-minions/quiz-comments-on-banners' },
  siftersFiltersUnderbosses: { quizCommentsOnBanners: '/sifters-filters-underbosses/quiz-comments-on-banners' },
  siftersHighersiftersBosses: { quizCommentsOnQuestion: '/sifters-highersifters-bosses/quiz-comments-on-question' },
  siftersHighersiftersMinions: { quizCommentsOnQuestion: '/sifters-highersifters-minions/quiz-comments-on-question' },
  siftersHighersiftersUnderbosses: { quizCommentsOnQuestion: '/sifters-highersifters-underbosses/quiz-comments-on-question' },
  siftersInstructionsBosses: { quizCommentsOnOption: '/sifters-instructions-bosses/quiz-comments-on-option' },
  siftersInstructionsMinions: { quizCommentsOnOption: '/sifters-instructions-minions/quiz-comments-on-option' },
  siftersInstructionsUnderbosses: { quizCommentsOnOption: '/sifters-instructions-underbosses/quiz-comments-on-option' },
} as const;

export interface CommentContentQuery {
  take?: number | null;
  skip?: number | null;
  search?: string | null;
  isMutating?: boolean | null;
  childIds?: number[] | null;
  parentIds?: number[] | null;
  isPrivateView?: boolean | null;
}

export interface FiltersInstructionsBossesQuizOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsBosses: CommentContentQuery; bossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface FiltersInstructionsMinionsQuizOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsMinions: CommentContentQuery; minionsDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface FiltersInstructionsUnderbossesQuizOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsUnderbosses: CommentContentQuery; underbossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsBossesQuizOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsBosses: CommentContentQuery; bossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsMinionsQuizOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsMinions: CommentContentQuery; minionsDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsUnderbossesQuizOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsUnderbosses: CommentContentQuery; underbossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersBossesQuizOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersBosses: CommentContentQuery; bossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersMinionsQuizOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersMinions: CommentContentQuery; minionsDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersUnderbossesQuizOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersUnderbosses: CommentContentQuery; underbossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersBossesQuizOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersBosses: CommentContentQuery; bossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersMinionsQuizOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersMinions: CommentContentQuery; minionsDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersUnderbossesQuizOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersUnderbosses: CommentContentQuery; underbossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsBossesQuizOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsBosses: CommentContentQuery; bossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsMinionsQuizOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsMinions: CommentContentQuery; minionsDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsUnderbossesQuizOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsUnderbosses: CommentContentQuery; underbossesDashboards: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }

export type QuizzesSingleChainPath =
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.filtersInstructionsBosses)['quizCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.filtersInstructionsMinions)['quizCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.filtersInstructionsUnderbosses)['quizCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersDashboardsBosses)['quizCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersDashboardsMinions)['quizCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersDashboardsUnderbosses)['quizCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersFiltersBosses)['quizCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersFiltersMinions)['quizCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersFiltersUnderbosses)['quizCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersHighersiftersBosses)['quizCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersHighersiftersMinions)['quizCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersHighersiftersUnderbosses)['quizCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersInstructionsBosses)['quizCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersInstructionsMinions)['quizCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_QUIZZES_PATHS.siftersInstructionsUnderbosses)['quizCommentsOnOption'];

export type QuizzesSingleChainPayload =
  | FiltersInstructionsBossesQuizOnStepsArgs
  | FiltersInstructionsMinionsQuizOnStepsArgs
  | FiltersInstructionsUnderbossesQuizOnStepsArgs
  | SiftersDashboardsBossesQuizOnQuizzesArgs
  | SiftersDashboardsMinionsQuizOnQuizzesArgs
  | SiftersDashboardsUnderbossesQuizOnQuizzesArgs
  | SiftersFiltersBossesQuizOnBannersArgs
  | SiftersFiltersMinionsQuizOnBannersArgs
  | SiftersFiltersUnderbossesQuizOnBannersArgs
  | SiftersHighersiftersBossesQuizOnQuestionArgs
  | SiftersHighersiftersMinionsQuizOnQuestionArgs
  | SiftersHighersiftersUnderbossesQuizOnQuestionArgs
  | SiftersInstructionsBossesQuizOnOptionArgs
  | SiftersInstructionsMinionsQuizOnOptionArgs
  | SiftersInstructionsUnderbossesQuizOnOptionArgs;
