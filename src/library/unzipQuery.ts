/** Query-param encoding for auto-unzip source settings. */

export type UnzipSourceType = 'incoming' | 'outgoing' | 'incoming_and_outgoing';

export type UnzipTreeApp = 'tutorial' | 'course' | 'quiz';

/** Tree-id query keys in generation / deep-link order. */
export const UNZIP_TREE_PARAM_ORDER = [
  { zipper: 'tutorials', app: 'tutorial' as const },
  { zipper: 'courses', app: 'course' as const },
  { zipper: 'Quizzes', app: 'quiz' as const },
] as const;

const TOKEN_TO_TYPE: Record<string, UnzipSourceType> = {
  in: 'incoming',
  out: 'outgoing',
  both: 'incoming_and_outgoing',
};

type UnzipTypesByApp = Partial<Record<UnzipTreeApp, UnzipSourceType>>;

/** Ordered tree params that appear in the search string (tutorials → courses → Quizzes). */
const presentUnzipTreeApps = (search: string): UnzipTreeApp[] => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return UNZIP_TREE_PARAM_ORDER.filter(({ zipper }) => {
    const value = params.get(zipper);
    return value !== null && value !== '';
  }).map(({ app }) => app);
};

/** Parse `unzip=in-out-in` against tree params present in the same search string. */
export const parseUnzipQueryParam = (search: string): UnzipTypesByApp => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const unzipRaw = params.get('unzip');
  if (!unzipRaw) return {};

  const tokens = unzipRaw.split('-').filter(Boolean);
  const apps = presentUnzipTreeApps(search);
  const result: UnzipTypesByApp = {};

  for (let i = 0; i < apps.length && i < tokens.length; i++) {
    const type = TOKEN_TO_TYPE[tokens[i]];
    if (type) result[apps[i]] = type;
  }

  return result;
};
