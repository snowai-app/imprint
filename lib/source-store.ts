import 'server-only';
import { run, text } from './db.ts';
import type { SourceFull, SourceMeta, SourcePage, SourceStore } from './sources.ts';

/**
 * IMPRINT'S SOURCES (db/schema.sql, `public.imprint_sources`), over the Data
 * API (copied in shape from byline's lib/source-store.ts: change one, change
 * the other). Every row carries business_slug 'imprint'. EVERY query names the
 * owner and touches only that owner's rows; who may call is decided before any
 * of these runs (lib/sources-api.ts). A source is only inserted into a book
 * the owner owns. The list carries metadata only: the words are read one
 * source at a time, by `get`, because the Data API answers at most 1 MB.
 */
type Row = { id: string; book_id: string | null; name: string; kind: string; size_bytes: number; pages: number; created_at: string };
type FullRow = Row & { words: string };

const META = `cast(id as text) as id, cast(book_id as text) as book_id, name, kind, size_bytes, pages, cast(created_at as text) as created_at`;
const meta = (r: Row): SourceMeta => ({ id: r.id, bookId: r.book_id, name: r.name, kind: r.kind, sizeBytes: r.size_bytes, pages: r.pages, createdAt: r.created_at });

export const sourceStore: SourceStore = {
  async list(owner, bookId) {
    const rows = bookId
      ? await run<Row>(`select ${META} from public.imprint_sources where owner_email = :owner and book_id = cast(:book as uuid) order by created_at desc limit 200`, [text('owner', owner), text('book', bookId)])
      : await run<Row>(`select ${META} from public.imprint_sources where owner_email = :owner order by created_at desc limit 200`, [text('owner', owner)]);
    return rows.map(meta);
  },

  async count(owner) {
    const [r] = await run<{ n: number }>(`select count(*)::int as n from public.imprint_sources where owner_email = :owner`, [text('owner', owner)]);
    return r?.n ?? 0;
  },

  async get(owner, id) {
    const [r] = await run<FullRow>(
      `select ${META}, cast(text as text) as words from public.imprint_sources where id = cast(:id as uuid) and owner_email = :owner`,
      [text('id', id), text('owner', owner)],
    );
    return r ? ({ ...meta(r), text: JSON.parse(r.words) as SourcePage[] } satisfies SourceFull) : null;
  },

  /** Into the owner's own book, or (no book) into none. A book that is not the owner's inserts nothing and answers null. */
  async create(owner, s) {
    const params = [text('owner', owner), text('book', s.bookId), text('name', s.name), text('kind', s.kind), text('size', String(s.sizeBytes)), text('pages', String(s.text.length)), text('words', JSON.stringify(s.text))];
    const [r] = s.bookId
      ? await run<Row>(
          `insert into public.imprint_sources (owner_email, book_id, name, kind, size_bytes, pages, text)
           select b.owner_email, b.id, :name, :kind, cast(:size as integer), cast(:pages as integer), cast(:words as jsonb)
             from public.imprint_books b where b.id = cast(:book as uuid) and b.owner_email = :owner
           returning ${META}`,
          params,
        )
      : await run<Row>(
          `insert into public.imprint_sources (owner_email, name, kind, size_bytes, pages, text)
           values (:owner, :name, :kind, cast(:size as integer), cast(:pages as integer), cast(:words as jsonb))
           returning ${META}`,
          params.filter((p) => p.name !== 'book'),
        );
    return r ? meta(r) : null;
  },

  async remove(owner, id) {
    const rows = await run(`delete from public.imprint_sources where id = cast(:id as uuid) and owner_email = :owner returning id`, [text('id', id), text('owner', owner)]);
    return rows.length > 0;
  },
};
