import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import type { Banner as CourseBanner, SlideGroup } from '../../library/CourseUtils';
import { getVideoAspectRatioFromInitPayload } from '../../library/mseVideoPlayback';
import { isRenderableImageUrl } from '../../library/directoryTreeUtils';
import {
  buildCourseChunkBufferingLogEntries,
  collectChunkBufferingEntries,
  formatPlaybackMs,
  getCourseChunkPartRows,
  getPlaylistFmp4InitPayload,
  getPlaylistStructureSignature,
  getTotalDurationMs,
  isChunkAwaitingRemotePayload,
  isPlaylistChunkPlayable,
  type PlaylistChunk,
} from '../../library/videoChunkPlayback';
import { clearChunkBuffer, updateChunkBuffer } from '../../store/slices/playbackSlice';
import { videoMimePlaceholder } from '../../utils';
import {
  useVideoChunkPlayer,
  type ChunkPlaybackState,
} from './useVideoChunkPlayer';
import Comments from '../views/Comments';
import MediaScreenSwitcher from '../MediaScreenSwitcher';
import * as styles from '../../styles/mediaPlayer.module.css';

type CourseVideoPlaybackProps = {
  title: string;
  chunkPlaylist: PlaylistChunk[];
  playlistError: string | null;
  expectedChunkCount: number;
  selectedCourseBanner: CourseBanner;
  selectedCourseSlideGroup: SlideGroup;
  onChangeMedia: () => void;
  onPlaylistFinished: () => void;
  tabs: React.ReactNode;
};

type PlaybackSession = {
  startChunkIndex: number;
};

type DisplayChunk = PlaylistChunk & { thumbnailUrl?: string };

type SharedChunkListProps = {
  chunkPlaylist: PlaylistChunk[];
  displayChunks: DisplayChunk[];
  getPartRows: (index: number) => ReturnType<typeof getCourseChunkPartRows>;
  getChunkPlaybackState: (index: number) => ChunkPlaybackState;
  onChunkClick: (index: number) => void;
};

const ChunkList: React.FC<SharedChunkListProps> = ({
  chunkPlaylist,
  displayChunks,
  getPartRows,
  getChunkPlaybackState,
  onChunkClick,
}) => (
  <Card className={styles['playlistCard']}>
    <div className={styles['playlistHeaderRow']}>
      <div className={styles['playlistHeader']}>
        Chunks
      </div>
    </div>
    <div className={styles['playlist']}>
      {displayChunks.map((displayChunk, index) => {
        const chunk = chunkPlaylist[index] ?? displayChunk;
        const playbackState = getChunkPlaybackState(index);
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
            onClick={() => { onChunkClick(index); }}
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
      })}
    </div>
  </Card>
);

type MountedPlayerProps = {
  chunkPlaylist: PlaylistChunk[];
  displayChunks: DisplayChunk[];
  startChunkIndex: number;
  getPartRows: SharedChunkListProps['getPartRows'];
  videoAspectRatio: number;
  onPlayerError: (message: string | null) => void;
  onPlaylistFinished: () => void;
};

const MountedCourseVideoPlayer: React.FC<MountedPlayerProps> = ({
  chunkPlaylist,
  displayChunks,
  startChunkIndex,
  getPartRows,
  videoAspectRatio,
  onPlayerError,
  onPlaylistFinished,
}) => {
  const videoBoundsRef = useRef<HTMLDivElement>(null);
  const startRequestedRef = useRef(false);
  const [videoFrameSize, setVideoFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [frameAspectRatio, setFrameAspectRatio] = useState(videoAspectRatio);

  const player = useVideoChunkPlayer({
    chunks: chunkPlaylist,
    // Start via playChunk below when a non-zero chunk was chosen; otherwise auto-play from 0.
    autoPlay: startChunkIndex === 0,
    onError: onPlayerError,
    onPlaylistFinished,
  });

  useEffect(() => {
    setFrameAspectRatio(videoAspectRatio);
  }, [videoAspectRatio]);

  useEffect(() => {
    if (startChunkIndex === 0 || startRequestedRef.current) return;
    startRequestedRef.current = true;
    void player.playChunk(startChunkIndex);
  }, [player, startChunkIndex]);

  useEffect(() => {
    const video = player.videoRef.current;
    if (!video) return undefined;

    const syncAspectRatio = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setFrameAspectRatio(video.videoWidth / video.videoHeight);
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
  }, [player.activeChunkIndex, player.videoRef]);

  const updateVideoFrameSize = useCallback(() => {
    const boundsEl = videoBoundsRef.current;
    if (!boundsEl || frameAspectRatio <= 0) return;

    const maxWidth = boundsEl.clientWidth;
    if (maxWidth <= 0) return;

    const top = boundsEl.getBoundingClientRect().top;
    const metaRowReserve = 64;
    const bottomGap = 16;
    const maxHeight = Math.max(0, window.innerHeight - top - metaRowReserve - bottomGap);
    if (maxHeight <= 0) return;

    let width = maxWidth;
    let height = width / frameAspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * frameAspectRatio;
    }

    setVideoFrameSize((prev) => (
      prev?.width === width && prev?.height === height ? prev : { width, height }
    ));
  }, [frameAspectRatio]);

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
  }, [updateVideoFrameSize]);

  const handleChunkClick = useCallback((index: number) => {
    const chunk = chunkPlaylist[index];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return;
    void player.playChunk(index);
  }, [chunkPlaylist, player]);

  return (
    <>
      <Card className={styles['playerCard']}>
        <div ref={videoBoundsRef} className={styles['videoBounds']}>
          <div
            className={styles['videoStack']}
            style={videoFrameSize
              ? { width: videoFrameSize.width, height: videoFrameSize.height }
              : { width: '100%', aspectRatio: frameAspectRatio }}
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

      <ChunkList
        chunkPlaylist={chunkPlaylist}
        displayChunks={displayChunks}
        getPartRows={getPartRows}
        getChunkPlaybackState={player.getChunkPlaybackState}
        onChunkClick={handleChunkClick}
      />
    </>
  );
};

type IdlePlayerProps = {
  chunkPlaylist: PlaylistChunk[];
  displayChunks: DisplayChunk[];
  getPartRows: SharedChunkListProps['getPartRows'];
  videoAspectRatio: number;
  totalDurationMs: number;
  onStartPlayback: (startChunkIndex: number) => void;
};

const IdleCourseVideoPlayer: React.FC<IdlePlayerProps> = ({
  chunkPlaylist,
  displayChunks,
  getPartRows,
  videoAspectRatio,
  totalDurationMs,
  onStartPlayback,
}) => {
  const videoBoundsRef = useRef<HTMLDivElement>(null);
  const [videoFrameSize, setVideoFrameSize] = useState<{ width: number; height: number } | null>(null);

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
  }, [updateVideoFrameSize]);

  const getChunkPlaybackState = useCallback((): ChunkPlaybackState => 'pending', []);

  const handleChunkClick = useCallback((index: number) => {
    const chunk = chunkPlaylist[index];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return;
    onStartPlayback(index);
  }, [chunkPlaylist, onStartPlayback]);

  return (
    <>
      <Card className={styles['playerCard']}>
        <div ref={videoBoundsRef} className={styles['videoBounds']}>
          <div
            className={styles['videoStack']}
            style={videoFrameSize
              ? { width: videoFrameSize.width, height: videoFrameSize.height }
              : { width: '100%', aspectRatio: videoAspectRatio }}
          >
            <img
              src={videoMimePlaceholder}
              alt=""
              className={styles['video']}
            />
          </div>
        </div>
        <div className={styles['metaRow']}>
          <div className={styles['progressText']}>
            {formatPlaybackMs(0)}
            {' / '}
            {formatPlaybackMs(totalDurationMs)}
          </div>
          <div className={styles['controls']}>
            <Button
              variant="primary"
              onClick={() => { onStartPlayback(0); }}
            >
              Play
            </Button>
          </div>
        </div>
      </Card>

      <ChunkList
        chunkPlaylist={chunkPlaylist}
        displayChunks={displayChunks}
        getPartRows={getPartRows}
        getChunkPlaybackState={getChunkPlaybackState}
        onChunkClick={handleChunkClick}
      />
    </>
  );
};

const CourseVideoPlayback: React.FC<CourseVideoPlaybackProps> = ({
  title,
  chunkPlaylist,
  playlistError,
  expectedChunkCount,
  selectedCourseBanner,
  selectedCourseSlideGroup,
  onChangeMedia,
  onPlaylistFinished,
  tabs,
}) => {
  const dispatch = useDispatch();
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [playbackSession, setPlaybackSession] = useState<PlaybackSession | null>(null);
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

  const totalDurationMs = useMemo(
    () => getTotalDurationMs(chunkPlaylist),
    [chunkPlaylist],
  );

  const playlistStructureSignature = useMemo(
    () => getPlaylistStructureSignature(chunkPlaylist),
    [chunkPlaylist],
  );

  useEffect(() => {
    setPlayerError(null);
  }, [playlistStructureSignature]);

  // New playlist layout resets the deferred player session.
  useEffect(() => {
    setPlaybackSession(null);
  }, [playlistStructureSignature]);

  const playlistInitAspectRatio = useMemo(() => {
    const initPayload = getPlaylistFmp4InitPayload(chunkPlaylist);
    if (!initPayload) return null;
    return getVideoAspectRatioFromInitPayload(initPayload);
  }, [chunkPlaylist]);

  const videoAspectRatio = playlistInitAspectRatio ?? 16 / 9;

  const displayChunks = useMemo(() => (
    chunkPlaylist.map((chunk) => ({
      ...chunk,
      thumbnailUrl: isPlaylistChunkPlayable(chunk) && isRenderableImageUrl(chunk.thumbnailUrl)
        ? chunk.thumbnailUrl
        : undefined,
    }))
  ), [chunkPlaylist]);

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

  const handleStartPlayback = useCallback((startChunkIndex: number) => {
    setPlayerError(null);
    setPlaybackSession({ startChunkIndex });
  }, []);

  const activeChunkIndexForError = playbackSession?.startChunkIndex ?? 0;

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
            {chunkPlaylist.length > 0 && playableChunkCount > 0 && (
              <>
                {' · '}
                {formatPlaybackMs(totalDurationMs)} total
              </>
            )}
          </p>
        </div>
        <div className={styles['headerActions']}>
          <MediaScreenSwitcher />
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
                activeChunkIndexForError,
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
        {playbackSession ? (
          <MountedCourseVideoPlayer
            chunkPlaylist={chunkPlaylist}
            displayChunks={displayChunks}
            startChunkIndex={playbackSession.startChunkIndex}
            getPartRows={getPartRows}
            videoAspectRatio={videoAspectRatio}
            onPlayerError={setPlayerError}
            onPlaylistFinished={onPlaylistFinished}
          />
        ) : (
          <IdleCourseVideoPlayer
            chunkPlaylist={chunkPlaylist}
            displayChunks={displayChunks}
            getPartRows={getPartRows}
            videoAspectRatio={videoAspectRatio}
            totalDurationMs={totalDurationMs}
            onStartPlayback={handleStartPlayback}
          />
        )}
      </div>

      {selectedCourseBanner.id > 0 && (
        <Comments _for="course" commentsId={selectedCourseBanner.id} />
      )}
    </div>
  );
};

export default CourseVideoPlayback;
