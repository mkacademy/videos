import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../types';
import {
  CommentItem,
} from '../../types/comments';
import { fetchMessageComments } from '../thunks/fetchMessageComments';

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
  },
});

export const {
  toggleCommentsOpen,
  toggleSubmitHeading,
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
