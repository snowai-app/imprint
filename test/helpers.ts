/* Stand-ins: Ask answering from a queue, Reader, Render, a made-up sign-in and
   in-memory stores with the same owner rule as lib/books-store.ts,
   lib/chapter-store.ts and lib/source-store.ts. Invented data only. */
import type { Ask, AskOptions, ChatMessage } from '../lib/ask.ts';
import { AskUnavailable } from '../lib/ask.ts';
import type { Book, BookStore } from '../lib/books.ts';
import { wordCount } from '../lib/books.ts';
import { DEFAULT_TARGET, MAX_CHAPTERS, appendParagraphs, type Chapter, type ChapterMeta, type ChapterStore } from '../lib/chapters.ts';
import type { SourceFull, SourceMeta, SourceStore } from '../lib/sources.ts';
import type { Reader } from '../lib/reader.ts';
import { ReaderUnavailable } from '../lib/reader.ts';
import type { Who } from '../lib/api.ts';

export type Call = { messages: ChatMessage[]; options: AskOptions };

export function fakeAsk(answers: unknown[]): { ask: Ask; calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...answers];
  const ask: Ask = async (messages, options) => {
    calls.push({ messages, options });
    const next = queue.shift();
    if (next instanceof AskUnavailable) throw next;
    if (next === undefined) throw new Error('the stand-in ran out of answers');
    return next;
  };
  return { ask, calls };
}

/** Whoever the request's `x-test-viewer` header names; nobody without it. */
export const who: Who = async (request) => {
  const email = request.headers.get('x-test-viewer');
  return email ? { email, userId: 'u', authTime: null } : null;
};

type BookRow = Book & { owner: string };

/** Books in memory, with the same owner rule as lib/books-store.ts. */
export function memoryBooks(): BookStore & { rows: Map<string, BookRow> } {
  const rows = new Map<string, BookRow>();
  let n = 0;
  let clock = 0;
  const strip = ({ owner: _o, ...b }: BookRow): Book => structuredClone(b);
  return {
    rows,
    async list(owner) { return [...rows.values()].filter((r) => r.owner === owner).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(strip); },
    async get(owner, id) { const r = rows.get(id); return r && r.owner === owner ? strip(r) : null; },
    async create(owner, f) {
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
      const now = `2026-09-30 12:00:${String(++clock).padStart(2, '0')}+00`;
      const row: BookRow = { ...structuredClone(f), owner, id, status: 'draft', createdAt: now, updatedAt: now };
      rows.set(id, row);
      return strip(row);
    },
    async update(owner, id, patch) {
      const r = rows.get(id);
      if (!r || r.owner !== owner) return null;
      Object.assign(r, structuredClone(patch), { updatedAt: `2026-09-30 13:00:${String(++clock).padStart(2, '0')}+00` });
      return strip(r);
    },
    async remove(owner, id) {
      const r = rows.get(id);
      if (!r || r.owner !== owner) return false;
      return rows.delete(id);
    },
  };
}

type ChapterRow = Chapter & { owner: string };

/** Chapters in memory. `books` is the books store they belong to: a chapter is only created in a book the owner owns, as the SQL's insert-select does. */
export function memoryChapters(books: Pick<BookStore, 'get'>): ChapterStore & { rows: Map<string, ChapterRow> } {
  const rows = new Map<string, ChapterRow>();
  let n = 0;
  const strip = ({ owner: _o, ...c }: ChapterRow): Chapter => structuredClone(c);
  const meta = (r: ChapterRow): ChapterMeta => { const { body, ...rest } = strip(r); return { ...rest, words: wordCount(body) }; };
  const of = (owner: string, bookId: string) => [...rows.values()].filter((r) => r.owner === owner && r.bookId === bookId).sort((a, b) => a.position - b.position);
  const make = (owner: string, bookId: string, position: number, c: { title: string; summary: string; points: string[]; targetWords?: number }): ChapterRow => ({
    id: `00000000-0000-4000-a000-${String(++n).padStart(12, '0')}`, owner, bookId, position, title: c.title, summary: c.summary, points: [...c.points], body: '', status: 'outline',
    provenance: [], targetWords: c.targetWords ?? DEFAULT_TARGET, sourceIds: [], updatedAt: '2026-09-30 12:00:00+00',
  });
  return {
    rows,
    async list(owner, bookId) { return of(owner, bookId).map(meta); },
    async get(owner, bookId, id) { const r = rows.get(id); return r && r.owner === owner && r.bookId === bookId ? strip(r) : null; },
    async getAt(owner, bookId, position) { const r = of(owner, bookId).find((x) => x.position === position); return r ? strip(r) : null; },
    async add(owner, bookId, c) {
      if (!(await books.get(owner, bookId))) return null;
      const have = of(owner, bookId);
      if (have.length >= MAX_CHAPTERS) return null;
      const row = make(owner, bookId, (have.at(-1)?.position ?? 0) + 1, c);
      rows.set(row.id, row);
      return strip(row);
    },
    async replaceAll(owner, bookId, chapters) {
      if (!(await books.get(owner, bookId))) return null;
      for (const r of of(owner, bookId)) rows.delete(r.id);
      chapters.forEach((c, i) => { const row = make(owner, bookId, i + 1, c); rows.set(row.id, row); });
      return of(owner, bookId).map(meta);
    },
    async update(owner, bookId, id, patch) {
      const r = rows.get(id);
      if (!r || r.owner !== owner || r.bookId !== bookId) return null;
      Object.assign(r, structuredClone(patch), { updatedAt: '2026-09-30 13:00:00+00' });
      return strip(r);
    },
    async reorder(owner, bookId, ids) {
      const have = of(owner, bookId);
      if (ids.length !== have.length || new Set(ids).size !== ids.length || ids.some((i) => !have.some((h) => h.id === i))) return false;
      ids.forEach((id, i) => { rows.get(id)!.position = i + 1; });
      return true;
    },
    async remove(owner, bookId, id) {
      const r = rows.get(id);
      if (!r || r.owner !== owner || r.bookId !== bookId) return false;
      rows.delete(id);
      of(owner, bookId).forEach((x, i) => { x.position = i + 1; });
      return true;
    },
    async appendDraft(owner, bookId, id, paragraphs, entry) {
      const r = rows.get(id);
      if (!r || r.owner !== owner || r.bookId !== bookId) return null;
      r.body = appendParagraphs(r.body, paragraphs);
      r.provenance = [...r.provenance, structuredClone(entry)];
      if (r.status === 'outline') r.status = 'drafting';
      return strip(r);
    },
    async totals(owner) {
      const out: Record<string, { chapters: number; words: number }> = {};
      for (const r of rows.values()) {
        if (r.owner !== owner) continue;
        const t = (out[r.bookId] ??= { chapters: 0, words: 0 });
        t.chapters++;
        t.words += wordCount(r.body);
      }
      return out;
    },
  };
}

/** Sources in memory, with the same owner rule as lib/source-store.ts. */
export function memorySources(books: Pick<BookStore, 'get'> = { get: async () => ({}) as Book }): SourceStore & { rows: Map<string, SourceFull & { owner: string }> } {
  const rows = new Map<string, SourceFull & { owner: string }>();
  let n = 0;
  const meta = (r: SourceFull & { owner: string }): SourceMeta => ({ id: r.id, bookId: r.bookId, name: r.name, kind: r.kind, sizeBytes: r.sizeBytes, pages: r.pages, createdAt: r.createdAt });
  return {
    rows,
    async list(owner, bookId) { return [...rows.values()].filter((r) => r.owner === owner && (!bookId || r.bookId === bookId)).reverse().map(meta); },
    async count(owner) { return [...rows.values()].filter((r) => r.owner === owner).length; },
    async get(owner, id) { const r = rows.get(id); if (!r || r.owner !== owner) return null; const { owner: _o, ...rest } = r; return structuredClone(rest); },
    async create(owner, s) {
      if (s.bookId && !(await books.get(owner, s.bookId))) return null;
      const id = `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`;
      const row = { id, owner, bookId: s.bookId, name: s.name, kind: s.kind, sizeBytes: s.sizeBytes, pages: s.text.length, createdAt: '2026-09-30 12:00:00+00', text: structuredClone(s.text) };
      rows.set(id, row);
      return meta(row);
    },
    async remove(owner, id) { const r = rows.get(id); return r && r.owner === owner ? rows.delete(id) : false; },
  };
}

/** Reader answering from a queue of page lists (or an error), recording the bytes it was sent. */
export function fakeReader(answers: (Awaited<ReturnType<Reader>> | ReaderUnavailable)[]): { reader: Reader; sent: Uint8Array[] } {
  const sent: Uint8Array[] = [];
  const queue = [...answers];
  const reader: Reader = async (pdf) => {
    sent.push(pdf);
    const next = queue.shift();
    if (next instanceof ReaderUnavailable) throw next;
    if (!next) throw new Error('the stand-in ran out of answers');
    return next;
  };
  return { reader, sent };
}
