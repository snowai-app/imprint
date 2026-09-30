/**
 * THE AUTHOR'S OWN SOURCES, cut into passages and ranked against a brief
 * (T-1751). The pure part is copied from byline's lib/chat.ts (change one,
 * change the other): cut each source's pages into chunks that keep where they
 * came from (the source and its page), score them against the wanted words by
 * simple keyword matching, most relevant first. `gatherPassages` reads ONE
 * owner's sources for ONE book through a store that names the owner in every
 * query, a few at a time (the Data API answers at most 1 MB and a list carries
 * no words).
 *
 * The outline step draws on all of a book's sources; a chapter draft draws
 * ONLY on the sources the author ticked for that chapter (`only`). When no
 * passage shares a word with the brief, the first passages of each source are
 * used instead, so a ticked source is never silently ignored.
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
import type { SourcePage, SourceStore } from './sources.ts';
import { titleOf } from './sources.ts';

export type Passage = { sourceId: string; name: string; page: number; text: string };

export const CHUNK_CHARS = 1200;
/** What a call to Ask may carry of the sources, in characters. */
export const CONTEXT_CHARS = 20_000;
export const MAX_SOURCES_READ = 30;
const AT_ONCE = 4;

/** A long passage cut at sentence ends into pieces of at most `max` characters. */
export function cutText(text: string, max = CHUNK_CHARS): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  if (t.length <= max) return [t];
  const out: string[] = [];
  let rest = t;
  while (rest.length > max) {
    let at = -1;
    for (const m of rest.slice(0, max).matchAll(/[.!?]["”’)]?\s/g)) at = (m.index ?? 0) + m[0].length;
    if (at < max / 3) at = rest.lastIndexOf(' ', max);
    if (at < max / 3) at = max;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export function passagesFromSource(src: { id: string; name: string }, pages: SourcePage[]): Passage[] {
  return pages.flatMap((p) => cutText(p.text).map((text): Passage => ({ sourceId: src.id, name: src.name, page: p.page, text })));
}

const STOP = new Set('the and for are but not you all any can had her was one our out has have that this with from they will what when where which who whom why how does did about into than then them these those there their would could should your mine its it\'s is a an of to in on at by as be or if so we do my me i'.split(' '));

/** The words of a brief worth matching: lower-case, three letters or more (or a number), no filler. */
export function terms(query: string): string[] {
  const seen = new Set<string>();
  for (const w of query.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+(?:[.,][0-9]+)*%?/g) ?? []) {
    const t = w.replace(/[.,]$/, '');
    if (STOP.has(t)) continue;
    if (t.length < 3 && !/^[0-9]/.test(t)) continue;
    seen.add(t);
  }
  return [...seen];
}

/** Terms that appear in a passage count for more the more of them it holds; repeats count a little, capped; the source's name counts a bit. */
export function score(p: Passage, ts: string[]): number {
  if (!ts.length) return 0;
  const hay = p.text.toLowerCase();
  const head = titleOf(p.name).toLowerCase();
  let hits = 0;
  let extra = 0;
  for (const t of ts) {
    let n = 0;
    for (let i = hay.indexOf(t); i !== -1 && n < 5; i = hay.indexOf(t, i + t.length)) n++;
    if (n) { hits++; extra += Math.min(n, 4) - 1; }
    if (head.includes(t)) extra += 0.5;
  }
  return hits ? hits * 3 + extra * 0.5 : 0;
}

/** The passages that share words with the query, best first (ties keep their order), at most `limit`. */
export function rank(passages: Passage[], query: string, limit = 40): Passage[] {
  const ts = terms(query);
  return passages
    .map((p, i) => ({ p, i, s: score(p, ts) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.p);
}

/**
 * The passages to send: the best-matching ones, and when fewer than a few
 * match (or none), the opening passages of each source in turn, so every
 * source chosen contributes something. Only whole passages, under `max`
 * characters in all, in the order they will be read: by source, then page.
 */
export function choose(passages: Passage[], query: string, max = CONTEXT_CHARS): Passage[] {
  const picked: Passage[] = [];
  let used = 0;
  const take = (p: Passage) => {
    if (picked.includes(p)) return false;
    if (used + p.text.length > max) return false;
    picked.push(p);
    used += p.text.length;
    return true;
  };
  for (const p of rank(passages, query)) take(p);
  if (picked.length < 4) {
    const bySource = new Map<string, Passage[]>();
    for (const p of passages) bySource.set(p.sourceId, [...(bySource.get(p.sourceId) ?? []), p]);
    for (let round = 0; round < 3; round++) for (const list of bySource.values()) if (list[round]) take(list[round]);
  }
  const order = new Map(passages.map((p, i) => [p, i]));
  return picked.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

export type Excerpt = { name: string; page: number; text: string };
/** What goes to Ask: the source's name without its extension, and the page, so a quote can be labelled. */
export const excerptOf = (p: Passage): Excerpt => ({ name: titleOf(p.name), page: p.page, text: p.text });

/**
 * The owner's passages for a book, read through the store: all the book's
 * sources, or only those in `only` (a chapter's ticked ones; an id that is not
 * one of this book's sources is simply not there). Newest first, at most 30.
 */
export async function gatherPassages(sources: Pick<SourceStore, 'list' | 'get'>, owner: string, bookId: string, query: string, only?: string[]): Promise<{ excerpts: Excerpt[]; sources: number }> {
  let metas = (await sources.list(owner, bookId)).slice(0, MAX_SOURCES_READ);
  if (only) metas = metas.filter((m) => only.includes(m.id));
  const all: Passage[] = [];
  for (let i = 0; i < metas.length; i += AT_ONCE) {
    const got = await Promise.all(metas.slice(i, i + AT_ONCE).map((s) => sources.get(owner, s.id)));
    for (const s of got) if (s && s.bookId === bookId) all.push(...passagesFromSource(s, s.text));
  }
  return { excerpts: choose(all, query).map(excerptOf), sources: metas.length };
}
