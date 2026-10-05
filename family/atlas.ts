/**
 * ATLAS SYNC (T-2193): how an app tells Atlas what it has, the moment it
 * changes. Pure, no imports and no hostname, so the family test, Atlas and
 * every app read the same rules.
 *
 * Atlas (the app named `atlas`) is the family's public map: every app's articles,
 * help pages, forms, terms and the app itself, one search and one page each.
 * Every change reaches it at once, by push:
 *
 *   publishToAtlas(FAMILY_LINKS.atlas, key, 'tax', [entry])   // added or changed
 *   removeFromAtlas(FAMILY_LINKS.atlas, key, 'tax', 'what-is-1099')   // gone: hidden at once
 *
 * and a safety sweep behind it: every 15 minutes Atlas reads each app's
 * public manifest at `<the app's address>/atlas.json` (`atlasManifest`),
 * adds or updates what changed and removes what is no longer listed. An app
 * with no manifest yet, or one that does not answer, is skipped and keeps
 * its entries.
 *
 * SERVER ONLY. `key` is the family's shared capability key (Secrets Manager,
 * `snowai/capability-key`), read by the app's server. It never reaches a
 * browser, and a manifest never carries it.
 *
 * EVERY ENTRY IS PUBLIC. No customer's document, no account, no health
 * detail about a person: Atlas refuses an email address, a phone number or a
 * Social Security number in any entry. General information only.
 *
 * The endpoint comes from the app's own lib/links.ts (`FAMILY_LINKS.atlas`).
 */

/** The languages an entry may carry besides English. English governs. */
export type AtlasLang = 'es' | 'hi';

export type AtlasKind = 'product' | 'capability' | 'article' | 'pdf' | 'help' | 'term' | 'page';

export const ATLAS_KINDS: readonly AtlasKind[] = ['product', 'capability', 'article', 'pdf', 'help', 'term', 'page'];

/** One entry's words in another language; anything left out shows in English. */
export type AtlasText = { title?: string; lead?: string; body?: string };

export type AtlasEntry = {
  /** The app's own id for the thing, stable across edits (letters, digits, `.`, `_`, `:`, `-`). */
  id: string;
  kind: AtlasKind;
  /** Up to 200 characters. */
  title: string;
  /** One plain sentence saying what it is, up to 400 characters. */
  lead: string;
  /** Where it lives: an https address on the family's own domains (Snow AI's or Get Covered's). */
  url: string;
  /** When it last changed, ISO 8601. Atlas shows it as "Updated … ago". */
  updated_at: string;
  /** Plain text, paragraphs separated by a blank line, up to 8000 characters. */
  body?: string;
  /** Words people search for that are not in the title. */
  keywords?: string[];
  /** Translations, by language. */
  lang?: Partial<Record<AtlasLang, AtlasText>>;
  /** Atlas's address for it (`<Atlas>/<slug>`); `atlasSlug(source, id)` when left out. */
  slug?: string;
};

/** What `<the app's address>/atlas.json` answers with. */
export type AtlasManifest = { source: string; updated_at: string; entries: AtlasEntry[] };

/** Where an app serves its manifest, under its own address. */
export const ATLAS_MANIFEST_PATH = '/atlas.json';

/** The most entries one push carries; `publishToAtlas` splits a longer list. */
export const ATLAS_MAX_BATCH = 200;

/** An app's id, as in family/apps.ts. */
export const ATLAS_SOURCE = /^[a-z0-9-]{2,40}$/;

/** An entry's id within its app. */
export const ATLAS_ID = /^[A-Za-z0-9._:-]{1,120}$/;

/** Atlas's address for an entry that names none: `<source>-<id>`, lower case, hyphens only. */
export function atlasSlug(source: string, id: string): string {
  const s = `${source}-${id}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 81)
    .replace(/-+$/g, '');
  return s || source;
}

/** The manifest an app serves at ATLAS_MANIFEST_PATH. */
export function atlasManifest(source: string, entries: AtlasEntry[], now: Date = new Date()): AtlasManifest {
  return { source, updated_at: now.toISOString(), entries };
}

export type AtlasResult = { ok: true; saved?: number; removed?: string } | { ok: false; status: number; error: string };

const base = (endpoint: string) => endpoint.replace(/\/+$/, '');

async function call(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

/**
 * Add or update entries in Atlas, now. Never throws: a refusal or a network
 * failure comes back as `{ ok: false }`, and the sweep picks the change up
 * from the manifest within 15 minutes anyway.
 */
export async function publishToAtlas(
  endpoint: string,
  key: string,
  source: string,
  entries: AtlasEntry | AtlasEntry[],
  opts: { signal?: AbortSignal } = {},
): Promise<AtlasResult> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (!endpoint || !key) return { ok: false, status: 0, error: 'no Atlas address or key' };
  if (!ATLAS_SOURCE.test(source)) return { ok: false, status: 0, error: 'source: the app id, as in family/apps.ts' };
  let saved = 0;
  try {
    for (let i = 0; i < list.length; i += ATLAS_MAX_BATCH) {
      const r = await call(`${base(endpoint)}/api/entries`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ source, entries: list.slice(i, i + ATLAS_MAX_BATCH) }),
        signal: opts.signal,
      });
      if (!r.ok) return { ok: false, status: r.status, error: typeof r.body.error === 'string' ? r.body.error : `Atlas answered ${r.status}` };
      saved += typeof r.body.saved === 'number' ? r.body.saved : 0;
    }
    return { ok: true, saved };
  } catch {
    return { ok: false, status: 0, error: 'Atlas could not be reached' };
  }
}

/** Take an entry off Atlas, now: it is hidden at once. Never throws. */
export async function removeFromAtlas(endpoint: string, key: string, source: string, id: string, opts: { signal?: AbortSignal } = {}): Promise<AtlasResult> {
  if (!endpoint || !key) return { ok: false, status: 0, error: 'no Atlas address or key' };
  if (!ATLAS_SOURCE.test(source) || !ATLAS_ID.test(id)) return { ok: false, status: 0, error: 'source or id is not one Atlas takes' };
  try {
    const r = await call(`${base(endpoint)}/api/entries/${source}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${key}` },
      signal: opts.signal,
    });
    if (!r.ok) return { ok: false, status: r.status, error: typeof r.body.error === 'string' ? r.body.error : `Atlas answered ${r.status}` };
    return { ok: true, removed: id };
  } catch {
    return { ok: false, status: 0, error: 'Atlas could not be reached' };
  }
}
