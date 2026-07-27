# mkacademy/videos

Standalone media player and thumbs app for the mkacademy workspace. FFmpeg powers chunked video playback; course and tutorial content can be imported and exported.

## Features

- **Media Player** (`/media-player`) — chunked FFmpeg video playback for course and tutorial content
- **Media Thumbs** (`/media-thumbs`) — browse and export tutorial instruction images and course covers

## Development

```bash
npm install
npm run sync-ffmpeg-assets   # copies FFmpeg WASM assets into public/ffmpeg
npm run dev                # http://localhost:3002
```

## Build

```bash
npm run build
npm run preview            # serve production build on http://localhost:3007
```

## Workspace

Part of the mkacademy 4-repo workspace alongside `landing`, `studio`, `images`, and `videos`. See [WORKSPACE.md](WORKSPACE.md).

## Related docs

- [VIDEO_CHUNK_PLAYBACK.md](VIDEO_CHUNK_PLAYBACK.md) — chunked playback architecture and seek behavior
- [SHORTCUTS.md](SHORTCUTS.md) — keyboard shortcuts (full frontend shortcut catalog)
