import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import type { AppDispatch } from '../store';
import {
  selectCommentsFor,
  selectIsCommentsOpen,
  selectParents,
  selectShouldShowSubmitHeading,
  toggleCommentsOpen,
  toggleSubmitHeading,
} from '../store/slices/commentsSlice';
import { fetchMessageComments } from '../store/thunks/fetchMessageComments';
import { buildDisplayItems as buildDisplayItemsUtil, getCommentDepth } from '../library/commentsDisplay';
import type { CommentItem } from '../types/comments';

export interface UseCommentsReadOnlyParams {
  commentsId: number;
  headingCommentCount?: string;
  _for: 'course' | 'quiz' | 'tutorial';
}

const defaultHeadingCommentCount = (count: number) => `${count} comments`;

const MAX_DEPTH = 3;

export function useCommentsReadOnly({
  commentsId,
  headingCommentCount,
  _for,
}: UseCommentsReadOnlyParams) {
  const dispatch = useDispatch<AppDispatch>();
  const commentsSelector = useMemo(
    () => selectCommentsFor(_for, commentsId),
    [_for, commentsId],
  );
  const comments = useSelector(commentsSelector, shallowEqual) as CommentItem[];

  const isOpenSelector = useMemo(
    () => selectIsCommentsOpen(_for, commentsId),
    [_for, commentsId],
  );
  const isOpen = useSelector(isOpenSelector);

  const shouldShowSubmitHeadingSelector = useMemo(
    () => selectShouldShowSubmitHeading(_for, commentsId),
    [_for, commentsId],
  );
  const shouldShowSubmitHeading = useSelector(shouldShowSubmitHeadingSelector);

  const [isSubmitHeadingLoading, setIsSubmitHeadingLoading] = useState(false);
  const submitHeadingLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parentsSelector = useMemo(
    () => selectParents(_for, commentsId),
    [_for, commentsId],
  );
  const parentIDs = useSelector(parentsSelector, shallowEqual);

  const byId = useMemo(() => {
    const map = new Map<string, CommentItem>();
    comments.forEach((c) => map.set(String(c.id), c));
    return map;
  }, [comments]);

  const getDepth = useMemo(
    () => (c: CommentItem) => getCommentDepth(c, byId),
    [byId],
  );

  const displayItems = useMemo(
    () => buildDisplayItemsUtil(comments, getDepth, new Set<string>(), MAX_DEPTH),
    [comments, getDepth],
  );

  const countLabel = headingCommentCount ?? defaultHeadingCommentCount(comments.length);
  const headingLabel = isOpen ? countLabel : 'click here to view comments';

  const clearSubmitHeadingLoadingTimer = () => {
    if (submitHeadingLoadingTimerRef.current) {
      clearTimeout(submitHeadingLoadingTimerRef.current);
      submitHeadingLoadingTimerRef.current = null;
    }
  };

  useEffect(() => () => clearSubmitHeadingLoadingTimer(), []);

  const handleFetchComments = () => {
    void dispatch(fetchMessageComments({ _for, commentsId, mode: 'initial' }));
  };

  const handleToggleComments = () => {
    dispatch(toggleCommentsOpen({ _for, commentsId }));
    if (isOpen === undefined) handleFetchComments();
  };

  const handleToggleSubmitHeading = () => {
    if (shouldShowSubmitHeading) {
      clearSubmitHeadingLoadingTimer();
      setIsSubmitHeadingLoading(true);
      submitHeadingLoadingTimerRef.current = setTimeout(() => {
        setIsSubmitHeadingLoading(false);
        submitHeadingLoadingTimerRef.current = null;
      }, 2000);
      void dispatch(fetchMessageComments({ _for, commentsId, mode: 'loadMore' }));
    } else {
      clearSubmitHeadingLoadingTimer();
      setIsSubmitHeadingLoading(false);
    }
    dispatch(toggleSubmitHeading({ _for, commentsId }));
  };

  return {
    isOpen,
    countLabel,
    headingLabel,
    byId,
    displayItems,
    parentIDs,
    shouldShowSubmitHeading,
    handleToggleComments,
    handleToggleSubmitHeading,
    isSubmitHeadingLoading,
  };
}
