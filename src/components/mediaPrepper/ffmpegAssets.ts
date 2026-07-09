import { toBlobURL } from '@ffmpeg/util';

export interface FfmpegLoadUrls {
  coreURL: string;
  wasmURL: string;
  classWorkerURL: string;
}

function getLocalFfmpegPath(): string {
  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  return `${publicUrl}/public/ffmpeg`;
}

export function getLocalFfmpegBaseUrl(): string {
  const path = getLocalFfmpegPath();
  if (typeof window === 'undefined') {
    return path;
  }
  return `${window.location.origin}${path}`;
}

async function blobFromUrl(url: string, mimeType: string): Promise<string> {
  try {
    return await toBlobURL(url, mimeType);
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function resolveFfmpegLoadUrls(): Promise<FfmpegLoadUrls> {
  const base = getLocalFfmpegBaseUrl();
  const [coreURL, wasmURL] = await Promise.all([
    blobFromUrl(`${base}/ffmpeg-core.js`, 'text/javascript'),
    blobFromUrl(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  ]);
  return {
    coreURL,
    wasmURL,
    classWorkerURL: `${base}/worker.js`,
  };
}
