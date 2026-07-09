import type {
  BuildLatestGroupsFreightArgs,
} from './commentsMiddlewareUtils';
import { buildCommentContentQueryFromLatestGroups } from './commentsMiddlewareUtils';
import {
  COMMENTS_TREE_PATHS,
  type CommentsTreePath,
  type CommentContentQuery,
  type ViaContentSiftersDashboardsBossesTreeArgs,
  type ViaContentSiftersDashboardsMinionsTreeArgs,
  type ViaContentSiftersDashboardsUnderbossesTreeArgs,
} from './comments-api-trees';
import type { CommentsTreeReplyBaseArgs, CommentsTreeReplyPayloadResult } from './commentsTreeReplyTypes';

export function getSiftersDashboardsTreeReplyPayload({
  latestChildrenCommentItems,
  getState,
  roleType,
  parentIDs,
  commentId,
}: CommentsTreeReplyBaseArgs): CommentsTreeReplyPayloadResult | undefined {
  const state = getState();
  const { session: { curMailer, curToken, mutateRole, isPrivate } } = state;
  const pathKey = `siftersDashboards${roleType}` as keyof typeof COMMENTS_TREE_PATHS.viaDashboards;
  const path = COMMENTS_TREE_PATHS.viaDashboards[pathKey] as CommentsTreePath;

  const defaultPayload: CommentContentQuery = { isPrivateView: false };

  if (roleType === 'Bosses') {
    const defaultfreight = buildCommentContentQueryFromLatestGroups({
      groups: latestChildrenCommentItems,
      authorKey: 'b',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: ViaContentSiftersDashboardsBossesTreeArgs = {
      siftersDashboards: {
        parentIds: parentIDs,
        isPrivateView: false,
        childIds: [commentId],
      },
      dashboardsBosses: defaultPayload,
      bossesInstructions: defaultfreight,
      bossesDashboards: defaultfreight,
      bossesSifters: defaultfreight,
      bossesFilters: defaultfreight,
      mailer: curMailer,
      curToken: curToken ?? null,
      mutateRole: mutateRole ?? null,
    };
    return { path, payload };
  }

  if (roleType === 'Minions') {
    const defaultfreight = buildCommentContentQueryFromLatestGroups({
      groups: latestChildrenCommentItems,
      authorKey: 'm',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: ViaContentSiftersDashboardsMinionsTreeArgs = {
      siftersDashboards: {
        parentIds: parentIDs,
        isPrivateView: false,
        childIds: [commentId],
      },
      dashboardsMinions: defaultPayload,
      minionsInstructions: defaultfreight,
      minionsDashboards: defaultfreight,
      minionsSifters: defaultfreight,
      minionsFilters: defaultfreight,
      mailer: curMailer,
      curToken: curToken ?? null,
      mutateRole: mutateRole ?? null,
    };
    return { path, payload };
  }

  const defaultfreight = buildCommentContentQueryFromLatestGroups({
    groups: latestChildrenCommentItems,
    authorKey: 'u',
    isPrivateView: isPrivate,
  } as BuildLatestGroupsFreightArgs);

  const payload: ViaContentSiftersDashboardsUnderbossesTreeArgs = {
    siftersDashboards: {
      parentIds: parentIDs,
      isPrivateView: false,
      childIds: [commentId],
    },
    dashboardsUnderbosses: defaultPayload,
    underbossesInstructions: defaultfreight,
    underbossesDashboards: defaultfreight,
    underbossesSifters: defaultfreight,
    underbossesFilters: defaultfreight,
    mailer: curMailer,
    curToken: curToken ?? null,
    mutateRole: mutateRole ?? null,
  };
  return { path, payload };
}
