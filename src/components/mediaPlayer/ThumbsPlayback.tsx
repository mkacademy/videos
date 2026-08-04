import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { isMimeOnlyMediaUrl, resolveMediaSlotSrc } from '../../library/imageUtils';
import { placeholder, textEllipsis } from '../../utils';
import { clearChunkBuffer, updateChunkBuffer } from '../../store/slices/playbackSlice';
import MediaScreenSwitcher from '../MediaScreenSwitcher';
import { useChangeMediaOnEscape } from '../../Hooks/useChangeMediaOnEscape';
import {
  collectThumbsBufferingEntries,
  type ThumbsPlaylistItem,
} from './mediaThumbsUtils';
import * as styles from '../../styles/mediaPlayer.module.css';

const THUMBS_ASPECT_RATIO = 16 / 9;
/** Progress row under the main image. */
const META_ROW_RESERVE_PX = 64;
/** Thumbnail strip card (header + horizontal thumbs). */
const PLAYLIST_RESERVE_PX = 220;
const LAYOUT_GAP_PX = 20;
const BOTTOM_PADDING_PX = 24;
const MIN_FRAME_HEIGHT_PX = 120;

type ThumbsPlaybackProps = {
  title: string;
  items: ThumbsPlaylistItem[];
  kind: 'tutorial' | 'course';
  onChangeMedia: () => void;
  onMainImageClick?: (item: ThumbsPlaylistItem) => void;
  onToggleHighlight?: (item: ThumbsPlaylistItem) => void;
  tabs: React.ReactNode;
};

const ThumbsPlayback: React.FC<ThumbsPlaybackProps> = ({
  title,
  items,
  kind,
  onChangeMedia,
  onMainImageClick,
  onToggleHighlight,
  tabs,
}) => {
  const dispatch = useDispatch();
  const boundsRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const bufferQueueLoadedForRef = useRef<string | null>(null);

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

  const updateFrameSize = useCallback(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;

    const maxWidth = bounds.clientWidth;
    if (maxWidth <= 0) return;

    const top = bounds.getBoundingClientRect().top;
    const maxHeight = Math.max(
      MIN_FRAME_HEIGHT_PX,
      window.innerHeight
        - top
        - META_ROW_RESERVE_PX
        - PLAYLIST_RESERVE_PX
        - LAYOUT_GAP_PX
        - BOTTOM_PADDING_PX,
    );

    let width = maxWidth;
    let height = Math.round(width / THUMBS_ASPECT_RATIO);
    if (height > maxHeight) {
      height = maxHeight;
      width = Math.round(height * THUMBS_ASPECT_RATIO);
    }

    setFrameSize((prev) => (
      prev?.width === width && prev?.height === height ? prev : { width, height }
    ));
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

  const activeItem = items[activeIndex] ?? items[0] ?? null;
  const mainSrc = activeItem ? resolveMediaSlotSrc(activeItem.imageurl) : placeholder;

  const awaitingCount = useMemo(
    () => items.filter((item) => isMimeOnlyMediaUrl(item.imageurl)).length,
    [items],
  );
  const readyCount = items.length - awaitingCount;

  const handleMainImageClick = () => {
    if (!activeItem || !onMainImageClick) return;
    onMainImageClick(activeItem);
  };

  const renderThumbItem = (item: ThumbsPlaylistItem, index: number) => {
    const awaiting = isMimeOnlyMediaUrl(item.imageurl);
    const thumbSrc = resolveMediaSlotSrc(item.imageurl);
    const isActive = index === activeIndex;

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
            {textEllipsis(item.title || `Image ${index + 1}`, 15)}
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
            image
            {items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className={styles['headerActions']}>
          <MediaScreenSwitcher />
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
            ? `Still downloading images: ${readyCount} / ${items.length} ready`
            : `Images are not ready yet: ${awaitingCount} buffering`}
        </Alert>
      )}

      <div className={styles['layout']}>
        <Card className={styles['playerCard']}>
          <div ref={boundsRef} className={styles['videoBounds']}>
            <div
              className={styles['videoStack']}
              style={frameSize
                ? { width: frameSize.width, height: frameSize.height }
                : { width: '100%', aspectRatio: '16 / 9' }}
            >
              <img
                src={mainSrc}
                alt={activeItem?.title ?? title}
                className={`${styles['video']} ${styles['thumbsImage']}${
                  onMainImageClick ? ` ${styles['thumbsImageClickable']}` : ''
                }`}
                onClick={handleMainImageClick}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = placeholder;
                }}
              />
            </div>
          </div>
          <div className={styles['metaRow']}>
            <div className={styles['progressText']}>
              {activeItem
                ? `${activeIndex + 1} / ${items.length} · ${activeItem.title || `Image ${activeIndex + 1}`}`
                : 'No images'}
            </div>
          </div>
        </Card>

        <Card className={styles['playlistCard']}>
          <div className={styles['playlistHeaderRow']}>
            <div className={styles['playlistHeader']}>
              Thumbnails
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

export default ThumbsPlayback;
