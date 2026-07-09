import type { RootState } from '../store/types';
import type {
  LatestCommentItemsByAuthorAndContentType,
  BuildLatestGroupsFreightArgs,
} from './commentsMiddlewareUtils';
import { buildCommentContentQueryFromLatestGroups } from './commentsMiddlewareUtils';
import {
  COMMENTS_TREE_PATHS,
  type CommentsTreePath,
  type CommentsTreePayload,
  type CommentContentQuery,
  type SiftersDashboardsBossesTreeArgs,
  type SiftersDashboardsMinionsTreeArgs,
  type SiftersDashboardsUnderbossesTreeArgs,
} from './comments-api-trees';

export interface SiftersDashboardsTreeBaseArgs {
  roleType: 'Bosses' | 'Minions' | 'Underbosses';
  latestRootCommentItems: LatestCommentItemsByAuthorAndContentType;
  getState: () => RootState;
  parentIDs: number[];
  commentsId: number;
}

export interface SiftersDashboardsTreePayloadResult {
  path: CommentsTreePath;
  payload: CommentsTreePayload;
}

export function getSiftersDashboardsTreePayload({
  latestRootCommentItems,
  getState,
  roleType,
  parentIDs,
  commentsId,
}: SiftersDashboardsTreeBaseArgs): SiftersDashboardsTreePayloadResult | undefined {
  const state = getState();
  const { session: { curMailer, curToken, mutateRole, isPrivate } } = state;
  const pathKey = `siftersDashboards${roleType}` as keyof typeof COMMENTS_TREE_PATHS.viaInstructions.entrypoints;
  const seek = parentIDs.length === 0 ? `container_${commentsId}_comments` : null;
  const path = COMMENTS_TREE_PATHS.viaInstructions.entrypoints[pathKey] as CommentsTreePath;
  const defaultPayload: CommentContentQuery = {
    isPrivateView: false,
  };
  if (roleType === 'Bosses') {
    const defaultfreight = buildCommentContentQueryFromLatestGroups({
      groups: latestRootCommentItems,
      authorKey: 'b',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: SiftersDashboardsBossesTreeArgs = {
      siftersLowersifters: {
        search: seek,
        childIds: parentIDs,
        isPrivateView: false,
      },
      siftersDashboards: {
        parentIds: parentIDs,
        isPrivateView: false,
        childIds: [commentsId],
      },
      dashboardsBosses: defaultPayload,
      bossesInstructions: defaultfreight,
      instructionsBosses: defaultfreight,
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
      groups: latestRootCommentItems,
      authorKey: 'm',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: SiftersDashboardsMinionsTreeArgs = {
      siftersLowersifters: {
        search: seek,
        childIds: parentIDs,
        isPrivateView: false,
      },
      siftersDashboards: {
        parentIds: parentIDs,
        isPrivateView: false,
        childIds: [commentsId],
      },
      dashboardsMinions: defaultPayload,
      minionsInstructions: defaultfreight,
      instructionsMinions: defaultfreight,
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
    groups: latestRootCommentItems,
    authorKey: 'u',
    isPrivateView: isPrivate,
  } as BuildLatestGroupsFreightArgs);

  const payload: SiftersDashboardsUnderbossesTreeArgs = {
    siftersLowersifters: {
      search: seek,
      childIds: parentIDs,
      isPrivateView: false,
    },
    siftersDashboards: {
      parentIds: parentIDs,
      isPrivateView: false,
      childIds: [commentsId],
    },
    dashboardsUnderbosses: defaultPayload,
    underbossesInstructions: defaultfreight,
    instructionsUnderbosses: defaultfreight,
    underbossesDashboards: defaultfreight,
    underbossesSifters: defaultfreight,
    underbossesFilters: defaultfreight,
    mailer: curMailer,
    curToken: curToken ?? null,
    mutateRole: mutateRole ?? null,
  };
  return { path, payload };
}
