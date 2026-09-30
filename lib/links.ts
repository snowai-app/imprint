/**
 * Where Imprint lives and where the family signs in. A blank variable counts
 * as absent, so an empty row in the console never hands '' to an <a href>.
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
const env = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value && value.trim() ? value.trim().replace(/\/+$/, '') : fallback;
};

export const IMPRINT_URL = 'https://imprint.snowai.app';
export const LOGIN_URL = env('NEXT_PUBLIC_FRONT_URL', 'https://snowai.app') + '/login';

/** The family's sign-in, coming back to `path` on Imprint. */
export const loginUrl = (path: string) => `${LOGIN_URL}?next=${encodeURIComponent(new URL(path, IMPRINT_URL).toString())}`;
