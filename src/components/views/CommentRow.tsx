import React from 'react';
import { useSelector, useStore } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import {
  applyBannerClipboardPasteRound,
  awaitBannerClipboardPasteButtonFeedback,
  buildTreesFromBannerClipboardIds,
} from '../../library/bannerClipboardTrees';
import { readClipboardBannerIdsThenClear } from '../../library/EncodingVerifierUtils';
import { avatars } from '../../library/commsUtils';
import type { CommentAuthorType, CommentContentType, CommentItem } from '../../types/comments';
import { selectCommentById } from '../../store/slices/commentsSlice';
import { commentsVisibilityAliases } from '../../utils';
import * as styles from '../../styles/comments.module.css';
import type { RootState } from '../../store';
import FormErrorMessage from '../Formulator/FormErrorMessage';

/** Parcel resolves default PNG imports as a module object; `new URL` yields a real string URL. */
const courseMessageIcon = new URL(
  '../../Images/course_message.png',
  import.meta.url
).href;
const quizMessageIcon = new URL(
  '../../Images/quiz_message.png',
  import.meta.url
).href;
const tutorialMessageIcon = new URL(
  '../../Images/tutorial_message.png',
  import.meta.url
).href;
const plainMessageIcon = new URL(
  '../../Images/plain_message.png',
  import.meta.url
).href;
const taggedIcon = new URL('../../Images/tagged.png', import.meta.url).href;

const getAvatarForComment = (type: CommentAuthorType): string => avatars[type];
const messageIconsByType = {
  course: courseMessageIcon,
  quiz: quizMessageIcon,
  tutorial: tutorialMessageIcon,
  message: plainMessageIcon,
} as const;

const isMessageIconType = (
  contentType: CommentContentType
): contentType is keyof typeof messageIconsByType =>
  contentType === 'course' ||
  contentType === 'quiz' ||
  contentType === 'tutorial' ||
  contentType === 'message';

const COMMENT_BODY_DISPLAY_MAX_LEN = 200;

/** Props for a single comment row. Primitives + stable callbacks so React.memo can skip re-renders when only another comment changes. */
export interface CommentRowProps {
  _for: 'course' | 'quiz' | 'tutorial';
  commentsId: number;
  commentId: string;
  depth: number;
  /** Number of replies in the collapsed "run" for this comment (structural, from buildDisplayItems). Row derives hasShowMore from this + store's comment.hasMoreReplies. */
  runLength: number;
  isExpanded: boolean;
  isReplying: boolean;
  isEditing: boolean;
  isParentOfEdited: boolean;
  replyVisibility: string;
  editVisibility: string;
  onToggleHasMoreReplies: (id: string) => void;
  onToggleCommentTagged: (id: string) => void;
  onToggleReplyBox: (id: string) => void;
  onUpdateClick: (id: string) => void;
  onShowMoreReplies: (comment: CommentItem, runWasEmpty: boolean) => void;
  onToggleDepthReplies: (id: string) => void;
  replyTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  editTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onReplyCancel: () => void;
  onReplySubmit: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onChangeReplyVisibility: (value: string) => void;
  onChangeEditVisibility: (value: string) => void;
}

/** Subscribes to the store for this comment only, so toggling hasMoreReplies (or any comment field) only re-renders this row. */
const CommentRow = React.memo(function CommentRow({
  _for,
  commentsId,
  commentId,
  depth,
  runLength,
  isExpanded,
  isReplying,
  isEditing,
  isParentOfEdited,
  replyVisibility,
  editVisibility,
  onToggleHasMoreReplies,
  onToggleCommentTagged,
  onToggleReplyBox,
  onUpdateClick,
  onShowMoreReplies,
  onToggleDepthReplies,
  replyTextareaRef,
  editTextareaRef,
  onReplyCancel,
  onReplySubmit,
  onEditCancel,
  onEditSave,
  onChangeReplyVisibility,
  onChangeEditVisibility,
}: CommentRowProps) {
  const store = useStore<RootState>();
  const [replyPasteDisabled, setReplyPasteDisabled] = React.useState(false);
  const [editPasteDisabled, setEditPasteDisabled] = React.useState(false);
  const pasteActionMountedRef = React.useRef(true);
  React.useEffect(() => {
    pasteActionMountedRef.current = true;
    return () => {
      pasteActionMountedRef.current = false;
    };
  }, []);

  const showCopyIcons = useSelector(
    (state: RootState) => state.settings.showCopyIcons
  );
  const aquiredClipboardConsent = useSelector(
    (state: RootState) => state.settings.aquiredClipboardConsent
  );
  const canUseClipboard = showCopyIcons && aquiredClipboardConsent;

  const runPasteBannerIdsIntoTextarea = React.useCallback(
    async (
      ref: React.RefObject<HTMLTextAreaElement | null>,
      setBusy: (v: boolean) => void,
    ) => {
      if (!canUseClipboard) return;
      setBusy(true);
      try {
        await awaitBannerClipboardPasteButtonFeedback(async () => {
          const ids = await readClipboardBannerIdsThenClear(showCopyIcons, aquiredClipboardConsent);
          const byKind = buildTreesFromBannerClipboardIds(
            store.getState(),
            ids,
          );
          await applyBannerClipboardPasteRound(byKind, ref.current);
        });
      } finally {
        if (pasteActionMountedRef.current) setBusy(false);
      }
    },
    [store, canUseClipboard, showCopyIcons, aquiredClipboardConsent],
  );

  const selector = React.useMemo(
    () => selectCommentById(_for, commentsId, commentId),
    [_for, commentsId, commentId]
  );
  const comment = useSelector(selector);
  if (!comment) return null;

  const authenticated = useSelector(
    (state: RootState) => state.session.authenticated
  );
  const { pathname, search } = useLocation();
  const redirectUrl = encodeURIComponent(pathname + (search || ""));
  const isReply = depth > 0;
  const hasShowMore =
    (comment.hasMoreReplies || runLength > 0) && !isExpanded;
  const runWasEmpty = runLength === 0;
  const showMessageIcon =
    showCopyIcons && isMessageIconType(comment.contentType);
  const messageIconSrc = showMessageIcon
    ? comment.tagged
      ? taggedIcon
      : messageIconsByType[comment.contentType]
    : undefined;
  const editBodyIsPlainMessage = comment.contentType === 'message';
  return (
    <li
      className={`${styles['commentItem']} ${isReply ? styles['replied'] : ''} ${isReplying ? styles['commentItemActive'] : ''} ${isParentOfEdited ? styles['parentOfEditing'] : ''}`}
      style={
        { ['--depth' as string]: depth } as React.CSSProperties
      }
    >
      <div className={styles['commentRow']}>
        <div
          className={styles['authorThumb']}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditing) onToggleHasMoreReplies(commentId);
          }}
          onKeyDown={(e) => {
            if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              e.stopPropagation();
              onToggleHasMoreReplies(commentId);
            }
          }}
          aria-label={`Toggle more replies for ${comment.authorName}`}
        >
          <img
            src={
              comment.avatarUrl ?? getAvatarForComment(comment.userRole)
            }
            alt=""
          />
        </div>
        <div
          className={styles['rightContent']}
          role="button"
          tabIndex={0}
          onClick={() => !isEditing && onToggleReplyBox(commentId)}
          onKeyDown={(e) => {
            if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onToggleReplyBox(commentId);
            }
          }}
          aria-expanded={isReplying}
          aria-label={`Reply to ${comment.authorName}`}
        >
          <h4
            {...(isExpanded && {
              role: 'button' as const,
              tabIndex: 0,
              'aria-expanded': true,
              'aria-label': `Collapse replies for ${comment.authorName}`,
            })}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing && isExpanded) onToggleDepthReplies(commentId);
            }}
            onKeyDown={(e) => {
              if (!isEditing && isExpanded && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                e.stopPropagation();
                onToggleDepthReplies(commentId);
              } else {
                e.stopPropagation();
              }
            }}
          >
            <span
              className={isExpanded ? styles['authorNameCollapsible'] : undefined}
            >
              {comment.authorName}
            </span>
            <span
              className={styles['date']}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateClick(commentId);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onUpdateClick(commentId);
                }
              }}
              aria-label={`Edit comment from ${comment.date}`}
            >
              {comment.date}
            </span>
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
          {showMessageIcon && messageIconSrc && (
            <button
              type="button"
              className={styles['messageIconButton']}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCommentTagged(commentId);
              }}
              aria-label={
                comment.tagged
                  ? 'Tagged — click to remove tag'
                  : `Tag ${comment.contentType} message`
              }
            >
              <img
                src={messageIconSrc}
                alt={
                  comment.tagged ? 'Tagged' : `${comment.contentType} message`
                }
                className={styles['messageIconImage']}
              />
            </button>
          )}
        </div>
      </div>
      {isReplying && (
        <div className={styles['replyBox']}>
          {authenticated ? (
            comment.commentId == null || comment.commentId < 0 ? (
              <p className={styles['replySavingMessage']}>
                Saving comment... please wait
              </p>
            ) : (
              <>
                <textarea
                  ref={replyTextareaRef}
                  rows={3}
                  placeholder="Write a reply..."
                  className={styles['replyTextarea']}
                  autoFocus
                />
                <div className={styles['replyActions']}>
                  <select
                    className="form-select"
                    style={{ maxWidth: '8rem' }}
                    value={replyVisibility}
                    onChange={(e) => onChangeReplyVisibility(e.target.value)}
                  >
                    {Object.entries(commentsVisibilityAliases).map(
                      ([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={onReplyCancel}
                    className={styles['replyCancelButton']}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onReplySubmit}
                    className={styles['mainButton']}
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    disabled={!canUseClipboard || replyPasteDisabled}
                    aria-busy={replyPasteDisabled || undefined}
                    onClick={() => {
                      void runPasteBannerIdsIntoTextarea(
                        replyTextareaRef,
                        setReplyPasteDisabled,
                      );
                    }}
                    className={styles['pasteButton']}
                  >
                    Paste
                  </button>
                </div>
              </>
            )
          ) : (
            <FormErrorMessage>
              <p>
                Create an{' '}
                <Link to="/register" style={{ color: '#ccc' }}>
                  account
                </Link>{' '}
                or{' '}
                <Link
                  to={`/login?redirectUrl=${redirectUrl}`}
                  style={{ color: '#ccc' }}
                >
                  log in
                </Link>{' '}
                to submit a reply.
              </p>
            </FormErrorMessage>
          )}
        </div>
      )}
      {isEditing && (
        <div className={styles['replyBox']}>
          {authenticated && comment.owner ? (
            <>
              <textarea
                ref={editTextareaRef}
                rows={3}
                placeholder="Edit your comment..."
                className={styles['replyTextarea']}
                defaultValue={comment.body}
                disabled={!editBodyIsPlainMessage}
                autoFocus={editBodyIsPlainMessage}
                aria-label={
                  editBodyIsPlainMessage
                    ? undefined
                    : 'Comment body; use the Paste button to change this comment.'
                }
              />
              <div className={styles['replyActions']}>
                <select
                  className="form-select"
                  style={{ maxWidth: '8rem' }}
                  value={editVisibility}
                  onChange={(e) => onChangeEditVisibility(e.target.value)}
                >
                  {Object.entries(commentsVisibilityAliases).map(
                    ([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    )
                  )}
                </select>
                <button
                  type="button"
                  onClick={onEditCancel}
                  className={styles['replyCancelButton']}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onEditSave}
                  className={styles['mainButton']}
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={!canUseClipboard || editPasteDisabled}
                  aria-busy={editPasteDisabled || undefined}
                  onClick={() => {
                    void runPasteBannerIdsIntoTextarea(
                      editTextareaRef,
                      setEditPasteDisabled,
                    );
                  }}
                  className={styles['pasteButton']}
                >
                  Paste
                </button>
              </div>
            </>
          ) : (
            <FormErrorMessage>
              {!authenticated ? (
                <p>
                  Create an{' '}
                  <Link to="/register" style={{ color: '#ccc' }}>
                    account
                  </Link>{' '}
                  or{' '}
                  <Link
                    to={`/login?redirectUrl=${redirectUrl}`}
                    style={{ color: '#ccc' }}
                  >
                    log in
                  </Link>{' '}
                  to edit your reply.
                </p>
              ) : (
                <p>
                  You can only edit comments you posted.
                </p>
              )}
            </FormErrorMessage>
          )}
        </div>
      )}
      {hasShowMore && (
        <div style={{ marginLeft: 130 }}>
          <button
            type="button"
            onClick={() => onShowMoreReplies(comment, runWasEmpty)}
            className={styles['collapseButton']}
          >
            show more replies
          </button>
        </div>
      )}
    </li>
  );
});

export default CommentRow;
