export function getDouble(
  map: Record<string, unknown>,
  key: string,
  defaultValue = 0,
): number {
  const value = map[key];
  if (value == null) return defaultValue;
  if (typeof value === "number") return value;
  return defaultValue;
}

export function getInteger(
  map: Record<string, unknown>,
  key: string,
  defaultValue: number | null = 0,
): number | null {
  const value = map[key];
  if (value == null) return defaultValue;
  if (typeof value === "number") return value;
  return defaultValue;
}

export function getString(
  map: Record<string, unknown>,
  key: string,
  defaultValue: string | null = "",
): string | null {
  const value = map[key];
  if (value == null) return defaultValue;
  return String(value);
}

export function getBoolean(
  map: Record<string, unknown>,
  key: string,
  defaultValue: boolean | null = false,
): boolean | null {
  const value = map[key];
  if (value == null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return defaultValue;
}
