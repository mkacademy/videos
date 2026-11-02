/**
 * Landing search history in localStorage.
 * One key per day (`YYYY-MM-DD`), value = that day's searches joined by `\n`, oldest first.
 * When a key's value no longer fits, overflow goes to `YYYY-MM-DD-1`, `YYYY-MM-DD-2`, …
 * and those keys are merged back under the same date when loaded.
 */

const SEPARATOR = '\n';
const KEY_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:-(\d+))?$/;

export interface SearchHistoryDay {
  date: string;
  /** Latest first. */
  searches: string[];
}

const pad = (n: number): string => String(n).padStart(2, '0');

const todayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const split = (value: string | null): string[] =>
  (value ?? '').split(SEPARATOR).filter((s) => s !== '');

/** Storage keys for each date, ordered base key first then by suffix. */
const keysByDate = (): Map<string, string[]> => {
  const parsed: { date: string; suffix: number; key: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const match = key ? KEY_PATTERN.exec(key) : null;
    if (key && match) parsed.push({ date: match[1], suffix: match[2] ? Number(match[2]) : 0, key });
  }
  parsed.sort((a, b) => a.suffix - b.suffix);
  const byDate = new Map<string, string[]>();
  for (const { date, key } of parsed) {
    byDate.set(date, [...(byDate.get(date) ?? []), key]);
  }
  return byDate;
};

const writeOrRemove = (key: string, searches: string[]): void => {
  if (searches.length === 0) localStorage.removeItem(key);
  else localStorage.setItem(key, searches.join(SEPARATOR));
};

const isQuotaError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

export const isSearchHistoryAvailable = (): boolean => {
  try {
    const probe = '__searchHistoryProbe__';
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};

/** Dates latest to oldest; searches within a date latest first. */
export const loadSearchHistory = (): SearchHistoryDay[] =>
  [...keysByDate()]
    .map(([date, keys]) => ({
      date,
      searches: keys.flatMap((key) => split(localStorage.getItem(key))).reverse(),
    }))
    .filter((day) => day.searches.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

/** Append to today's history; a repeated search moves to the top instead of duplicating. */
export const addSearchToHistory = (text: string): void => {
  const date = todayKey();
  const keys = keysByDate().get(date) ?? [date];
  for (const key of keys) {
    const searches = split(localStorage.getItem(key));
    if (searches.includes(text)) writeOrRemove(key, searches.filter((s) => s !== text));
  }

  const lastKey = keys[keys.length - 1];
  const existing = localStorage.getItem(lastKey);
  try {
    localStorage.setItem(lastKey, existing ? `${existing}${SEPARATOR}${text}` : text);
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    const lastSuffix = Number(KEY_PATTERN.exec(lastKey)?.[2] ?? 0);
    localStorage.setItem(`${date}-${lastSuffix + 1}`, text);
  }
};

export const removeSearchFromHistory = (date: string, text: string): void => {
  for (const key of keysByDate().get(date) ?? []) {
    writeOrRemove(key, split(localStorage.getItem(key)).filter((s) => s !== text));
  }
};

export const removeDateFromHistory = (date: string): void => {
  for (const key of keysByDate().get(date) ?? []) localStorage.removeItem(key);
};
