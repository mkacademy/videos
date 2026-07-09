import React from 'react';
import { Col, Row } from 'react-bootstrap';
import CommentForm from './CommentForm';
import CommentRow from './CommentRow';
import * as styles from '../../styles/comments.module.css';
import type { CommentFormData } from '../../types/comments';
import { useComments } from '../../Hooks/useComments';

export type {
  CommentItem,
  CommentFormData,
  CommentAuthorType,
} from '../../types/comments';

export type CommentContentType = 'message' | 'tutorial' | 'course' | 'quiz';

/** Parse composite id to { userId, commentId } */
export function parseCommentId(id: string): { userId: string; commentId: string } {
  const [userId, commentId] = id.split(':');
  return { userId: userId ?? '', commentId: commentId ?? '' };
}

/** Build composite id from (userId, commentId) */
export function toCommentId(
  userId: string | number,
  commentId: string | number
): string {
  return `${userId}:${commentId}`;
}

export interface CommentsProps {
  commentsId: number;
  headingYourComment?: string;
  headingCommentCount?: string;
  formErrorMessage?: React.ReactNode;
  _for: 'course' | 'quiz' | 'tutorial';
  onSubmitComment?: (data: CommentFormData) => void;
}

const defaultHeadingYourComment = 'show more comments';

const Comments: React.FC<CommentsProps> = ({
  commentsId,
  headingCommentCount,
  headingYourComment = defaultHeadingYourComment,
  _for,
}) => {
  const {
    isOpen,
    countLabel,
    headingLabel,
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
    shouldShowSubmitHeading,
    handleToggleSubmitHeading,
    isSubmitHeadingLoading,
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
  } = useComments({
    commentsId,
    headingCommentCount,
    _for,
  });

  return (
    <div className={styles['root']}>
      <Row>
        <Col lg={12}>
          <div className={styles['sidebarItem']}>
            <div
              className={styles['sidebarHeading']}
              role="button"
              tabIndex={0}
              onClick={handleToggleComments}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleComments();
                }
              }}
              aria-label={
                isOpen
                  ? `Hide comments (${countLabel})`
                  : 'Click here to view comments'
              }
            >
              <h2>{headingLabel}</h2>
            </div>
            {isOpen && (
              <div className={styles['content']}>
                <ul className={styles['commentsList']}>
                  {displayItems.map((item) => {
                    if (item.type !== 'comment') return null;
                    const { comment, depth, showMore } = item;
                    const commentIdStr = String(comment.id);
                    const isReplying = replyToId === commentIdStr;
                    const isEditing = editingCommentId === commentIdStr;
                    const editedComment = editingCommentId
                      ? byId.get(String(editingCommentId))
                      : null;
                    const isParentOfEdited =
                      !!editedComment?.parentId &&
                      editedComment.parentId === comment.id;
                    const runLength = showMore?.comments.length ?? 0;
                    const isExpanded = expandedMoreReplies.has(commentIdStr);
                    return (
                      <CommentRow
                        key={commentIdStr}
                        _for={_for}
                        commentsId={commentsId}
                        commentId={commentIdStr}
                        depth={depth}
                        runLength={runLength}
                        isExpanded={isExpanded}
                        isReplying={isReplying}
                        isEditing={isEditing}
                        isParentOfEdited={isParentOfEdited}
                        replyVisibility={isReplying ? replyVisibility : 'UNSELECTED'}
                        editVisibility={isEditing ? editVisibility : 'UNSELECTED'}
                        onToggleHasMoreReplies={onToggleHasMoreReplies}
                        onToggleCommentTagged={onToggleCommentTagged}
                        onToggleReplyBox={toggleReplyBox}
                        onUpdateClick={handleUpdateClick}
                        onShowMoreReplies={onShowMoreReplies}
                        replyTextareaRef={replyTextareaRef}
                        editTextareaRef={editTextareaRef}
                        onReplyCancel={onReplyCancel}
                        onReplySubmit={handleReplyClick}
                        onEditCancel={handleEditCancel}
                        onEditSave={handleEditSave}
                        onToggleDepthReplies={toggleDepthReplies}
                        onChangeReplyVisibility={setReplyVisibility}
                        onChangeEditVisibility={setEditVisibility}
                      />
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </Col>
        <Col lg={12}>
          <div
            className={`${styles['sidebarItem']} ${styles['submitComment']}`}
          >
            {(shouldShowSubmitHeading || isSubmitHeadingLoading) && (
              <div
                className={styles['sidebarHeading']}
                role="button"
                tabIndex={0}
                onClick={handleToggleSubmitHeading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleSubmitHeading();
                  }
                }}
              >
                <h2>
                  {isSubmitHeadingLoading
                    ? 'loading.. please wait'
                    : headingYourComment}
                </h2>
              </div>
            )}
            {isOpen && <CommentForm onSubmitComment={handleSubmitComment} />}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Comments;
