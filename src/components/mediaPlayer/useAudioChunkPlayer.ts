import { useCallback, useEffect, useRef, useState } from 'react';
import { AUDIO_MPEG_MIME, partPayloadsToBlob } from '../../library/directoryTreeUtils';
import {
  getChunkState,
  getPlaylistChunksSignature,
  getPlaylistStructureSignature,
  getTotalDurationMs,
  isPlaylistChunkPlayable,
  PlaylistChunk,
} from '../../library/videoChunkPlayback';
import type { ChunkPlaybackState } from './useMseVideoChunkPlayer';

export type UseAudioChunkPlayerOptions = {
  chunks: PlaylistChunk[];
  autoPlay?: boolean;
  onError?: (message: string) => void;
  onChunkFinished?: (chunkListIndex: number) => void;
  onPlaylistFinished?: () => void;
  onBufferUnderrun?: (nextChunkListIndex: number) => void;
};

const PLAYLIST_END_TOLERANCE_MS = 300;

function findChunkIndexForGlobalMs(chunks: readonly PlaylistChunk[], globalMs: number): number {
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const chunk = chunks[i];
    if (chunk && chunk.startMs <= globalMs + 1) return i;
  }
  return 0;
}

function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      resolve();
    };
    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });
  });
}

export function useAudioChunkPlayer({
  chunks,
  autoPlay = false,
  onError,
  onChunkFinished,
  onPlaylistFinished,
  onBufferUnderrun,
}: UseAudioChunkPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlsRef = useRef<Map<number, string>>(new Map());
  const activeChunkIndexRef = useRef(0);
  const waitingToPlayRef = useRef(false);
  const wantsPlaybackRef = useRef(false);
  const loadingRef = useRef(false);
  const finishedThroughIndexRef = useRef(-1);
  const playlistFinishedRef = useRef(false);
  const onPlaylistFinishedRef = useRef(onPlaylistFinished);
  const onBufferUnderrunRef = useRef(onBufferUnderrun);

  onPlaylistFinishedRef.current = onPlaylistFinished;
  onBufferUnderrunRef.current = onBufferUnderrun;

  const totalDurationMs = getTotalDurationMs(chunks);
  const chunksIdentity = getPlaylistChunksSignature(chunks);
  const playlistStructureIdentity = getPlaylistStructureSignature(chunks);

  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [globalPlaybackMs, setGlobalPlaybackMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackTick, setPlaybackTick] = useState(0);

  activeChunkIndexRef.current = activeChunkIndex;

  const reportError = useCallback((message: string) => {
    onError?.(message);
  }, [onError]);

  const revokeObjectUrls = useCallback(() => {
    for (const url of objectUrlsRef.current.values()) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current.clear();
  }, []);

  const evictObjectUrlsBeforeChunk = useCallback((keepFromChunkIndex: number) => {
    const keepFrom = Math.max(0, keepFromChunkIndex - 1);
    for (let i = 0; i < keepFrom; i += 1) {
      const chunk = chunks[i];
      if (!chunk) continue;
      const url = objectUrlsRef.current.get(chunk.contentId);
      if (!url) continue;
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(chunk.contentId);
    }
  }, [chunks]);

  const getChunkObjectUrl = useCallback((chunkListIndex: number): string | null => {
    const chunk = chunks[chunkListIndex];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return null;

    const existing = objectUrlsRef.current.get(chunk.contentId);
    if (existing) return existing;

    const blob = partPayloadsToBlob(chunk.partPayloads, AUDIO_MPEG_MIME);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.set(chunk.contentId, url);
    return url;
  }, [chunks]);

  const markFinishedThrough = useCallback((chunkIndex: number) => {
    for (let i = finishedThroughIndexRef.current + 1; i <= chunkIndex; i += 1) {
      const chunk = chunks[i];
      if (chunk && isPlaylistChunkPlayable(chunk)) {
        onChunkFinished?.(i);
      }
    }
    finishedThroughIndexRef.current = Math.max(finishedThroughIndexRef.current, chunkIndex);
  }, [chunks, onChunkFinished]);

  const completePlaylist = useCallback(() => {
    if (playlistFinishedRef.current || chunks.length === 0) return;
    playlistFinishedRef.current = true;
    markFinishedThrough(chunks.length - 1);
    audioRef.current?.pause();
    wantsPlaybackRef.current = false;
    waitingToPlayRef.current = false;
    setIsPlaying(false);
    onPlaylistFinishedRef.current?.();
  }, [chunks.length, markFinishedThrough]);

  const startPlaybackAt = useCallback(async (
    chunkListIndex: number,
    shouldAutoPlay: boolean,
    localOffsetMs = 0,
    showLoading = true,
  ): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio || chunks.length === 0) return false;

    const chunk = chunks[chunkListIndex];
    if (!chunk) return false;

    if (!isPlaylistChunkPlayable(chunk)) {
      if (shouldAutoPlay) {
        waitingToPlayRef.current = true;
        wantsPlaybackRef.current = true;
        onBufferUnderrunRef.current?.(chunkListIndex);
      }
      return true;
    }

    const objectUrl = getChunkObjectUrl(chunkListIndex);
    if (!objectUrl) {
      reportError(`Chunk ${chunk.index} could not be loaded.`);
      return false;
    }

    if (showLoading) setIsLoading(true);
    try {
      if (audio.src !== objectUrl) {
        audio.src = objectUrl;
        audio.load();
      }

      if (activeChunkIndexRef.current !== chunkListIndex) {
        setActiveChunkIndex(chunkListIndex);
      }

      await waitForCanPlay(audio);
      audio.currentTime = Math.max(0, localOffsetMs / 1000);
      setGlobalPlaybackMs(chunk.startMs + localOffsetMs);

      if (shouldAutoPlay) {
        await audio.play();
        setIsPlaying(true);
        waitingToPlayRef.current = false;
        wantsPlaybackRef.current = true;
      }
      return true;
    } catch {
      reportError('Playback failed to start.');
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [chunks, getChunkObjectUrl, reportError]);

  const playNextChunk = useCallback(async () => {
    const nextIndex = activeChunkIndexRef.current + 1;
    if (nextIndex >= chunks.length) {
      completePlaylist();
      return;
    }
    await startPlaybackAt(nextIndex, true);
  }, [chunks.length, completePlaylist, startPlaybackAt]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const chunk = chunks[activeChunkIndexRef.current];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) {
      waitingToPlayRef.current = true;
      wantsPlaybackRef.current = true;
      return;
    }

    if (audio.src) {
      await waitForCanPlay(audio);
      await audio.play();
      setIsPlaying(true);
      waitingToPlayRef.current = false;
      wantsPlaybackRef.current = true;
      return;
    }

    await startPlaybackAt(activeChunkIndexRef.current, true);
  }, [chunks, startPlaybackAt]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    waitingToPlayRef.current = false;
    wantsPlaybackRef.current = false;
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pause();
      return;
    }
    await play();
  }, [isPlaying, pause, play]);

  const playChunk = useCallback(async (chunkListIndex: number) => {
    await startPlaybackAt(chunkListIndex, true);
  }, [startPlaybackAt]);

  const playPreviousChunk = useCallback(async () => {
    const prevIndex = Math.max(0, activeChunkIndexRef.current - 1);
    await startPlaybackAt(prevIndex, true);
  }, [startPlaybackAt]);

  const seekTo = useCallback(async (globalMs: number) => {
    const clampedMs = Math.max(0, Math.min(globalMs, totalDurationMs));
    const chunkIndex = findChunkIndexForGlobalMs(chunks, clampedMs);
    const chunk = chunks[chunkIndex];
    if (!chunk) return;

    const localOffsetMs = Math.max(0, clampedMs - chunk.startMs);
    const shouldResume = wantsPlaybackRef.current || isPlaying;
    await startPlaybackAt(chunkIndex, shouldResume, localOffsetMs);
  }, [chunks, isPlaying, startPlaybackAt, totalDurationMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleTimeUpdate = () => {
      if (playlistFinishedRef.current) return;

      const chunk = chunks[activeChunkIndexRef.current];
      if (!chunk) return;

      const globalMs = chunk.startMs + audio.currentTime * 1000;
      setGlobalPlaybackMs(globalMs);
      setPlaybackTick((tick) => tick + 1);
      evictObjectUrlsBeforeChunk(activeChunkIndexRef.current);

      const chunkDurationMs = Math.max(0, chunk.endMs - chunk.startMs);
      const nearChunkEnd = chunkDurationMs > 0
        ? globalMs >= chunk.endMs - PLAYLIST_END_TOLERANCE_MS
        : audio.duration > 0 && audio.currentTime >= audio.duration - PLAYLIST_END_TOLERANCE_MS / 1000;

      if (nearChunkEnd && activeChunkIndexRef.current >= chunks.length - 1) {
        completePlaylist();
      }
    };

    const handleEnded = () => {
      if (activeChunkIndexRef.current >= chunks.length - 1) {
        completePlaylist();
        return;
      }
      markFinishedThrough(activeChunkIndexRef.current);
      void playNextChunk();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      wantsPlaybackRef.current = true;
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (!playlistFinishedRef.current) {
        wantsPlaybackRef.current = false;
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [chunks, completePlaylist, evictObjectUrlsBeforeChunk, markFinishedThrough, playNextChunk]);

  useEffect(() => {
    revokeObjectUrls();
    finishedThroughIndexRef.current = -1;
    loadingRef.current = false;
    playlistFinishedRef.current = false;
    waitingToPlayRef.current = autoPlay;
    wantsPlaybackRef.current = autoPlay;
    setActiveChunkIndex(0);
    setGlobalPlaybackMs(0);
    setIsPlaying(false);
    setIsLoading(false);
  }, [autoPlay, playlistStructureIdentity, revokeObjectUrls]);

  useEffect(() => {
    const activeIdx = activeChunkIndexRef.current;
    const chunk = chunks[activeIdx];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return;
    if (!waitingToPlayRef.current || loadingRef.current) return;

    loadingRef.current = true;
    void startPlaybackAt(activeIdx, true, 0, false)
      .finally(() => {
        loadingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunksIdentity]);

  useEffect(() => () => {
    revokeObjectUrls();
  }, [revokeObjectUrls]);

  const getChunkPlaybackState = useCallback((chunkListIndex: number): ChunkPlaybackState => {
    void playbackTick;
    return getChunkState(
      chunks[chunkListIndex],
      globalPlaybackMs,
      activeChunkIndex,
      chunkListIndex,
    );
  }, [activeChunkIndex, chunks, globalPlaybackMs, playbackTick]);

  return {
    audioRef,
    chunks,
    activeChunkIndex,
    globalPlaybackMs,
    totalDurationMs,
    isPlaying,
    isLoading,
    getChunkPlaybackState,
    play,
    pause,
    playChunk,
    playPreviousChunk,
    playNextChunk,
    togglePlay,
    seekTo,
  };
}
