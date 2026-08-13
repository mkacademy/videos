import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { isMimeOnlyMediaUrl, resolveMediaSlotSrc } from '../../library/imageUtils';
import { placeholder, textEllipsis } from '../../utils';
import { clearChunkBuffer, updateChunkBuffer } from '../../store/slices/playbackSlice';
import MediaScreenSwitcher from '../MediaScreenSwitcher';
import { useChangeMediaOnEscape } from '../../Hooks/useChangeMediaOnEscape';
import {
  useMediaFullscreenOpen,
  useMediaFullscreenReady,
} from '../../Hooks/useMediaFullscreen';
import {
  collectThumbsBufferingEntries,
  decodeMarkdownSlotText,
  type DocumentMediaKind,
  type ThumbsPlaylistItem,
} from './mediaThumbsUtils';
import MediaFullscreenCloseButton from './MediaFullscreenCloseButton';
import MediaFullscreenToggle from './MediaFullscreenToggle';
import MarkdownDocument from '../markdown/MarkdownDocument';
import LinkifiedText from '../LinkifiedText';
import * as styles from '../../styles/mediaPlayer.module.css';

/** Progress row under the main markdown pane. */
const META_ROW_RESERVE_PX = 64;
/** Thumbnail strip card (header + horizontal thumbs). */
const PLAYLIST_RESERVE_PX = 220;
const LAYOUT_GAP_PX = 20;
const BOTTOM_PADDING_PX = 24;
const MIN_FRAME_HEIGHT_PX = 160;

type MarkdownPlaybackProps = {
  title: string;
  items: ThumbsPlaylistItem[];
  kind: 'tutorial' | 'course';
  documentKind?: DocumentMediaKind;
  onChangeMedia: () => void;
  onMainDocumentClick?: (item: ThumbsPlaylistItem) => void;
  onToggleHighlight?: (item: ThumbsPlaylistItem) => void;
  tabs: React.ReactNode;
};

const MarkdownPlayback: React.FC<MarkdownPlaybackProps> = ({
  title,
  items,
  kind,
  documentKind = 'markdown',
  onChangeMedia,
  onMainDocumentClick,
  onToggleHighlight,
  tabs,
}) => {
  const dispatch = useDispatch();
  const boundsRef = useRef<HTMLDivElement>(null);
  const bufferQueueLoadedForRef = useRef<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [frameHeight, setFrameHeight] = useState<number | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState(false);
  const kindLabel = documentKind === 'text' ? 'text' : 'markdown';
  const kindTitle = documentKind === 'text' ? 'Text' : 'Markdown';

  useChangeMediaOnEscape(onChangeMedia);

  const structureSignature = useMemo(
    () => items.map((item) => item.id).join(','),
    [items],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [structureSignature]);

  useEffect(() => {
    if (items.length === 0) return;
    const queueKey = `${kind}:${structureSignature}`;
    if (bufferQueueLoadedForRef.current === queueKey) return;
    bufferQueueLoadedForRef.current = queueKey;

    const logs = collectThumbsBufferingEntries(items, kind);
    if (logs.length > 0) {
      dispatch(updateChunkBuffer(logs));
    }

    return () => {
      bufferQueueLoadedForRef.current = null;
      dispatch(clearChunkBuffer());
    };
    // Queue once per playlist layout; payload updates must not clear/re-queue the buffer.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items captured when structureSignature/kind change
  }, [dispatch, kind, structureSignature]);

  const activeItem = items[activeIndex] ?? items[0] ?? null;
  const activeImageurl = activeItem?.imageurl ?? '';
  const activeAwaiting = Boolean(activeItem && isMimeOnlyMediaUrl(activeItem.imageurl));

  useEffect(() => {
    let cancelled = false;
    setDocumentText(null);
    setDecodeError(false);

    if (!activeItem) return undefined;

    // Mime-only slots are still queued for bytesFetcher — keep loading until payload arrives.
    if (isMimeOnlyMediaUrl(activeItem.imageurl)) {
      return undefined;
    }

    void (async () => {
      const text = await decodeMarkdownSlotText(activeItem.imageurl);
      if (cancelled) return;
      if (text == null) {
        setDecodeError(true);
        setDocumentText(null);
        return;
      }
      setDocumentText(text);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeItem, activeImageurl]);

  const updateFrameSize = useCallback(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;

    const top = bounds.getBoundingClientRect().top;
    const height = Math.max(
      MIN_FRAME_HEIGHT_PX,
      window.innerHeight
        - top
        - META_ROW_RESERVE_PX
        - PLAYLIST_RESERVE_PX
        - LAYOUT_GAP_PX
        - BOTTOM_PADDING_PX,
    );

    setFrameHeight((prev) => (prev === height ? prev : height));
  }, []);

  useLayoutEffect(() => {
    updateFrameSize();

    const bounds = boundsRef.current;
    if (!bounds) return undefined;

    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(bounds);
    window.addEventListener('resize', updateFrameSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFrameSize);
    };
  }, [updateFrameSize]);

  const awaitingCount = useMemo(
    () => items.filter((item) => isMimeOnlyMediaUrl(item.imageurl)).length,
    [items],
  );
  const readyCount = items.length - awaitingCount;
  const activeReady = Boolean(activeItem && !activeAwaiting && documentText != null);
  useMediaFullscreenReady(activeReady);
  const { open: fullscreenOpen, close: closeFullscreen } = useMediaFullscreenOpen();

  useEffect(() => {
    if (!fullscreenOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreenOpen]);

  const handleMainDocumentClick = () => {
    if (!activeItem || !onMainDocumentClick) return;
    onMainDocumentClick(activeItem);
  };

  const renderThumbItem = (item: ThumbsPlaylistItem, index: number) => {
    const thumbSrc = resolveMediaSlotSrc(item.imageurl);
    const isActive = index === activeIndex;
    const awaiting = isMimeOnlyMediaUrl(item.imageurl);

    return (
      <button
        key={item.id}
        type="button"
        className={[
          styles['chunkItem'],
          isActive ? styles['chunkItemActive'] : '',
          item.isHighlighted ? styles['chunkItemHighlighted'] : '',
        ].filter(Boolean).join(' ')}
        onClick={() => setActiveIndex(index)}
      >
        <img
          src={thumbSrc}
          alt={item.title}
          className={styles['chunkThumbnail']}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = placeholder;
          }}
        />
        <div className={styles['chunkMeta']}>
          <div
            className={[
              styles['chunkTitle'],
              onToggleHighlight ? styles['titleClickable'] : '',
            ].filter(Boolean).join(' ')}
            title={item.title || undefined}
            role={onToggleHighlight ? 'button' : undefined}
            tabIndex={onToggleHighlight ? 0 : undefined}
            onClick={(e) => {
              if (!onToggleHighlight) return;
              e.preventDefault();
              e.stopPropagation();
              onToggleHighlight(item);
            }}
            onKeyDown={(e) => {
              if (!onToggleHighlight) return;
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              onToggleHighlight(item);
            }}
          >
            {textEllipsis(item.title || `${kindTitle} ${index + 1}`, 15)}
          </div>
          <div className={styles['chunkBadges']}>
            {isActive && <Badge bg="primary">Viewing</Badge>}
            {awaiting && <Badge bg="warning" text="dark">Buffering</Badge>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={`${styles['container']} ${styles['playerContainer']}`}>
      <div className={styles['headerRow']}>
        <div>
          <h1 className={styles['title']}>{title}</h1>
          <p className={styles['subtitle']}>
            {items.length}
            {' '}
            document
            {items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className={styles['headerActions']}>
          <MediaScreenSwitcher />
          <MediaFullscreenToggle />
          <Button
            variant="link"
            className={styles['changeMediaLink']}
            onClick={onChangeMedia}
            title={kind === 'course' ? 'Change course (Escape)' : 'Change tutorial (Escape)'}
          >
            {kind === 'course' ? 'Change course' : 'Change tutorial'}
          </Button>
        </div>
      </div>

      {tabs}

      {awaitingCount > 0 && (
        <Alert variant="warning" className="mb-3">
          {readyCount > 0
            ? `Still downloading ${kindLabel}: ${readyCount} / ${items.length} ready`
            : `${kindTitle} is not ready yet: ${awaitingCount} buffering`}
        </Alert>
      )}

      <div className={styles['layout']}>
        <Card className={styles['playerCard']}>
          <div
            ref={boundsRef}
            className={fullscreenOpen ? styles['fullscreenOverlay'] : styles['videoBounds']}
          >
            {fullscreenOpen && <MediaFullscreenCloseButton onClose={closeFullscreen} />}
            <div
              className={[
                styles['markdownPane'],
                onMainDocumentClick ? styles['markdownPaneClickable'] : '',
              ].filter(Boolean).join(' ')}
              style={fullscreenOpen
                ? undefined
                : frameHeight
                  ? { height: frameHeight }
                  : { height: MIN_FRAME_HEIGHT_PX }}
              onClick={(e) => {
                if (!onMainDocumentClick) return;
                const target = e.target as HTMLElement | null;
                if (target?.closest('a, button, input, textarea, select')) return;
                handleMainDocumentClick();
              }}
              role={onMainDocumentClick ? 'button' : undefined}
              tabIndex={onMainDocumentClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (!onMainDocumentClick) return;
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                handleMainDocumentClick();
              }}
            >
              {decodeError ? (
                <Alert variant="warning" className="mb-0">
                  Could not decode this {kindLabel} document.
                </Alert>
              ) : documentText == null ? (
                <div className={styles['markdownLoading']}>
                  {activeAwaiting ? `Downloading ${kindLabel}…` : `Loading ${kindLabel}…`}
                </div>
              ) : (
                <div className={[
                  styles['markdownBody'],
                  documentKind === 'text' ? styles['markdownBodyPlain'] : '',
                ].filter(Boolean).join(' ')}
                >
                  {documentKind === 'text'
                    ? <LinkifiedText text={documentText} />
                    : <MarkdownDocument>{documentText}</MarkdownDocument>}
                </div>
              )}
            </div>
          </div>
          <div className={styles['metaRow']}>
            <div className={styles['progressText']}>
              {activeItem
                ? `${activeIndex + 1} / ${items.length} · ${activeItem.title || `${kindTitle} ${activeIndex + 1}`}`
                : 'No documents'}
            </div>
          </div>
        </Card>

        <Card className={styles['playlistCard']}>
          <div className={styles['playlistHeaderRow']}>
            <div className={styles['playlistHeader']}>
              Documents
            </div>
          </div>
          <div className={styles['playlist']}>
            {items.map((item, index) => renderThumbItem(item, index))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MarkdownPlayback;
