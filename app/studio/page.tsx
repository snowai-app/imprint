import BooksTable from '@/components/BooksTable';
import { bookStore } from '@/lib/books-store';
import type { Book } from '@/lib/books';
import { chapterStore } from '@/lib/chapter-store';
import { requireViewer } from '@/lib/session';

/** The studio's front room: the viewer's own books. Any signed-in person may write their own. A database that is not there yet answers in words, never a crash. */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Books · Studio · Imprint · Snow AI' };

export default async function Page() {
  const viewer = await requireViewer('/studio');
  let rows: Book[] = [];
  let totals: Record<string, { chapters: number; words: number }> = {};
  let failed = false;
  try {
    rows = await bookStore.list(viewer.email);
    totals = await chapterStore.totals(viewer.email).catch(() => ({}));
  } catch {
    failed = true;
  }
  return <BooksTable rows={rows} totals={totals} failed={failed} />;
}
