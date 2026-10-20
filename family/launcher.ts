/**
 * THE BAR'S APPS, AND THE PINS (T-3395, T-3403). Pure; tested in
 * family.test.mts. Which of the apps an account holds show on the family
 * bar, and in what order:
 *
 *   1. the apps the person pinned (in the nine dots), in the order pinned;
 *   2. failing any pin, the last five they opened, most recent first;
 *   3. failing that, the first nine they hold.
 *
 * The app the page belongs to is always on the bar. Pins and recents are
 * the person's, kept on snowai.app (/api/launcher) so every app shows the
 * same bar; while that cannot be read, this browser's copy stands in.
 */
export const BAR_MAX = 9;
export const BAR_DEFAULT = 5;
export const RECENT_MAX = 12;
export type LauncherPrefs = { pins: string[]; recent: string[] };
export const NO_PREFS: LauncherPrefs = { pins: [], recent: [] };

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(x)) : []);
const unique = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) === i);

/** Prefs as the API or a browser copy hands them back; nothing that is not an app id. */
export function parsePrefs(v: unknown): LauncherPrefs {
  if (!v || typeof v !== 'object') return NO_PREFS;
  const o = v as Record<string, unknown>;
  return { pins: unique(ids(o.pins)).slice(0, BAR_MAX), recent: unique(ids(o.recent)).slice(0, RECENT_MAX) };
}

/** The ids the bar shows, in order. `held` is what the account may open. */
export function barApps(held: string[], prefs: LauncherPrefs, current?: string): string[] {
  const has = new Set(held);
  const pinned = prefs.pins.filter((id) => has.has(id));
  let shown: string[];
  if (pinned.length) shown = pinned.slice(0, BAR_MAX);
  else if (held.length > BAR_MAX) {
    const recent = prefs.recent.filter((id) => has.has(id)).slice(0, BAR_DEFAULT);
    shown = recent.length ? recent : held.slice(0, BAR_MAX);
  } else shown = held.slice(0, BAR_MAX);
  if (current && has.has(current) && !shown.includes(current)) shown = [...shown.slice(0, BAR_MAX - 1), current];
  return shown;
}

export function togglePin(pins: string[], id: string): string[] {
  return pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id].slice(-BAR_MAX);
}

export function noteOpen(recent: string[], id: string): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, RECENT_MAX);
}
