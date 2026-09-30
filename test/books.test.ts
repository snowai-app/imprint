/* What a book and a chapter may hold (lib/books.ts, lib/chapters.ts): the checks, the word count, the append, and that provenance cannot be written from outside. Invented data only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, checkBook, hasSeed, isUuid, wordCount } from '../lib/books.ts';
import { CH_LIMITS, MAX_CHAPTERS, appendParagraphs, checkBrief, checkPatch, checkTarget, paragraphsOf, progress } from '../lib/chapters.ts';

test('a new book takes the fields it knows, trimmed, and fills the rest with nothing', () => {
  const r = checkBook({ title: '  The Renewal Checklist ', idea: 'A short client guide.' }, false);
  assert.ok(r.ok);
  assert.deepEqual(r.value, { title: 'The Renewal Checklist', subtitle: '', idea: 'A short client guide.', audience: '', tone: '', positioning: '', authorName: '', aboutAuthor: '' });
});

test('a change takes only the fields sent; unknown fields, non-text and over-long text are refused in words', () => {
  assert.deepEqual(checkBook({ subtitle: 'A guide' }, true), { ok: true, value: { subtitle: 'A guide' } });
  for (const bad of [{ status: 'done' }, { owner_email: 'x@example.test' }, { id: 'a' }]) {
    const r = checkBook(bad, true);
    assert.equal(r.ok, false);
  }
  assert.match((checkBook({ title: 5 }, true) as { error: string }).error, /must be text/);
  assert.match((checkBook({ title: 'x'.repeat(LIMITS.title + 1) }, true) as { error: string }).error, /over 200/);
  assert.equal(checkBook(null, false).ok, false);
  assert.equal(checkBook([], false).ok, false);
  assert.equal((checkBook({ title: 'a\u0000b' }, true) as { value: { title: string } }).value.title, 'ab');
});

test('a book has something to make things from when it has a title or an idea', () => {
  assert.equal(hasSeed({ title: '', idea: '  ' }), false);
  assert.equal(hasSeed({ title: 'A', idea: '' }), true);
  assert.equal(hasSeed({ title: '', idea: 'An idea' }), true);
});

test('words are runs of non-space characters; ids are uuids', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount('  one two\n\nthree\tfour  '), 4);
  assert.equal(isUuid('00000000-0000-4000-8000-000000000001'), true);
  assert.equal(isUuid('nope'), false);
  assert.equal(isUuid(undefined), false);
});

test('a chapter brief needs a title; points are trimmed and empty ones dropped; limits are held', () => {
  assert.deepEqual(checkBrief({ title: ' Why renewal matters ', summary: ' S ', points: [' a ', '', 'b', 4] }), { ok: true, value: { title: 'Why renewal matters', summary: 'S', points: ['a', 'b'] } });
  assert.equal(checkBrief({ title: '  ' }).ok, false);
  assert.equal(checkBrief({ title: 'x', points: 'a' }).ok, false);
  assert.equal(checkBrief({ title: 'x', points: Array(CH_LIMITS.points + 1).fill('p') }).ok, false);
  assert.equal(checkBrief({ title: 'x', targetWords: 50 }).ok, false);
  assert.deepEqual(checkBrief({ title: 'x', targetWords: '2000' }), { ok: true, value: { title: 'x', summary: '', points: [], targetWords: 2000 } });
  assert.equal(checkTarget(CH_LIMITS.targetMax + 1), null);
  assert.equal(checkTarget(1.5), null);
  assert.ok(MAX_CHAPTERS >= 14);
});

test('a change to a chapter: only known fields, each checked; provenance can never be written from outside', () => {
  assert.deepEqual(checkPatch({ body: 'Some words.' }), { ok: true, value: { body: 'Some words.' } });
  assert.deepEqual(checkPatch({ title: 'New', points: ['one'], status: 'edited' }), { ok: true, value: { title: 'New', points: ['one'], status: 'edited' } });
  const prov = checkPatch({ provenance: [] });
  assert.equal(prov.ok, false);
  assert.match((prov as { error: string }).error, /Provenance is written by drafting/);
  for (const bad of [{ owner_email: 'a@example.test' }, { bookId: 'x' }, { position: 3 }, { id: 'x' }, { status: 'published' }, { body: 4 }, { title: '  ' }, { sourceIds: ['nope'] }]) {
    assert.equal(checkPatch(bad).ok, false, JSON.stringify(bad));
  }
  assert.match((checkPatch({ body: 'x'.repeat(CH_LIMITS.body + 1) }) as { error: string }).error, /Split it into two chapters/);
  assert.deepEqual(checkPatch({ sourceIds: ['00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000001'] }), { ok: true, value: { sourceIds: ['00000000-0000-4000-9000-000000000001'] } });
});

test('appending adds paragraphs after the author\'s text and changes none of it', () => {
  const mine = 'My own first paragraph.\n\nMy second, unfinished  ';
  assert.equal(appendParagraphs(mine, ['New one.', ' Another. ']), 'My own first paragraph.\n\nMy second, unfinished\n\nNew one.\n\nAnother.');
  assert.equal(appendParagraphs('', ['Only new.']), 'Only new.');
  assert.equal(appendParagraphs('Mine.', []), 'Mine.');
  assert.equal(appendParagraphs('Mine.', ['  ', '']), 'Mine.');
  assert.ok(appendParagraphs(mine, ['x']).startsWith('My own first paragraph.\n\nMy second, unfinished'));
  assert.deepEqual(paragraphsOf('One.\n\n\nTwo.\r\n\r\nThree.'), ['One.', 'Two.', 'Three.']);
  assert.equal(progress(750, 1500), 50);
  assert.equal(progress(9000, 1500), 100);
  assert.equal(progress(10, 0), 0);
});
