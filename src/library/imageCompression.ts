import imageCompression from 'browser-image-compression';

export const MAX_IMAGE_WIDTH = 587;

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
]);

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export async function prepareImageFileForUpload(file: File): Promise<File> {
  if (!COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  try {
    const [, sourceCanvas] = await imageCompression.drawFileInCanvas(file, {
      fileType: file.type,
    });
    const { width, height } = sourceCanvas;

    if (width <= MAX_IMAGE_WIDTH) {
      sourceCanvas.width = 0;
      sourceCanvas.height = 0;
      return file;
    }

    const newWidth = MAX_IMAGE_WIDTH;
    const newHeight = Math.round(height * (MAX_IMAGE_WIDTH / width));
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      sourceCanvas.width = 0;
      sourceCanvas.height = 0;
      return file;
    }

    if (/jpe?g/.test(file.type)) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, newWidth, newHeight);
    }

    ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
    sourceCanvas.width = 0;
    sourceCanvas.height = 0;

    const quality = /jpe?g/.test(file.type) ? 0.92 : 1;
    return await imageCompression.canvasToFile(
      canvas,
      file.type,
      file.name,
      file.lastModified,
      quality,
    );
  } catch (error) {
    console.warn('Image compression failed, using original file', error);
    return file;
  }
}

export async function imageFileToDataUrl(file: File): Promise<{
  dataUrl: string;
  preparedFile: File;
}> {
  const preparedFile = await prepareImageFileForUpload(file);
  const dataUrl = await readFileAsDataUrl(preparedFile);
  return { dataUrl, preparedFile };
}
