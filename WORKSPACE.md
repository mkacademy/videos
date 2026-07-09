# mkacademy workspace — videos repo

| Repo | Path | Remote | Port (`npm run dev`) |
|------|------|--------|----------------------|
| Editor | `~/Desktop/frontend` | `mkacademy/frontend` | 3000 |
| Viewer | `~/Desktop/website` | `mkacademy/website` | 3001 |
| CMS | `~/Desktop/cms` | `mkacademy/cms` | — |
| **Videos** | `~/Desktop/videos` | `mkacademy/videos` | 3000 |
| Landing | `~/Desktop/landing` | `mkacademy/landing` | — |

The **videos** repo is a standalone fork of `frontend` with routes trimmed to media player and prepper only. It retains the full dependency closure from frontend (Redux store, stash, FFmpeg tooling) so media features work without the convolution editor UI.

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
