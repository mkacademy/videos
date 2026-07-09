/**
 * Comments API – single-chain query paths and payload types (CoursesCommentsController).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

export const COMMENTS_SINGLE_CHAIN_COURSES_PATHS = {
  filtersInstructionsBosses: { courseCommentsOnSteps: '/filters-instructions-bosses/course-comments-on-steps' },
  filtersInstructionsMinions: { courseCommentsOnSteps: '/filters-instructions-minions/course-comments-on-steps' },
  filtersInstructionsUnderbosses: { courseCommentsOnSteps: '/filters-instructions-underbosses/course-comments-on-steps' },
  siftersDashboardsBosses: { courseCommentsOnQuizzes: '/sifters-dashboards-bosses/course-comments-on-quizzes' },
  siftersDashboardsMinions: { courseCommentsOnQuizzes: '/sifters-dashboards-minions/course-comments-on-quizzes' },
  siftersDashboardsUnderbosses: { courseCommentsOnQuizzes: '/sifters-dashboards-underbosses/course-comments-on-quizzes' },
  siftersFiltersBosses: { courseCommentsOnBanners: '/sifters-filters-bosses/course-comments-on-banners' },
  siftersFiltersMinions: { courseCommentsOnBanners: '/sifters-filters-minions/course-comments-on-banners' },
  siftersFiltersUnderbosses: { courseCommentsOnBanners: '/sifters-filters-underbosses/course-comments-on-banners' },
  siftersHighersiftersBosses: { courseCommentsOnQuestion: '/sifters-highersifters-bosses/course-comments-on-question' },
  siftersHighersiftersMinions: { courseCommentsOnQuestion: '/sifters-highersifters-minions/course-comments-on-question' },
  siftersHighersiftersUnderbosses: { courseCommentsOnQuestion: '/sifters-highersifters-underbosses/course-comments-on-question' },
  siftersInstructionsBosses: { courseCommentsOnOption: '/sifters-instructions-bosses/course-comments-on-option' },
  siftersInstructionsMinions: { courseCommentsOnOption: '/sifters-instructions-minions/course-comments-on-option' },
  siftersInstructionsUnderbosses: { courseCommentsOnOption: '/sifters-instructions-underbosses/course-comments-on-option' },
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

export interface FiltersInstructionsBossesCourseOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsBosses: CommentContentQuery; bossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface FiltersInstructionsMinionsCourseOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsMinions: CommentContentQuery; minionsSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface FiltersInstructionsUnderbossesCourseOnStepsArgs { filtersInstructions: CommentContentQuery; instructionsUnderbosses: CommentContentQuery; underbossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsBossesCourseOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsBosses: CommentContentQuery; bossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsMinionsCourseOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsMinions: CommentContentQuery; minionsSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersDashboardsUnderbossesCourseOnQuizzesArgs { siftersLowersifters: CommentContentQuery; siftersDashboards: CommentContentQuery; dashboardsUnderbosses: CommentContentQuery; underbossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersBossesCourseOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersBosses: CommentContentQuery; bossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersMinionsCourseOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersMinions: CommentContentQuery; minionsSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersFiltersUnderbossesCourseOnBannersArgs { siftersLowersifters: CommentContentQuery; siftersFilters: CommentContentQuery; filtersUnderbosses: CommentContentQuery; underbossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersBossesCourseOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersBosses: CommentContentQuery; bossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersMinionsCourseOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersMinions: CommentContentQuery; minionsSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersHighersiftersUnderbossesCourseOnQuestionArgs { siftersLowersifters: CommentContentQuery; siftersHighersifters: CommentContentQuery; siftersUnderbosses: CommentContentQuery; underbossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsBossesCourseOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsBosses: CommentContentQuery; bossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsMinionsCourseOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsMinions: CommentContentQuery; minionsSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }
export interface SiftersInstructionsUnderbossesCourseOnOptionArgs { siftersInstructions: CommentContentQuery; instructionsUnderbosses: CommentContentQuery; underbossesSifters: CommentContentQuery; mailer: number | null; curToken: string | null; mutateRole: string | null; }

export type CoursesSingleChainPath =
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.filtersInstructionsBosses)['courseCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.filtersInstructionsMinions)['courseCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.filtersInstructionsUnderbosses)['courseCommentsOnSteps']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersDashboardsBosses)['courseCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersDashboardsMinions)['courseCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersDashboardsUnderbosses)['courseCommentsOnQuizzes']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersFiltersBosses)['courseCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersFiltersMinions)['courseCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersFiltersUnderbosses)['courseCommentsOnBanners']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersHighersiftersBosses)['courseCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersHighersiftersMinions)['courseCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersHighersiftersUnderbosses)['courseCommentsOnQuestion']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersInstructionsBosses)['courseCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersInstructionsMinions)['courseCommentsOnOption']
  | (typeof COMMENTS_SINGLE_CHAIN_COURSES_PATHS.siftersInstructionsUnderbosses)['courseCommentsOnOption'];

export type CoursesSingleChainPayload =
  | FiltersInstructionsBossesCourseOnStepsArgs
  | FiltersInstructionsMinionsCourseOnStepsArgs
  | FiltersInstructionsUnderbossesCourseOnStepsArgs
  | SiftersDashboardsBossesCourseOnQuizzesArgs
  | SiftersDashboardsMinionsCourseOnQuizzesArgs
  | SiftersDashboardsUnderbossesCourseOnQuizzesArgs
  | SiftersFiltersBossesCourseOnBannersArgs
  | SiftersFiltersMinionsCourseOnBannersArgs
  | SiftersFiltersUnderbossesCourseOnBannersArgs
  | SiftersHighersiftersBossesCourseOnQuestionArgs
  | SiftersHighersiftersMinionsCourseOnQuestionArgs
  | SiftersHighersiftersUnderbossesCourseOnQuestionArgs
  | SiftersInstructionsBossesCourseOnOptionArgs
  | SiftersInstructionsMinionsCourseOnOptionArgs
  | SiftersInstructionsUnderbossesCourseOnOptionArgs;
