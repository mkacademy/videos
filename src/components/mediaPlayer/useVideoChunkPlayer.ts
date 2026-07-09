import type { RefObject } from 'react';
import {
  useMseVideoChunkPlayer,
  type ChunkPlaybackState,
} from './useMseVideoChunkPlayer';
import type { PlaylistChunk } from '../../library/videoChunkPlayback';

export type { ChunkPlaybackState };

export type UseVideoChunkPlayerOptions = {
  chunks: PlaylistChunk[];
  autoPlay?: boolean;
  onError?: (message: string | null) => void;
  onChunkFinished?: (chunkListIndex: number) => void;
  onPlaylistFinished?: () => void;
  onBufferUnderrun?: (nextChunkListIndex: number) => void;
};

export type UseVideoChunkPlayerResult = {
  videoRef: RefObject<HTMLVideoElement | null>;
  chunks: PlaylistChunk[];
  activeChunkIndex: number;
  globalPlaybackMs: number;
  totalDurationMs: number;
  isPlaying: boolean;
  isLoading: boolean;
  seekWarning: string | null;
  getChunkPlaybackState: (chunkListIndex: number) => ChunkPlaybackState;
  play: () => Promise<void>;
  pause: () => void;
  playChunk: (chunkListIndex: number) => Promise<void>;
  togglePlay: () => Promise<void>;
};

export function useVideoChunkPlayer(options: UseVideoChunkPlayerOptions): UseVideoChunkPlayerResult {
  return useMseVideoChunkPlayer(options);
}
