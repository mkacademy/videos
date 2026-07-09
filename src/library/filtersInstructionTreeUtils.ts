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
  type FiltersInstructionsBossesTreeArgs,
  type FiltersInstructionsMinionsTreeArgs,
  type FiltersInstructionsUnderbossesTreeArgs,
} from './comments-api-trees';

export interface FiltersInstructionsTreeBaseArgs {
  roleType: 'Bosses' | 'Minions' | 'Underbosses';
  latestChildrenCommentItems: LatestCommentItemsByAuthorAndContentType;
  getState: () => RootState;
  parentIDs: number[];
  commentId: number;
}

export interface FiltersInstructionsTreePayloadResult {
  path: CommentsTreePath;
  payload: CommentsTreePayload;
}

export function getFiltersInstructionsTreePayload({
  latestChildrenCommentItems,
  getState,
  roleType,
  parentIDs,
  commentId,
}: FiltersInstructionsTreeBaseArgs): FiltersInstructionsTreePayloadResult | undefined {
  const state = getState();
  const { session: { curMailer, curToken, mutateRole, isPrivate } } = state;
  const pathKey = `filtersInstructions${roleType}` as keyof Omit<
    typeof COMMENTS_TREE_PATHS.viaInstructions,
    'entrypoints'
  >;
  const path = COMMENTS_TREE_PATHS.viaInstructions[pathKey] as CommentsTreePath;

  const defaultPayload: CommentContentQuery = {
    isPrivateView: false,
  };

  if (roleType === 'Bosses') {
    const defaultfreight = buildCommentContentQueryFromLatestGroups({
      groups: latestChildrenCommentItems,
      authorKey: 'b',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: FiltersInstructionsBossesTreeArgs = {
      filtersInstructions: {
        parentIds: parentIDs,
        isPrivateView: false,
        childIds: [commentId],
      },
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
      groups: latestChildrenCommentItems,
      authorKey: 'm',
      isPrivateView: isPrivate,
    } as BuildLatestGroupsFreightArgs);
    const payload: FiltersInstructionsMinionsTreeArgs = {
      filtersInstructions: {
        parentIds: parentIDs,
        isPrivateView: false,
        childIds: [commentId],
      },
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
    groups: latestChildrenCommentItems,
    authorKey: 'u',
    isPrivateView: isPrivate,
  } as BuildLatestGroupsFreightArgs);

  const payload: FiltersInstructionsUnderbossesTreeArgs = {
    filtersInstructions: {
      parentIds: parentIDs,
      isPrivateView: false,
      childIds: [commentId],
    },
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

