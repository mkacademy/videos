export interface FlattenResult {
  content: Record<string, unknown>;
  counts: Record<string, unknown>;
}

export interface Content {
  records: Record<string, unknown>;
  counts: Record<string, unknown>;
}

export function content(
  records: Record<string, unknown>,
  counts: Record<string, unknown> = {},
): Content {
  return { records, counts };
}
