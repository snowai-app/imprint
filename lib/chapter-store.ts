import 'server-only';
import { inTransaction, run, text } from './db.ts';
import type { Chapter, ChapterMeta, ChapterPatch, ChapterStore, NewChapter, Provenance } from './chapters.ts';
import { DEFAULT_TARGET, MAX_CHAPTERS } from './chapters.ts';

/**
 * IMPRINT'S CHAPTERS (db/schema.sql, `public.imprint_chapters`), over the Data
 * API. Every row carries business_slug 'imprint'. EVERY query names the owner
 * and the book and touches only that owner's rows; a chapter is only ever
 * inserted from a book the owner owns (`from public.imprint_books b where b.id
 * = :book and b.owner_email = :owner`), so a chapter's owner is always its
 * book's. Who may call is decided before any of these runs
 * (lib/chapters-api.ts).
 *
 * A list never carries the words, only how many there are (counted by the
 * database with `\S+`, the same count as lib/books.ts `wordCount`): a book's
 * words are read one chapter at a time, because the Data API answers at most
 * 1 MB.
 */
type Row = {
  id: string; book_id: string; position: number; title: string; summary: string; points: string; status: Chapter['status'];
  provenance: string; target_words: number; source_ids: string; updated_at: string;
};
type FullRow = Row & { body: string };
type MetaRow = Row & { words: number };

const META = `cast(c.id as text) as id, cast(c.book_id as text) as book_id, c.position, c.title, c.summary, cast(c.points as text) as points, c.status,
  cast(c.provenance as text) as provenance, c.target_words, cast(c.source_ids as text) as source_ids, cast(c.updated_at as text) as updated_at`;
const FULL = `${META}, c.body`;
const WORDS = `(select count(*) from regexp_matches(c.body, '\\S+', 'g'))::int as words`;

const base = (r: Row): Omit<Chapter, 'body'> => ({
  id: r.id, bookId: r.book_id, position: r.position, title: r.title, summary: r.summary,
  points: JSON.parse(r.points) as string[], status: r.status, provenance: JSON.parse(r.provenance) as Provenance[],
  targetWords: r.target_words, sourceIds: JSON.parse(r.source_ids) as string[], updatedAt: r.updated_at,
});
const full = (r: FullRow): Chapter => ({ ...base(r), body: r.body });
const meta = (r: MetaRow): ChapterMeta => ({ ...base(r), words: r.words });

const json = (v: unknown) => JSON.stringify(v);

export const chapterStore: ChapterStore = {
  async list(owner, bookId) {
    const rows = await run<MetaRow>(
      `select ${META}, ${WORDS} from public.imprint_chapters c where c.book_id = cast(:book as uuid) and c.owner_email = :owner order by c.position`,
      [text('book', bookId), text('owner', owner)],
    );
    return rows.map(meta);
  },

  async get(owner, bookId, id) {
    const [r] = await run<FullRow>(
      `select ${FULL} from public.imprint_chapters c where c.id = cast(:id as uuid) and c.book_id = cast(:book as uuid) and c.owner_email = :owner`,
      [text('id', id), text('book', bookId), text('owner', owner)],
    );
    return r ? full(r) : null;
  },

  async getAt(owner, bookId, position) {
    const [r] = await run<FullRow>(
      `select ${FULL} from public.imprint_chapters c where c.position = cast(:pos as integer) and c.book_id = cast(:book as uuid) and c.owner_email = :owner`,
      [text('pos', String(position)), text('book', bookId), text('owner', owner)],
    );
    return r ? full(r) : null;
  },

  async add(owner, bookId, c: NewChapter) {
    const [r] = await run<FullRow>(
      `insert into public.imprint_chapters as c (book_id, owner_email, position, title, summary, points, target_words)
       select b.id, b.owner_email,
              (select coalesce(max(x.position), 0) + 1 from public.imprint_chapters x where x.book_id = b.id and x.owner_email = b.owner_email),
              :title, :summary, cast(:points as jsonb), cast(:target as integer)
         from public.imprint_books b
        where b.id = cast(:book as uuid) and b.owner_email = :owner
          and (select count(*) from public.imprint_chapters y where y.book_id = b.id and y.owner_email = b.owner_email) < cast(:max as integer)
       returning ${FULL}`,
      [text('book', bookId), text('owner', owner), text('title', c.title), text('summary', c.summary), text('points', json(c.points)), text('target', String(c.targetWords ?? DEFAULT_TARGET)), text('max', String(MAX_CHAPTERS))],
    );
    return r ? full(r) : null;
  },

  /** One transaction: the old chapters go and the new ones come, for this owner's own book only. */
  async replaceAll(owner, bookId, chapters) {
    return inTransaction(async (tx) => {
      const [own] = await run<{ id: string }>(`select cast(id as text) as id from public.imprint_books where id = cast(:book as uuid) and owner_email = :owner`, [text('book', bookId), text('owner', owner)], tx);
      if (!own) return null;
      await run(`delete from public.imprint_chapters where book_id = cast(:book as uuid) and owner_email = :owner`, [text('book', bookId), text('owner', owner)], tx);
      await run(
        `insert into public.imprint_chapters (book_id, owner_email, position, title, summary, points, target_words)
         select b.id, b.owner_email, e.ord::int, e.v->>'title', e.v->>'summary', e.v->'points', (e.v->>'target')::int
           from public.imprint_books b, jsonb_array_elements(cast(:chapters as jsonb)) with ordinality as e(v, ord)
          where b.id = cast(:book as uuid) and b.owner_email = :owner`,
        [text('book', bookId), text('owner', owner), text('chapters', json(chapters.map((c) => ({ title: c.title, summary: c.summary, points: c.points, target: c.targetWords ?? DEFAULT_TARGET }))))],
        tx,
      );
      const rows = await run<MetaRow>(
        `select ${META}, ${WORDS} from public.imprint_chapters c where c.book_id = cast(:book as uuid) and c.owner_email = :owner order by c.position`,
        [text('book', bookId), text('owner', owner)],
        tx,
      );
      return rows.map(meta);
    });
  },

  /** Only what is in the patch changes; `coalesce` keeps the rest. */
  async update(owner, bookId, id, p: ChapterPatch) {
    const opt = (v: string | undefined) => (v === undefined ? null : v);
    const [r] = await run<FullRow>(
      `update public.imprint_chapters c set
          title = coalesce(:title, c.title),
          summary = coalesce(:summary, c.summary),
          points = coalesce(cast(:points as jsonb), c.points),
          body = coalesce(:body, c.body),
          status = coalesce(:status, c.status),
          target_words = coalesce(cast(:target as integer), c.target_words),
          source_ids = coalesce(cast(:source_ids as jsonb), c.source_ids),
          updated_at = now()
        where c.id = cast(:id as uuid) and c.book_id = cast(:book as uuid) and c.owner_email = :owner
        returning ${FULL}`,
      [
        text('id', id), text('book', bookId), text('owner', owner),
        text('title', opt(p.title)), text('summary', opt(p.summary)), text('points', p.points === undefined ? null : json(p.points)),
        text('body', opt(p.body)), text('status', opt(p.status)), text('target', p.targetWords === undefined ? null : String(p.targetWords)),
        text('source_ids', p.sourceIds === undefined ? null : json(p.sourceIds)),
      ],
    );
    return r ? full(r) : null;
  },

  /** One statement: every chapter takes its new place at once (the unique constraint is deferred to its end). */
  async reorder(owner, bookId, ids) {
    const have = await run<{ id: string }>(`select cast(id as text) as id from public.imprint_chapters where book_id = cast(:book as uuid) and owner_email = :owner`, [text('book', bookId), text('owner', owner)]);
    const a = new Set(have.map((h) => h.id));
    if (ids.length !== a.size || new Set(ids).size !== ids.length || ids.some((i) => !a.has(i))) return false;
    await run(
      `update public.imprint_chapters c set position = o.ord::int, updated_at = now()
         from unnest(string_to_array(:ids, ',')) with ordinality as o(id, ord)
        where c.id = cast(o.id as uuid) and c.book_id = cast(:book as uuid) and c.owner_email = :owner`,
      [text('ids', ids.join(',')), text('book', bookId), text('owner', owner)],
    );
    return true;
  },

  /** Delete, then close the gap in the numbering, in one transaction. */
  async remove(owner, bookId, id) {
    return inTransaction(async (tx) => {
      const gone = await run(`delete from public.imprint_chapters where id = cast(:id as uuid) and book_id = cast(:book as uuid) and owner_email = :owner returning id`, [text('id', id), text('book', bookId), text('owner', owner)], tx);
      if (!gone.length) return false;
      await run(
        `update public.imprint_chapters c set position = n.ord::int
           from (select x.id, row_number() over (order by x.position) as ord from public.imprint_chapters x where x.book_id = cast(:book as uuid) and x.owner_email = :owner) n
          where c.id = n.id and c.book_id = cast(:book as uuid) and c.owner_email = :owner`,
        [text('book', bookId), text('owner', owner)],
        tx,
      );
      return true;
    });
  },

  /** The author's words stay exactly as they are: the new paragraphs are added after them, in the same statement that records the provenance. */
  async appendDraft(owner, bookId, id, paragraphs, entry) {
    const add = paragraphs.map((p) => p.trim()).filter(Boolean).join('\n\n');
    const [r] = await run<FullRow>(
      `update public.imprint_chapters c set
          body = case when btrim(c.body, E' \\t\\r\\n') = '' then :add else regexp_replace(c.body, '\\s+$', '') || chr(10) || chr(10) || :add end,
          provenance = c.provenance || cast(:entry as jsonb),
          status = case when c.status = 'outline' then 'drafting' else c.status end,
          updated_at = now()
        where c.id = cast(:id as uuid) and c.book_id = cast(:book as uuid) and c.owner_email = :owner
        returning ${FULL}`,
      [text('add', add), text('entry', json([entry])), text('id', id), text('book', bookId), text('owner', owner)],
    );
    return r ? full(r) : null;
  },

  async totals(owner) {
    const rows = await run<{ book_id: string; chapters: number; words: number }>(
      `select cast(c.book_id as text) as book_id, count(*)::int as chapters, sum((select count(*) from regexp_matches(c.body, '\\S+', 'g')))::int as words
         from public.imprint_chapters c where c.owner_email = :owner group by c.book_id`,
      [text('owner', owner)],
    );
    return Object.fromEntries(rows.map((r) => [r.book_id, { chapters: r.chapters, words: r.words ?? 0 }]));
  },
};
