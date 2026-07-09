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
  type SiftersHighersiftersBossesTreeArgs,
  type SiftersHighersiftersMinionsTreeArgs,
  type SiftersHighersiftersUnderbossesTreeArgs,
} from './comments-api-trees';

export interface SiftersHighersiftersTreeBaseArgs {
  roleType: 'Bosses' | 'Minions' | 'Underbosses';
  latestRootCommentItems: LatestCommentItemsByAuthorAndContentType;
  getState: () => RootState;
  parentIDs: number[];
  commentsId: number;
}

export interface SiftersHighersiftersTreePayloadResult {
  path: CommentsTreePath;
  payload: CommentsTreePayload;
}


export function getSiftersHighersiftersTreePayload({
  latestRootCommentItems,
  getState,
  roleType,
  parentIDs,
  commentsId,
}: SiftersHighersiftersTreeBaseArgs): SiftersHighersiftersTreePayloadResult | undefined {
  const state = getState();
  const { session: { curMailer, curToken, mutateRole, isPrivate } } = state;
  const pathKey = `siftersHighersifters${roleType}` as keyof typeof COMMENTS_TREE_PATHS.viaInstructions.entrypoints;
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
    const payload: SiftersHighersiftersBossesTreeArgs = {
      siftersLowersifters: {
        search: seek,
        childIds: parentIDs,
        isPrivateView: false,
      },
      siftersHighersifters: {
        isPrivateView: false,
        childIds: [commentsId],
      },
      siftersBosses: defaultPayload,
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
    const payload: SiftersHighersiftersMinionsTreeArgs = {
      siftersLowersifters: {
        search: seek,
        childIds: parentIDs,
        isPrivateView: false,
      },
      siftersHighersifters: {
        isPrivateView: false,
        childIds: [commentsId],
      },
      siftersMinions: defaultPayload,
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

  const payload: SiftersHighersiftersUnderbossesTreeArgs = {
    siftersLowersifters: {
      search: seek,
      childIds: parentIDs,
      isPrivateView: false,
    },
    siftersHighersifters: {
      isPrivateView: false,
      childIds: [commentsId],
    },
    siftersUnderbosses: defaultPayload,
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
