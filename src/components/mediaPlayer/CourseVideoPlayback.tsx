import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import type { Banner as CourseBanner, SlideGroup } from '../../store/slices/courseSlice';
import { getVideoAspectRatioFromInitPayload } from '../../library/mseVideoPlayback';
import { isRenderableImageUrl } from '../../library/directoryTreeUtils';
import {
  buildCourseChunkBufferingLogEntries,
  collectChunkBufferingEntries,
  formatPlaybackMs,
  getCourseChunkPartRows,
  getPlaylistFmp4InitPayload,
  getPlaylistStructureSignature,
  isChunkAwaitingRemotePayload,
  isPlaylistChunkPlayable,
  type PlaylistChunk,
} from '../../library/videoChunkPlayback';
import { clearChunkBuffer, updateChunkBuffer } from '../../store/slices/playbackSlice';
import { useVideoChunkPlayer } from './useVideoChunkPlayer';
import * as styles from '../../styles/mediaPlayer.module.css';

type CourseVideoPlaybackProps = {
  title: string;
  chunkPlaylist: PlaylistChunk[];
  playlistError: string | null;
  expectedChunkCount: number;
  selectedCourseBanner: CourseBanner;
  selectedCourseSlideGroup: SlideGroup;
  autoPlay: boolean;
  onChangeMedia: () => void;
  onExit: () => void;
  onPlaylistFinished: () => void;
  tabs: React.ReactNode;
};

const CourseVideoPlayback: React.FC<CourseVideoPlaybackProps> = ({
  title,
  chunkPlaylist,
  playlistError,
  expectedChunkCount,
  selectedCourseBanner,
  selectedCourseSlideGroup,
  autoPlay,
  onChangeMedia,
  onExit,
  onPlaylistFinished,
  tabs,
}) => {
  const dispatch = useDispatch();
  const videoBoundsRef = useRef<HTMLDivElement>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const [videoFrameSize, setVideoFrameSize] = useState<{ width: number; height: number } | null>(null);
  const bufferQueueLoadedForRef = useRef<string | null>(null);

  const getPartRows = useCallback(
    (index: number) => getCourseChunkPartRows(
      selectedCourseBanner,
      selectedCourseSlideGroup,
      index,
    ),
    [selectedCourseBanner, selectedCourseSlideGroup],
  );

  const playableChunkCount = useMemo(
    () => chunkPlaylist.filter(isPlaylistChunkPlayable).length,
    [chunkPlaylist],
  );

  const playlistStructureSignature = useMemo(
    () => getPlaylistStructureSignature(chunkPlaylist),
    [chunkPlaylist],
  );

  useEffect(() => {
    setPlayerError(null);
  }, [playlistStructureSignature]);

  const playlistInitAspectRatio = useMemo(() => {
    const initPayload = getPlaylistFmp4InitPayload(chunkPlaylist);
    if (!initPayload) return null;
    return getVideoAspectRatioFromInitPayload(initPayload);
  }, [chunkPlaylist]);

  const displayChunks = useMemo(() => (
    chunkPlaylist.map((chunk) => ({
      ...chunk,
      thumbnailUrl: isPlaylistChunkPlayable(chunk) && isRenderableImageUrl(chunk.thumbnailUrl)
        ? chunk.thumbnailUrl
        : undefined,
    }))
  ), [chunkPlaylist]);

  const player = useVideoChunkPlayer({
    chunks: chunkPlaylist,
    autoPlay,
    onError: setPlayerError,
    onPlaylistFinished,
  });

  useEffect(() => {
    if (chunkPlaylist.length === 0) return;
    if (bufferQueueLoadedForRef.current === playlistStructureSignature) return;
    bufferQueueLoadedForRef.current = playlistStructureSignature;

    const logs = collectChunkBufferingEntries(
      chunkPlaylist,
      0,
      getPartRows,
      (index) => buildCourseChunkBufferingLogEntries(
        selectedCourseBanner,
        selectedCourseSlideGroup,
        index,
      ),
    );
    if (logs.length > 0) {
      dispatch(updateChunkBuffer(logs));
    }

    return () => {
      bufferQueueLoadedForRef.current = null;
      dispatch(clearChunkBuffer());
    };
    // Queue once per playlist layout; payload updates must not clear/re-queue the buffer.
  }, [dispatch, playlistStructureSignature]);

  useEffect(() => {
    setVideoAspectRatio(playlistInitAspectRatio ?? 16 / 9);
  }, [playlistInitAspectRatio]);

  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return undefined;

    const syncAspectRatio = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    const events: Array<keyof HTMLMediaElementEventMap> = [
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'resize',
    ];
    for (const event of events) {
      video.addEventListener(event, syncAspectRatio);
    }
    syncAspectRatio();

    return () => {
      for (const event of events) {
        video.removeEventListener(event, syncAspectRatio);
      }
    };
  }, [player.activeChunkIndex, player.videoRef, playlistInitAspectRatio]);

  const updateVideoFrameSize = useCallback(() => {
    const boundsEl = videoBoundsRef.current;
    if (!boundsEl || videoAspectRatio <= 0) return;

    const maxWidth = boundsEl.clientWidth;
    if (maxWidth <= 0) return;

    const top = boundsEl.getBoundingClientRect().top;
    const metaRowReserve = 64;
    const bottomGap = 16;
    const maxHeight = Math.max(0, window.innerHeight - top - metaRowReserve - bottomGap);
    if (maxHeight <= 0) return;

    let width = maxWidth;
    let height = width / videoAspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * videoAspectRatio;
    }

    setVideoFrameSize((prev) => (
      prev?.width === width && prev?.height === height ? prev : { width, height }
    ));
  }, [videoAspectRatio]);

  useLayoutEffect(() => {
    updateVideoFrameSize();

    const boundsEl = videoBoundsRef.current;
    if (!boundsEl) return undefined;

    const resizeObserver = new ResizeObserver(updateVideoFrameSize);
    resizeObserver.observe(boundsEl);
    window.addEventListener('resize', updateVideoFrameSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVideoFrameSize);
    };
  }, [updateVideoFrameSize, playlistError, playerError]);

  const handleChunkClick = useCallback((index: number) => {
    const chunk = chunkPlaylist[index];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return;
    void player.playChunk(index);
  }, [chunkPlaylist, player]);

  const renderChunkItem = (chunk: PlaylistChunk, index: number) => {
    const displayChunk = displayChunks[index] ?? chunk;
    const playbackState = player.getChunkPlaybackState(index);
    const isPlayable = isPlaylistChunkPlayable(chunk);
    const partRows = getPartRows(index);
    const awaitingRemotePayload = isChunkAwaitingRemotePayload(partRows);
    const itemClass = [
      styles['chunkItem'],
      playbackState === 'active' ? styles['chunkItemActive'] : '',
      playbackState === 'played' ? styles['chunkItemPlayed'] : '',
    ].filter(Boolean).join(' ');

    return (
      <button
        key={`${chunk.contentId}-${chunk.index}`}
        type="button"
        className={itemClass}
        disabled={!isPlayable}
        onClick={() => { handleChunkClick(index); }}
      >
        {displayChunk.thumbnailUrl ? (
          <img
            src={displayChunk.thumbnailUrl}
            alt={`Chunk ${displayChunk.index}`}
            className={styles['chunkThumbnail']}
          />
        ) : (
          <div className={styles['chunkThumbnailPlaceholder']}>
            {displayChunk.index}
          </div>
        )}
        <div className={styles['chunkMeta']}>
          <div className="d-flex justify-content-between align-items-center gap-1">
            <span className={styles['chunkTitle']}>
              {displayChunk.index}/{displayChunk.total}
            </span>
            {playbackState === 'active' && isPlayable && (
              <Badge bg="primary">Playing</Badge>
            )}
            {playbackState === 'played' && <Badge bg="secondary">Played</Badge>}
            {playbackState === 'pending' && !isPlayable && awaitingRemotePayload && (
              <Badge bg="warning">Buffering</Badge>
            )}
            {playbackState === 'pending' && !isPlayable && !awaitingRemotePayload && (
              <Badge bg="danger">Invalid</Badge>
            )}
          </div>
          <div className={styles['chunkTime']}>
            {formatPlaybackMs(displayChunk.startMs)}
            {' – '}
            {formatPlaybackMs(displayChunk.endMs)}
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
            {playableChunkCount}
            {expectedChunkCount > playableChunkCount ? ` / ${expectedChunkCount}` : ''}
            {' '}
            chunks
            {player.chunks.length > 0 && playableChunkCount > 0 && (
              <>
                {' · '}
                {formatPlaybackMs(player.totalDurationMs)} total
              </>
            )}
          </p>
        </div>
        <div className={styles['headerActions']}>
          <Button variant="outline-secondary" onClick={onExit}>
            Exit
          </Button>
          <Button variant="link" className={styles['changeMediaLink']} onClick={onChangeMedia}>
            Change video
          </Button>
        </div>
      </div>

      {tabs}

      {playlistError && (
        <Alert variant="warning" className="mb-3">
          {playableChunkCount > 0 && playableChunkCount < expectedChunkCount
            ? `Still downloading chunks: ${playlistError}`
            : isChunkAwaitingRemotePayload(
              getCourseChunkPartRows(
                selectedCourseBanner,
                selectedCourseSlideGroup,
                player.activeChunkIndex,
              ),
            )
              ? `Chunks are not ready to play yet: ${playlistError}`
              : `Chunk validation failed: ${playlistError}`}
        </Alert>
      )}

      {playerError && (
        <Alert variant="danger" className="mb-3" onClose={() => setPlayerError(null)} dismissible>
          {playerError}
        </Alert>
      )}

      <div className={styles['layout']}>
        <Card className={styles['playerCard']}>
          <div ref={videoBoundsRef} className={styles['videoBounds']}>
            <div
              className={styles['videoStack']}
              style={videoFrameSize
                ? { width: videoFrameSize.width, height: videoFrameSize.height }
                : { width: '100%', aspectRatio: videoAspectRatio }}
            >
              <video
                ref={player.videoRef}
                className={styles['video']}
                controls
                preload="auto"
                playsInline
                muted
              />
            </div>
          </div>
          <div className={styles['metaRow']}>
            <div className={styles['progressText']}>
              {formatPlaybackMs(player.globalPlaybackMs)}
              {' / '}
              {formatPlaybackMs(player.totalDurationMs)}
            </div>
            <div className={styles['controls']}>
              {player.isLoading && <Spinner animation="border" size="sm" />}
              <Button
                variant="primary"
                onClick={() => { void player.togglePlay(); }}
                disabled={player.isLoading}
              >
                {player.isPlaying ? 'Pause' : 'Play'}
              </Button>
            </div>
          </div>
        </Card>

        {player.seekWarning && (
          <div className={styles['seekWarningBanner']} role="status">
            {player.seekWarning}
          </div>
        )}

        <Card className={styles['playlistCard']}>
          <div className={styles['playlistHeaderRow']}>
            <div className={styles['playlistHeader']}>
              Chunks
            </div>
          </div>
          <div className={styles['playlist']}>
            {displayChunks.map((chunk, index) => renderChunkItem(chunk, index))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CourseVideoPlayback;
