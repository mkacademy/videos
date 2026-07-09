export const PAYLOAD_TOO_LARGE_TO_STRINGIFY_MESSAGE =
  'The data is too large to serialize. Reduce the size of your selection before saving or exporting.';

export class PayloadTooLargeToStringifyError extends Error {
  constructor() {
    super(PAYLOAD_TOO_LARGE_TO_STRINGIFY_MESSAGE);
    this.name = 'PayloadTooLargeToStringifyError';
  }
}

export const isPayloadTooLargeToStringifyError = (error: unknown): boolean =>
  error instanceof PayloadTooLargeToStringifyError ||
  (error instanceof RangeError && error.message === 'Invalid string length');

export const safeJsonStringify = (value: unknown, space?: string | number): string => {
  try {
    return JSON.stringify(value, null, space);
  } catch (error) {
    if (isPayloadTooLargeToStringifyError(error)) {
      throw new PayloadTooLargeToStringifyError();
    }
    throw error;
  }
};

export const safeUtf8ByteLength = (value: unknown): number => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch (error) {
    if (isPayloadTooLargeToStringifyError(error)) {
      throw new PayloadTooLargeToStringifyError();
    }
    throw error;
  }
};

export const tryStringifyForExport = (
  value: unknown,
  space?: string | number,
): { ok: true; json: string } | { ok: false; message: string } => {
  try {
    return { ok: true, json: safeJsonStringify(value, space) };
  } catch (error) {
    if (isPayloadTooLargeToStringifyError(error)) {
      return { ok: false, message: PAYLOAD_TOO_LARGE_TO_STRINGIFY_MESSAGE };
    }
    throw error;
  }
};
