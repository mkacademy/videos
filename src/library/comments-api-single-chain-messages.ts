/**
 * Comments API – single-chain query paths and payload types (CommentsController message-comments-on-* +
 * matching Java *Pojos records for tutorial/quiz/course chains).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

/** Paths implemented on CommentsController (message-comments-on-* only). */
export const COMMENTS_SINGLE_CHAIN_PATHS = {
  filtersInstructionsBosses: {
    messageCommentsOnSteps: '/filters-instructions-bosses/message-comments-on-steps',
  },
  filtersInstructionsMinions: {
    messageCommentsOnSteps: '/filters-instructions-minions/message-comments-on-steps',
  },
  filtersInstructionsUnderbosses: {
    messageCommentsOnSteps: '/filters-instructions-underbosses/message-comments-on-steps',
  },
  siftersDashboardsBosses: {
    messageCommentsOnQuizzes: '/sifters-dashboards-bosses/message-comments-on-quizzes',
  },
  siftersDashboardsMinions: {
    messageCommentsOnQuizzes: '/sifters-dashboards-minions/message-comments-on-quizzes',
  },
  siftersDashboardsUnderbosses: {
    messageCommentsOnQuizzes: '/sifters-dashboards-underbosses/message-comments-on-quizzes',
  },
  siftersFiltersBosses: {
    messageCommentsOnBanners: '/sifters-filters-bosses/message-comments-on-banners',
  },
  siftersFiltersMinions: {
    messageCommentsOnBanners: '/sifters-filters-minions/message-comments-on-banners',
  },
  siftersFiltersUnderbosses: {
    messageCommentsOnBanners: '/sifters-filters-underbosses/message-comments-on-banners',
  },
  siftersHighersiftersBosses: {
    messageCommentsOnQuestion: '/sifters-highersifters-bosses/message-comments-on-question',
  },
  siftersHighersiftersMinions: {
    messageCommentsOnQuestion: '/sifters-highersifters-minions/message-comments-on-question',
  },
  siftersHighersiftersUnderbosses: {
    messageCommentsOnQuestion: '/sifters-highersifters-underbosses/message-comments-on-question',
  },
  siftersInstructionsBosses: {
    messageCommentsOnOption: '/sifters-instructions-bosses/message-comments-on-option',
  },
  siftersInstructionsMinions: {
    messageCommentsOnOption: '/sifters-instructions-minions/message-comments-on-option',
  },
  siftersInstructionsUnderbosses: {
    messageCommentsOnOption: '/sifters-instructions-underbosses/message-comments-on-option',
  },
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

// --- FiltersInstructions* – onSteps (bosses / minions / underbosses) ---

export interface FiltersInstructionsBossesMessageOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsBossesTutorialOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsBossesQuizOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsBossesCourseOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsMinionsMessageOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsMinionsTutorialOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsMinionsQuizOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsMinionsCourseOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsUnderbossesMessageOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsUnderbossesTutorialOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsUnderbossesQuizOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface FiltersInstructionsUnderbossesCourseOnStepsArgs {
  filtersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- SiftersDashboards* – onQuizzes ---

export interface SiftersDashboardsBossesMessageOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsBossesTutorialOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsBosses: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsBossesQuizOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsBossesCourseOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsBosses: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsMinionsMessageOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsMinionsTutorialOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsMinions: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsMinionsQuizOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsMinionsCourseOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsMinions: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsUnderbossesMessageOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsUnderbossesTutorialOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsUnderbosses: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsUnderbossesQuizOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersDashboardsUnderbossesCourseOnQuizzesArgs {
  siftersLowersifters: CommentContentQuery;
  siftersDashboards: CommentContentQuery;
  dashboardsUnderbosses: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- SiftersFilters* – onBanners ---

export interface SiftersFiltersBossesMessageOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersBossesTutorialOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersBosses: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersBossesQuizOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersBossesCourseOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersBosses: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersMinionsMessageOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersMinionsTutorialOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersMinions: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersMinionsQuizOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersMinionsCourseOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersMinions: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersUnderbossesMessageOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersUnderbossesTutorialOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersUnderbosses: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersUnderbossesQuizOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersFiltersUnderbossesCourseOnBannersArgs {
  siftersLowersifters: CommentContentQuery;
  siftersFilters: CommentContentQuery;
  filtersUnderbosses: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- SiftersHighersifters* – onQuestion ---

export interface SiftersHighersiftersBossesMessageOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersBossesTutorialOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersBosses: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersBossesQuizOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersBossesCourseOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersBosses: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersMinionsMessageOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersMinionsTutorialOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersMinions: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersMinionsQuizOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersMinionsCourseOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersMinions: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersUnderbossesMessageOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersUnderbossesTutorialOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersUnderbosses: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersUnderbossesQuizOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersHighersiftersUnderbossesCourseOnQuestionArgs {
  siftersLowersifters: CommentContentQuery;
  siftersHighersifters: CommentContentQuery;
  siftersUnderbosses: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- SiftersInstructions* – onOption ---

export interface SiftersInstructionsBossesMessageOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsBossesTutorialOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsBossesQuizOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsBossesCourseOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsBosses: CommentContentQuery;
  bossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsMinionsMessageOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsMinionsTutorialOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsMinionsQuizOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsMinionsCourseOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsMinions: CommentContentQuery;
  minionsSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsUnderbossesMessageOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesInstructions: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsUnderbossesTutorialOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesFilters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsUnderbossesQuizOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesDashboards: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface SiftersInstructionsUnderbossesCourseOnOptionArgs {
  siftersInstructions: CommentContentQuery;
  instructionsUnderbosses: CommentContentQuery;
  underbossesSifters: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export type CommentsSingleChainPath =
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.filtersInstructionsBosses)['messageCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.filtersInstructionsMinions)['messageCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.filtersInstructionsUnderbosses)['messageCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersDashboardsBosses)['messageCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersDashboardsMinions)['messageCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersDashboardsUnderbosses)['messageCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersFiltersBosses)['messageCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersFiltersMinions)['messageCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersFiltersUnderbosses)['messageCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersHighersiftersBosses)['messageCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersHighersiftersMinions)['messageCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersHighersiftersUnderbosses)['messageCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersInstructionsBosses)['messageCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersInstructionsMinions)['messageCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_PATHS.siftersInstructionsUnderbosses)['messageCommentsOnOption'];

export type CommentsSingleChainPayload =
  | FiltersInstructionsBossesMessageOnStepsArgs
  | FiltersInstructionsBossesTutorialOnStepsArgs
  | FiltersInstructionsBossesQuizOnStepsArgs
  | FiltersInstructionsBossesCourseOnStepsArgs
  | FiltersInstructionsMinionsMessageOnStepsArgs
  | FiltersInstructionsMinionsTutorialOnStepsArgs
  | FiltersInstructionsMinionsQuizOnStepsArgs
  | FiltersInstructionsMinionsCourseOnStepsArgs
  | FiltersInstructionsUnderbossesMessageOnStepsArgs
  | FiltersInstructionsUnderbossesTutorialOnStepsArgs
  | FiltersInstructionsUnderbossesQuizOnStepsArgs
  | FiltersInstructionsUnderbossesCourseOnStepsArgs
  | SiftersDashboardsBossesMessageOnQuizzesArgs
  | SiftersDashboardsBossesTutorialOnQuizzesArgs
  | SiftersDashboardsBossesQuizOnQuizzesArgs
  | SiftersDashboardsBossesCourseOnQuizzesArgs
  | SiftersDashboardsMinionsMessageOnQuizzesArgs
  | SiftersDashboardsMinionsTutorialOnQuizzesArgs
  | SiftersDashboardsMinionsQuizOnQuizzesArgs
  | SiftersDashboardsMinionsCourseOnQuizzesArgs
  | SiftersDashboardsUnderbossesMessageOnQuizzesArgs
  | SiftersDashboardsUnderbossesTutorialOnQuizzesArgs
  | SiftersDashboardsUnderbossesQuizOnQuizzesArgs
  | SiftersDashboardsUnderbossesCourseOnQuizzesArgs
  | SiftersFiltersBossesMessageOnBannersArgs
  | SiftersFiltersBossesTutorialOnBannersArgs
  | SiftersFiltersBossesQuizOnBannersArgs
  | SiftersFiltersBossesCourseOnBannersArgs
  | SiftersFiltersMinionsMessageOnBannersArgs
  | SiftersFiltersMinionsTutorialOnBannersArgs
  | SiftersFiltersMinionsQuizOnBannersArgs
  | SiftersFiltersMinionsCourseOnBannersArgs
  | SiftersFiltersUnderbossesMessageOnBannersArgs
  | SiftersFiltersUnderbossesTutorialOnBannersArgs
  | SiftersFiltersUnderbossesQuizOnBannersArgs
  | SiftersFiltersUnderbossesCourseOnBannersArgs
  | SiftersHighersiftersBossesMessageOnQuestionArgs
  | SiftersHighersiftersBossesTutorialOnQuestionArgs
  | SiftersHighersiftersBossesQuizOnQuestionArgs
  | SiftersHighersiftersBossesCourseOnQuestionArgs
  | SiftersHighersiftersMinionsMessageOnQuestionArgs
  | SiftersHighersiftersMinionsTutorialOnQuestionArgs
  | SiftersHighersiftersMinionsQuizOnQuestionArgs
  | SiftersHighersiftersMinionsCourseOnQuestionArgs
  | SiftersHighersiftersUnderbossesMessageOnQuestionArgs
  | SiftersHighersiftersUnderbossesTutorialOnQuestionArgs
  | SiftersHighersiftersUnderbossesQuizOnQuestionArgs
  | SiftersHighersiftersUnderbossesCourseOnQuestionArgs
  | SiftersInstructionsBossesMessageOnOptionArgs
  | SiftersInstructionsBossesTutorialOnOptionArgs
  | SiftersInstructionsBossesQuizOnOptionArgs
  | SiftersInstructionsBossesCourseOnOptionArgs
  | SiftersInstructionsMinionsMessageOnOptionArgs
  | SiftersInstructionsMinionsTutorialOnOptionArgs
  | SiftersInstructionsMinionsQuizOnOptionArgs
  | SiftersInstructionsMinionsCourseOnOptionArgs
  | SiftersInstructionsUnderbossesMessageOnOptionArgs
  | SiftersInstructionsUnderbossesTutorialOnOptionArgs
  | SiftersInstructionsUnderbossesQuizOnOptionArgs
  | SiftersInstructionsUnderbossesCourseOnOptionArgs;
