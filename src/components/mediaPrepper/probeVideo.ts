import type { ProbeResult } from './types';

export async function probeVideo(file: File): Promise<ProbeResult> {
  const probeUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    const metadata = await new Promise<{ width: number; height: number; duration: number }>(
      (resolve, reject) => {
        const cleanup = () => {
          video.removeAttribute('src');
          video.load();
        };

        video.onloadedmetadata = () => {
          const width = video.videoWidth;
          const height = video.videoHeight;
          const duration = Number.isFinite(video.duration) ? video.duration : 0;

          if (!width || !height) {
            cleanup();
            reject(new Error('Could not read video dimensions. The file may be corrupt or unsupported.'));
            return;
          }

          cleanup();
          resolve({ width, height, duration });
        };

        video.onerror = () => {
          cleanup();
          reject(new Error('Could not read video metadata. The file may be corrupt or in an unsupported format.'));
        };

        video.src = probeUrl;
      },
    );

    return {
      ...metadata,
      fileSizeBytes: file.size,
      probeUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(probeUrl);
    throw error;
  }
}

export function revokeProbeUrl(probe: ProbeResult | null | undefined): void {
  if (probe?.probeUrl) {
    URL.revokeObjectURL(probe.probeUrl);
  }
}
