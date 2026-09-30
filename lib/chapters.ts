/**
 * A CHAPTER, and the store it lives in (T-1751). Types, limits, the checks on
 * what a chapter may hold and the pure helpers the pages, the API and the
 * store share, with no imports of app code, so the tests can stand an
 * in-memory store in for lib/chapter-store.ts and run the real handlers.
 *
 * A chapter belongs to a book and to that book's author: every store method
 * names the owner AND the book, and touches only that owner's rows. A chapter
 * of someone else's book is simply not found.
 *
 * PROVENANCE is the list of times words were put into the chapter by AI:
 * `{ at, kind: 'ai_draft' | 'ai_assist', words }`. Only the server writes it
 * (a draft is inserted by the store itself, `appendDraft`, never by a client
 * PATCH), and editing the chapter back to human words never erases it: it is
 * the record of what was inserted, not of what is left (lib/provenance.ts).
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
export const CHAPTER_STATUSES = ['outline', 'drafting', 'edited', 'done'] as const;
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];
export const STATUS_LABEL: Record<ChapterStatus, string> = { outline: 'Outline', drafting: 'Drafting', edited: 'Edited', done: 'Done' };

export const PROVENANCE_KINDS = ['ai_draft', 'ai_assist'] as const;
export type ProvenanceKind = (typeof PROVENANCE_KINDS)[number];
export type Provenance = { at: string; kind: ProvenanceKind; words: number };

export type Chapter = {
  id: string;
  bookId: string;
  /** 1, 2, 3 …: the order in the book, and the `<n>` of /studio/book/<id>/<n>. */
  position: number;
  title: string;
  summary: string;
  /** The points the chapter should make. */
  points: string[];
  body: string;
  status: ChapterStatus;
  provenance: Provenance[];
  targetWords: number;
  /** The book's sources ticked for this chapter: the only ones a draft may draw on. */
  sourceIds: string[];
  updatedAt: string;
};

/** A chapter without its words, but with how many it has: what a list carries (a list should not carry a book). */
export type ChapterMeta = Omit<Chapter, 'body'> & { words: number };

/** What the outline step gives: the brief of one chapter. */
export type NewChapter = { title: string; summary: string; points: string[]; targetWords?: number };

export type ChapterPatch = Partial<Pick<Chapter, 'title' | 'summary' | 'points' | 'body' | 'status' | 'targetWords' | 'sourceIds'>>;

export type ChapterStore = {
  /** The book's chapters in order, without their words; [] when the book is not the owner's. */
  list(owner: string, bookId: string): Promise<ChapterMeta[]>;
  get(owner: string, bookId: string, id: string): Promise<Chapter | null>;
  /** By place in the book (1 is the first). */
  getAt(owner: string, bookId: string, position: number): Promise<Chapter | null>;
  /** At the end; null when the book is not the owner's or has the most chapters it can. */
  add(owner: string, bookId: string, chapter: NewChapter): Promise<Chapter | null>;
  /** The whole outline at once, replacing the chapters the book had; null when the book is not the owner's. */
  replaceAll(owner: string, bookId: string, chapters: NewChapter[]): Promise<ChapterMeta[] | null>;
  /** Only what is in the patch changes; null when the chapter is not the owner's. */
  update(owner: string, bookId: string, id: string, patch: ChapterPatch): Promise<Chapter | null>;
  /** `ids` is every chapter of the book, in the new order; false when it is not exactly that. */
  reorder(owner: string, bookId: string, ids: string[]): Promise<boolean>;
  /** Removes the chapter and closes the gap in the numbering. */
  remove(owner: string, bookId: string, id: string): Promise<boolean>;
  /**
   * AI words going in: the paragraphs are added after the author's own text
   * (never replacing any of it), the provenance gets one entry and an
   * `outline` chapter becomes `drafting`, all in one statement. Null when the
   * chapter is not the owner's.
   */
  appendDraft(owner: string, bookId: string, id: string, paragraphs: string[], entry: Provenance): Promise<Chapter | null>;
  /** How many chapters and words each of the owner's books has: for the books table. */
  totals(owner: string): Promise<Record<string, { chapters: number; words: number }>>;
};

export const CH_LIMITS = {
  title: 200,
  summary: 1200,
  point: 300,
  points: 12,
  body: 40_000,
  targetMin: 100,
  targetMax: 20_000,
} as const;
export const DEFAULT_TARGET = 1500;
/** The most chapters a book may have: the outline asks for 8 to 14, the author may add a few more. */
export const MAX_CHAPTERS = 24;

const clean = (v: string) => v.replace(/\u0000/g, '').trim();

/** One brief as kept: trimmed, lengths held, empty points dropped. Null when it has no title. */
export function checkBrief(input: unknown): { ok: true; value: NewChapter } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Send the chapter as an object.' };
  const g = input as Record<string, unknown>;
  const title = typeof g.title === 'string' ? clean(g.title) : '';
  if (!title) return { ok: false, error: 'A chapter needs a title.' };
  if (title.length > CH_LIMITS.title) return { ok: false, error: `The title is over ${CH_LIMITS.title} characters.` };
  const summary = typeof g.summary === 'string' ? clean(g.summary) : '';
  if (summary.length > CH_LIMITS.summary) return { ok: false, error: `The summary is over ${CH_LIMITS.summary} characters.` };
  if (g.points !== undefined && !Array.isArray(g.points)) return { ok: false, error: 'points must be a list.' };
  const points = ((g.points as unknown[] | undefined) ?? []).filter((p): p is string => typeof p === 'string').map(clean).filter(Boolean);
  if (points.length > CH_LIMITS.points) return { ok: false, error: `At most ${CH_LIMITS.points} points.` };
  if (points.some((p) => p.length > CH_LIMITS.point)) return { ok: false, error: `A point is over ${CH_LIMITS.point} characters.` };
  const value: NewChapter = { title, summary, points };
  if (g.targetWords !== undefined) {
    const t = checkTarget(g.targetWords);
    if (t === null) return { ok: false, error: `The target is a number of words from ${CH_LIMITS.targetMin} to ${CH_LIMITS.targetMax.toLocaleString('en-US')}.` };
    value.targetWords = t;
  }
  return { ok: true, value };
}

export function checkTarget(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= CH_LIMITS.targetMin && n <= CH_LIMITS.targetMax ? n : null;
}

const PATCH_KEYS = ['title', 'summary', 'points', 'body', 'status', 'targetWords', 'sourceIds'];

/**
 * A change to a chapter: only the fields sent, each checked. `provenance` is
 * NOT among them: a client cannot write it (only a draft does, through the
 * store), so the record of what AI inserted cannot be edited from outside.
 */
export function checkPatch(input: unknown): { ok: true; value: ChapterPatch } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Send the change as an object.' };
  const g = input as Record<string, unknown>;
  for (const k of Object.keys(g)) {
    if (k === 'provenance') return { ok: false, error: 'Provenance is written by drafting, not by editing.' };
    if (!PATCH_KEYS.includes(k)) return { ok: false, error: `Unknown field “${k}”.` };
  }
  const out: ChapterPatch = {};
  if ('title' in g || 'summary' in g || 'points' in g) {
    const brief = checkBrief({ title: g.title ?? 'x', summary: g.summary, points: g.points });
    if (!brief.ok) return brief;
    if ('title' in g) {
      if (typeof g.title !== 'string' || !clean(g.title)) return { ok: false, error: 'A chapter needs a title.' };
      out.title = brief.value.title;
    }
    if ('summary' in g) {
      if (typeof g.summary !== 'string') return { ok: false, error: 'summary must be text.' };
      out.summary = brief.value.summary;
    }
    if ('points' in g) out.points = brief.value.points;
  }
  if ('body' in g) {
    if (typeof g.body !== 'string') return { ok: false, error: 'body must be text.' };
    const body = g.body.replace(/\u0000/g, '');
    if (body.length > CH_LIMITS.body) return { ok: false, error: `A chapter holds at most ${CH_LIMITS.body.toLocaleString('en-US')} characters (about ${Math.round(CH_LIMITS.body / 6).toLocaleString('en-US')} words). Split it into two chapters.` };
    out.body = body;
  }
  if ('status' in g) {
    if (!(CHAPTER_STATUSES as readonly unknown[]).includes(g.status)) return { ok: false, error: `Status is one of ${CHAPTER_STATUSES.join(', ')}.` };
    out.status = g.status as ChapterStatus;
  }
  if ('targetWords' in g) {
    const t = checkTarget(g.targetWords);
    if (t === null) return { ok: false, error: `The target is a number of words from ${CH_LIMITS.targetMin} to ${CH_LIMITS.targetMax.toLocaleString('en-US')}.` };
    out.targetWords = t;
  }
  if ('sourceIds' in g) {
    if (!Array.isArray(g.sourceIds) || g.sourceIds.some((s) => typeof s !== 'string' || !/^[0-9a-f-]{36}$/i.test(s)) || g.sourceIds.length > 40) return { ok: false, error: 'sourceIds is a list of source ids.' };
    out.sourceIds = [...new Set(g.sourceIds as string[])];
  }
  return { ok: true, value: out };
}

/** The author's text with new paragraphs after it: a blank line between, nothing of the author's touched. */
export function appendParagraphs(body: string, paragraphs: string[]): string {
  const add = paragraphs.map((p) => p.trim()).filter(Boolean).join('\n\n');
  if (!add) return body;
  const head = body.replace(/\s+$/, '');
  return head ? `${head}\n\n${add}` : add;
}

/** The chapter's body as paragraphs (a blank line starts a new one). */
export const paragraphsOf = (body: string): string[] => body.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean);

/** The share of the target a chapter has written, 0 to 100, for a progress bar. */
export const progress = (words: number, target: number): number => (target > 0 ? Math.max(0, Math.min(100, Math.round((words / target) * 100))) : 0);
