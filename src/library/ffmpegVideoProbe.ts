import { probeVideo, revokeProbeUrl } from '../components/mediaPrepper/probeVideo';
import { probeMp4FrameRate } from './mp4FrameRateProbe';

export type VideoFileProbeResult = {
  durationSeconds: number;
  frameRate: number | null;
  width: number;
  height: number;
  source: 'html-video';
};

/** Fast metadata probe for directory import — no ffmpeg.wasm load or full decode. */
export async function probeVideoFileForImport(file: File): Promise<VideoFileProbeResult> {
  const [probe, frameRate] = await Promise.all([
    probeVideo(file),
    probeMp4FrameRate(file),
  ]);

  try {
    return {
      durationSeconds: probe.duration,
      frameRate,
      width: probe.width,
      height: probe.height,
      source: 'html-video',
    };
  } finally {
    revokeProbeUrl(probe);
  }
}

export type AudioFileProbeResult = {
  durationSeconds: number;
  frameRate: null;
  width: 0;
  height: 0;
  source: 'html-audio';
};

/** Fast metadata probe for MP3 directory import — no ffmpeg.wasm load or full decode. */
export async function probeAudioFileForImport(file: File): Promise<AudioFileProbeResult> {
  const url = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';

  try {
    const durationSeconds = await new Promise<number>((resolve, reject) => {
      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      };
      audio.onerror = () => reject(new Error('Could not read audio metadata. The file may be corrupt or unsupported.'));
      audio.src = url;
    });

    return {
      durationSeconds,
      frameRate: null,
      width: 0,
      height: 0,
      source: 'html-audio',
    };
  } finally {
    URL.revokeObjectURL(url);
    audio.removeAttribute('src');
    audio.load();
  }
}
