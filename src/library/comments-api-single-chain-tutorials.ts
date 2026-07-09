/**
 * Comments API – single-chain query paths and payload types (TutorialsCommentsController).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

export const COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS = {
  filtersInstructionsBosses: { tutorialCommentsOnSteps: '/filters-instructions-bosses/tutorial-comments-on-steps' },
  filtersInstructionsMinions: { tutorialCommentsOnSteps: '/filters-instructions-minions/tutorial-comments-on-steps' },
  filtersInstructionsUnderbosses: { tutorialCommentsOnSteps: '/filters-instructions-underbosses/tutorial-comments-on-steps' },
  siftersDashboardsBosses: { tutorialCommentsOnQuizzes: '/sifters-dashboards-bosses/tutorial-comments-on-quizzes' },
  siftersDashboardsMinions: { tutorialCommentsOnQuizzes: '/sifters-dashboards-minions/tutorial-comments-on-quizzes' },
  siftersDashboardsUnderbosses: { tutorialCommentsOnQuizzes: '/sifters-dashboards-underbosses/tutorial-comments-on-quizzes' },
  siftersFiltersBosses: { tutorialCommentsOnBanners: '/sifters-filters-bosses/tutorial-comments-on-banners' },
  siftersFiltersMinions: { tutorialCommentsOnBanners: '/sifters-filters-minions/tutorial-comments-on-banners' },
  siftersFiltersUnderbosses: { tutorialCommentsOnBanners: '/sifters-filters-underbosses/tutorial-comments-on-banners' },
  siftersHighersiftersBosses: { tutorialCommentsOnQuestion: '/sifters-highersifters-bosses/tutorial-comments-on-question' },
  siftersHighersiftersMinions: { tutorialCommentsOnQuestion: '/sifters-highersifters-minions/tutorial-comments-on-question' },
  siftersHighersiftersUnderbosses: { tutorialCommentsOnQuestion: '/sifters-highersifters-underbosses/tutorial-comments-on-question' },
  siftersInstructionsBosses: { tutorialCommentsOnOption: '/sifters-instructions-bosses/tutorial-comments-on-option' },
  siftersInstructionsMinions: { tutorialCommentsOnOption: '/sifters-instructions-minions/tutorial-comments-on-option' },
  siftersInstructionsUnderbosses: { tutorialCommentsOnOption: '/sifters-instructions-underbosses/tutorial-comments-on-option' },
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

export interface FiltersInstructionsBossesTutorialOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsBosses: CommentContentQuery; bossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface FiltersInstructionsMinionsTutorialOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsMinions: CommentContentQuery; minionsFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface FiltersInstructionsUnderbossesTutorialOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsUnderbosses: CommentContentQuery; underbossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsBossesTutorialOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsBosses: CommentContentQuery; bossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsMinionsTutorialOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsMinions: CommentContentQuery; minionsFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsUnderbossesTutorialOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsUnderbosses: CommentContentQuery; underbossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersBossesTutorialOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersBosses: CommentContentQuery; bossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersMinionsTutorialOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersMinions: CommentContentQuery; minionsFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersUnderbossesTutorialOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersUnderbosses: CommentContentQuery; underbossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersBossesTutorialOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersBosses: CommentContentQuery; bossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersMinionsTutorialOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersMinions: CommentContentQuery; minionsFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersUnderbossesTutorialOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersUnderbosses: CommentContentQuery; underbossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsBossesTutorialOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsBosses: CommentContentQuery; bossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsMinionsTutorialOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsMinions: CommentContentQuery; minionsFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsUnderbossesTutorialOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsUnderbosses: CommentContentQuery; underbossesFilters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }

export type TutorialsSingleChainPath =
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.filtersInstructionsBosses)['tutorialCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.filtersInstructionsMinions)['tutorialCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.filtersInstructionsUnderbosses)['tutorialCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersDashboardsBosses)['tutorialCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersDashboardsMinions)['tutorialCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersDashboardsUnderbosses)['tutorialCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersFiltersBosses)['tutorialCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersFiltersMinions)['tutorialCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersFiltersUnderbosses)['tutorialCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersHighersiftersBosses)['tutorialCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersHighersiftersMinions)['tutorialCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersHighersiftersUnderbosses)['tutorialCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersInstructionsBosses)['tutorialCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersInstructionsMinions)['tutorialCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_TUTORIALS_PATHS.siftersInstructionsUnderbosses)['tutorialCommentsOnOption'];

export type TutorialsSingleChainPayload =
  | FiltersInstructionsBossesTutorialOnStepsArgs
  | FiltersInstructionsMinionsTutorialOnStepsArgs
  | FiltersInstructionsUnderbossesTutorialOnStepsArgs
  | SiftersDashboardsBossesTutorialOnQuizzesArgs
  | SiftersDashboardsMinionsTutorialOnQuizzesArgs
  | SiftersDashboardsUnderbossesTutorialOnQuizzesArgs
  | SiftersFiltersBossesTutorialOnBannersArgs
  | SiftersFiltersMinionsTutorialOnBannersArgs
  | SiftersFiltersUnderbossesTutorialOnBannersArgs
  | SiftersHighersiftersBossesTutorialOnQuestionArgs
  | SiftersHighersiftersMinionsTutorialOnQuestionArgs
  | SiftersHighersiftersUnderbossesTutorialOnQuestionArgs
  | SiftersInstructionsBossesTutorialOnOptionArgs
  | SiftersInstructionsMinionsTutorialOnOptionArgs
  | SiftersInstructionsUnderbossesTutorialOnOptionArgs;
