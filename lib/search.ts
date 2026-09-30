/**
 * What a search box sends to the database as a `like` pattern: the words
 * trimmed, cut to a sensible length, and every character that `like` treats as
 * a wildcard (`%`, `_`) or an escape (`\`) made plain, so a person searching
 * for "100%" finds "100%" and not everything. Use with `escape '\'`.
 * '' means "no search". No imports, so the tests can load it.
 */
export const SEARCH_MAX = 80;

export function likePattern(q: unknown): string {
  const t = typeof q === 'string' ? q.trim().replace(/\s+/g, ' ').slice(0, SEARCH_MAX) : '';
  if (!t) return '';
  return `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** The same words as a plain, lower-case needle for searching in memory (tests, and the chat's scoring). */
export const needle = (q: unknown): string => (typeof q === 'string' ? q.trim().replace(/\s+/g, ' ').slice(0, SEARCH_MAX).toLowerCase() : '');
