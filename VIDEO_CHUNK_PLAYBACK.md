# Video Chunk Playback — Implementation Notes

This document summarizes the work done on **course/tutorial chunked video playback** (large fMP4 videos split across many Redux rows and MSE `SourceBuffer` segments). It covers architecture, optimizations, seek behavior, and known limitations.

---

## Problem context

Course videos can be very large (~200 MB, 50+ chunks). Each chunk is stored as one or more **base64 split parts** in Redux (`imageurl` on slide/content rows). The media player must:

1. Fetch missing parts from the server while the player is open.
2. Stream them into MSE without freezing the UI or exhausting browser memory.
3. Support chunk selection, forward/backward seek, and replay after the playlist ends.

Early issues included: buffering stalls, resume bugs, browser OOM (`Aw, Snap! Error code: 5`), slow fetches with the player open, and broken seek/restart behavior.

---

## Architecture overview

```
┌─────────────────────┐     updateChunkBuffer      ┌──────────────────────────┐
│ CourseVideoPlayback │ ──────────────────────────► │ playbackSlice.chunkBuffer │
│ TutorialAudio...    │     (once per video open)  └────────────┬─────────────┘
└──────────┬──────────┘                                        │
           │ useVideoChunkPlayer                                ▼
           ▼                                        ┌──────────────────────────┐
┌─────────────────────┐     bytesFetcher chain    │ cascadingUnstasher       │
│ useMseVideoChunk    │ ◄──────────────────────── │ middleware               │
│ Player              │     updateSteps per part  └──────────────────────────┘
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ MseChunkPlayer      │  sequence mode, part-by-part append, buffer eviction
│ Controller          │
└─────────────────────┘
```

**Data model:** `PlaylistChunk` holds `partPayloads[]` (per split part) plus `playable`, `expectedPartCount`, timing, and optional `fmp4InitPayload`. Chunks are **not** assembled into a single base64 string in the playlist model.

---

## Key files

| File | Role |
|------|------|
| `src/library/videoChunkPlayback.ts` | Playlist build, chunk signatures, buffer queue entries, seek constants |
| `src/library/mseVideoPlayback.ts` | MSE controller: init append, part-by-part append, eviction, stream end |
| `src/components/mediaPlayer/useMseVideoChunkPlayer.ts` | React hook: playback, prefetch, seek, rebuild, warnings |
| `src/components/mediaPlayer/useVideoChunkPlayer.ts` | Thin wrapper exporting hook API |
| `src/components/mediaPlayer/CourseVideoPlayback.tsx` | Course UI, buffer queue dispatch, seek warning overlay |
| `src/components/mediaPlayer/TutorialAudioPlayback.tsx` | Tutorial audio variant (same buffer-queue pattern) |
| `src/components/mediaPlayer/mediaPlayer.tsx` | Builds `chunkPlaylist` from course/tutorial state |
| `src/store/slices/playbackSlice.ts` | `chunkBuffer`, `chunkFetchInFlight`, `playbackWebapp` |
| `src/store/middleware/cascadingUnstasher.ts` | Chains `bytesFetcher` on fulfill; starts fetch on `updateChunkBuffer` |
| `src/store/middleware/cascadingUnstasherUtils.ts` | Buffer entry → query mapping, resume/chain helpers |
| `src/library/directoryTreeUtils.ts` | Base64/fMP4 helpers, `partPayloadsToBlob` (audio) |
| `src/styles/mediaPlayer.module.css` | `.videoSeekWarning` overlay styles |

---

## Chunk fetch behavior

### Queue loading (once per video)

When the player opens, `CourseVideoPlayback` / `TutorialAudioPlayback` call `collectChunkBufferingEntries` and dispatch **`updateChunkBuffer` once** per playlist structure (guarded by `bufferQueueLoadedForRef` + `playlistStructureSignature`). The queue includes **all unfetched parts** from the start of the playlist through the end.

### Sequential fetch chain

1. `updateChunkBuffer` → `resumeChunkBufferFetchIfNeeded` starts the first `bytesFetcher` if `chunkFetchInFlight` is false.
2. Each `bytesFetcher.fulfilled` → `updateSteps` (part lands in course/tutorial Redux) → chain to `findNextChunkBufferEntryToFetch` → next `bytesFetcher`.
3. Stops when all entries are fetched (`bytesFetcher chain stopped: all entries fetched`).

### Simplifications (intentional)

- **No headroom / byte window limits** — fetch continues until the queue is empty.
- **No `viewedBytes` / `bufferedBytes`** in `playbackSlice` — removed to avoid incorrect resume/stop logic.
- **`chunkFetchInFlight`** replaces `view.requestIsFetching` for coordinating one in-flight buffer fetch at a time.
- **Buffering chunks are not clickable** until `isPlaylistChunkPlayable(chunk)` (`disabled={!isPlayable}`).

### Debug logging

Filter console for **`[chunk-buffer]`** to trace queue updates, fetch start, chain next, and rejections.

---

## MSE playback behavior

### Sequence mode + part-by-part append

- `SourceBuffer.mode = 'sequence'` — fragments are placed back-to-back because imported fMP4 moof decode times are not continuous across chunk boundaries.
- Each **split part** is decoded and appended individually (`appendChunkParts`), not as one joined string per chunk.
- **`appendNextChunk`** / **`appendThroughIndex`** drive progressive buffering during playback.

### Buffer eviction (memory)

- **`evictBehindPlayhead()`** removes decoded media older than **`MSE_KEEP_BACK_BUFFER_SEC` (30s)** behind the playhead via `SourceBuffer.remove`.
- Append bookkeeping (`appendedThroughIndex`, `appendedPartCountByChunk`) is **left intact** so sequence-mode segments are not duplicated on forward append.

### Prefetch throttling

| Constant | Value | Purpose |
|----------|-------|---------|
| `BUFFER_AHEAD_TARGET_SEC` | 60 | Stop MSE prefetch when this much media is buffered ahead |
| `maxPrefetchPasses` | 3 | Cap append attempts per prefetch cycle |
| `schedulePrefetch` debounce | 32 ms | Coalesce MSE work when many parts arrive quickly |

### Playlist finished / replay

- Near end of last chunk → `endOfStream()` + `playlistFinishedRef`.
- **Play after finish** restarts from **chunk 1** (`startPlaybackAt(0)`).
- **Chunk click after finish** or when stream ended → **`rebuildMediaPipeline`** (destroy controller, re-append from chunk 0 through target).

### Backward seek

- If target time is **not buffered** (evicted behind playhead) or stream ended → full pipeline rebuild and re-append chunks `0..target` (+ next chunk when playable).
- If target is still buffered → seek with `video.currentTime` only.

---

## Memory optimizations (still active)

### Redux / React hot path

- **Lightweight payload signatures** — `getCourseSlideGroupPayloadSignature` uses `content + imageurl.length` per row, not full base64 hashing.
- **Chunk identity** — `hashPartPayloads` uses part **string lengths**, not `fnv1aHash` of full payloads.
- **`computeChunkPlayability`** — true when all parts are non-empty; avoids `joinBase64SplitParts` on every part arrival during playlist rebuild.

### MSE layer

- **No `bytesCache`** in `MseChunkPlayerController` — decoded bytes are not retained in a growing map.
- **Part-by-part decode** — `base64PayloadToBytesSync` per part at append time only.
- **`updateChunks()`** — tracks per-chunk appended part counts; only invalidates append state when already-appended part content changes.

### Audio player

- **`partPayloadsToBlob()`** instead of assembling full chunk strings.
- **`evictObjectUrlsBeforeChunk()`** revokes blob URLs behind the playhead.

### What was removed

- `viewedBytes`, `bufferedBytes`, `bufferFocusChunkIndex`, `bufferResumeForced` from playback slice.
- Headroom caps that stopped `bytesFetcher` before the queue emptied.
- Per-fetch full-base64 hashing that blocked the main thread when the player was open.

---

## Seek limitations and user warning

### Why far jumps fail

In **sequence mode**, seeking to chunk *N* requires media for chunks `0..N` to exist contiguously in the `SourceBuffer` timeline. After eviction, a far-ahead target is not buffered. Rebuilding by re-appending `0..N` hits the browser **SourceBuffer quota** for large *N* (~15–20+ chunks depending on chunk size).

### Current UX (incremental seek)

- **`MAX_DIRECT_CHUNK_SEEK_DISTANCE = 10`** — forward jumps more than 10 chunks from the active chunk are blocked.
- A **yellow banner** (`.videoSeekWarning`) appears on top of the video with guidance, e.g. *"To reach chunk 50, select chunks in smaller steps — try chunk 13 first…"*
- Implemented in `formatIncrementalSeekWarning()` and `useMseVideoChunkPlayer` `seekWarning` state.
- If a rebuild completes but the target time is still not buffered, the same warning is shown.

### Approaches tried and reverted

| Approach | Outcome |
|----------|---------|
| **Segments mode + `timestampOffset`** sparse seek (append only target chunk) | Broke playback quality; **reverted** |
| **Full rebuild 0..N** without jump limit | Works for small *N*; fails silently or stalls for large *N* |
| **Incremental 10-chunk warning** | **Kept** — matches MSE limits with clear UX |

---

## Known problems and limitations

### 1. Total video size still in Redux memory

All fetched parts remain as **base64 strings in Redux** (`imageurl`). For a fully downloaded ~200 MB video, total JS heap use can still be large. Optimizations reduce *duplicate* work and MSE pressure but do not remove stored payload size.

### 2. Far forward seek requires stepping

Users cannot jump from chunk 3 to chunk 50 in one click. They must select chunks in steps of ~10 (or rely on playback to advance the buffer).

### 3. Seek rebuild cost

Backward seek or seek after eviction **destroys and rebuilds** the MSE pipeline, re-decoding and re-appending many chunks. This can cause a noticeable loading pause and temporary CPU/memory spikes.

### 4. OOM risk on very large courses

If all chunks are fetched into Redux while the player is open, memory can still approach browser tab limits. MSE eviction helps **decoded** buffer size, not Redux store size.

### 5. `joinBase64SplitParts` still used in non-hot paths

Full chunk assembly still happens for strict playlist validation, export, and `isVideoPlaylistChunk` / `isAudioPlaylistChunk` checks — not on every fetch, but worth knowing for future profiling.

### 6. Sequence mode fundamental constraint

Any future “jump to arbitrary chunk in one step” feature needs either:

- Reliable per-segment absolute timestamps in fMP4 moof boxes (segments mode), or
- A different delivery model (single progressive URL, HLS, etc.)

The codebase comment in `mseVideoPlayback.ts` documents why sequence mode was chosen for imported chunks.

### 7. Tutorial audio parity

Tutorial audio uses the same buffer queue and incremental patterns; seek warning overlay is on **course video** (`CourseVideoPlayback`). Audio seek behavior may differ slightly (`useAudioChunkPlayer`).

---

## Testing checklist

- [ ] Large course video (~200 MB, 50+ chunks): open player → single `updateChunkBuffer`, steady `[chunk-buffer] bytesFetcher chain next` logs.
- [ ] Fetch speed with player open comparable to player closed (no multi-second gaps between parts).
- [ ] Play through several chunks; pause; click an **earlier** playable chunk → resumes after brief rebuild.
- [ ] Play to end → **Play** restarts from beginning; chunk click works after finish.
- [ ] From chunk 3, click chunk 50 → **warning banner**, no silent failure.
- [ ] Step 3 → 13 → 23 → … → 50 → each step plays.
- [ ] Buffering (non-playable) chunks are disabled in the playlist UI.
- [ ] Long session: monitor for OOM with full download + playback.

---

## Related constants (quick reference)

```ts
// videoChunkPlayback.ts
MAX_DIRECT_CHUNK_SEEK_DISTANCE = 10
PREFETCH_WINDOW_MS = 30_000
PREFETCH_TRIGGER_LEAD_MS = 5_000

// mseVideoPlayback.ts
MSE_KEEP_BACK_BUFFER_SEC = 30
MSE_EVICT_MIN_INTERVAL_MS = 5000

// useMseVideoChunkPlayer.ts
BUFFER_AHEAD_TARGET_SEC = 60
maxPrefetchPasses = min(chunks.length, 3)
schedulePrefetch debounce = 32 ms
```

---

## History (conversation summary)

1. Fixed chunk buffer resume, orphan queues, and unstable part ordering.
2. Addressed OOM — root cause was duplicate base64 in Redux + assembly + unbounded fetch, not “200 MB is too big” alone.
3. Fixed slow fetch with player open — lightweight signatures, debounced prefetch, removed per-part full hashing.
4. Simplified buffering — fetch-all queue, no headroom byte accounting.
5. Fixed backward seek after buffer eviction (rebuild pipeline).
6. Fixed playlist-finished restart (`endOfStream` / `playlistFinishedRef` handling).
7. Attempted sparse seek via segments mode — reverted; added incremental seek warning instead.

---

*Last updated: reflects state of the codebase after the seek-warning revert (sequence mode, incremental seek UX).*
