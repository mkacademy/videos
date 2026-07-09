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

const TYPE_TO_TOKEN: Record<UnzipSourceType, string> = {
  incoming: 'in',
  outgoing: 'out',
  incoming_and_outgoing: 'both',
};

export type UnzipTypesByApp = Partial<Record<UnzipTreeApp, UnzipSourceType>>;

/** Ordered tree params that appear in the search string (tutorials → courses → Quizzes). */
export const presentUnzipTreeApps = (search: string): UnzipTreeApp[] => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return UNZIP_TREE_PARAM_ORDER.filter(({ zipper }) => {
    const value = params.get(zipper);
    return value !== null && value !== '';
  }).map(({ app }) => app);
};

/**
 * Build `unzip` value for the apps present in the link (token order = param order).
 * `incoming` → `in`, `outgoing` → `out`, `incoming_and_outgoing` → `both`.
 */
export const buildUnzipQueryValue = (
  presentApps: UnzipTreeApp[],
  types: Record<UnzipTreeApp, string>,
): string | null => {
  if (presentApps.length === 0) return null;

  const tokens: string[] = [];
  for (const app of presentApps) {
    const token = TYPE_TO_TOKEN[types[app] as UnzipSourceType];
    if (!token) return null;
    tokens.push(token);
  }
  return tokens.join('-');
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

/**
 * True when present apps span more than one distinct mailbox policy
 * (`incoming` / `outgoing` / `incoming_and_outgoing`).
 */
export const hasMixedUnzipMailboxes = (
  presentApps: UnzipTreeApp[],
  types: Record<UnzipTreeApp, string>,
): boolean => {
  if (presentApps.length < 2) return false;
  const distinct = new Set(presentApps.map((app) => types[app]));
  return distinct.size > 1;
};

export const MIXED_UNZIP_MAILBOX_WARNING =
  'Viewer note: this link mixes unzip mailboxes. The viewer runs one initial fetch using the first content type’s mailbox, so trees that need a different mailbox may be missing unless that side was already loaded.';
