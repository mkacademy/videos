import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Card } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import {
  buildChunkBufferingLogEntries,
  collectChunkBufferingEntries,
  formatPlaybackMs,
  getTutorialChunkPartRows,
  getPlaylistStructureSignature,
  isChunkAwaitingRemotePayload,
  isPlaylistChunkPlayable,
  type PlaylistChunk,
  type TutorialVideoBannerEntry,
} from '../../library/videoChunkPlayback';
import { clearChunkBuffer, updateChunkBuffer } from '../../store/slices/playbackSlice';
import AudioWaveformPlayer from './AudioWaveformPlayer';
import { useAudioChunkPlayer } from './useAudioChunkPlayer';
import Comments from '../views/Comments';
import * as styles from '../../styles/mediaPlayer.module.css';

type TutorialAudioPlaybackProps = {
  title: string;
  chunkPlaylist: PlaylistChunk[];
  playlistError: string | null;
  expectedChunkCount: number;
  selectedTutorialGroup: TutorialVideoBannerEntry[];
  autoPlay: boolean;
  onChangeMedia: () => void;
  onExit: () => void;
  tabs: React.ReactNode;
};

const TutorialAudioPlayback: React.FC<TutorialAudioPlaybackProps> = ({
  title,
  chunkPlaylist,
  playlistError,
  expectedChunkCount,
  selectedTutorialGroup,
  autoPlay,
  onChangeMedia,
  onExit,
  tabs,
}) => {
  const dispatch = useDispatch();
  const [playerError, setPlayerError] = useState<string | null>(null);
  const bufferQueueLoadedForRef = useRef<string | null>(null);
  const commentsId = selectedTutorialGroup[0]?.banner.id ?? 0;

  const playableChunkCount = useMemo(
    () => chunkPlaylist.filter(isPlaylistChunkPlayable).length,
    [chunkPlaylist],
  );

  const playlistStructureSignature = useMemo(
    () => getPlaylistStructureSignature(chunkPlaylist),
    [chunkPlaylist],
  );

  const getPartRows = useCallback(
    (index: number) => getTutorialChunkPartRows(selectedTutorialGroup, index),
    [selectedTutorialGroup],
  );

  const player = useAudioChunkPlayer({
    chunks: chunkPlaylist,
    autoPlay,
    onError: setPlayerError,
  });

  useEffect(() => {
    if (chunkPlaylist.length === 0) return;
    if (bufferQueueLoadedForRef.current === playlistStructureSignature) return;
    bufferQueueLoadedForRef.current = playlistStructureSignature;

    const logs = collectChunkBufferingEntries(
      chunkPlaylist,
      0,
      getPartRows,
      (index) => buildChunkBufferingLogEntries(index, getPartRows(index)),
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

  const handleChunkClick = useCallback((index: number) => {
    const chunk = chunkPlaylist[index];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return;
    void player.playChunk(index);
  }, [chunkPlaylist, player]);

  const renderChunkItem = (chunk: PlaylistChunk, index: number) => {
    const state = player.getChunkPlaybackState(index);
    const isPlayable = isPlaylistChunkPlayable(chunk);
    const partRows = getTutorialChunkPartRows(selectedTutorialGroup, index);
    const awaitingRemotePayload = isChunkAwaitingRemotePayload(partRows);
    const itemClass = [
      styles['chunkItem'],
      styles['audioChunkItem'],
      state === 'active' ? styles['chunkItemActive'] : '',
      state === 'played' ? styles['chunkItemPlayed'] : '',
    ].filter(Boolean).join(' ');

    return (
      <button
        key={`${chunk.contentId}-${chunk.index}`}
        type="button"
        className={itemClass}
        disabled={!isPlayable}
        onClick={() => { handleChunkClick(index); }}
      >
        <div className={styles['audioChunkBar']} aria-hidden>
          <span style={{ height: `${30 + (chunk.index % 5) * 12}%` }} />
          <span style={{ height: `${45 + (chunk.index % 3) * 10}%` }} />
          <span style={{ height: `${25 + (chunk.index % 4) * 14}%` }} />
        </div>
        <div className={styles['chunkMeta']}>
          <div className="d-flex justify-content-between align-items-center gap-1">
            <span className={styles['chunkTitle']}>
              {chunk.index}/{chunk.total}
            </span>
            {state === 'active' && isPlayable && <Badge bg="primary">Playing</Badge>}
            {state === 'played' && <Badge bg="secondary">Played</Badge>}
            {state === 'pending' && !isPlayable && awaitingRemotePayload && (
              <Badge bg="warning">Buffering</Badge>
            )}
            {state === 'pending' && !isPlayable && !awaitingRemotePayload && (
              <Badge bg="danger">Invalid</Badge>
            )}
          </div>
          <div className={styles['chunkTime']}>
            {formatPlaybackMs(chunk.startMs)}
            {' – '}
            {formatPlaybackMs(chunk.endMs)}
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
            Change audio
          </Button>
        </div>
      </div>

      {tabs}

      {playlistError && (
        <Alert variant="warning" className="mb-3">
          {isChunkAwaitingRemotePayload(
            getTutorialChunkPartRows(selectedTutorialGroup, player.activeChunkIndex),
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
        <Card className={`${styles['playerCard']} ${styles['audioPlayerCard']}`}>
          <AudioWaveformPlayer
            audioRef={player.audioRef}
            globalPlaybackMs={player.globalPlaybackMs}
            totalDurationMs={player.totalDurationMs}
            isPlaying={player.isPlaying}
            isLoading={player.isLoading}
            onTogglePlay={() => { void player.togglePlay(); }}
            onPrevious={() => { void player.playPreviousChunk(); }}
            onNext={() => { void player.playNextChunk(); }}
            onSeek={(globalMs) => { void player.seekTo(globalMs); }}
            canGoPrevious={player.activeChunkIndex > 0}
            canGoNext={player.activeChunkIndex < player.chunks.length - 1}
          />
        </Card>

        <Card className={styles['playlistCard']}>
          <div className={styles['playlistHeaderRow']}>
            <div className={styles['playlistHeader']}>
              Chunks
            </div>
          </div>
          <div className={styles['playlist']}>
            {chunkPlaylist.map((chunk, index) => renderChunkItem(chunk, index))}
          </div>
        </Card>
      </div>

      {commentsId > 0 && (
        <Comments _for="tutorial" commentsId={commentsId} />
      )}
    </div>
  );
};

export default TutorialAudioPlayback;
