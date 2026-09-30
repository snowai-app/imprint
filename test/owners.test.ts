/* OWNER SCOPING: a book, a chapter and a source are their author's alone. The in-memory stores in test/helpers.ts keep the same rule as the SQL stores (test/schema.test.ts checks every SQL query names the owner); these tests prove another person's rows are never returned, changed, removed or attached to. Invented emails only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryBooks, memoryChapters, memorySources } from './helpers.ts';

const ME = 'me@example.test';
const OTHER = 'other@example.test';
const fields = (title: string) => ({ title, subtitle: '', idea: 'An invented idea.', audience: '', tone: '', positioning: '', authorName: '', aboutAuthor: '' });
const brief = (title: string) => ({ title, summary: 'S', points: ['p'] });
const page = [{ page: 1, text: 'Invented words.' }];

function world() {
  const books = memoryBooks();
  const chapters = memoryChapters(books);
  const sources = memorySources(books);
  return { books, chapters, sources };
}

test('another person\'s book is never listed, read, changed or removed', async () => {
  const { books } = world();
  const mine = await books.create(ME, fields('Mine'));
  const theirs = await books.create(OTHER, fields('Theirs'));
  assert.deepEqual((await books.list(ME)).map((b) => b.title), ['Mine']);
  assert.equal(await books.get(ME, theirs.id), null);
  assert.equal(await books.update(ME, theirs.id, { title: 'Taken' }), null);
  assert.equal(await books.remove(ME, theirs.id), false);
  assert.equal((await books.get(OTHER, theirs.id))?.title, 'Theirs');
  assert.equal((await books.get(ME, mine.id))?.title, 'Mine');
});

test('another person\'s chapters are never listed, read, changed, reordered, removed or drafted into', async () => {
  const { books, chapters } = world();
  const mine = await books.create(ME, fields('Mine'));
  const theirs = await books.create(OTHER, fields('Theirs'));
  const a = (await chapters.add(OTHER, theirs.id, brief('Their one')))!;
  const b = (await chapters.add(OTHER, theirs.id, brief('Their two')))!;
  assert.deepEqual(await chapters.list(ME, theirs.id), []);
  assert.equal(await chapters.get(ME, theirs.id, a.id), null);
  assert.equal(await chapters.getAt(ME, theirs.id, 1), null);
  assert.equal(await chapters.update(ME, theirs.id, a.id, { body: 'Mine now' }), null);
  assert.equal(await chapters.reorder(ME, theirs.id, [b.id, a.id]), false);
  assert.equal(await chapters.remove(ME, theirs.id, a.id), false);
  assert.equal(await chapters.appendDraft(ME, theirs.id, a.id, ['Injected.'], { at: 'x', kind: 'ai_draft', words: 1 }), null);
  /* and asking through MY book id for THEIR chapter finds nothing either */
  assert.equal(await chapters.get(ME, mine.id, a.id), null);
  assert.equal(await chapters.update(ME, mine.id, a.id, { body: 'Mine now' }), null);
  assert.deepEqual(Object.keys(await chapters.totals(ME)), []);
  const still = (await chapters.get(OTHER, theirs.id, a.id))!;
  assert.equal(still.body, '');
  assert.deepEqual(still.provenance, []);
  assert.equal((await chapters.list(OTHER, theirs.id)).length, 2);
});

test('a chapter cannot be added to, or an outline put into, a book that is not yours', async () => {
  const { books, chapters } = world();
  const theirs = await books.create(OTHER, fields('Theirs'));
  assert.equal(await chapters.add(ME, theirs.id, brief('Sneaked in')), null);
  assert.equal(await chapters.replaceAll(ME, theirs.id, [brief('A'), brief('B')]), null);
  assert.deepEqual(await chapters.list(OTHER, theirs.id), []);
});

test('another person\'s source is never listed, counted, read or removed, and cannot be added to a book that is not yours', async () => {
  const { books, sources } = world();
  const mine = await books.create(ME, fields('Mine'));
  const theirs = await books.create(OTHER, fields('Theirs'));
  const s = (await sources.create(OTHER, { name: 'secret.pdf', kind: 'pdf', sizeBytes: 10, text: page, bookId: theirs.id }))!;
  assert.deepEqual(await sources.list(ME), []);
  assert.deepEqual(await sources.list(ME, theirs.id), []);
  assert.equal(await sources.count(ME), 0);
  assert.equal(await sources.get(ME, s.id), null);
  assert.equal(await sources.remove(ME, s.id), false);
  assert.equal(await sources.create(ME, { name: 'sneak.pdf', kind: 'pdf', sizeBytes: 1, text: page, bookId: theirs.id }), null);
  assert.equal((await sources.get(OTHER, s.id))?.name, 'secret.pdf');
  const mineSource = (await sources.create(ME, { name: 'mine.txt', kind: 'txt', sizeBytes: 1, text: page, bookId: mine.id }))!;
  assert.deepEqual((await sources.list(ME, mine.id)).map((x) => x.id), [mineSource.id]);
  assert.deepEqual(await sources.list(ME, theirs.id), []);
});

test('an author\'s chapters keep their own order, numbering and words; removing one closes the gap', async () => {
  const { books, chapters } = world();
  const book = await books.create(ME, fields('Mine'));
  const [a, b, c] = await Promise.all([1, 2, 3].map((n) => chapters.add(ME, book.id, brief(`Chapter ${n}`)))) as NonNullable<Awaited<ReturnType<typeof chapters.add>>>[];
  assert.deepEqual((await chapters.list(ME, book.id)).map((x) => x.position), [1, 2, 3]);
  assert.equal(await chapters.reorder(ME, book.id, [c.id, a.id]), false, 'not every chapter');
  assert.equal(await chapters.reorder(ME, book.id, [c.id, a.id, b.id]), true);
  assert.deepEqual((await chapters.list(ME, book.id)).map((x) => x.title), ['Chapter 3', 'Chapter 1', 'Chapter 2']);
  assert.equal(await chapters.remove(ME, book.id, c.id), true);
  assert.deepEqual((await chapters.list(ME, book.id)).map((x) => [x.title, x.position]), [['Chapter 1', 1], ['Chapter 2', 2]]);
  await chapters.update(ME, book.id, a.id, { body: 'one two three' });
  assert.equal((await chapters.list(ME, book.id))[0].words, 3);
  assert.deepEqual(await chapters.totals(ME), { [book.id]: { chapters: 2, words: 3 } });
});
