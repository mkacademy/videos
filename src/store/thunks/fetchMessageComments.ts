import { createAsyncThunk } from '@reduxjs/toolkit';
import { timeout } from '../../utils';
import { getLatestRootCommentSelection } from '../../library/commentsMiddlewareUtils';
import { getSiftersFiltersTreePayload } from '../../library/siftersFiltersTreeUtils';
import { getSiftersHighersiftersTreePayload } from '../../library/SiftersHighersiftersTreeUtils';
import { getSiftersDashboardsTreePayload } from '../../library/siftersDashboardsTreeUtils';
import {
  commentsPath,
  commentsbodyPath,
  COMMENTS_BODY_PATHS,
  type CommentsBodyPath,
  type CommentContentQuery,
  type CommentbodyArgs,
} from '../../library/comments-api-messagesOn-mutations';
import type { CommentsTreePath, CommentsTreePayload } from '../../library/comments-api-trees';
import type { CommentsFor } from '../slices/commentsSlice';
import type { RootState } from '../index';
import { selectCommentsFor, selectParents } from '../slices/commentsSlice';
import type { CommentItem } from '../../types/comments';

export interface FetchMessageCommentsArg {
  _for: CommentsFor;
  commentsId: number;
  mode?: 'initial' | 'loadMore';
}

const ROLES = ['Bosses', 'Minions', 'Underbosses'] as const;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseCommentsResponse(data: unknown): CommentItem[] {
  if (Array.isArray(data)) return data as CommentItem[];
  if (data && typeof data === 'object' && Array.isArray((data as { comments?: unknown }).comments)) {
    return (data as { comments: CommentItem[] }).comments;
  }
  return [];
}

function extractParentIds(comments: CommentItem[]): number[] {
  const special = comments.find((c) => String(c.id) === '0:0');
  if (!special?.body) return [];
  try {
    return atob(special.body)
      .split(',')
      .map((part) => Number(part))
      .filter((n): n is number => Number.isFinite(n));
  } catch {
    return [];
  }
}

function bodyPathForRole(userRole: CommentItem['userRole']): CommentsBodyPath | null {
  if (userRole === 'b') return COMMENTS_BODY_PATHS.commentbody.bossesInstructions;
  if (userRole === 'u') return COMMENTS_BODY_PATHS.commentbody.underbossesInstructions;
  if (userRole === 'm') return COMMENTS_BODY_PATHS.commentbody.minionsInstructions;
  return null;
}

function buildTreeRequest(
  _for: CommentsFor,
  args: {
    getState: () => RootState;
    parentIDs: number[];
    latestRootCommentItems: ReturnType<typeof getLatestRootCommentSelection>;
    commentsId: number;
    roleType: (typeof ROLES)[number];
  },
): { path: CommentsTreePath; payload: CommentsTreePayload } | undefined {
  switch (_for) {
    case 'tutorial':
      return getSiftersFiltersTreePayload(args);
    case 'course':
      return getSiftersHighersiftersTreePayload(args);
    case 'quiz':
      return getSiftersDashboardsTreePayload(args);
    default:
      return undefined;
  }
}

/** Fetches message-type comments via studio comments-tree + commentsbody/instructions paths. */
export const fetchMessageComments = createAsyncThunk(
  'comments/fetchMessageComments',
  async (
    { _for, commentsId, mode = 'initial' }: FetchMessageCommentsArg,
    { getState, rejectWithValue },
  ) => {
    const state = getState() as RootState;
    const entryComments = selectCommentsFor(_for, commentsId)(state);
    const parentIDs =
      mode === 'loadMore' ? selectParents(_for, commentsId)(state) : [];

    const latestRootCommentItems = getLatestRootCommentSelection({
      entryComments: mode === 'loadMore' ? entryComments : [],
      rootParentCommentId: commentsId,
    });

    const baseArgs = {
      getState: () => getState() as RootState,
      parentIDs,
      latestRootCommentItems,
      commentsId,
    };

    try {
      const treeResults = await Promise.all(
        ROLES.map(async (roleType) => {
          const tree = buildTreeRequest(_for, { ...baseArgs, roleType });
          if (!tree) return [] as CommentItem[];
          const data = await postJson<unknown>(
            commentsPath(tree.path),
            tree.payload,
          );
          return parseCommentsResponse(data);
        }),
      );

      const mergedById = new Map<string, CommentItem>();
      const parentIdSet = new Set<number>();
      for (const batch of treeResults) {
        for (const id of extractParentIds(batch)) parentIdSet.add(id);
        for (const comment of batch) {
          if (String(comment.id) === '0:0') continue;
          // Viewer is message-only.
          if (comment.contentType && comment.contentType !== 'message') continue;
          mergedById.set(String(comment.id), comment);
        }
      }

      const treeComments = Array.from(mergedById.values());

      type Group = {
        userRole: CommentItem['userRole'];
        parentIds: number[];
        childIds: number[];
      };
      const groups = new Map<string, Group>();
      for (const comment of treeComments) {
        const { userRole, userId, commentId } = comment;
        if (
          !userRole ||
          typeof userId !== 'number' ||
          typeof commentId !== 'number' ||
          userId === commentId ||
          commentId < 1 ||
          userId < 1
        ) {
          continue;
        }
        let group = groups.get(userRole);
        if (!group) {
          group = { userRole, parentIds: [], childIds: [] };
          groups.set(userRole, group);
        }
        group.parentIds.push(userId);
        group.childIds.push(commentId);
      }

      const {
        session: { curMailer, curToken, mutateRole, isPrivate },
      } = state;

      await Promise.all(
        Array.from(groups.values()).map(async ({ userRole, parentIds, childIds }) => {
          const path = bodyPathForRole(userRole);
          if (!path) return;
          const uniqueChildIds = Array.from(new Set(childIds));
          const uniqueParentIds = Array.from(new Set(parentIds));
          if (uniqueChildIds.length === 0) return;

          const query: CommentContentQuery = {
            take: uniqueChildIds.length,
            parentIds: uniqueParentIds,
            childIds: uniqueChildIds,
            isPrivateView: isPrivate,
            skip: 0,
          };
          const payload: CommentbodyArgs = {
            args: query,
            mutateRole: mutateRole ?? null,
            curToken: curToken ?? null,
            mailer: curMailer,
          };
          const data = await postJson<unknown>(commentsbodyPath(path), payload);
          for (const incoming of parseCommentsResponse(data)) {
            const existing = mergedById.get(String(incoming.id));
            if (existing) {
              Object.assign(existing, incoming);
            } else if (!incoming.contentType || incoming.contentType === 'message') {
              mergedById.set(String(incoming.id), incoming);
            }
          }
        }),
      );

      const comments = Array.from(mergedById.values());
      return {
        _for,
        commentsId,
        mode,
        comments,
        parentIDs: Array.from(parentIdSet),
        hasMore: comments.length > 0,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Comments fetch failed',
      );
    }
  },
);
