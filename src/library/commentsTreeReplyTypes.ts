import type { RootState } from '../store/types';
import type { LatestCommentItemsByAuthorAndContentType } from './commentsMiddlewareUtils';
import type { CommentsTreePath, CommentsViaContentTreePayload } from './comments-api-trees';

export type CommentsTreeReplyRoleType = 'Bosses' | 'Minions' | 'Underbosses';

export interface CommentsTreeReplyBaseArgs {
  roleType: CommentsTreeReplyRoleType;
  latestChildrenCommentItems: LatestCommentItemsByAuthorAndContentType;
  getState: () => RootState;
  parentIDs: number[];
  commentId: number;
}

export interface CommentsTreeReplyPayloadResult {
  path: CommentsTreePath;
  payload: CommentsViaContentTreePayload;
}
