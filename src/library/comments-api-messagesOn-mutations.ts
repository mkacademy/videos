/**
 * Comments API – mutation paths and payload types (CommentsController + CommentbodyController + CommentsupdateController).
 * Bases: /api/comments, /api/commentsbody, /api/commentsupdate. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';
export const COMMENTSBODY_API_BASE = '/api/commentsbody';
export const COMMENTS_UPDATE_API_BASE = '/api/commentsupdate';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;
export const commentsbodyPath = (path: string) => `${getBaseUrl()}${COMMENTSBODY_API_BASE}${path}`;
export const commentsUpdatePath = (path: string) => `${getBaseUrl()}${COMMENTS_UPDATE_API_BASE}${path}`;

/** Paths on CommentsController for course / tutorial / quiz mutations. */
export const COMMENTS_MUTATION_PATHS = {
  course: {
    setBossMessageOnBanners: '/course/set-boss-message-on-banners',
    setMinionMessageOnBanners: '/course/set-minion-message-on-banners',
    setUnderbossMessageOnBanners: '/course/set-underboss-message-on-banners',
    setBossMessageOnCovers: '/course/set-boss-message-on-covers',
    setMinionMessageOnCovers: '/course/set-minion-message-on-covers',
    setUnderbossMessageOnCovers: '/course/set-underboss-message-on-covers',
  },
  tutorial: {
    setBossMessageOnBanners: '/tutorial/set-boss-message-on-banners',
    setMinionMessageOnBanners: '/tutorial/set-minion-message-on-banners',
    setUnderbossMessageOnBanners: '/tutorial/set-underboss-message-on-banners',
    setBossMessageOnSteps: '/tutorial/set-boss-message-on-steps',
    setMinionMessageOnSteps: '/tutorial/set-minion-message-on-steps',
    setUnderbossMessageOnSteps: '/tutorial/set-underboss-message-on-steps',
  },
  quiz: {
    setBossMessageOnQuizzes: '/quiz/set-boss-message-on-quizzes',
    setMinionMessageOnQuizzes: '/quiz/set-minion-message-on-quizzes',
    setUnderbossMessageOnQuizzes: '/quiz/set-underboss-message-on-quizzes',
  },
  commentbody: {
    bossesDashboards: '/bosses/dashboards',
    bossesSifters: '/bosses/sifters',
    bossesFilters: '/bosses/filters',
    bossesInstructions: '/bosses/instructions',
    underbossesDashboards: '/underbosses/dashboards',
    underbossesSifters: '/underbosses/sifters',
    underbossesFilters: '/underbosses/filters',
    underbossesInstructions: '/underbosses/instructions',
    minionsDashboards: '/minions/dashboards',
    minionsSifters: '/minions/sifters',
    minionsFilters: '/minions/filters',
    minionsInstructions: '/minions/instructions',
  },
  commentsUpdate: {
    bossesDashboards: '/bosses/dashboards',
    bossesSifters: '/bosses/sifters',
    bossesFilters: '/bosses/filters',
    bossesInstructions: '/bosses/instructions',
    underbossesDashboards: '/underbosses/dashboards',
    underbossesSifters: '/underbosses/sifters',
    underbossesFilters: '/underbosses/filters',
    underbossesInstructions: '/underbosses/instructions',
    minionsDashboards: '/minions/dashboards',
    minionsSifters: '/minions/sifters',
    minionsFilters: '/minions/filters',
    minionsInstructions: '/minions/instructions',
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

/** Mirrors {@code Pojos.CommentContentInputs} field order. */
export interface CommentContentInputs {
  visibility?: string | null;
  texts?: string[] | null;
  childIds?: number[] | null;
  parentIds?: number[] | null;
  statuses?: number[] | null;
  groups?: number[] | null;
  ordinals?: number[] | null;
}

// --- CourseCommentServicePojos (Java) – message / tutorial / quiz / course on banners & covers ---

export interface MessageOnCourseBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftershighersifters: CommentContentInputs | null;
  siftersRole: CommentContentInputs | null;
  roleInstructions: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface MessageOnCoverArgs {
  quota: number | null;
  siftersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleInstructions: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- TutorialCommentsServicePojos ---

export interface MessageOnTutorialBannerArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersfilters: CommentContentInputs | null;
  filtersRole: CommentContentInputs | null;
  roleInstructions: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export interface MessageOnStepArgs {
  quota: number | null;
  siftersfilters: CommentContentInputs | null;
  filtersinstructions: CommentContentInputs | null;
  instructionsRole: CommentContentInputs | null;
  roleInstructions: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

// --- QuizCommentsServicePojos ---

export interface MessageOnQuizArgs {
  quota: number | null;
  sifterslowersifters: CommentContentInputs | null;
  siftersdashboards: CommentContentInputs | null;
  dashboardsRole: CommentContentInputs | null;
  roleInstructions: CommentContentInputs | null;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

/** Mirrors {@code Pojos.CommentbodyArgs}. */
export interface CommentbodyArgs {
  args: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

/** Mirrors {@code Pojos.CommentupdateArgs}. */
export interface CommentupdateArgs {
  inputs: CommentContentInputs;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export type commentsBodyArgs = CommentbodyArgs;
export type commentsUpdateArgs = CommentupdateArgs;

/** Request body shape per exposed mutation path group on the gateway controllers. */
export interface CommentsMutationApiRequestArgs {
  course: {
    setBossMessageOnBanners: MessageOnCourseBannerArgs;
    setMinionMessageOnBanners: MessageOnCourseBannerArgs;
    setUnderbossMessageOnBanners: MessageOnCourseBannerArgs;
    setBossMessageOnCovers: MessageOnCoverArgs;
    setMinionMessageOnCovers: MessageOnCoverArgs;
    setUnderbossMessageOnCovers: MessageOnCoverArgs;
  };
  tutorial: {
    setBossMessageOnBanners: MessageOnTutorialBannerArgs;
    setMinionMessageOnBanners: MessageOnTutorialBannerArgs;
    setUnderbossMessageOnBanners: MessageOnTutorialBannerArgs;
    setBossMessageOnSteps: MessageOnStepArgs;
    setMinionMessageOnSteps: MessageOnStepArgs;
    setUnderbossMessageOnSteps: MessageOnStepArgs;
  };
  quiz: {
    setBossMessageOnQuizzes: MessageOnQuizArgs;
    setMinionMessageOnQuizzes: MessageOnQuizArgs;
    setUnderbossMessageOnQuizzes: MessageOnQuizArgs;
  };
  commentbody: {
    bossesDashboards: CommentbodyArgs;
    bossesSifters: CommentbodyArgs;
    bossesFilters: CommentbodyArgs;
    bossesInstructions: CommentbodyArgs;
    underbossesDashboards: CommentbodyArgs;
    underbossesSifters: CommentbodyArgs;
    underbossesFilters: CommentbodyArgs;
    underbossesInstructions: CommentbodyArgs;
    minionsDashboards: CommentbodyArgs;
    minionsSifters: CommentbodyArgs;
    minionsFilters: CommentbodyArgs;
    minionsInstructions: CommentbodyArgs;
  };
  commentsUpdate: {
    bossesDashboards: CommentupdateArgs;
    bossesSifters: CommentupdateArgs;
    bossesFilters: CommentupdateArgs;
    bossesInstructions: CommentupdateArgs;
    underbossesDashboards: CommentupdateArgs;
    underbossesSifters: CommentupdateArgs;
    underbossesFilters: CommentupdateArgs;
    underbossesInstructions: CommentupdateArgs;
    minionsDashboards: CommentupdateArgs;
    minionsSifters: CommentupdateArgs;
    minionsFilters: CommentupdateArgs;
    minionsInstructions: CommentupdateArgs;
  };
}

export type MessagesMutationPath =
  | (typeof COMMENTS_MUTATION_PATHS.course)[keyof typeof COMMENTS_MUTATION_PATHS.course]
  | (typeof COMMENTS_MUTATION_PATHS.tutorial)[keyof typeof COMMENTS_MUTATION_PATHS.tutorial]
  | (typeof COMMENTS_MUTATION_PATHS.quiz)[keyof typeof COMMENTS_MUTATION_PATHS.quiz];

export type MessagesMutationPayload =
  | CommentsMutationApiRequestArgs['course'][keyof CommentsMutationApiRequestArgs['course']]
  | CommentsMutationApiRequestArgs['tutorial'][keyof CommentsMutationApiRequestArgs['tutorial']]
  | CommentsMutationApiRequestArgs['quiz'][keyof CommentsMutationApiRequestArgs['quiz']];

export type CommentsBodyPath =
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.bossesDashboards)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.bossesSifters)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.bossesFilters)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.bossesInstructions)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.underbossesDashboards)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.underbossesSifters)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.underbossesFilters)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.underbossesInstructions)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.minionsDashboards)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.minionsSifters)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.minionsFilters)
  | (typeof COMMENTS_MUTATION_PATHS.commentbody.minionsInstructions);

export type CommentsUpdatePath =
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.bossesDashboards)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.bossesSifters)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.bossesFilters)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.bossesInstructions)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.underbossesDashboards)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.underbossesSifters)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.underbossesFilters)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.underbossesInstructions)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.minionsDashboards)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.minionsSifters)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.minionsFilters)
  | (typeof COMMENTS_MUTATION_PATHS.commentsUpdate.minionsInstructions);
