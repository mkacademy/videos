import { useCallback, useEffect, useRef, useState } from 'react';
import { MseChunkPlayerController, describeMediaElementError, getBufferedEndSeconds, isPlaybackTimeBuffered } from '../../library/mseVideoPlayback';
import {
  chunkCanAcceptMoreAppends,
  formatIncrementalSeekWarning,
  getChunkPartPayloadSignature,
  getChunkState,
  getPlaylistChunksSignature,
  getPlaylistStructureSignature,
  getTotalDurationMs,
  isPlaylistChunkPlayable,
  MAX_DIRECT_CHUNK_SEEK_DISTANCE,
  PlaylistChunk,
} from '../../library/videoChunkPlayback';

export type ChunkPlaybackState = 'pending' | 'active' | 'played';

export type UseMseVideoChunkPlayerOptions = {
  chunks: PlaylistChunk[];
  autoPlay?: boolean;
  onError?: (message: string | null) => void;
  onChunkFinished?: (chunkListIndex: number) => void;
  onPlaylistFinished?: () => void;
  /** Fired when playback stalls and the next chunk still needs remote data. */
  onBufferUnderrun?: (nextChunkListIndex: number) => void;
};

const PLAYLIST_END_TOLERANCE_MS = 300;
/** Keep this much media buffered ahead of the playhead before pausing MSE append. */
const BUFFER_AHEAD_TARGET_SEC = 60;
/** Minimum time the incremental seek warning stays visible once shown. */
const SEEK_WARNING_MIN_DISPLAY_MS = 10_000;

function isNearPlaylistEnd(
  chunks: readonly PlaylistChunk[],
  totalDurationMs: number,
  globalMs: number,
  video: HTMLVideoElement,
): boolean {
  if (chunks.length === 0) return false;

  const lastChunk = chunks[chunks.length - 1];
  const chunkEndMs = lastChunk.endMs > 0 ? lastChunk.endMs : totalDurationMs;
  if (chunkEndMs > 0 && globalMs >= chunkEndMs - PLAYLIST_END_TOLERANCE_MS) {
    return true;
  }

  return video.duration > 0
    && !Number.isNaN(video.duration)
    && video.currentTime >= video.duration - PLAYLIST_END_TOLERANCE_MS / 1000;
}

function findChunkIndexForGlobalMs(chunks: readonly PlaylistChunk[], globalMs: number): number {
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const chunk = chunks[i];
    if (chunk && chunk.startMs <= globalMs + 1) return i;
  }
  return 0;
}

function getBufferDrivenPrefetchIndex(
  chunks: readonly PlaylistChunk[],
  video: HTMLVideoElement,
  appendedThroughIndex: number,
  getAppendedPartCount: (chunkListIndex: number) => number,
): number | null {
  if (describeMediaElementError(video)) return null;

  const bufferedAheadSec = getBufferedEndSeconds(video) - video.currentTime;
  if (bufferedAheadSec > BUFFER_AHEAD_TARGET_SEC) return null;

  let nextIndex = appendedThroughIndex + 1;
  while (nextIndex < chunks.length) {
    const chunk = chunks[nextIndex];
    if (chunk && chunkCanAcceptMoreAppends(chunk, getAppendedPartCount(nextIndex))) {
      return nextIndex;
    }
    nextIndex += 1;
  }
  return null;
}

function waitForCanPlay(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      resolve();
    };
    video.addEventListener('canplay', onCanPlay, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

export function useMseVideoChunkPlayer({
  chunks,
  autoPlay = false,
  onError,
  onChunkFinished,
  onPlaylistFinished,
  onBufferUnderrun,
}: UseMseVideoChunkPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<MseChunkPlayerController | null>(null);
  const activeChunkIndexRef = useRef(0);
  const waitingToPlayRef = useRef(false);
  const wantsPlaybackRef = useRef(false);
  const loadingRef = useRef(false);
  const chunkPayloadSignaturesRef = useRef<string[]>([]);
  const finishedThroughIndexRef = useRef(-1);
  const playlistFinishedRef = useRef(false);
  const recoveringRef = useRef(false);
  const lastRecoveryAttemptMsRef = useRef(0);
  const lastUnderrunSignalMsRef = useRef(0);
  const onPlaylistFinishedRef = useRef(onPlaylistFinished);
  const onBufferUnderrunRef = useRef(onBufferUnderrun);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekWarningShownAtRef = useRef<number | null>(null);
  const seekWarningDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  onPlaylistFinishedRef.current = onPlaylistFinished;
  onBufferUnderrunRef.current = onBufferUnderrun;

  const totalDurationMs = getTotalDurationMs(chunks);
  const chunksIdentity = getPlaylistChunksSignature(chunks);
  const playlistStructureIdentity = getPlaylistStructureSignature(chunks);

  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [globalPlaybackMs, setGlobalPlaybackMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [seekWarning, setSeekWarning] = useState<string | null>(null);
  const [playbackTick, setPlaybackTick] = useState(0);

  activeChunkIndexRef.current = activeChunkIndex;

  const reportError = useCallback((message: string | null) => {
    if (!mountedRef.current) return;
    onError?.(message);
  }, [onError]);

  const dismissSeekWarningNow = useCallback(() => {
    if (seekWarningDismissTimerRef.current !== null) {
      clearTimeout(seekWarningDismissTimerRef.current);
      seekWarningDismissTimerRef.current = null;
    }
    seekWarningShownAtRef.current = null;
    setSeekWarning(null);
  }, []);

  const showSeekWarning = useCallback((message: string) => {
    if (seekWarningDismissTimerRef.current !== null) {
      clearTimeout(seekWarningDismissTimerRef.current);
      seekWarningDismissTimerRef.current = null;
    }
    seekWarningShownAtRef.current = Date.now();
    setSeekWarning(message);
  }, []);

  const clearSeekWarning = useCallback(() => {
    const shownAt = seekWarningShownAtRef.current;
    if (shownAt === null) return;

    const remaining = SEEK_WARNING_MIN_DISPLAY_MS - (Date.now() - shownAt);
    if (remaining <= 0) {
      dismissSeekWarningNow();
      return;
    }

    if (seekWarningDismissTimerRef.current !== null) return;

    seekWarningDismissTimerRef.current = setTimeout(() => {
      seekWarningDismissTimerRef.current = null;
      seekWarningShownAtRef.current = null;
      setSeekWarning(null);
    }, remaining);
  }, [dismissSeekWarningNow]);

  const getController = useCallback((): MseChunkPlayerController | null => {
    const video = videoRef.current;
    if (!video) return null;
    if (!controllerRef.current) {
      controllerRef.current = new MseChunkPlayerController(video, chunks, (message) => {
        reportError(message);
      });
    } else {
      controllerRef.current.updateChunks(chunks);
    }
    return controllerRef.current;
  }, [chunks, reportError]);

  const destroyController = useCallback(() => {
    controllerRef.current?.destroy();
    controllerRef.current = null;
    finishedThroughIndexRef.current = -1;
  }, []);

  const rebuildMediaPipeline = useCallback(async (
    chunkListIndex: number,
    shouldAutoPlay: boolean,
  ): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || recoveringRef.current) return false;

    const chunk = chunks[chunkListIndex];
    if (!chunk) return false;

    recoveringRef.current = true;
    playlistFinishedRef.current = false;
    reportError(null);
    try {
      const resumeTimeSec = chunk.startMs / 1000;
      destroyController();

      const controller = getController();
      if (!controller) return false;

      let appendThrough = chunkListIndex;
      if (
        appendThrough + 1 < chunks.length
        && isPlaylistChunkPlayable(chunks[appendThrough + 1])
      ) {
        appendThrough += 1;
      }

      for (let i = 0; i <= appendThrough; i += 1) {
        const appended = await controller.appendNextChunk();
        if (!appended) break;
        if (describeMediaElementError(video)) return false;
        await waitForCanPlay(video);
      }

      if (!isPlaybackTimeBuffered(video, resumeTimeSec)) {
        showSeekWarning(formatIncrementalSeekWarning(
          chunkListIndex,
          activeChunkIndexRef.current,
        ));
        return false;
      }

      clearSeekWarning();
      video.currentTime = resumeTimeSec;
      setGlobalPlaybackMs(chunk.startMs);
      setActiveChunkIndex(chunkListIndex);

      if (shouldAutoPlay) {
        await waitForCanPlay(video);
        await video.play();
        setIsPlaying(true);
        wantsPlaybackRef.current = true;
        waitingToPlayRef.current = false;
      }

      reportError(null);
      return true;
    } catch {
      return false;
    } finally {
      recoveringRef.current = false;
    }
  }, [chunks, destroyController, getController, reportError, clearSeekWarning, showSeekWarning]);

  const bufferAhead = useCallback(async () => {
    if (!mountedRef.current || playlistFinishedRef.current) return;
    if (recoveringRef.current || loadingRef.current) return;

    const video = videoRef.current;
    if (!video || describeMediaElementError(video)) return;

    const controller = getController();
    if (!controller) return;
    if (!controller.isMediaSourceOpen() && controller.getAppendedThroughIndex() >= 0) return;

    const playbackChunkIndex = findChunkIndexForGlobalMs(chunks, video.currentTime * 1000);
    let appendedThrough = controller.getAppendedThroughIndex();

    while (
      appendedThrough < playbackChunkIndex + 1
      && appendedThrough + 1 < chunks.length
    ) {
      const nextIndex = appendedThrough + 1;
      const nextChunk = chunks[nextIndex];
      if (
        !nextChunk
        || !chunkCanAcceptMoreAppends(nextChunk, controller.getAppendedPartCount(nextIndex))
      ) {
        break;
      }
      const partsBefore = controller.getAppendedPartCount(nextIndex);
      const appendedBefore = controller.getAppendedThroughIndex();
      const ok = await controller.appendNextChunk();
      if (!ok || describeMediaElementError(video)) break;
      const partsAfter = controller.getAppendedPartCount(nextIndex);
      const appendedAfter = controller.getAppendedThroughIndex();
      if (partsAfter <= partsBefore && appendedAfter <= appendedBefore) break;
      appendedThrough = appendedAfter;
    }

    const maxPrefetchPasses = Math.min(chunks.length, 3);
    for (let pass = 0; pass < maxPrefetchPasses; pass += 1) {
      if (describeMediaElementError(video)) break;

      const bufferedAheadSec = getBufferedEndSeconds(video) - video.currentTime;
      if (bufferedAheadSec >= BUFFER_AHEAD_TARGET_SEC) break;

      const prefetchIndex = getBufferDrivenPrefetchIndex(
        chunks,
        video,
        controller.getAppendedThroughIndex(),
        (index) => controller.getAppendedPartCount(index),
      );
      if (prefetchIndex === null) break;

      const partsBefore = controller.getAppendedPartCount(prefetchIndex);
      const appendedBefore = controller.getAppendedThroughIndex();
      const ok = await controller.appendNextChunk();
      if (!ok || describeMediaElementError(video)) break;
      const partsAfter = controller.getAppendedPartCount(prefetchIndex);
      const appendedAfter = controller.getAppendedThroughIndex();
      if (partsAfter <= partsBefore && appendedAfter <= appendedBefore) break;
    }

    if (!wantsPlaybackRef.current || video.paused) return;
    if (describeMediaElementError(video)) return;
    await waitForCanPlay(video);
    try {
      await video.play();
      setIsPlaying(true);
      clearSeekWarning();
    } catch {
      // Ignore play interruptions while more chunks are still buffering.
    }
  }, [chunks, getController, clearSeekWarning]);

  const schedulePrefetch = useCallback(() => {
    if (prefetchTimerRef.current !== null) return;
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null;
      void bufferAhead();
    }, 32);
  }, [bufferAhead]);

  const startPlaybackAt = useCallback(async (
    chunkListIndex: number,
    shouldAutoPlay: boolean,
    showLoading = true,
  ): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || chunks.length === 0) return false;

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

    const currentIndex = activeChunkIndexRef.current;
    const forwardJump = chunkListIndex - currentIndex;
    if (forwardJump > MAX_DIRECT_CHUNK_SEEK_DISTANCE) {
      showSeekWarning(formatIncrementalSeekWarning(chunkListIndex, currentIndex));
      return false;
    }

    dismissSeekWarningNow();

    const targetTimeSec = chunk.startMs / 1000;
    const needsPipelineReset = playlistFinishedRef.current
      || !isPlaybackTimeBuffered(video, targetTimeSec)
      || controllerRef.current?.isStreamEnded() === true;
    playlistFinishedRef.current = false;

    if (showLoading) setIsLoading(true);
    try {
      if (needsPipelineReset) {
        return rebuildMediaPipeline(chunkListIndex, shouldAutoPlay);
      }

      const controller = getController();
      if (!controller) return false;

      await controller.appendThroughIndex(chunkListIndex);
      const nextIndex = chunkListIndex + 1;
      if (
        nextIndex < chunks.length
        && isPlaylistChunkPlayable(chunks[nextIndex])
      ) {
        await controller.appendThroughIndex(nextIndex);
      }
      video.currentTime = targetTimeSec;
      if (activeChunkIndexRef.current !== chunkListIndex) {
        setActiveChunkIndex(chunkListIndex);
      }
      setGlobalPlaybackMs(chunk.startMs);
      clearSeekWarning();

      if (shouldAutoPlay) {
        await waitForCanPlay(video);
        await video.play();
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
  }, [chunks, getController, rebuildMediaPipeline, reportError, clearSeekWarning, dismissSeekWarningNow, showSeekWarning]);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (playlistFinishedRef.current || controllerRef.current?.isStreamEnded() === true) {
      await startPlaybackAt(0, true);
      return;
    }

    const chunk = chunks[activeChunkIndexRef.current];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) {
      waitingToPlayRef.current = true;
      wantsPlaybackRef.current = true;
      return;
    }

    const globalMs = video.currentTime * 1000;
    if (isNearPlaylistEnd(chunks, totalDurationMs, globalMs, video)) {
      await startPlaybackAt(0, true);
      return;
    }

    if (video.src && controllerRef.current) {
      await waitForCanPlay(video);
      await video.play();
      setIsPlaying(true);
      clearSeekWarning();
      waitingToPlayRef.current = false;
      wantsPlaybackRef.current = true;
      void schedulePrefetch();
      return;
    }

    await startPlaybackAt(activeChunkIndexRef.current, true);
  }, [chunks, schedulePrefetch, startPlaybackAt, totalDurationMs, clearSeekWarning]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const markFinishedThrough = (chunkIndex: number) => {
      for (let i = finishedThroughIndexRef.current + 1; i <= chunkIndex; i += 1) {
        const chunk = chunks[i];
        if (chunk && isPlaylistChunkPlayable(chunk)) {
          onChunkFinished?.(i);
        }
      }
      finishedThroughIndexRef.current = Math.max(finishedThroughIndexRef.current, chunkIndex);
    };

    const completePlaylist = () => {
      if (playlistFinishedRef.current || chunks.length === 0) return;
      playlistFinishedRef.current = true;
      markFinishedThrough(chunks.length - 1);
      video.pause();
      wantsPlaybackRef.current = false;
      waitingToPlayRef.current = false;
      setIsPlaying(false);
      onPlaylistFinishedRef.current?.();
    };

    const maybeCompletePlaylist = () => {
      if (playlistFinishedRef.current || chunks.length === 0) return;

      const globalMs = video.currentTime * 1000;
      const chunkIndex = findChunkIndexForGlobalMs(chunks, globalMs);
      if (chunkIndex < chunks.length - 1) return;
      if (!isNearPlaylistEnd(chunks, totalDurationMs, globalMs, video)) return;

      completePlaylist();
    };

    const schedulePrefetchFromVideo = () => {
      schedulePrefetch();
    };

    const handleTimeUpdate = () => {
      if (playlistFinishedRef.current) return;

      const globalMs = video.currentTime * 1000;
      setGlobalPlaybackMs(globalMs);
      setPlaybackTick((tick) => tick + 1);

      const chunkIndex = findChunkIndexForGlobalMs(chunks, globalMs);
      if (chunkIndex !== activeChunkIndexRef.current) {
        markFinishedThrough(chunkIndex - 1);
        setActiveChunkIndex(chunkIndex);
      }

      if (chunkIndex >= chunks.length - 1 && isNearPlaylistEnd(chunks, totalDurationMs, globalMs, video)) {
        completePlaylist();
        return;
      }

      schedulePrefetchFromVideo();

      const controller = controllerRef.current;
      if (controller) {
        void controller.evictBehindPlayhead(video.currentTime);
      }
      if (
        controller
        && controller.getAppendedThroughIndex() >= chunks.length - 1
        && chunks.every(isPlaylistChunkPlayable)
      ) {
        void controller.tryCompleteStreamNearPlaybackEnd(video.currentTime);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      wantsPlaybackRef.current = true;
      clearSeekWarning();
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (!playlistFinishedRef.current) {
        wantsPlaybackRef.current = false;
      }
      maybeCompletePlaylist();
    };
    const handleEnded = () => {
      completePlaylist();
    };
    const maybeSignalBufferUnderrun = () => {
      const video = videoRef.current;
      if (!video || playlistFinishedRef.current) return;

      const globalMs = video.currentTime * 1000;
      const chunkIndex = findChunkIndexForGlobalMs(chunks, globalMs);
      const nextIndex = chunkIndex + 1;
      if (nextIndex >= chunks.length) return;
      const nextPlayable = isPlaylistChunkPlayable(chunks[nextIndex]);
      if (nextPlayable) {
        console.log('[chunk-buffer]', 'waiting/stalled: next chunk playable, forcing MSE append', {
          currentChunk: chunkIndex + 1,
          nextChunk: nextIndex + 1,
          currentTimeSec: video.currentTime.toFixed(2),
          appendedThrough: controllerRef.current?.getAppendedThroughIndex() ?? -1,
        });
        schedulePrefetchFromVideo();
        return;
      }
      const now = Date.now();
      if (now - lastUnderrunSignalMsRef.current < 2000) return;
      lastUnderrunSignalMsRef.current = now;
      console.log('[chunk-buffer]', 'waiting/stalled: signaling underrun', {
        currentChunk: chunkIndex + 1,
        nextChunk: nextIndex + 1,
        nextPlayable,
        currentTimeSec: video.currentTime.toFixed(2),
        appendedThrough: controllerRef.current?.getAppendedThroughIndex() ?? -1,
      });
      onBufferUnderrunRef.current?.(nextIndex);
    };

    const handleStalled = () => {
      if (playlistFinishedRef.current || recoveringRef.current || loadingRef.current) return;
      schedulePrefetchFromVideo();
      maybeSignalBufferUnderrun();
      maybeCompletePlaylist();
    };
    const handleWaiting = () => {
      if (playlistFinishedRef.current || recoveringRef.current || loadingRef.current) return;
      schedulePrefetchFromVideo();
      maybeSignalBufferUnderrun();
      maybeCompletePlaylist();
    };
    const handleVideoError = () => {
      const detail = describeMediaElementError(video);
      if (!detail) return;
      reportError(`Video playback stopped: ${detail}`);
      setIsPlaying(false);
      if (!wantsPlaybackRef.current) return;

      const now = Date.now();
      if (now - lastRecoveryAttemptMsRef.current < 2000) return;
      lastRecoveryAttemptMsRef.current = now;
      const chunkIndex = findChunkIndexForGlobalMs(chunks, video.currentTime * 1000);
      void rebuildMediaPipeline(chunkIndex, true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('error', handleVideoError);
    };
  }, [chunks, onChunkFinished, rebuildMediaPipeline, reportError, schedulePrefetch, totalDurationMs, clearSeekWarning]);

  useEffect(() => {
    destroyController();
    chunkPayloadSignaturesRef.current = [];
    loadingRef.current = false;
    playlistFinishedRef.current = false;
    waitingToPlayRef.current = autoPlay;
    wantsPlaybackRef.current = autoPlay;
    setActiveChunkIndex(0);
    setGlobalPlaybackMs(0);
    setIsPlaying(false);
    setIsLoading(false);
    dismissSeekWarningNow();
  }, [autoPlay, destroyController, dismissSeekWarningNow, playlistStructureIdentity]);

  useEffect(() => {
    const nextPayloadSignatures = chunks.map(getChunkPartPayloadSignature);
    const prevPayloadSignatures = chunkPayloadSignaturesRef.current;

    let payloadChanged = false;
    for (let i = 0; i < chunks.length; i += 1) {
      if (prevPayloadSignatures[i] === nextPayloadSignatures[i]) continue;
      payloadChanged = true;
      if (i <= finishedThroughIndexRef.current) {
        finishedThroughIndexRef.current = Math.min(finishedThroughIndexRef.current, i - 1);
      }
    }
    chunkPayloadSignaturesRef.current = nextPayloadSignatures;

    if (!payloadChanged) return;

    const video = videoRef.current;
    if (controllerRef.current && video) {
      controllerRef.current.updateChunks(chunks);
      schedulePrefetch();
    }

    const activeIdx = activeChunkIndexRef.current;
    const chunk = chunks[activeIdx];
    if (!chunk || !isPlaylistChunkPlayable(chunk)) return;
    if (!waitingToPlayRef.current || loadingRef.current) return;

    loadingRef.current = true;
    void startPlaybackAt(activeIdx, true, false)
      .finally(() => {
        loadingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunksIdentity]);

  useEffect(() => () => {
    mountedRef.current = false;
    if (prefetchTimerRef.current !== null) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    if (seekWarningDismissTimerRef.current !== null) {
      clearTimeout(seekWarningDismissTimerRef.current);
      seekWarningDismissTimerRef.current = null;
    }
    destroyController();
  }, [destroyController]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, [playlistStructureIdentity]);

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
    videoRef,
    chunks,
    activeChunkIndex,
    globalPlaybackMs,
    totalDurationMs,
    isPlaying,
    isLoading,
    seekWarning,
    getChunkPlaybackState,
    play,
    pause,
    playChunk,
    togglePlay,
  };
}
