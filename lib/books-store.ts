import 'server-only';
import { run, text } from './db.ts';
import type { Book, BookFields, BookPatch, BookStore } from './books.ts';

/**
 * IMPRINT'S BOOKS (db/schema.sql, `public.imprint_books`), over the Data API.
 * Every row carries business_slug 'imprint' (the table's default and its
 * check). EVERY query names the owner and touches only that owner's rows; who
 * may call is decided before any of these runs (lib/books-api.ts).
 *
 * Every parameter goes in as text and is cast in the SQL, as the family's
 * Data API code does (the pattern of byline's lib/store.ts).
 */
type Row = {
  id: string; title: string; subtitle: string; idea: string; audience: string; tone: string; positioning: string;
  author_name: string; about_author: string; status: Book['status']; created_at: string; updated_at: string;
};

const COLS = `cast(id as text) as id, title, subtitle, idea, audience, tone, positioning, author_name, about_author, status,
  cast(created_at as text) as created_at, cast(updated_at as text) as updated_at`;

const book = (r: Row): Book => ({
  id: r.id, title: r.title, subtitle: r.subtitle, idea: r.idea, audience: r.audience, tone: r.tone, positioning: r.positioning,
  authorName: r.author_name, aboutAuthor: r.about_author, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
});

export const bookStore: BookStore = {
  async list(owner) {
    const rows = await run<Row>(`select ${COLS} from public.imprint_books where owner_email = :owner order by updated_at desc limit 200`, [text('owner', owner)]);
    return rows.map(book);
  },

  async get(owner, id) {
    const [r] = await run<Row>(`select ${COLS} from public.imprint_books where id = cast(:id as uuid) and owner_email = :owner`, [text('id', id), text('owner', owner)]);
    return r ? book(r) : null;
  },

  async create(owner, f: BookFields) {
    const [r] = await run<Row>(
      `insert into public.imprint_books (owner_email, title, subtitle, idea, audience, tone, positioning, author_name, about_author)
       values (:owner, :title, :subtitle, :idea, :audience, :tone, :positioning, :author_name, :about_author)
       returning ${COLS}`,
      [text('owner', owner), text('title', f.title), text('subtitle', f.subtitle), text('idea', f.idea), text('audience', f.audience), text('tone', f.tone),
       text('positioning', f.positioning), text('author_name', f.authorName), text('about_author', f.aboutAuthor)],
    );
    return book(r);
  },

  /** Only what is in the patch changes; `coalesce` keeps the rest. */
  async update(owner, id, p: BookPatch) {
    const opt = (v: string | undefined) => (v === undefined ? null : v);
    const [r] = await run<Row>(
      `update public.imprint_books set
          title = coalesce(:title, title),
          subtitle = coalesce(:subtitle, subtitle),
          idea = coalesce(:idea, idea),
          audience = coalesce(:audience, audience),
          tone = coalesce(:tone, tone),
          positioning = coalesce(:positioning, positioning),
          author_name = coalesce(:author_name, author_name),
          about_author = coalesce(:about_author, about_author),
          status = coalesce(:status, status),
          updated_at = now()
        where id = cast(:id as uuid) and owner_email = :owner
        returning ${COLS}`,
      [text('id', id), text('owner', owner), text('title', opt(p.title)), text('subtitle', opt(p.subtitle)), text('idea', opt(p.idea)), text('audience', opt(p.audience)),
       text('tone', opt(p.tone)), text('positioning', opt(p.positioning)), text('author_name', opt(p.authorName)), text('about_author', opt(p.aboutAuthor)), text('status', opt(p.status))],
    );
    return r ? book(r) : null;
  },

  async remove(owner, id) {
    const rows = await run(`delete from public.imprint_books where id = cast(:id as uuid) and owner_email = :owner returning id`, [text('id', id), text('owner', owner)]);
    return rows.length > 0;
  },
};
