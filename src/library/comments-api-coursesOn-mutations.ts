/**
 * Comments API – course-focused mutation paths and payload types (CoursesCommentsController).
 * Base: /api/comments. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;

export const COMMENTS_MUTATION_PATHS = {
  course: {
    setBossCourseOnBanners: '/course/set-boss-course-on-banners',
    setMinionCourseOnBanners: '/course/set-minion-course-on-banners',
    setUnderbossCourseOnBanners: '/course/set-underboss-course-on-banners',
    setBossCourseOnCovers: '/course/set-boss-course-on-covers',
    setMinionCourseOnCovers: '/course/set-minion-course-on-covers',
    setUnderbossCourseOnCovers: '/course/set-underboss-course-on-covers',
  },
  tutorial: {
    setBossCourseOnBanners: '/tutorial/set-boss-course-on-banners',
    setMinionCourseOnBanners: '/tutorial/set-minion-course-on-banners',
    setUnderbossCourseOnBanners: '/tutorial/set-underboss-course-on-banners',
    setBossCourseOnSteps: '/tutorial/set-boss-course-on-steps',
    setMinionCourseOnSteps: '/tutorial/set-minion-course-on-steps',
    setUnderbossCourseOnSteps: '/tutorial/set-underboss-course-on-steps',
  },
  quiz: {
    setBossCourseOnQuizzes: '/quiz/set-boss-course-on-quizzes',
    setMinionCourseOnQuizzes: '/quiz/set-minion-course-on-quizzes',
    setUnderbossCourseOnQuizzes: '/quiz/set-underboss-course-on-quizzes',
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

export interface CourseOnCourseBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftershighersifters: CommentContentInputs | null;
  siftersRole: CommentContentInputs | null;
  roleSifters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface CourseOnCoverArgs {
  quota: number | null;
  siftersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleSifters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface CourseOnTutorialBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersfilters: CommentContentInputs | null;
  filtersRole: CommentContentInputs | null;
  roleSifters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface CourseOnStepArgs {
  quota: number | null;
  siftersfilters: CommentContentInputs | null;
  filtersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleSifters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface CourseOnQuizArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersdashboards: CommentContentInputs | null;
  dashboardsRole: CommentContentInputs | null;
  roleSifters: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface CoursesMutationApiRequestArgs {
  course: {
    setBossCourseOnBanners: CourseOnCourseBannerArgs;
    setMinionCourseOnBanners: CourseOnCourseBannerArgs;
    setUnderbossCourseOnBanners: CourseOnCourseBannerArgs;
    setBossCourseOnCovers: CourseOnCoverArgs;
    setMinionCourseOnCovers: CourseOnCoverArgs;
    setUnderbossCourseOnCovers: CourseOnCoverArgs;
  };
  tutorial: {
    setBossCourseOnBanners: CourseOnTutorialBannerArgs;
    setMinionCourseOnBanners: CourseOnTutorialBannerArgs;
    setUnderbossCourseOnBanners: CourseOnTutorialBannerArgs;
    setBossCourseOnSteps: CourseOnStepArgs;
    setMinionCourseOnSteps: CourseOnStepArgs;
    setUnderbossCourseOnSteps: CourseOnStepArgs;
  };
  quiz: {
    setBossCourseOnQuizzes: CourseOnQuizArgs;
    setMinionCourseOnQuizzes: CourseOnQuizArgs;
    setUnderbossCourseOnQuizzes: CourseOnQuizArgs;
  };
}

export type CoursesMutationPath =
  | (typeof COMMENTS_MUTATION_PATHS.course)[keyof typeof COMMENTS_MUTATION_PATHS.course]
  | (typeof COMMENTS_MUTATION_PATHS.tutorial)[keyof typeof COMMENTS_MUTATION_PATHS.tutorial]
  | (typeof COMMENTS_MUTATION_PATHS.quiz)[keyof typeof COMMENTS_MUTATION_PATHS.quiz];

export type CoursesMutationPayload =
  | CoursesMutationApiRequestArgs['course'][keyof CoursesMutationApiRequestArgs['course']]
  | CoursesMutationApiRequestArgs['tutorial'][keyof CoursesMutationApiRequestArgs['tutorial']]
  | CoursesMutationApiRequestArgs['quiz'][keyof CoursesMutationApiRequestArgs['quiz']];
