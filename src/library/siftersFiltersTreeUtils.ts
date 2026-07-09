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
  type SiftersFiltersBossesTreeArgs,
  type SiftersFiltersMinionsTreeArgs,
  type SiftersFiltersUnderbossesTreeArgs,
} from './comments-api-trees';

export interface SiftersFiltersTreeBaseArgs {
  roleType: 'Bosses' | 'Minions' | 'Underbosses';
  latestRootCommentItems: LatestCommentItemsByAuthorAndContentType;
  getState: () => RootState;
  parentIDs: number[];
  commentsId: number;
}

export interface SiftersFiltersTreePayloadResult {
  path: CommentsTreePath;
  payload: CommentsTreePayload;
}

export function getSiftersFiltersTreePayload({
  latestRootCommentItems,
  getState,
  roleType,
  parentIDs,
  commentsId,
}: SiftersFiltersTreeBaseArgs): SiftersFiltersTreePayloadResult | undefined {
  const state = getState();
  const { session: { curMailer, curToken, mutateRole, isPrivate } } = state;
  const pathKey = `siftersFilters${roleType}` as keyof typeof COMMENTS_TREE_PATHS.viaInstructions.entrypoints;
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
    const payload: SiftersFiltersBossesTreeArgs = {
      siftersLowersifters: { 
        search: seek,
        childIds: parentIDs,
        isPrivateView: false,
      },
      siftersFilters: {
        isPrivateView: false,
        childIds: [commentsId],
      },
      filtersBosses: defaultPayload,
      instructionsBosses: defaultPayload,
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
      groups: latestRootCommentItems,
      authorKey: 'm',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: SiftersFiltersMinionsTreeArgs = {
      siftersLowersifters: { 
        search: seek,
        childIds: parentIDs,
        isPrivateView: false,
      },
      siftersFilters: {
        isPrivateView: false,
        childIds: [commentsId],
      },
      filtersMinions: defaultPayload,
      instructionsMinions: defaultPayload,
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
    groups: latestRootCommentItems,
    authorKey: 'u',
    isPrivateView: isPrivate,
  } as BuildLatestGroupsFreightArgs);
  const payload: SiftersFiltersUnderbossesTreeArgs = {
    siftersLowersifters: { 
      search: seek,
      childIds: parentIDs,
      isPrivateView: false,
    },
    siftersFilters: {
      isPrivateView: false,
      childIds: [commentsId],
    },
    filtersUnderbosses: defaultPayload,
    instructionsUnderbosses: defaultPayload,
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
