import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../types';
import {
  CommentItem,
  toCommentId,
  mutateRoleToCommentAuthor,
  parseCommentId,
  CommentContentType,
} from '../../types/comments';
import { incrementID, isValidCommentsVisibility } from '../../utils';
import { fetchCommentsTree, fetchCommentsBodyTree } from '../../library/Thunks';
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

/** Payload for addComment */
export interface AddCommentPayload {
  _for: CommentsFor;
  commentsId: number;
  parentIDs: number[];
  body: string;
  userId: number;
  authorName: string;
  userRole: string;
  visibility?: string;
  type: CommentContentType;
}

/** Payload for addReply */
export interface AddReplyPayload {
  _for: CommentsFor;
  commentsId: number;
  parentId: string;
  body: string;
  userId: number;
  authorName: string;
  userRole: string;
  visibility?: string;
  type: CommentContentType;
}

/** Payload for updateComment */
export interface UpdateCommentPayload {
  _for: CommentsFor;
  commentsId: number;
  body: string;
  id: string;
  visibility?: string;
}

/** Payload for clearHasMoreReplies. runWasEmpty: true when there were no replies in the list yet (e.g. need to fetch from DB). */
export interface ClearHasMoreRepliesPayload {
  id: string;
  _for: CommentsFor;
  commentsId: number;
  runWasEmpty: boolean;
  type: CommentContentType;
}

/** Payload for toggleHasMoreReplies */
export interface ToggleHasMoreRepliesPayload {
  _for: CommentsFor;
  commentsId: number;
  id: string;
}

/** Payload for toggleCommentTagged */
export interface ToggleCommentTaggedPayload {
  _for: CommentsFor;
  commentsId: number;
  id: string;
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

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildCommentItem(
  userId: number,
  authorName: string,
  userRole: Parameters<typeof mutateRoleToCommentAuthor>[0],
  body: string,
  parentId: string,
  type: CommentContentType,
  visibility?: string,
): CommentItem {
  const commentId = incrementID();
  const id = toCommentId(userId, commentId);
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = monthNames[now.getMonth()];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const date = `${month} ${day}, ${year} ${hours}:${minutes}`;

  const comment: CommentItem = {
    id,
    date,
    userId,
    commentId,
    authorName,
    owner: true,
    body: body.trim(),
    userRole: mutateRoleToCommentAuthor(userRole),
    contentType: type,
    visibility: 'NONE',
    status: 0,
  };

  if (parentId) comment.parentId = parentId;
  if (visibility && isValidCommentsVisibility(visibility))
    comment.visibility = visibility;
  return comment;
}

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
    addComment(state, action: PayloadAction<AddCommentPayload>) {
      console.log('addComment', action.payload);
      const { _for, commentsId, body, userId, authorName, userRole, visibility, type } =
        action.payload;
      const trimmed = body.trim();
      if (!trimmed) return;

      const comment = buildCommentItem(
        userId,
        authorName,
        userRole,
        body,
        `-1:${commentsId}`,
        type,
        visibility
      );
      const area = state[_for];
      if (!area[commentsId])
        area[commentsId] = {
          isOpen: false,
          showSubmitHeading: false,
          parentIDs: [],
          comments: [],
        };
      area[commentsId].comments.push(comment);
    },
    addReply(state, action: PayloadAction<AddReplyPayload>) {
      const {
        _for,
        commentsId,
        parentId,
        body,
        userId,
        authorName,
        userRole,
        visibility,
        type,
      } = action.payload;
      const trimmed = body.trim();
      if (!trimmed) return;

      const comment = buildCommentItem(
        userId,
        authorName,
        userRole,
        body,
        parentId,
        type,
        visibility,
      );
      const area = state[_for];
      if (!area[commentsId]) return;
      area[commentsId].comments.push(comment);
    },
    updateComment(state, action: PayloadAction<UpdateCommentPayload>) {
      const { _for, commentsId, id, body, visibility } = action.payload;
      const trimmed = body.trim();
      if (!trimmed) return;

      const entry = state[_for]?.[commentsId];
      if (!entry) return;
      const list = entry.comments;

      const idx = list.findIndex((c) => String(c.id) === String(id));
      if (idx >= 0) {
        list[idx].body = trimmed;
        if (visibility && isValidCommentsVisibility(visibility)) {
          list[idx].visibility = visibility;
        }
      }
    },
    clearHasMoreReplies(
      state,
      action: PayloadAction<ClearHasMoreRepliesPayload>
    ) {
      const { _for, commentsId, id } = action.payload;
      const entry = state[_for]?.[commentsId];
      if (!entry) return;
      const comment = entry.comments.find((c) => String(c.id) === String(id));
      if (comment) {
        comment.hasMoreReplies = false;
      }
    },
    toggleHasMoreReplies(
      state,
      action: PayloadAction<ToggleHasMoreRepliesPayload>
    ) {
      const { _for, commentsId, id } = action.payload;
      const entry = state[_for]?.[commentsId];
      if (!entry) return;
      const comment = entry.comments.find((c) => String(c.id) === String(id));
      if (comment) {
        comment.hasMoreReplies = !comment.hasMoreReplies;
      }
    },
    toggleCommentTagged(
      state,
      action: PayloadAction<ToggleCommentTaggedPayload>
    ) {
      const { _for, commentsId, id } = action.payload;
      const entry = state[_for]?.[commentsId];
      if (!entry) return;
      const comment = entry.comments.find((c) => String(c.id) === String(id));
      if (comment) {
        comment.tagged = !comment.tagged;
      }
    },
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
    builder.addCase(fetchCommentsTree.fulfilled, (state, action) => {
      const { _for, commentsId, userId } = action.meta.arg;
      const area = state[_for];
      if (!area) return;
      const current = area[commentsId];
      // Find the special "0:0" comment (if any)
      const special = action.payload.find((comment) => String(comment.id) === '0:0');
      // Decode base64 body of the special comment into an array of integers
      let extraParentIds: number[] = [];
      if (special?.body) {
        try {
          const decoded = atob(special.body);
          // Backend encodes a comma-separated list of IDs before Base64-encoding
          extraParentIds = decoded
            .split(',')
            .map((part) => Number(part))
            .filter((n): n is number => Number.isFinite(n));
        } catch {
          // If decoding fails, ignore and treat as no extra parents
          extraParentIds = [];
        }
      }
      const mergedParentIDs = [...new Set([...(current?.parentIDs ?? []), ...extraParentIds])];
      const realComments = action.payload
        .filter((comment) => String(comment.id) !== '0:0')
        .map((comment) => {
          if (!(typeof userId === 'number' && userId > 0)) return comment;
          const parentId = typeof comment.parentId === 'string' ? comment.parentId : '';
          if (!parentId.startsWith('-1:')) return comment;
          const parentNum = Number(parentId.slice(3));
          if (!Number.isFinite(parentNum) || parentNum <= 0) return comment;
          return {
            ...comment,
            parentId: `${userId}:${parentNum}`,
          };
        });
      const existing = current?.comments ?? [];
      const existingById = new Map(existing.map((c) => [String(c.id), c]));
      for (const c of realComments) existingById.set(String(c.id), c);
      const mergedComments = Array.from(existingById.values());
      area[commentsId] = {
        isOpen: current?.isOpen ?? false,
        parentIDs: mergedParentIDs,
        comments: mergedComments,
        showSubmitHeading: true,
      };
    }).addCase(fetchCommentsBodyTree.fulfilled, (state, action) => {
      const { _for, commentsId } = action.meta.arg;
      const area = state[_for];
      if (!area[commentsId])
        area[commentsId] = {
          showSubmitHeading: true,
          isOpen: true,
          parentIDs: [],
          comments: [],
        };
      const entry = area[commentsId];
      const list = entry.comments;
      for (const incoming of action.payload) {
        const id = String(incoming.id);
        const existing = list.find((c) => String(c.id) === id);
        if (existing) {
          for (const key of Object.keys(incoming) as (keyof CommentItem)[])
            (existing as unknown as Record<string, unknown>)[key] = (incoming as unknown as Record<string, unknown>)[key];
        }
      }
    })
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
  addComment,
  addReply,
  updateComment,
  clearHasMoreReplies,
  toggleHasMoreReplies,
  toggleCommentTagged,
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
