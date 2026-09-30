/**
 * A BOOK, and the store it lives in (T-1751). Types, limits and the checks on
 * what a book may hold, with no imports of app code, so the tests can stand an
 * in-memory store in for lib/books-store.ts (the Data API) and run the real
 * handlers. A book is its author's alone: every store method names the owner
 * and touches only that owner's rows, and an id that is someone else's is
 * simply not found.
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
export const BOOK_STATUSES = ['draft', 'done'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export type BookFields = {
  title: string;
  subtitle: string;
  /** What the book is about, in the author's own words, as dictated or typed. */
  idea: string;
  /** Who it is for. */
  audience: string;
  tone: string;
  /** The one positioning sentence the idea step suggested and the author kept or edited. */
  positioning: string;
  /** The name on the title page and the copyright line; '' until the author gives it. */
  authorName: string;
  /** The optional "About the author" page. */
  aboutAuthor: string;
};

export type Book = BookFields & { id: string; status: BookStatus; createdAt: string; updatedAt: string };
export type BookPatch = Partial<BookFields> & { status?: BookStatus };

/** What a book is called until the author gives it a title (the books table and the crumb). */
export const UNTITLED = 'Untitled book';

export const LIMITS = {
  title: 200,
  subtitle: 300,
  idea: 6000,
  audience: 500,
  tone: 200,
  positioning: 500,
  authorName: 120,
  aboutAuthor: 1500,
} as const;

export type BookStore = {
  /** The owner's books, newest change first. */
  list(owner: string): Promise<Book[]>;
  get(owner: string, id: string): Promise<Book | null>;
  create(owner: string, fields: BookFields): Promise<Book>;
  /** Only what is in the patch changes; null when the book is not the owner's. */
  update(owner: string, id: string, patch: BookPatch): Promise<Book | null>;
  /** Removes the book, its chapters and its sources (they go with it in the database). */
  remove(owner: string, id: string): Promise<boolean>;
};

export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const KEYS = Object.keys(LIMITS) as (keyof BookFields)[];

/** A field as kept: a string, trimmed at the ends, never longer than its limit is checked separately. */
const asText = (v: unknown): string | null => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim() : null);

/**
 * The fields of a new book (`partial` false: every missing one is '') or of a
 * change (`partial` true: only the ones sent). An unknown field, a value that
 * is not text or one over its limit is refused, with the reason in words.
 */
export function checkBook(input: unknown, partial: boolean): { ok: true; value: Partial<BookFields> } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Send the book as an object.' };
  const given = input as Record<string, unknown>;
  for (const k of Object.keys(given)) if (!(KEYS as string[]).includes(k)) return { ok: false, error: `Unknown field “${k}”.` };
  const out: Partial<BookFields> = {};
  for (const k of KEYS) {
    if (!(k in given)) {
      if (!partial) out[k] = '';
      continue;
    }
    const t = asText(given[k]);
    if (t === null) return { ok: false, error: `${k} must be text.` };
    if (t.length > LIMITS[k]) return { ok: false, error: `${k} is over ${LIMITS[k]} characters.` };
    out[k] = t;
  }
  return { ok: true, value: out };
}

/** A book needs at least an idea or a title before anything can be made from it. */
export const hasSeed = (f: Pick<BookFields, 'title' | 'idea'>): boolean => f.title.trim() !== '' || f.idea.trim() !== '';

/** Words in a text: runs of non-space characters. The same count the database makes (`\S+`). */
export const wordCount = (text: string): number => (text.match(/\S+/g) ?? []).length;
