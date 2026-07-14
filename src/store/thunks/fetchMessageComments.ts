import { createAsyncThunk } from '@reduxjs/toolkit';
import { webappToMessageType } from '../../api/commsMessage';
import { fetchCommsMessageThunk } from './fetchCommsMessage';
import {
  buildCommentContentQueryFromLatestGroups,
  getLatestRootCommentSelection,
} from '../../library/commentsMiddlewareUtils';
import type { CommentsFor } from '../slices/commentsSlice';
import type { RootState } from '../index';
import { selectCommentsFor } from '../slices/commentsSlice';
import type { CommentAuthorType } from '../../types/comments';

export interface FetchMessageCommentsArg {
  _for: CommentsFor;
  commentsId: number;
  mode?: 'initial' | 'loadMore';
  direction?: 'incoming' | 'outgoing';
}

/** Fetches read-only message-type comments for a banner (no sequence wrapper). */
export const fetchMessageComments = createAsyncThunk(
  'comments/fetchMessageComments',
  async (
    { _for, commentsId, mode = 'initial', direction = 'incoming' }: FetchMessageCommentsArg,
    { dispatch, getState, rejectWithValue },
  ) => {
    const state = getState() as RootState;
    const entryComments = selectCommentsFor(_for, commentsId)(state);
    const messageType = webappToMessageType(_for);

    let cursor: { search: string; childIds: number[]; isMutating: true } | undefined;

    if (mode === 'loadMore' && entryComments.length > 0) {
      const latestGroups = getLatestRootCommentSelection({
        entryComments,
        rootParentCommentId: commentsId,
      });
      const authorKey = (Object.keys(latestGroups)[0] ?? 'ROLE_USER') as CommentAuthorType;
      const query = buildCommentContentQueryFromLatestGroups({
        groups: latestGroups,
        authorKey,
        isPrivateView: false,
      });
      if (query.search && query.childIds?.length) {
        cursor = {
          search: query.search,
          childIds: query.childIds,
          isMutating: true,
        };
      }
    }

    const result = await dispatch(
      fetchCommsMessageThunk({
        direction,
        type: messageType,
        id: commentsId,
        cursor,
      }),
    );

    if (fetchCommsMessageThunk.rejected.match(result)) {
      return rejectWithValue(result.payload as string);
    }

    return {
      _for,
      commentsId,
      mode,
      ...result.payload,
    };
  },
);
