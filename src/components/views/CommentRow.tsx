import React from 'react';
import { avatars } from '../../library/commsUtils';
import type { CommentAuthorType } from '../../types/comments';
import { selectCommentById } from '../../store/slices/commentsSlice';
import * as styles from '../../styles/comments.module.css';
import { useSelector } from 'react-redux';

const getAvatarForComment = (type: CommentAuthorType): string => avatars[type];

const COMMENT_BODY_DISPLAY_MAX_LEN = 200;

export interface CommentRowProps {
  _for: 'course' | 'quiz' | 'tutorial';
  commentsId: number;
  commentId: string;
  depth: number;
  runLength: number;
  isExpanded: boolean;
}

const CommentRow = React.memo(function CommentRow({
  _for,
  commentsId,
  commentId,
  depth,
  runLength,
  isExpanded,
}: CommentRowProps) {
  const selector = React.useMemo(
    () => selectCommentById(_for, commentsId, commentId),
    [_for, commentsId, commentId],
  );
  const comment = useSelector(selector);
  if (!comment) return null;

  const isReply = depth > 0;
  const hasShowMore = (comment.hasMoreReplies || runLength > 0) && !isExpanded;

  return (
    <li
      className={`${styles['commentItem']} ${isReply ? styles['replied'] : ''}`}
      style={{ ['--depth' as string]: depth } as React.CSSProperties}
    >
      <div className={styles['commentRow']}>
        <div className={styles['authorThumb']}>
          <img
            src={comment.avatarUrl ?? getAvatarForComment(comment.userRole)}
            alt=""
          />
        </div>
        <div className={styles['rightContent']}>
          <h4>
            <span>{comment.authorName}</span>
            <span className={styles['date']}>{comment.date}</span>
          </h4>
          <p
            className={styles['commentBody']}
            title={
              comment.body.length > COMMENT_BODY_DISPLAY_MAX_LEN
                ? comment.body
                : undefined
            }
          >
            {comment.body.length > COMMENT_BODY_DISPLAY_MAX_LEN
              ? `${comment.body.slice(0, COMMENT_BODY_DISPLAY_MAX_LEN)}...`
              : comment.body}
          </p>
        </div>
      </div>
      {hasShowMore && (
        <div style={{ marginLeft: 130 }}>
          <span className={styles['collapseButton']}>more replies available</span>
        </div>
      )}
    </li>
  );
});

export default CommentRow;
