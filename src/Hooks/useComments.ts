import React, { useRef, useMemo } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  addComment,
  addReply,
  updateComment,
  clearHasMoreReplies,
  toggleHasMoreReplies,
  toggleCommentTagged,
  toggleCommentsOpen,
  toggleSubmitHeading,
  selectCommentsFor,
  selectIsCommentsOpen,
  selectParents,
  selectShouldShowSubmitHeading,
} from '../store/slices/commentsSlice';
import { prependError } from '../store/slices/errorSlice';
import {
  fetchCourseComments,
  fetchTutorialComments,
  fetchQuizComments,
} from '../library/actions';
import type {
  CommentItem,
  CommentFormData,
  CommentContentType,
} from '../types/comments';
import {
  getCommentDepth,
  buildDisplayItems as buildDisplayItemsUtil,
} from '../library/commentsDisplay';
import { isValidCommentsVisibility } from '../utils';
import { tryInferZipPayloadCommentType } from '../library/EncodingVerifierUtils';

export type {
  CommentItem,
  CommentFormData,
  CommentAuthorType,
  CommentContentType,
} from '../types/comments';

export interface UseCommentsParams {
  commentsId: number;
  headingCommentCount?: string;
  _for: 'course' | 'quiz' | 'tutorial';
}

const defaultHeadingCommentCount = (count: number) => `${count} comments`;

// Spacing between depth tiers when flattening nested replies.
// With MAX_DEPTH = 3, tier boundaries are at depths 3, 6, 9, 12, ...
const MAX_DEPTH = 3;

export const useComments = ({
  commentsId,
  headingCommentCount,
  _for,
}: UseCommentsParams) => {
  const dispatch = useDispatch<AppDispatch>();
  const commentsSelector = useMemo(
    () => selectCommentsFor(_for, commentsId),
    [_for, commentsId]
  );
  const comments = useSelector(commentsSelector, shallowEqual);

  const isOpenSelector = useMemo(
    () => selectIsCommentsOpen(_for, commentsId),
    [_for, commentsId]
  );

  const isOpen: boolean | undefined = useSelector(isOpenSelector);

  const shouldShowSubmitHeadingSelector = useMemo(
    () => selectShouldShowSubmitHeading(_for, commentsId),
    [_for, commentsId]
  );
  const shouldShowSubmitHeading = useSelector(shouldShowSubmitHeadingSelector);

  const [isSubmitHeadingLoading, setIsSubmitHeadingLoading] =
    React.useState(false);
  const submitHeadingLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearSubmitHeadingLoadingTimer = React.useCallback(() => {
    if (submitHeadingLoadingTimerRef.current) {
      clearTimeout(submitHeadingLoadingTimerRef.current);
      submitHeadingLoadingTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => clearSubmitHeadingLoadingTimer, [
    clearSubmitHeadingLoadingTimer,
  ]);

  const parentsSelector = useMemo(
    () => selectParents(_for, commentsId),
    [_for, commentsId]
  );
  const parentIDs: number[] = useSelector(parentsSelector, shallowEqual);

  const countLabel =
    headingCommentCount ?? defaultHeadingCommentCount(comments.length);
  const headingLabel = isOpen ? countLabel : 'click here to view comments';

  const handleFetchComments = React.useCallback(() => {
    switch (_for) {
      case 'course':
        dispatch(fetchCourseComments({ commentsId, parentIDs }));
        break;
      case 'tutorial':
        dispatch(fetchTutorialComments({ commentsId, parentIDs }));
        break;
      case 'quiz':
        dispatch(fetchQuizComments({ commentsId, parentIDs }));
        break;
    }
  }, [_for, commentsId, parentIDs, dispatch]);

  const handleToggleComments = React.useCallback(() => {
    dispatch(toggleCommentsOpen({ _for, commentsId }));
    if (isOpen === undefined) handleFetchComments();
  }, [_for, commentsId, parentIDs, isOpen, dispatch, handleFetchComments]);

  const handleToggleSubmitHeading = React.useCallback(() => {
    // When the user clicks to hide the submit heading, the store may quickly
    // switch it back to `true` once async data arrives. To prevent flicker,
    // keep it visible for 2 seconds and show a loading placeholder.
    if (shouldShowSubmitHeading) {
      clearSubmitHeadingLoadingTimer();
      setIsSubmitHeadingLoading(true);
      submitHeadingLoadingTimerRef.current = setTimeout(() => {
        setIsSubmitHeadingLoading(false);
        submitHeadingLoadingTimerRef.current = null;
      }, 2000);
    } else {
      // If it's currently hidden, allow the toggle to take effect immediately.
      clearSubmitHeadingLoadingTimer();
      setIsSubmitHeadingLoading(false);
    }

    dispatch(toggleSubmitHeading({ _for, commentsId }));
  }, [
    dispatch,
    _for,
    commentsId,
    shouldShowSubmitHeading,
    clearSubmitHeadingLoadingTimer,
  ]);

  const [expandedMoreReplies, setExpandedMoreReplies] = React.useState<
    Set<CommentItem['id']>
  >(new Set());
  const [replyToId, setReplyToId] = React.useState<CommentItem['id'] | null>(
    null
  );
  const [editingCommentId, setEditingCommentId] = React.useState<
    CommentItem['id'] | null
  >(null);
  const [replyVisibility, setReplyVisibility] = React.useState<string>('UNSELECTED');
  const [editVisibility, setEditVisibility] = React.useState<string>('UNSELECTED');

  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const byId = React.useMemo(
    () =>
      new Map<CommentItem['id'], CommentItem>(
        comments.map((c) => [String(c.id), c])
      ),
    [comments]
  );
  const getDepth = React.useCallback(
    (c: CommentItem) => getCommentDepth(c, byId),
    [byId]
  );

  const displayItems = React.useMemo(
    () =>
      buildDisplayItemsUtil(
        comments,
        getDepth,
        expandedMoreReplies,
        MAX_DEPTH
      ),
    [comments, getDepth, expandedMoreReplies]
  );

  const showMoreReplies = React.useCallback(
    (comment: CommentItem, runWasEmpty: boolean) => {
      const { id: commentId, contentType } = comment;  
      setExpandedMoreReplies((prev) => new Set(prev).add(String(commentId)));
      const payload = { _for, commentsId, id: String(commentId), runWasEmpty, type: contentType }
      dispatch(   clearHasMoreReplies(payload));
    },
    [dispatch, _for, commentsId]
  );

  const onToggleHasMoreReplies = React.useCallback(
    (id: string) => {
      dispatch(toggleHasMoreReplies({ _for, commentsId, id }));
    },
    [dispatch, _for, commentsId]
  );

  const onToggleCommentTagged = React.useCallback(
    (id: string) => {
      dispatch(toggleCommentTagged({ _for, commentsId, id }));
    },
    [dispatch, _for, commentsId]
  );

  const onShowMoreReplies = React.useCallback(
    (comment: CommentItem, runWasEmpty: boolean) => {
      showMoreReplies(comment, runWasEmpty);
    },
    [showMoreReplies]
  );

  const toggleDepthReplies = React.useCallback(
    (commentId: CommentItem['id']) => {
      const targetIdStr = String(commentId);
      setExpandedMoreReplies((prev) => {
        const next = new Set(prev);
        const isCurrentlyExpanded = next.has(targetIdStr);

        if (!isCurrentlyExpanded) {
          // Expanding only this depth tier.
          next.add(targetIdStr);
          return next;
        }

        // Collapsing: remove this boundary and all descendant tier-boundary
        // comments under it so everything below this depth is hidden.
        next.delete(targetIdStr);

        const target = byId.get(targetIdStr);
        if (!target) return next;

        const targetDepth = getDepth(target);

        for (const c of comments) {
          const cidStr = String(c.id);
          if (!next.has(cidStr)) continue;

          const depth = getDepth(c);
          // Only consider deeper tier-boundary comments.
          if (!(depth > targetDepth && depth > 0 && depth % MAX_DEPTH === 0)) {
            continue;
          }

          // Check if this comment is a descendant of the target boundary.
          let parentId =
            c.parentId != null ? String(c.parentId) : null;
          let isDescendant = false;
          while (parentId != null) {
            if (parentId === targetIdStr) {
              isDescendant = true;
              break;
            }
            const parent = byId.get(parentId);
            parentId =
              parent && parent.parentId != null
                ? String(parent.parentId)
                : null;
          }

          if (isDescendant) {
            next.delete(cidStr);
          }
        }

        return next;
      });
    },
    [byId, comments, getDepth]
  );

  const toggleReplyBox = React.useCallback((commentId: CommentItem['id']) => {
    const idStr = String(commentId);
    setReplyToId((prev) => (prev === idStr ? null : idStr));
    setEditingCommentId(null);
    const target = byId.get(idStr);
    setReplyVisibility(
      (target && target.visibility) && isValidCommentsVisibility(target.visibility)
        ? target.visibility
        : 'UNSELECTED'
    );
  }, [byId]);

  const userid = useSelector((state: RootState) => state.session.userid);
  const authorName = useSelector((state: RootState) => state.session.username);
  const mutateRole = useSelector((state: RootState) => state.session.mutateRole);

  const handleSubmitComment = React.useCallback(
    (data: CommentFormData) => {
      if (!data.message.trim() || userid === undefined) return;
      const visibility =
        data.visibility && isValidCommentsVisibility(data.visibility)
          ? data.visibility
          : undefined;
      const encodedType = tryInferZipPayloadCommentType(
        data.message,
        authorName ?? '',
      );
      const type: CommentContentType = encodedType ?? 'message';
      dispatch(
        addComment({
          _for,
          parentIDs,
          commentsId,
          visibility,
          userId: userid,
          body: data.message,
          authorName: authorName ?? 'Unknown',
          userRole: mutateRole ?? 'ROLE_USER',
          type,
        })
      );
    },
    [dispatch, _for, commentsId, mutateRole, parentIDs, authorName]
  );

  const handleReplyClick = React.useCallback(() => {
    const body = replyTextareaRef.current?.value ?? '';
    if (!body.trim() || !replyToId || userid === undefined) return;
    const parentIdStr = String(replyToId);

    // Expand tier-boundary ancestors *before* adding the reply so the next render
    // already has the right expansion when the new reply is in the store.
    const parent = byId.get(parentIdStr);
    if (parent) {
      const parentDepth = getDepth(parent);
      const newReplyDepth = parentDepth + 1;
      if (newReplyDepth > MAX_DEPTH) {
        const toExpand: string[] = [];
        let ancestorId: string | null = parentIdStr;
        while (ancestorId != null) {
          const ancestor = byId.get(ancestorId);
          if (!ancestor) break;
          const d = getDepth(ancestor);
          if (d > 0 && d % MAX_DEPTH === 0) {
            toExpand.push(String(ancestor.id));
          }
          ancestorId =
            ancestor.parentId != null ? String(ancestor.parentId) : null;
        }
        if (toExpand.length > 0) {
          setExpandedMoreReplies((prev) => {
            const next = new Set(prev);
            for (const id of toExpand) next.add(id);
            return next;
          });
        }
      }
    }

    const visibility =
      replyVisibility && isValidCommentsVisibility(replyVisibility)
        ? replyVisibility
        : undefined;

    const encodedType = tryInferZipPayloadCommentType(body, authorName ?? '');
    const type: CommentContentType = encodedType ?? 'message';

    dispatch(
      addReply({
        _for,
        body,
        commentsId,
        userId: userid,
        parentId: parentIdStr,
        authorName: authorName ?? 'Unknown',
        userRole: mutateRole ?? 'ROLE_USER',
        visibility,
        type,
      })
    );
    setReplyToId(null);
    replyTextareaRef.current = null;
  }, [
    dispatch,
    _for,
    commentsId,
    replyToId,
    userid,
    authorName,
    mutateRole,
    byId,
    getDepth,
    replyVisibility,
  ]);

  const handleUpdateClick = React.useCallback(
    (commentId: CommentItem['id']) => {
      const idStr = String(commentId);
      if (editingCommentId === idStr) {
        editTextareaRef.current = null;
        setEditingCommentId(null);
      } else {
        setReplyToId(null);
        setEditingCommentId(idStr);
        const target = byId.get(idStr);
        setEditVisibility(
          (target && target.visibility) && isValidCommentsVisibility(target.visibility)
            ? target.visibility
            : 'UNSELECTED'
        );
      }
    },
    [editingCommentId, byId]
  );

  const handleEditSave = React.useCallback(() => {
    const body = editTextareaRef.current?.value ?? '';
    if (!body.trim() || !editingCommentId) return;
    const editing = byId.get(String(editingCommentId));
    if (
      editing &&
      editing.contentType !== 'message'
    ) {
      const inferred = tryInferZipPayloadCommentType(body, authorName ?? '');
      if (inferred !== editing.contentType) {
        dispatch(
          prependError(
            `Comment body must match this comment's type (${editing.contentType}). ` +
              `Inferred: ${inferred ?? 'plain message (not signed zip payload)'}. ` +
              'Use Paste with the correct clipboard content.'
          )
        );
        return;
      }
    }
    const visibility =
      editVisibility && isValidCommentsVisibility(editVisibility)
        ? editVisibility
        : undefined;
    dispatch(
      updateComment({ _for, commentsId, id: editingCommentId, body, visibility })
    );
    setEditingCommentId(null);
    editTextareaRef.current = null;
  }, [
    dispatch,
    _for,
    commentsId,
    editingCommentId,
    editVisibility,
    byId,
    authorName,
  ]);

  const handleEditCancel = React.useCallback(() => {
    setEditingCommentId(null);
    editTextareaRef.current = null;
  }, []);

  const onReplyCancel = React.useCallback(() => setReplyToId(null), []);

  return {
    isOpen,
    countLabel,
    headingLabel,
    shouldShowSubmitHeading,
    isSubmitHeadingLoading,
    comments,
    byId,
    displayItems,
    replyToId,
    editingCommentId,
    expandedMoreReplies,
    replyVisibility,
    editVisibility,
    replyTextareaRef,
    editTextareaRef,
    handleSubmitComment,
    handleToggleComments,
    handleToggleSubmitHeading,
    onToggleHasMoreReplies,
    onToggleCommentTagged,
    onShowMoreReplies,
    toggleReplyBox,
    handleUpdateClick,
    handleReplyClick,
    handleEditSave,
    handleEditCancel,
    onReplyCancel,
    toggleDepthReplies,
    setReplyVisibility,
    setEditVisibility,
  };
};

