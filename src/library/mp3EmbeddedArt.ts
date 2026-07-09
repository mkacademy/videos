const ID3_HEADER_SIZE = 10;

const ID3V22_FRAME_IDS = {
  PICTURE: 'PIC',
} as const;

const ID3V23_FRAME_IDS = {
  ATTACHED_PICTURE: 'APIC',
} as const;

const PREFERRED_PICTURE_TYPES = [3, 4, 0] as const;

type EmbeddedPicture = {
  pictureType: number;
  mime: string;
  data: Uint8Array;
};

const readSyncsafeInt = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] << 21)
    | (bytes[offset + 1] << 14)
    | (bytes[offset + 2] << 7)
    | bytes[offset + 3]) >>> 0;

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]) >>> 0;

const readUint24BE = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2]) >>> 0;

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const step = 8192;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
};

const unsyncId3Bytes = (bytes: Uint8Array): Uint8Array => {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    out.push(bytes[i]);
    if (bytes[i] === 0xff && i + 1 < bytes.length && bytes[i + 1] === 0x00) {
      i += 1;
    }
  }
  return new Uint8Array(out);
};

const normalizeV22ImageFormat = (format: string): string => {
  const trimmed = format.trim().toUpperCase();
  if (trimmed === 'JPG' || trimmed === 'JPEG') return 'image/jpeg';
  if (trimmed === 'PNG') return 'image/png';
  if (trimmed === 'GIF') return 'image/gif';
  if (trimmed === 'WEBP') return 'image/webp';
  if (trimmed.includes('/')) return trimmed.toLowerCase();
  return `image/${trimmed.toLowerCase()}`;
};

const skipEncodedString = (bytes: Uint8Array, offset: number, encoding: number): number => {
  if (encoding === 1 || encoding === 2) {
    let i = offset;
    while (i + 1 < bytes.length) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i + 2;
      i += 1;
    }
    return bytes.length;
  }

  let i = offset;
  while (i < bytes.length && bytes[i] !== 0) i += 1;
  return i + 1;
};

const parseApicFrame = (frameData: Uint8Array, majorVersion: number): EmbeddedPicture | null => {
  if (frameData.length < 4) return null;

  const encoding = frameData[0];
  let offset = 1;

  let mime = '';
  if (majorVersion === 2) {
    if (offset + 3 > frameData.length) return null;
    mime = normalizeV22ImageFormat(String.fromCharCode(...frameData.subarray(offset, offset + 3)));
    offset += 3;
  } else {
    let i = offset;
    while (i < frameData.length && frameData[i] !== 0) i += 1;
    mime = String.fromCharCode(...frameData.subarray(offset, i)).trim().toLowerCase() || 'image/jpeg';
    offset = i + 1;
  }

  if (offset >= frameData.length) return null;
  const pictureType = frameData[offset];
  offset += 1;

  offset = skipEncodedString(frameData, offset, encoding);
  if (offset >= frameData.length) return null;

  const data = frameData.subarray(offset);
  if (data.length === 0) return null;

  return { pictureType, mime, data };
};

const pickPreferredPicture = (pictures: EmbeddedPicture[]): EmbeddedPicture | null => {
  if (pictures.length === 0) return null;
  for (const preferredType of PREFERRED_PICTURE_TYPES) {
    const match = pictures.find(({ pictureType }) => pictureType === preferredType);
    if (match) return match;
  }
  return pictures[0];
};

const parseId3v2Tag = (bytes: Uint8Array): EmbeddedPicture[] => {
  if (bytes.length < ID3_HEADER_SIZE) return [];
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== 'ID3') return [];

  const majorVersion = bytes[3];
  const flags = bytes[5];
  const tagSize = readSyncsafeInt(bytes, 6);
  const tagEnd = Math.min(bytes.length, ID3_HEADER_SIZE + tagSize);
  if (tagEnd <= ID3_HEADER_SIZE) return [];

  let frameAreaStart = ID3_HEADER_SIZE;
  if (flags & 0x40) {
    if (frameAreaStart + 4 > tagEnd) return [];
    const extendedSize = majorVersion === 4
      ? readSyncsafeInt(bytes, frameAreaStart)
      : readUint32BE(bytes, frameAreaStart);
    frameAreaStart += 4 + extendedSize;
  }

  let frameBytes = bytes.subarray(frameAreaStart, tagEnd);
  if (flags & 0x80) {
    frameBytes = unsyncId3Bytes(frameBytes);
  }

  const pictures: EmbeddedPicture[] = [];
  let offset = 0;

  while (offset + 10 <= frameBytes.length) {
    const frameId = String.fromCharCode(...frameBytes.subarray(offset, offset + (majorVersion === 2 ? 3 : 4)));
    if (!/^[A-Z0-9]{3,4}$/.test(frameId)) break;

    let frameSize = 0;
    let headerSize = 0;
    if (majorVersion === 2) {
      frameSize = readUint24BE(frameBytes, offset + 3);
      headerSize = 6;
    } else {
      frameSize = majorVersion === 4
        ? readSyncsafeInt(frameBytes, offset + 4)
        : readUint32BE(frameBytes, offset + 4);
      headerSize = 10;
    }

    offset += headerSize;
    if (frameSize <= 0 || offset + frameSize > frameBytes.length) break;

    const frameData = frameBytes.subarray(offset, offset + frameSize);
    offset += frameSize;

    const isPictureFrame = majorVersion === 2
      ? frameId === ID3V22_FRAME_IDS.PICTURE
      : frameId === ID3V23_FRAME_IDS.ATTACHED_PICTURE;
    if (!isPictureFrame) continue;

    const parsed = parseApicFrame(frameData, majorVersion);
    if (parsed) pictures.push(parsed);
  }

  return pictures;
};

/** Reads embedded cover art from MP3 ID3 tags and returns a data URL, if present. */
export const extractMp3EmbeddedArtDataUrl = (bytes: Uint8Array): string | null => {
  const picture = pickPreferredPicture(parseId3v2Tag(bytes));
  if (!picture) return null;

  const mime = picture.mime.startsWith('image/') ? picture.mime : 'image/jpeg';
  return `data:${mime};base64,${bytesToBase64(picture.data)}`;
};

export const audioFileToDataUrlWithThumbnail = async (
  file: File,
): Promise<{ dataUrl: string; fileBytes: number; thumbnailDataUrl?: string }> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const thumbnailDataUrl = extractMp3EmbeddedArtDataUrl(bytes) ?? undefined;

  let binary = '';
  const step = 8192;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }

  const mime = file.type || 'audio/mpeg';
  return {
    dataUrl: `data:${mime};base64,${btoa(binary)}`,
    fileBytes: file.size,
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
  };
};
