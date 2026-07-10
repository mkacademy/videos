# mkacademy workspace — videos repo

| Repo | Path | Remote | `npm run dev` |
|------|------|--------|---------------|
| Studio | `~/Desktop/studio` | `mkacademy/studio` | http://localhost:3000 |
| Images | `~/Desktop/images` | `mkacademy/images` | http://localhost:3001 |
| **Videos** | `~/Desktop/videos` | `mkacademy/videos` | http://localhost:3002 |
| Landing | `~/Desktop/landing` | `mkacademy/landing` | http://localhost:4000 |

The **videos** repo is a standalone app with routes trimmed to media player and prepper only. It retains the dependency closure needed for FFmpeg tooling and media workflows without the full studio convolution UI.

## Clone (SSH)

```bash
cd ~/Desktop
GIT_SSH_COMMAND="ssh -i ~/.ssh/fabrisrugero-GitHub -o IdentitiesOnly=yes" \
  git clone git@github.com:mkacademy/videos.git
```

## Local dev

```bash
cd ~/Desktop/videos
npm install
npm run sync-ffmpeg-assets
npm run dev
```

Default route redirects `/` → `/media-prepper`.
