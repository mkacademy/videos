/** Query-param encoding for quiz randomizedType settings (`ran=I|d|b`). */

export type RandomizedType = 'Imageurls' | 'details' | 'both';

export const RANDOMIZED_QUERY_PARAM = 'ran';

const TOKEN_TO_TYPE: Record<string, RandomizedType> = {
  I: 'Imageurls',
  d: 'details',
  b: 'both',
};

const TYPE_TO_TOKEN: Record<RandomizedType, string> = {
  Imageurls: 'I',
  details: 'd',
  both: 'b',
};

export const buildRandomizedQueryValue = (type: RandomizedType): string => TYPE_TO_TOKEN[type];

/** Parse `ran=I|d|b` from a search string; returns null when absent or invalid. */
export const parseRandomizedQueryParam = (search: string): RandomizedType | null => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const token = new URLSearchParams(raw).get(RANDOMIZED_QUERY_PARAM);
  if (!token) return null;
  return TOKEN_TO_TYPE[token] ?? null;
};

export const hasQuizDeepLinkParam = (search: string): boolean => {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return params.has('Quizzes') || params.has('quiz');
};

export const linkPairsIncludeQuiz = (
  pairs: Array<{ treeIdParam: string; bannerIdParam: string }>,
): boolean => pairs.some((pair) => pair.treeIdParam === 'Quizzes' || pair.bannerIdParam === 'quiz');
