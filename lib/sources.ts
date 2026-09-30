/**
 * SOURCES (T-1751; copied from byline's lib/sources.ts, change one, change the
 * other): what an author is writing a book from. A PDF (or a text file) is
 * read once, the words kept page by page, and the file itself is NOT kept:
 * Imprint stores nothing but the extracted text (the way Reader stores
 * nothing). Types, the rules for what may be uploaded, and the pure helpers
 * the pages and the API share, with no imports of app code, so the tests can
 * load this file and stand an in-memory store in for lib/source-store.ts.
 *
 * A source is its author's alone, and belongs to one of their books
 * (`bookId`; null is a source that belongs to no book yet): every store method
 * names the owner, and an id that is someone else's is simply not found.
 * Deleting a source never edits a chapter: a quote already inserted is the
 * author's own text now.
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
export type SourcePage = { page: number; text: string };

export type SourceMeta = { id: string; /** The book it belongs to, or null. */ bookId: string | null; name: string; kind: string; sizeBytes: number; pages: number; createdAt: string };
export type SourceFull = SourceMeta & { text: SourcePage[] };

/** What a new source is made of, once the words are out. */
export type NewSource = { name: string; kind: SourceKind; sizeBytes: number; text: SourcePage[]; /** The book it is for; it must be the owner's own. */ bookId: string | null };

export type SourceStore = {
  /** Metadata only, newest first: never the words (a list should not carry a book). With `bookId`, that book's sources only ([] when it is not the owner's). */
  list(owner: string, bookId?: string): Promise<SourceMeta[]>;
  count(owner: string): Promise<number>;
  get(owner: string, id: string): Promise<SourceFull | null>;
  /** Null when `bookId` is given and is not the owner's book. */
  create(owner: string, source: NewSource): Promise<SourceMeta | null>;
  remove(owner: string, id: string): Promise<boolean>;
};

/* ── what may be uploaded ────────────────────────────────────────────── */

export const MAX_BYTES = 4 * 1024 * 1024;
/** Slack for a multipart body's own framing on top of the file. */
export const MAX_BODY_BYTES = MAX_BYTES + 64 * 1024;
export const MAX_SOURCES = 100;
/** The most words kept from one source. A row this size is read back whole by the Data API, which answers at most 1 MB. */
export const MAX_TEXT_CHARS = 300_000;
export const MAX_NAME = 200;
export const TEXT_PART = 3000;

export const SOURCE_KINDS = ['pdf', 'txt', 'md'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const isSourceKind = (v: unknown): v is SourceKind => typeof v === 'string' && (SOURCE_KINDS as readonly string[]).includes(v);

/** What a file is, by its name: a kind that works now, a kind that is coming next, or nothing Imprint takes. */
export function kindOf(name: string): SourceKind | 'word' | 'audio' | null {
  const ext = /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'txt';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'doc' || ext === 'docx') return 'word';
  if (['mp3', 'm4a', 'wav'].includes(ext)) return 'audio';
  return null;
}

export const COMING_NEXT = 'Word and audio files are coming next. PDF, text and Markdown work now.';

/** A file name as kept: no folders, no control characters, not too long, never empty. */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const t = base.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  return t || 'Untitled source';
}

/** The name without its extension, as a quote's label uses it. */
export const titleOf = (name: string): string => name.replace(/\.[a-z0-9]{1,8}$/i, '').trim() || name;

/** The quote as it goes into a chapter: “the words” [Source name, p. 4]. */
export function quoteFor(name: string, page: number, words: string): string {
  const w = words.replace(/\s+/g, ' ').trim().replace(/[“”]/g, '"');
  return `“${w}” [${titleOf(name)}, p. ${page}]`;
}

/** Text from a text file as pages: about 3,000 characters each, cut at a blank line where there is one. A text file has no pages of its own, so these are parts, shown as pages. */
export function partsOf(text: string): SourcePage[] {
  const clean = text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
  if (!clean) return [];
  const paras = clean.split(/\n[ \t]*\n+/);
  const out: SourcePage[] = [];
  let cur = '';
  const push = () => { if (cur.trim()) out.push({ page: out.length + 1, text: cur.trim() }); cur = ''; };
  for (const p of paras) {
    let rest = p;
    while (rest.length > TEXT_PART) {
      const at = rest.lastIndexOf(' ', TEXT_PART);
      const cut = at > TEXT_PART / 2 ? at : TEXT_PART;
      if (cur) push();
      cur = rest.slice(0, cut);
      push();
      rest = rest.slice(cut).trimStart();
    }
    if (cur && cur.length + rest.length + 2 > TEXT_PART) push();
    cur = cur ? `${cur}\n\n${rest}` : rest;
  }
  push();
  return out;
}

/** Reader's pages made ours: real page numbers, no NUL (jsonb refuses it), blank pages kept so a page number stays true. */
export function pagesFromReader(pages: { pageNumber: number; text: string }[]): SourcePage[] {
  return pages.map((p, i) => ({ page: Number.isInteger(p.pageNumber) && p.pageNumber > 0 ? p.pageNumber : i + 1, text: String(p.text ?? '').replace(/\u0000/g, '').trim() }));
}

export const wordsIn = (pages: SourcePage[]): number => pages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
export const charsIn = (pages: SourcePage[]): number => pages.reduce((n, p) => n + p.text.length, 0);
export const hasWords = (pages: SourcePage[]): boolean => pages.some((p) => p.text.trim().length > 0);

export function size(n: number): string {
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
