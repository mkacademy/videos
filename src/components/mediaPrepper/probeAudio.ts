import type { AudioProbeResult } from './types';

export async function probeAudio(file: File): Promise<AudioProbeResult> {
  const probeUrl = URL.createObjectURL(file);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const cleanup = () => {
        audio.removeAttribute('src');
        audio.load();
      };

      audio.onloadedmetadata = () => {
        const value = Number.isFinite(audio.duration) ? audio.duration : 0;
        if (value <= 0) {
          cleanup();
          reject(new Error('Could not read audio duration. The file may be corrupt or unsupported.'));
          return;
        }
        cleanup();
        resolve(value);
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error('Could not read audio metadata. The file may be corrupt or in an unsupported format.'));
      };

      audio.src = probeUrl;
    });

    return {
      duration,
      fileSizeBytes: file.size,
      probeUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(probeUrl);
    throw error;
  }
}

export function revokeAudioProbeUrl(probe: AudioProbeResult | null | undefined): void {
  if (probe?.probeUrl) {
    URL.revokeObjectURL(probe.probeUrl);
  }
}
