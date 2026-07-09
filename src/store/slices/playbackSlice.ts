import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ChunkBufferingEntry } from '../../library/videoChunkPlayback';

export type ChunkBuffer = {
  type: 'thumb' | 'part';
  parentId: number[];
  childId: number[];
  ordinal: number;
};

export type PlaybackWebapp = 'course' | 'tutorial' | 'quiz';

export type PlaybackState = {
  chunkFetchInFlight: boolean;
  playbackWebapp: PlaybackWebapp | null;
  chunkBuffer: Record<string, ChunkBuffer>;
};

const initialState: PlaybackState = {
  chunkFetchInFlight: false,
  playbackWebapp: null,
  chunkBuffer: {},
};

function chunkBufferKey(
  type: ChunkBuffer['type'],
  indexInPlaylist: number,
  childId: readonly (string | number)[],
): string {
  const normalizedChildId = childId.map((id) => Number(id)).join(',');
  return `${type}:${indexInPlaylist}:${normalizedChildId}`;
}

const chunkBufferIndexFromKey = (key: string): number => Number(key.split(':')[1]);

const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    updateChunkBuffer: (state, action: PayloadAction<ChunkBufferingEntry[]>) => {
      const entries = action.payload;
      if (entries.length > 0) {
        const minIndex = Math.min(...entries.map((e) => e.indexInPlaylist));
        for (const key of Object.keys(state.chunkBuffer)) {
          const indexInPlaylist = chunkBufferIndexFromKey(key);
          if (indexInPlaylist > minIndex) {
            delete state.chunkBuffer[key];
          }
        }
      }
      for (const entry of entries) {
        const key = chunkBufferKey(entry.type, entry.indexInPlaylist, entry.childId);
        state.chunkBuffer[key] = {
          parentId: entry.parentId.map((id) => Number(id)),
          childId: entry.childId.map((id) => Number(id)),
          ordinal: entry.ordinal,
          type: entry.type,
        };
      }
    },
    setChunkFetchInFlight: (state, action: PayloadAction<boolean>) => {
      state.chunkFetchInFlight = action.payload;
    },
    setPlaybackWebapp: (state, action: PayloadAction<PlaybackWebapp | null>) => {
      state.playbackWebapp = action.payload;
    },
    clearChunkBuffer: (state) => {
      state.chunkBuffer = {};
      state.chunkFetchInFlight = false;
    },
    resetPlayback: () => initialState,
  },
});

export const {
  updateChunkBuffer,
  setChunkFetchInFlight,
  clearChunkBuffer,
  resetPlayback,
  setPlaybackWebapp,
} = playbackSlice.actions;
export default playbackSlice.reducer;
