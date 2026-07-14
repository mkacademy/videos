import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../types';
import {
  CommentItem,
  toCommentId,
  parseCommentId,
  CommentContentType,
} from '../../types/comments';
import { fetchMessageComments } from '../thunks/fetchMessageComments';
import {
  createContainer,
  createCourses,
  createQuizzes,
  createSteps,
  createTutorials,
} from '../../library/actions';

export type CommentsFor = 'course' | 'quiz' | 'tutorial';

export interface CommentsEntry {
  isOpen: boolean | undefined;
  showSubmitHeading: boolean;
  comments: CommentItem[];
  parentIDs: number[];
}

type CommentsByKey = Record<number, CommentsEntry>;

export interface CommentsState {
  course: CommentsByKey;
  tutorial: CommentsByKey;
  quiz: CommentsByKey;
}

/** Payload for toggleCommentsOpen */
export interface ToggleCommentsOpenPayload {
  _for: CommentsFor;
  commentsId: number;
}

/** Payload for toggleSubmitHeading */
export interface ToggleSubmitHeadingPayload {
  _for: CommentsFor;
  commentsId: number;
}

const initialState: CommentsState = {
  course: {},
  tutorial: {},
  quiz: {},
};

/** Map temporary (negative) commentIds to persisted DB ids; payload is ["local_Id","db_Id",...]. */
function remapTempCommentIds(
  state: CommentsState,
  payload: string[],
  contentType: CommentContentType,
) {
  const ids = payload
    .map((value) => parseInt(value, 10))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) return;

  const updateEntry = (entry: CommentsEntry | undefined) => {
    if (!entry) return;
    for (const comment of entry.comments) {
      if (comment.contentType !== contentType) continue;
      const cid =
        typeof comment.commentId === 'number' ? comment.commentId : undefined;
      if (cid === undefined || cid >= 0) continue;

      const index = ids.findIndex((id) => id === cid);
      if (index === -1 || index % 2 !== 0 || index + 1 >= ids.length) continue;

      const dbId = ids[index + 1];
      const userId =
        typeof comment.userId === 'number'
          ? comment.userId
          : parseCommentId(String(comment.id)).userId;

      comment.commentId = dbId;
      comment.userId = userId;
      comment.id = toCommentId(userId, dbId);
    }
  };

  (['course', 'tutorial', 'quiz'] as const).forEach((_for) => {
    const area = state[_for];
    Object.values(area).forEach((entry) => updateEntry(entry));
  });
}

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    toggleCommentsOpen(state, action: PayloadAction<ToggleCommentsOpenPayload>) {
      const { _for, commentsId } = action.payload;
      const area = state[_for];
      if (!area[commentsId]) {
        area[commentsId] = {
          showSubmitHeading: true,
          isOpen: true,
          parentIDs: [],
          comments: [],
        };
      } else {
        const nextIsOpen = !area[commentsId].isOpen;
        area[commentsId].isOpen = nextIsOpen;
        area[commentsId].showSubmitHeading = nextIsOpen;
      }
    },
    toggleSubmitHeading(
      state,
      action: PayloadAction<ToggleSubmitHeadingPayload>
    ) {
      const { _for, commentsId } = action.payload;
      const area = state[_for];
      if (!area[commentsId]) {
        area[commentsId] = {
          showSubmitHeading: true,
          isOpen: false,
          parentIDs: [],
          comments: [],
        };
      } else {
        area[commentsId].showSubmitHeading = !area[commentsId].showSubmitHeading;
      }
    },
    /** Profile D Ctrl+Shift+E: merge comments stash rows into slice state. */
    restoreCommentsStash(state, action: PayloadAction<Partial<CommentsState>>) {
      (['course', 'tutorial', 'quiz'] as const).forEach((_for) => {
        const incoming = action.payload[_for];
        if (!incoming) return;
        for (const [key, entry] of Object.entries(incoming)) {
          const commentsId = Number(key);
          if (!Number.isFinite(commentsId) || !entry) continue;
          state[_for][commentsId] = entry;
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMessageComments.fulfilled, (state, action) => {
      const { _for, commentsId, comments, parentIDs, hasMore } = action.payload;
      const area = state[_for];
      const current = area[commentsId];
      const existing = current?.comments ?? [];
      const existingById = new Map(existing.map((c) => [String(c.id), c]));
      for (const c of comments) existingById.set(String(c.id), c);
      area[commentsId] = {
        isOpen: current?.isOpen ?? true,
        parentIDs: [...new Set([...(current?.parentIDs ?? []), ...parentIDs])],
        comments: Array.from(existingById.values()),
        showSubmitHeading: hasMore,
      };
    });
    builder
      .addCase(createSteps, (state, action) => {
        remapTempCommentIds(state, action.payload, 'message');
      })
      .addCase(createQuizzes, (state, action) => {
        remapTempCommentIds(state, action.payload, 'quiz');
      })
      .addCase(createCourses, (state, action) => {
        remapTempCommentIds(state, action.payload, 'course');
      })
      .addCase(createTutorials, (state, action) => {
        remapTempCommentIds(state, action.payload, 'tutorial');
      })
      .addCase(createContainer, (state, action) => {
      // Map temporary (negative) container ids to their persisted DB ids
      // createContainer payload is ["local_Id","db_Id","local_Id","db_Id",...]
      const ids = action.payload
        .map((value) => parseInt(value, 10))
        .filter((n) => Number.isFinite(n));
      if (ids.length < 2) return;
      for (let index = 0; index + 1 < ids.length; index += 2) {
        const localId = ids[index];
        const dbId = ids[index + 1];
        // localId is a temporary (negative) container id; abs(localId) is the commentsId
        const commentsId = Math.abs(localId);
        (['course', 'tutorial', 'quiz'] as const).forEach((_for) => {
          const area = state[_for];
          const entry = area[commentsId];
          if (!entry) return;
          if (!entry.parentIDs.includes(dbId))
            entry.parentIDs.push(dbId);
        });
      }
    });
  },
});

export const {
  toggleCommentsOpen,
  toggleSubmitHeading,
  restoreCommentsStash,
} = commentsSlice.actions;

const EMPTY_COMMENTS: CommentItem[] = [];
const EMPTY_PARENT_IDS: number[] = [];

export const selectCommentsFor =
  (_for: CommentsFor, commentsId: number) =>
    (state: RootState): CommentItem[] =>
      state.comments[_for]?.[commentsId]?.comments ?? EMPTY_COMMENTS;

export const selectParents =
  (_for: CommentsFor, commentsId: number) =>
    (state: RootState): number[] =>
      state.comments[_for]?.[commentsId]?.parentIDs ?? EMPTY_PARENT_IDS;

export const selectIsCommentsOpen =
  (_for: CommentsFor, commentsId: number) =>
    (state: RootState): boolean | undefined =>
      state.comments[_for]?.[commentsId]?.isOpen;

export const selectShouldShowSubmitHeading =
  (_for: CommentsFor, commentsId: number) =>
    (state: RootState): boolean =>
      state.comments[_for]?.[commentsId]?.showSubmitHeading ?? false;

/** Select a single comment by id. Use in a component so only that row re-renders when the comment changes. */
export const selectCommentById =
  (_for: CommentsFor, commentsId: number, id: string) =>
    (state: RootState): CommentItem | undefined =>
      state.comments[_for]?.[commentsId]?.comments?.find(
        (c) => String(c.id) === String(id)
      );

export default commentsSlice.reducer;
