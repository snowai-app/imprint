/* Visitor mode (lib/visitor.ts; snowai docs/design/implement/visitor-view.md)
   and the studio's gate (proxy.ts). No real Cognito token exists here, so
   only what happens before a token is checked is tested. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy.ts';
import nextConfig from '../next.config.ts';
import { VISITOR_HEADER, isFamilyHost } from '../lib/visitor.ts';

const req = (url: string, init: { cookie?: string; method?: string; host?: string } = {}) =>
  new NextRequest(url, { method: init.method ?? 'GET', headers: { host: init.host ?? new URL(url).host, ...(init.cookie ? { cookie: init.cookie } : {}) } });

test('?visitor=1 sets a host-only partitioned cookie and redirects without the parameter, on the host used', async () => {
  const res = await proxy(req('http://localhost:3000/studio?x=1&visitor=1', { host: 'imprint.snowai.app' }));
  assert.equal(res.status, 307);
  assert.equal(res.headers.get('location'), 'http://imprint.snowai.app/studio?x=1');
  const set = res.headers.get('set-cookie') ?? '';
  for (const part of ['sa_visitor=1', 'Path=/', 'Max-Age=3600', 'Secure', 'HttpOnly', 'SameSite=none', 'Partitioned']) assert.match(set, new RegExp(part, 'i'), part);
  assert.doesNotMatch(set, /Domain=/i);
});

test('?visitor=0 deletes the cookie the same way', async () => {
  const res = await proxy(req('https://imprint.snowai.app/?visitor=0', { cookie: 'sa_visitor=1' }));
  assert.equal(res.status, 307);
  const set = res.headers.get('set-cookie') ?? '';
  assert.match(set, /sa_visitor=;/);
  assert.match(set, /Max-Age=0/);
  assert.match(set, /Partitioned/);
});

test('signed in + visitor cookie: the public page renders signed out, the studio sends them to sign in', async () => {
  const home = await proxy(req('https://imprint.snowai.app/', { cookie: 'sa-id=eyJ.fake.token; sa_visitor=1' }));
  assert.equal(home.headers.get('x-middleware-next'), '1');
  assert.equal(home.headers.get('location'), null);
  assert.match(home.headers.get('x-middleware-override-headers') ?? '', new RegExp(VISITOR_HEADER));
  assert.equal(home.headers.get(`x-middleware-request-${VISITOR_HEADER}`), '1');
  assert.equal(home.headers.get('x-middleware-request-cookie'), null, 'no cookie reaches the page');
  const studio = await proxy(req('https://imprint.snowai.app/studio', { cookie: 'sa-id=eyJ.fake.token; sa_visitor=1' }));
  assert.equal(studio.status, 307);
  const to = new URL(studio.headers.get('location') ?? '');
  assert.equal(`${to.origin}${to.pathname}`, 'https://snowai.app/login');
  assert.equal(to.searchParams.get('next'), 'https://imprint.snowai.app/studio');
  assert.equal(to.searchParams.get('visitor'), '1');
});

test('visitor mode refuses every API call, the AI calls included', async () => {
  for (const method of ['GET', 'POST']) {
    assert.equal((await proxy(req('https://imprint.snowai.app/api/books', { method, cookie: 'sa_visitor=1' }))).status, 403);
  }
  assert.equal((await proxy(req('https://imprint.snowai.app/api/books/ideas', { method: 'POST', cookie: 'sa_visitor=1' }))).status, 403);
});

test('signed out, the studio goes to the family sign-in and comes back; the front page and the API pass', async () => {
  const res = await proxy(req('https://imprint.snowai.app/studio/abc'));
  assert.equal(res.status, 307);
  const to = new URL(res.headers.get('location') ?? '');
  assert.equal(to.searchParams.get('next'), 'https://imprint.snowai.app/studio/abc');
  assert.equal(to.searchParams.get('visitor'), null);
  assert.equal((await proxy(req('https://imprint.snowai.app/'))).headers.get('x-middleware-next'), '1');
  assert.equal((await proxy(req('https://imprint.snowai.app/api/books/ideas', { method: 'POST' }))).headers.get('x-middleware-next'), '1');
});

test('the studio\'s pages are gated; a path that only starts alike is not', async () => {
  for (const path of ['/studio', '/studio/abc']) {
    const res = await proxy(req(`https://imprint.snowai.app${path}`));
    assert.equal(res.status, 307, path);
    assert.equal(new URL(res.headers.get('location') ?? '').searchParams.get('next'), `https://imprint.snowai.app${path}`);
  }
  assert.equal((await proxy(req('https://imprint.snowai.app/studios'))).headers.get('x-middleware-next'), '1');
});

test('a browser cannot bring its own visitor mark', async () => {
  const h = new Headers({ host: 'imprint.snowai.app', [VISITOR_HEADER]: '1' });
  const res = await proxy(new NextRequest('https://imprint.snowai.app/', { headers: h }));
  assert.equal(res.headers.get(`x-middleware-request-${VISITOR_HEADER}`), null);
});

test('every page may be framed by Imprint and HQ only', async () => {
  const rules = await nextConfig.headers!();
  const all = rules.find((r) => r.source === '/:path*');
  assert.equal(all?.headers.find((h) => h.key === 'Content-Security-Policy')?.value, "frame-ancestors 'self' https://hq.snowai.app");
  assert.ok(!all?.headers.some((h) => h.key.toLowerCase() === 'x-frame-options'));
  assert.equal(isFamilyHost('evilsnowai.app'), false);
  assert.equal(isFamilyHost('tax.snowai.app'), true);
});
