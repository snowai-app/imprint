/* Where dictated words go (lib/dictate.ts): at the cursor, over a selection, with a space only where words would run together, no punctuation of its own, and within a box's limit. Invented text only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertAtSelection } from '../lib/dictate.ts';

const at = (value: string, start: number, spoken: string, end = start, max = 0) => insertAtSelection(value, start, end, spoken, max);

test('into an empty box: the words, and the cursor after them', () => {
  const r = at('', 0, 'hello world');
  assert.deepEqual([r.value, r.caret, r.added, r.cut, r.full], ['hello world', 11, 'hello world', false, false]);
});

test('appended after text gets one space; after a space or a line break, none', () => {
  assert.equal(at('First part', 10, 'and the second').value, 'First part and the second');
  assert.equal(at('First part ', 11, 'and the second').value, 'First part and the second');
  assert.equal(at('One.\n\n', 6, 'Two').value, 'One.\n\nTwo');
  assert.equal(at('a\n', 2, 'b').value, 'a\nb');
});

test('in the middle of a sentence: a space on each side, and the cursor stays before the trailing space', () => {
  const r = at('The credit ends at the line', 10, 'quietly');
  assert.equal(r.value, 'The credit quietly ends at the line');
  assert.equal(r.caret, 18);
  assert.equal(r.value.slice(r.caret), ' ends at the line');
  const next = at(r.value, r.caret, 'again');
  assert.equal(next.value, 'The credit quietly again ends at the line', 'the next phrase joins the same way');
});

test('no space before punctuation that follows, none after an opening bracket or quote, and none of its own punctuation is ever added', () => {
  assert.equal(at('Costs vary. Really', 10, 'a lot').value, 'Costs vary a lot. Really');
  assert.equal(at('See (', 5, 'the note').value, 'See (the note');
  assert.equal(at('He said “', 9, 'hello').value, 'He said “hello');
  assert.equal(at('Wait', 4, ', really').value, 'Wait, really');
  const r = at('It works', 8, 'and it is cheap');
  assert.doesNotMatch(r.added.replace(/^ /, ''), /[.,;:!?]/);
  assert.equal(r.value, 'It works and it is cheap');
});

test('a selection is replaced', () => {
  const r = at('Keep this, drop that, keep this', 11, 'swap', 20);
  assert.equal(r.value, 'Keep this, swap, keep this');
  assert.equal(r.caret, 15);
});

test('spoken whitespace is tidied, nothing spoken changes nothing, and a cursor outside the text is put inside it', () => {
  assert.equal(at('a', 1, '  b \n  c  ').value, 'a b c');
  const none = at('keep', 2, '   ');
  assert.deepEqual([none.value, none.added, none.full, none.cut], ['keep', '', false, false]);
  assert.equal(at('abc', 99, 'd').value, 'abc d');
  assert.equal(at('abc', -4, 'd').value, 'd abc');
  assert.equal(at('abc', 2, 'X', 1).value, 'a X c', 'a backwards selection is the same selection');
});

test('a box with a limit takes what fits, cut at a word, and says when nothing fits', () => {
  const r = at('Head', 4, 'and the rest of it goes here', 4, 20);
  assert.equal(r.cut, true);
  assert.ok(r.value.length <= 20, r.value);
  assert.equal(r.value, 'Head and the rest of');
  const exact = at('Head', 4, 'and more', 4, 13);
  assert.equal(exact.value, 'Head and more');
  assert.equal(exact.cut, false);
  const inWord = at('Head', 4, 'extraordinary', 4, 10);
  assert.equal(inWord.value, 'Head extra');
  const full = at('12345', 5, 'more', 5, 5);
  assert.deepEqual([full.value, full.full, full.added], ['12345', true, '']);
  assert.equal(at('12345', 5, 'more', 5, 6).full, true, 'a space alone leaves no room for a word');
  const none = at('short', 5, 'fits', 5, 0);
  assert.equal(none.value, 'short fits', 'no limit, no cut');
});
