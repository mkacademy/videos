const CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);

const HEAD_READ_BYTES = 2 * 1024 * 1024;
const TAIL_READ_BYTES = 8 * 1024 * 1024;

type BoxHeader = {
  type: string;
  offset: number;
  size: number;
  contentStart: number;
};

function readUint32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24)
    | (data[offset + 1] << 16)
    | (data[offset + 2] << 8)
    | data[offset + 3]
  ) >>> 0;
}

function readBoxType(data: Uint8Array, offset: number): string {
  return String.fromCharCode(
    data[offset + 4],
    data[offset + 5],
    data[offset + 6],
    data[offset + 7],
  );
}

function parseBoxHeader(data: Uint8Array, offset: number, end: number): BoxHeader | null {
  if (offset + 8 > end) return null;
  let size = readUint32(data, offset);
  const type = readBoxType(data, offset);
  let headerSize = 8;

  if (size === 1) {
    if (offset + 16 > end) return null;
    const high = readUint32(data, offset + 8);
    const low = readUint32(data, offset + 12);
    size = high * 2 ** 32 + low;
    headerSize = 16;
  } else if (size === 0) {
    size = end - offset;
  }

  if (size < headerSize || offset + size > end) return null;

  return {
    type,
    offset,
    size,
    contentStart: offset + headerSize,
  };
}

function forEachBox(
  data: Uint8Array,
  start: number,
  end: number,
  visit: (box: BoxHeader) => void,
): void {
  let offset = start;
  while (offset + 8 <= end) {
    const box = parseBoxHeader(data, offset, end);
    if (!box) break;
    visit(box);
    if (CONTAINER_BOXES.has(box.type)) {
      forEachBox(data, box.contentStart, box.offset + box.size, visit);
    }
    offset = box.offset + box.size;
  }
}

function parseMdhdTimescale(data: Uint8Array, contentStart: number, contentEnd: number): number | null {
  if (contentStart + 12 > contentEnd) return null;
  const version = data[contentStart];
  if (version === 0) {
    if (contentStart + 16 > contentEnd) return null;
    return readUint32(data, contentStart + 12);
  }
  if (version === 1) {
    if (contentStart + 24 > contentEnd) return null;
    return readUint32(data, contentStart + 20);
  }
  return null;
}

function parseSttsSampleDelta(data: Uint8Array, contentStart: number, contentEnd: number): number | null {
  if (contentStart + 12 > contentEnd) return null;
  const entryCount = readUint32(data, contentStart + 4);
  if (entryCount === 0 || contentStart + 16 > contentEnd) return null;
  return readUint32(data, contentStart + 12);
}

function parseVideoTrackFrameRate(data: Uint8Array, trak: BoxHeader): number | null {
  let isVideo = false;
  let timescale: number | null = null;
  let sampleDelta: number | null = null;
  const trakEnd = trak.offset + trak.size;

  forEachBox(data, trak.contentStart, trakEnd, (box) => {
    if (box.type === 'mdia') {
      const mdiaEnd = box.offset + box.size;
      forEachBox(data, box.contentStart, mdiaEnd, (mdiaChild) => {
        if (mdiaChild.type === 'hdlr') {
          const handlerStart = mdiaChild.contentStart + 8;
          if (handlerStart + 4 <= mdiaChild.offset + mdiaChild.size) {
            const handlerType = String.fromCharCode(
              data[handlerStart],
              data[handlerStart + 1],
              data[handlerStart + 2],
              data[handlerStart + 3],
            );
            if (handlerType === 'vide') isVideo = true;
          }
        }
        if (mdiaChild.type === 'mdhd') {
          timescale = parseMdhdTimescale(
            data,
            mdiaChild.contentStart,
            mdiaChild.offset + mdiaChild.size,
          );
        }
        if (mdiaChild.type === 'minf') {
          forEachBox(data, mdiaChild.contentStart, mdiaChild.offset + mdiaChild.size, (minfChild) => {
            if (minfChild.type === 'stbl') {
              forEachBox(data, minfChild.contentStart, minfChild.offset + minfChild.size, (stblChild) => {
                if (stblChild.type === 'stts') {
                  sampleDelta = parseSttsSampleDelta(
                    data,
                    stblChild.contentStart,
                    stblChild.offset + stblChild.size,
                  );
                }
              });
            }
          });
        }
      });
    }
  });

  if (!isVideo || !timescale || !sampleDelta || sampleDelta <= 0) return null;
  const fps = timescale / sampleDelta;
  return Number.isFinite(fps) && fps > 0 ? Math.round(fps * 100) / 100 : null;
}

function findVideoFrameRateInBuffer(data: Uint8Array): number | null {
  let frameRate: number | null = null;
  forEachBox(data, 0, data.length, (box) => {
    if (box.type !== 'trak' || frameRate !== null) return;
    const trakRate = parseVideoTrackFrameRate(data, box);
    if (trakRate !== null) frameRate = trakRate;
  });
  return frameRate;
}

async function readProbeBuffer(file: File): Promise<Uint8Array> {
  const headSize = Math.min(file.size, HEAD_READ_BYTES);
  const head = new Uint8Array(await file.slice(0, headSize).arrayBuffer());
  if (findVideoFrameRateInBuffer(head) !== null || hasMoovBox(head)) {
    return head;
  }

  const tailSize = Math.min(file.size, TAIL_READ_BYTES);
  const tailStart = Math.max(0, file.size - tailSize);
  const tail = new Uint8Array(await file.slice(tailStart, file.size).arrayBuffer());
  if (hasMoovBox(tail)) return tail;

  if (head.length + tail.length <= file.size) {
    const combined = new Uint8Array(head.length + tail.length);
    combined.set(head, 0);
    combined.set(tail, head.length);
    return combined;
  }

  return head;
}

function hasMoovBox(data: Uint8Array): boolean {
  let found = false;
  forEachBox(data, 0, data.length, (box) => {
    if (box.type === 'moov') found = true;
  });
  return found;
}

/** Reads only the head/tail of an MP4 to estimate constant frame rate. */
export async function probeMp4FrameRate(file: File): Promise<number | null> {
  try {
    const buffer = await readProbeBuffer(file);
    return findVideoFrameRateInBuffer(buffer);
  } catch (error) {
    console.warn(`MP4 frame-rate probe failed for "${file.name}":`, error);
    return null;
  }
}
