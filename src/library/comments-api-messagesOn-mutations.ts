/**
 * Comments API – mutation paths and payload types (CommentsController + CommentbodyController + CommentsupdateController).
 * Bases: /api/comments, /api/commentsbody, /api/commentsupdate. Endpoints are POST.
 */

import { getBaseUrl } from '../utils';

export const COMMENTS_API_BASE = '/api/comments';
export const COMMENTSBODY_API_BASE = '/api/commentsbody';

export const commentsPath = (path: string) => `${getBaseUrl()}${COMMENTS_API_BASE}${path}`;
export const commentsbodyPath = (path: string) => `${getBaseUrl()}${COMMENTSBODY_API_BASE}${path}`;

/** Paths on CommentsController for course / tutorial / quiz mutations. */
export const COMMENTS_BODY_PATHS = {
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



/** Mirrors {@code Pojos.CommentbodyArgs}. */
export interface CommentbodyArgs {
  args: CommentContentQuery;
  mailer: number | null;
  curToken: string | null;
  mutateRole: string | null;
}

export type commentsBodyArgs = CommentbodyArgs;

export type CommentsBodyPath =
  | (typeof COMMENTS_BODY_PATHS.commentbody.bossesDashboards)
  | (typeof COMMENTS_BODY_PATHS.commentbody.bossesSifters)
  | (typeof COMMENTS_BODY_PATHS.commentbody.bossesFilters)
  | (typeof COMMENTS_BODY_PATHS.commentbody.bossesInstructions)
  | (typeof COMMENTS_BODY_PATHS.commentbody.underbossesDashboards)
  | (typeof COMMENTS_BODY_PATHS.commentbody.underbossesSifters)
  | (typeof COMMENTS_BODY_PATHS.commentbody.underbossesFilters)
  | (typeof COMMENTS_BODY_PATHS.commentbody.underbossesInstructions)
  | (typeof COMMENTS_BODY_PATHS.commentbody.minionsDashboards)
  | (typeof COMMENTS_BODY_PATHS.commentbody.minionsSifters)
  | (typeof COMMENTS_BODY_PATHS.commentbody.minionsFilters)
  | (typeof COMMENTS_BODY_PATHS.commentbody.minionsInstructions);
