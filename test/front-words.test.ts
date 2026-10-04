/* The front page (app/page.tsx, T-2131): every word it and its moving parts ask for is
   in app/_front/words.ts, and the words carry only the markup the page draws. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { W } from '../app/_front/words.ts';

const files = ['app/page.tsx', ...readdirSync('app/_front').filter((f) => f.endsWith('.tsx')).map((f) => `app/_front/${f}`)];
const src = files.map((f) => [f, readFileSync(f, 'utf8')] as const);

test('every key the page and its parts read is in the dictionary', () => {
  let seen = 0;
  for (const [f, s] of src) {
    for (const m of s.matchAll(/\bW\['([^']+)'\]|\bW\.(\w+)\b/g)) {
      const k = m[1] ?? m[2];
      seen++;
      assert.ok(k in W, `${f}: ${k}`);
    }
    /* Keys handed over in typed lists: ['who.1t', ...] as Key[] and the like. */
    for (const m of s.matchAll(/'([a-z][\w]*\.[\w.]+)'/g)) {
      if (/^(fp|app|next)\b/.test(m[1]) || m[1].includes('/')) continue;
      assert.ok(m[1] in W, `${f}: ${m[1]}`);
    }
  }
  assert.ok(seen > 200, `only ${seen} reads found`);
  for (let n = 1; n <= 8; n++) assert.ok(`q${n}` in W && `a${n}` in W, `question ${n}`);
});

test('every value is filled in', () => {
  for (const [k, v] of Object.entries(W)) assert.ok(v.trim().length > 0, k);
});

test('markup is only what the page draws, and every tag is closed', () => {
  for (const [k, v] of Object.entries(W)) {
    const stack: string[] = [];
    for (const m of v.matchAll(/<(\/?)([a-z]+)([^>]*)>/g)) {
      assert.ok(['em', 'b', 'small', 'span', 'br'].includes(m[2]), `${k}: <${m[2]}>`);
      if (m[2] === 'br') continue;
      if (m[2] === 'span' && !m[1]) assert.match(m[3], /^ class="(soon|gap)"$/, `${k}: span`);
      if (m[1]) assert.equal(stack.pop(), m[2], `${k}: </${m[2]}>`);
      else stack.push(m[2]);
    }
    assert.equal(stack.length, 0, `${k}: unclosed`);
  }
});

test('no hostname is written into the words: the addresses come from lib/links.ts', () => {
  for (const [k, v] of Object.entries(W)) assert.ok(!/snowai\.app\//.test(v) && !/https?:\/\/[a-z]/.test(v), k);
});
