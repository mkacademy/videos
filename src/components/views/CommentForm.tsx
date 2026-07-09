import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from 'react-redux';
import { RootState } from '../../store';
import type { CommentFormData } from '../../types/comments';
import { commentsVisibilityAliases } from '../../utils';
import {
  applyBannerClipboardPasteRound,
  awaitBannerClipboardPasteButtonFeedback,
  buildTreesFromBannerClipboardIds,
} from '../../library/bannerClipboardTrees';
import { readClipboardBannerIdsThenClear } from '../../library/EncodingVerifierUtils';
import * as styles from '../../styles/comments.module.css';
import FormErrorMessage from '../Formulator/FormErrorMessage';

export interface CommentFormProps {
  /** Called when the form is submitted with the entered data */
  onSubmitComment?: (data: CommentFormData) => void;
  /** Shown when the user is not authenticated (e.g. "You must be logged in to submit a comment.") */
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmitComment,
}) => {
  const store = useStore<RootState>();
  const authenticated = useSelector((state: RootState) => state.session.authenticated);
  const showCopyIcons = useSelector((state: RootState) => state.settings.showCopyIcons);
  const aquiredClipboardConsent = useSelector((state: RootState) => state.settings.aquiredClipboardConsent);
  const canUseClipboard = showCopyIcons && aquiredClipboardConsent;
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [pasteDisabled, setPasteDisabled] = useState(false);
  const pasteActionMountedRef = useRef(true);
  useEffect(() => {
    pasteActionMountedRef.current = true;
    return () => {
      pasteActionMountedRef.current = false;
    };
  }, []);
  const { pathname, search } = useLocation();
  const redirectUrl = encodeURIComponent(pathname + (search || ""));
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onSubmitComment) return;
    const form = e.currentTarget;
    const data: CommentFormData = {
      message:
        (form.querySelector('#comment-message') as HTMLTextAreaElement)?.value ??
        '',
      visibility: (form.querySelector('#comment-visibility') as HTMLSelectElement)
        ?.value,
    };
    onSubmitComment(data);
    form.reset();
  };

  const handlePasteClick = () => {
    if (!canUseClipboard) return;
    void (async () => {
      setPasteDisabled(true);
      try {
        await awaitBannerClipboardPasteButtonFeedback(async () => {
          const ids = await readClipboardBannerIdsThenClear(showCopyIcons, aquiredClipboardConsent);
          const byKind = buildTreesFromBannerClipboardIds(
            store.getState(),
            ids,
          );
          await applyBannerClipboardPasteRound(byKind, messageRef.current);
        });
      } finally {
        if (pasteActionMountedRef.current) setPasteDisabled(false);
      }
    })();
  };

  if (!authenticated)
    return (
      <FormErrorMessage>
        <p>
          Create an{' '}
          <Link to="/register" style={{ color: '#ccc' }}>
            account
          </Link>{' '}
          or{' '}
          <Link to={`/login?redirectUrl=${redirectUrl}`} style={{ color: '#ccc' }}>
            log in
          </Link>{' '}
          to submit a comment.
        </p>
      </FormErrorMessage>
    );

  return (
    <div className={styles['content']}>
      <form id="comment" onSubmit={handleSubmit}>
        <Row>
          <Col lg={12}>
            <fieldset>
              <textarea
                ref={messageRef}
                name="message"
                rows={6}
                id="comment-message"
                placeholder="Type your comment"
                required
              />
            </fieldset>
          </Col>
          <Col lg={12}>
            <fieldset className="d-flex flex-column align-items-center gap-2">
              <select
                id="comment-visibility"
                name="visibility"
                className="form-select"
                style={{ maxWidth: '23.5rem' }}
                defaultValue="UNSELECTED"
              >
                {Object.entries(commentsVisibilityAliases).map(
                  ([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  )
                )}
              </select>
              <div className={styles['commentFormSubmitRow']}>
                <button type="submit" className={styles['mainButton']}>
                  Submit
                </button>
                <button
                  type="button"
                  disabled={!canUseClipboard || pasteDisabled}
                  onClick={handlePasteClick}
                  className={styles['pasteButton']}
                  aria-busy={pasteDisabled || undefined}
                >
                  Paste
                </button>
              </div>
            </fieldset>
          </Col>
        </Row>
      </form>
    </div>
  );
};

export default CommentForm;
