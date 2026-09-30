import Link from 'next/link';
import type { Book } from '@/lib/books';
import { UNTITLED } from '@/lib/books';
import { day } from '@/lib/format';
import { bookPath } from '@/lib/studio-paths';

const STATUS = { draft: 'Draft', done: 'Done' } as const;

/** The books table: a server component. The whole row is the link (the title's, stretched over it). `totals` has each book's chapters and words, or nothing when they could not be read. */
export default function BooksTable({ rows, totals, failed }: { rows: Book[]; totals: Record<string, { chapters: number; words: number }>; failed?: boolean }) {
  return (
    <section className="view">
      <h1>Books</h1>
      <p className="sub">Everything you are writing, each one yours alone.</p>
      {failed ? <p className="err" role="alert">Your books could not be read just now. If this is the first time Imprint is opened, its database tables are not there yet; try again in a minute.</p> : null}
      <div className="tw">
        <table>
          <thead>
            <tr><th>Book</th><th className="hide-s">Chapters</th><th className="hide-s">Words</th><th className="hide-s">Changed</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((b) => {
              const t = totals[b.id];
              return (
                <tr className="arow" key={b.id}>
                  <td>
                    <div className="t"><Link href={bookPath(b.id)}>{b.title || UNTITLED}</Link></div>
                    <div className="s">{b.subtitle || b.audience || 'No subtitle yet'}</div>
                  </td>
                  <td className="num hide-s">{t ? t.chapters : 0}</td>
                  <td className="num hide-s">{t ? t.words.toLocaleString('en-US') : 0}</td>
                  <td className="num hide-s">{day(b.updatedAt)}</td>
                  <td><span className={`chip ${b.status === 'done' ? 'ready' : 'draft'}`}>{STATUS[b.status]}</span></td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="s">{failed ? '' : 'No books yet. Writing one starts with the idea: “+ New book”.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
