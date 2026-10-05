import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { APPS, GROUPS, STATUS_LABEL, launcherApps } from './apps.ts';
import { OUTPUT, readPalette, render } from './generate-app-colours.mjs';
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  allows,
  consentCookie,
  consentFromCookieString,
  framedRequest,
  parseConsent,
} from './consent.ts';
import { ATLAS_MAX_BATCH, ATLAS_MANIFEST_PATH, atlasManifest, atlasSlug, publishToAtlas, removeFromAtlas, type AtlasEntry } from './atlas.ts';
import {
  EMBED_NAME,
  EMBED_SCRIPT,
  FRAME_ANCESTORS,
  NEVER_FRAMED,
  SIGN_IN_PATH,
  embedHref,
  familyFrameHeaders,
  frameName,
  isFamilyOrigin,
  openFromSearch,
  readEmbedMessage,
  withOpen,
  workspaceTarget,
} from './embed.ts';
import { runInNewContext } from 'node:vm';
import { ASK_SNOW_EN, GREET_AFTER_MS, MAX_QUESTION, askEndpointOf, fallbackPreset, fill, foundWords, greetNow, hiddenOn, maskText, readGreetState, scrolledHalf, visitKey } from './ask-snow.ts';

/**
 * The family kit's own checks (T-2126). Copied with the kit, so every app
 * that takes family/ runs them too.
 */

const palette = readPalette();
const ids = Object.keys(palette.apps);
const hex = /^#[0-9a-f]{6}$/;

function luminance(h: string): number {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('family kit', () => {
  const source = (f: string) => readFileSync(new URL(f, import.meta.url), 'utf8');

  it('app-colours.css is generated from palette.json and in sync', () => {
    assert.equal(readFileSync(OUTPUT, 'utf8'), render(palette), 'run node family/generate-app-colours.mjs');
  });

  it('app-colours.css carries a light block, a dark block and a tile for every app', () => {
    const css = readFileSync(OUTPUT, 'utf8');
    for (const id of ids) {
      assert.ok(css.includes(`:root[data-app="${id}"] {`), `${id} light`);
      assert.ok(css.includes(`:root[data-app="${id}"][data-theme="dark"] {`), `${id} dark`);
      assert.ok(css.includes(`[data-tile="${id}"] { --tile: ${palette.apps[id].accent}; }`), `${id} tile`);
    }
  });

  it('every app in apps.ts has a palette entry, a glyph and a known group, and the other way round', () => {
    const groups = new Set<string>([...GROUPS.map((g) => g.id), 'hub']);
    assert.equal(new Set(APPS.map((a) => a.id)).size, APPS.length, 'ids are unique');
    for (const app of APPS) {
      const entry = palette.apps[app.id];
      assert.ok(entry, `${app.id} has no palette entry`);
      assert.ok(app.glyph && /^[a-z0-9-]+$/.test(app.glyph), `${app.id} has no glyph`);
      assert.ok(groups.has(app.group), `${app.id}: unknown group ${app.group}`);
      assert.equal(app.group, entry.group, `${app.id}: group differs from palette.json`);
      assert.ok(STATUS_LABEL[app.status], `${app.id}: unknown status`);
      assert.match(app.env, /^NEXT_PUBLIC_[A-Z_]+_URL$/, `${app.id}: env`);
      assert.doesNotMatch(JSON.stringify(app), /https?:\/\/|\.app\b|\.cloud\b/, `${app.id}: a hostname in apps.ts`);
    }
    for (const id of ids) assert.ok(APPS.some((a) => a.id === id), `${id} is in palette.json but not apps.ts`);
  });

  it('every glyph named in apps.ts is mapped to a Lucide icon in glyphs.tsx', () => {
    const glyphs = readFileSync(new URL('./glyphs.tsx', import.meta.url), 'utf8');
    for (const app of APPS) {
      const key = /^[a-z0-9]+$/.test(app.glyph) ? `  ${app.glyph}: ` : `  '${app.glyph}': `;
      assert.ok(glyphs.includes(key), `${app.id}: ${app.glyph} is not in glyphs.tsx`);
    }
  });

  it('names follow the standard: "Snow AI <Short>", GetCovered standing alone', () => {
    for (const app of APPS) {
      if (app.id === 'snowai') assert.equal(app.name, 'Snow AI');
      else if (app.brand === 'getcovered') assert.doesNotMatch(app.name, /Snow AI/);
      else assert.equal(app.name, `Snow AI ${app.short}`);
    }
  });

  it('every colour is a hex, and contrast values are present and pass AA for text and buttons', () => {
    type Entry = Record<string, string> & { contrast: Record<string, number> };
    for (const [id, c] of Object.entries(palette.apps) as [string, Entry][]) {
      for (const k of ['accent', 'strong', 'soft', 'ground', 'dark', 'darkGround', 'darkSurface']) {
        assert.match(c[k], hex, `${id}.${k}`);
      }
      const r = c.contrast;
      for (const k of ['tileWhite', 'textOnGround', 'buttonWhite', 'darkText']) {
        assert.equal(typeof r?.[k], 'number', `${id}: contrast.${k} missing`);
      }
      assert.ok(r.textOnGround >= 4.5, `${id}: strong on ground ${r.textOnGround}`);
      assert.ok(r.buttonWhite >= 4.5, `${id}: white on strong ${r.buttonWhite}`);
      assert.ok(r.darkText >= 4.5, `${id}: dark accent on dark ground ${r.darkText}`);
      /* The tile's white glyph is a graphic: 3:1 (WCAG 1.4.11). */
      assert.ok(r.tileWhite >= 3, `${id}: white glyph on tile ${r.tileWhite}`);
      /* And the recorded figures are the real ones. */
      const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 0.02, `${id}: ${what} recorded ${b}, is ${a.toFixed(2)}`);
      near(contrast(c.strong, c.ground), r.textOnGround, 'textOnGround');
      near(contrast(c.strong, '#ffffff'), r.buttonWhite, 'buttonWhite');
      near(contrast(c.dark, c.darkGround), r.darkText, 'darkText');
      near(contrast(c.accent, '#ffffff'), r.tileWhite, 'tileWhite');
      assert.ok(contrast(c.dark, c.darkSurface) >= 4.5, `${id}: dark accent on dark surface`);
    }
  });

  it('the launcher list leaves out operator surfaces and the front door, and GetCovered lists only its own', () => {
    const hrefs = Object.fromEntries(APPS.map((a) => [a.id, `/${a.id}`]));
    const customer = launcherApps(hrefs, { operator: false });
    assert.ok(customer.every((a) => !APPS.find((x) => x.id === a.id)?.operatorOnly));
    assert.ok(!customer.some((a) => a.id === 'snowai'));
    assert.ok(launcherApps(hrefs, { operator: true }).some((a) => a.id === 'hq'));
    assert.deepEqual(launcherApps(hrefs, { operator: true, brand: 'getcovered' }).map((a) => a.id), ['getcovered']);
    assert.ok(!launcherApps({ ...hrefs, sign: '' }, { operator: false }).some((a) => a.id === 'sign'), 'no address, no link');
  });

  it('an app that only forwards elsewhere is in no launcher (the Workbench, T-2174)', () => {
    const hrefs = Object.fromEntries(APPS.map((a) => [a.id, `/${a.id}`]));
    assert.equal(APPS.find((a) => a.id === 'workbench')?.listed, false, 'the Workbench is marked not listed');
    for (const operator of [true, false]) {
      const list = launcherApps(hrefs, { operator });
      for (const app of APPS.filter((a) => a.listed === false)) assert.ok(!list.some((a) => a.id === app.id), `${app.id} is not in the launcher`);
    }
    assert.ok(launcherApps(hrefs, { operator: true }).some((a) => a.id === 'studio'), 'Studio, where its tools went, is');
  });

  it('an app whose address does not answer yet stays in the launcher, In build, without a link', () => {
    const hrefs = Object.fromEntries(APPS.map((a) => [a.id, `/${a.id}`]));
    const list = launcherApps(hrefs, { operator: false });
    /* Network and Atlas have no DNS record yet (family audit, T-2148). */
    for (const id of ['network', 'atlas']) {
      assert.equal(APPS.find((a) => a.id === id)?.live, false, `${id} is marked not live`);
      const entry = list.find((a) => a.id === id);
      assert.ok(entry, `${id} is still shown`);
      assert.equal(entry.href, '', `${id} has no link`);
      assert.equal(STATUS_LABEL[entry.status], 'In build', `${id} says In build`);
    }
    /* A not-live app is never one that says it can be opened. */
    for (const app of APPS.filter((a) => a.live === false)) assert.ok(app.status === 'building' || app.status === 'planned', app.id);
    /* Every other app keeps its address. */
    for (const entry of list.filter((a) => APPS.find((x) => x.id === a.id)?.live !== false)) assert.equal(entry.href, `/${entry.id}`);
    /* And the launcher draws an empty address as plain text, never <a href="">. */
    const launcher = source('./components/AppLauncher.tsx');
    assert.match(launcher, /if \(!app\.href\) \{\s*return <span className="fam-launcher__nolink">/);
    assert.doesNotMatch(launcher, /<a href=\{a\.href\}/, 'every app row goes through Entry');
  });

  it('the cookie choice reads and writes one family cookie', () => {
    assert.equal(CONSENT_COOKIE, 'snowai-consent');
    assert.equal(parseConsent('v1.all'), 'all');
    assert.equal(parseConsent('v1.essential'), 'essential');
    assert.equal(parseConsent('v1%2Eall'), 'all');
    for (const v of [undefined, null, '', 'all', 'v0.all', 'v1.maybe']) assert.equal(parseConsent(v), null, String(v));
    assert.equal(consentFromCookieString('a=1; snowai-consent=v1.essential; b=2'), 'essential');
    assert.equal(consentFromCookieString('xsnowai-consent=v1.all'), null);
    assert.equal(consentFromCookieString(''), null);
    /* On unless denied, as on GetCovered (T-1549). */
    assert.equal(allows(null), true);
    assert.equal(allows('all'), true);
    assert.equal(allows('essential'), false);
    assert.equal(CONSENT_MAX_AGE, 31536000);
    /* A framed page never asks: its parent page does. */
    assert.equal(framedRequest('iframe'), true);
    assert.equal(framedRequest('document'), false);
    assert.equal(framedRequest(null), false);
  });

  it('the cookie is shared across snowai.app and host-only anywhere else', () => {
    for (const hostname of ['snowai.app', 'docs.snowai.app', 'A.SNOWAI.APP']) {
      const c = consentCookie('all', { hostname, https: true });
      assert.match(c, /; Domain=\.snowai\.app(;|$)/, hostname);
      assert.match(c, /; Secure$/, hostname);
    }
    for (const hostname of ['localhost', 'notsnowai.app', 'main.d1.amplifyapp.com', 'snowai.app.evil.com']) {
      assert.doesNotMatch(consentCookie('essential', { hostname, https: false }), /Domain=/, hostname);
    }
    const c = consentCookie('essential', { hostname: 'localhost', https: false });
    assert.equal(c, 'snowai-consent=v1.essential; Path=/; Max-Age=31536000; SameSite=Lax');
  });

  it('the cookie bar is a named region with the family wording, its colours only from tokens', () => {
    const bar = source('./components/CookieBar.tsx');
    assert.match(bar, /role="region"/);
    assert.match(bar, /aria-label=\{l\.region\}/);
    assert.ok(bar.includes("accept: 'Accept'") && bar.includes("deny: 'Deny non-essential'") && bar.includes("link: 'Privacy and cookies'"));
    assert.doesNotMatch(bar, /https?:\/\//, 'no address in the component');
    const css = source('./components.css');
    const block = css.slice(css.indexOf('/* ------------------------------------------------------ the cookie bar */'), css.indexOf('/* ------------------------------------------------------------- Ask Snow */'));
    assert.ok(block.includes('.fam-cookiebar__accept {') && block.includes('.fam-cookiebtn.fam-cookiebtn {'));
    assert.match(block, /\.fam-cookiebar__accept \{\s*background: var\(--accent-strong\);\s*color: var\(--accent-ink\);/);
    /* No colour of its own: tokens, and black or white only to darken or lift a hover. */
    const hexes = block.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    assert.deepEqual([...new Set(hexes)].sort(), ['#000000', '#ffffff']);
    assert.doesNotMatch(block, /prefers-color-scheme/);
    assert.ok(source('./components/CookieChoices.tsx').includes('openCookieChoices'));
  });

  it('the launcher draws the shelf link only when it is given one, and the switch takes its words', () => {
    const launcher = source('./components/AppLauncher.tsx');
    assert.match(launcher, /shelfHref\?: string/);
    assert.match(launcher, /\{shelfHref \? \(\s*<a className="fam-launcher__all"/);
    const sw = source('./components/ThemeSwitch.tsx');
    assert.match(sw, /label\?: \{ toDark\?: string; toLight\?: string \}/);
    assert.doesNotMatch(sw, /useEffect/, 'no state set in an effect');
  });
  /* ---------------------------------------------------------- Ask Snow (T-2168) */

  it('Ask Snow masks a Social Security number, a date of birth and health words before anything is sent', () => {
    const m = maskText('SSN 123-45-6789, born 02/03/1981, I have diabetes and take insulin');
    assert.doesNotMatch(m.text, /123-45-6789|02\/03\/1981|diabetes|insulin/);
    assert.deepEqual([...m.found].sort(), ['dob', 'health', 'ssn']);
    assert.deepEqual(maskText('My invoice 0045 is due 10/25/2026').found, [], 'a due date this year is not a birth date');
    assert.deepEqual(maskText('my number is 123456789 ok').found, ['ssn']);
    assert.deepEqual(maskText('still typing 123456789', true).found, [], 'a bare number being typed waits for the next key');
    assert.equal(foundWords(['ssn', 'dob']), 'a Social Security number and a date of birth');
  });

  it('Ask Snow greets once per visit, after ten seconds or half a scroll, never on a phone, never again once closed', () => {
    const base = { state: 'none' as const, phone: false, open: false, enabled: true, elapsedMs: 0, scrolledHalf: false };
    assert.equal(GREET_AFTER_MS, 10_000);
    assert.equal(greetNow(base), 'wait');
    assert.equal(greetNow({ ...base, elapsedMs: 10_000 }), 'show');
    assert.equal(greetNow({ ...base, scrolledHalf: true }), 'show');
    assert.equal(greetNow({ ...base, state: 'shown' }), 'restore', 'shown earlier this visit: put back, not shown again');
    assert.equal(greetNow({ ...base, state: 'closed', elapsedMs: 99_000 }), 'never');
    assert.equal(greetNow({ ...base, phone: true, elapsedMs: 99_000, scrolledHalf: true }), 'never', 'the phone rule');
    assert.equal(greetNow({ ...base, enabled: false, elapsedMs: 99_000 }), 'never');
    assert.equal(greetNow({ ...base, open: true, elapsedMs: 99_000 }), 'wait', 'never over the open conversation');
    assert.equal(readGreetState('closed'), 'closed');
    assert.equal(readGreetState('nonsense'), 'none');
    assert.equal(visitKey('invoice'), 'ask-snow.visit.invoice');
    assert.equal(scrolledHalf(500, 2000, 1000), true);
    assert.equal(scrolledHalf(499, 2000, 1000), false);
    assert.equal(scrolledHalf(0, 800, 1000), false, 'a page that cannot scroll is never half scrolled');
  });

  it('Ask Snow stays off an app’s signed-in paths, and finds Ask in the launcher list', () => {
    assert.equal(hiddenOn('/dashboard', ['/dashboard']), true);
    assert.equal(hiddenOn('/dashboard/invoices/1?x=1', ['/dashboard']), true);
    assert.equal(hiddenOn('/dashboards', ['/dashboard']), false);
    assert.equal(hiddenOn('/', ['/dashboard', '/login']), false);
    assert.equal(hiddenOn('/', ['/']), true, '/ alone covers only the home page');
    assert.equal(hiddenOn('/pricing', ['/']), false);
    assert.equal(askEndpointOf([{ id: 'tax', href: 'a' }, { id: 'ask', href: 'b' }]), 'b');
    assert.equal(askEndpointOf(undefined), '');
  });

  it('Ask Snow carries its words in one object, with the honest line, and a fallback greeting', () => {
    for (const [k, v] of Object.entries(ASK_SNOW_EN)) assert.ok(typeof v === 'string' && v.trim(), `${k} has words`);
    assert.equal(ASK_SNOW_EN.name, 'Ask Snow');
    assert.equal(ASK_SNOW_EN.honest, 'AI assistant · answers from Snow AI’s own pages · not tax, legal or insurance advice');
    const p = fallbackPreset('invoice', 'Snow AI Invoice');
    assert.equal(p.greeting, 'Hi, welcome to Snow AI Invoice. What are you trying to get done?');
    assert.equal(p.choices[0].kind, 'followup');
    assert.equal(fill('{a} and {b}', { a: '1' }), '1 and {b}');
    assert.equal(MAX_QUESTION, 500);
  });

  it('Ask Snow names no address, takes its endpoint as a prop, and is coloured only by tokens', () => {
    for (const f of ['./components/AskSnow.tsx', './components/AskSnowButton.tsx', './components/AskSnowPanel.tsx', './ask-snow.ts']) {
      const src = source(f);
      assert.doesNotMatch(src, /https?:\/\/|snowai\.app|getcovered\./, `${f} writes an address`);
    }
    assert.match(source('./components/AskSnow.tsx'), /endpoint: string;/);
    assert.match(source('./components/AskSnowButton.tsx'), /endpoint: string;/);
    assert.match(source('./components/AskSnowPanel.tsx'), /"protected": true|protected: found\.length > 0/);
    const css = source('./components.css');
    const block = css.slice(css.indexOf('/* ------------------------------------------------------------- Ask Snow */'));
    assert.ok(block.includes('.fam-ask .fam-ask-fab {') && block.includes('.fam-ask-btn.fam-ask-btn {'));
    assert.deepEqual(block.match(/#[0-9a-f]{3,8}\b/gi) ?? [], [], 'no colour of its own');
    assert.match(block, /@media \(max-width: 600px\)[\s\S]*\.fam-ask \.fam-ask-greet \{ display: none !important; \}/, 'no greeting on a phone');
    assert.match(block, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(block, /prefers-color-scheme/);
    assert.match(block, /z-index: 800/, 'under the cookie bar');
  });

  it('Atlas: an entry with no slug gets <source>-<id>, and the manifest says who sent it and when (T-2193)', () => {
    assert.equal(atlasSlug('tax', 'What_is 1099?'), 'tax-what-is-1099');
    assert.equal(atlasSlug('playbook', '--x--'), 'playbook-x');
    assert.ok(atlasSlug('a1', 'y'.repeat(200)).length <= 81);
    assert.match(atlasSlug('tax', 'z'.repeat(200)), /^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    const m = atlasManifest('tax', [], new Date('2026-10-04T12:00:00Z'));
    assert.deepEqual(m, { source: 'tax', updated_at: '2026-10-04T12:00:00.000Z', entries: [] });
    assert.equal(ATLAS_MANIFEST_PATH, '/atlas.json');
  });

  it('Atlas: publishing pushes in batches with the key, removing names the source and id, and neither throws', async () => {
    const real = globalThis.fetch;
    const calls: { url: string; method: string; auth: string; body: unknown }[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const body = init.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method: String(init.method), auth: String((init.headers as Record<string, string>).authorization), body });
      return new Response(JSON.stringify(init.method === 'POST' ? { saved: body.entries.length } : { removed: true }), { status: 200 });
    }) as typeof fetch;
    try {
      const e: AtlasEntry = { id: 'x', kind: 'article', title: 'T', lead: 'L.', url: 'https://tax.snowai.app/x', updated_at: '2026-10-04T00:00:00Z' };
      const many = Array.from({ length: ATLAS_MAX_BATCH + 5 }, (_, i) => ({ ...e, id: `x${i}` }));
      const r = await publishToAtlas('https://atlas.test/', 'k', 'tax', many);
      assert.deepEqual(r, { ok: true, saved: ATLAS_MAX_BATCH + 5 });
      assert.equal(calls.length, 2);
      assert.equal(calls[0].url, 'https://atlas.test/api/entries');
      assert.equal(calls[0].auth, 'Bearer k');
      assert.equal((calls[0].body as { source: string }).source, 'tax');
      const d = await removeFromAtlas('https://atlas.test', 'k', 'tax', 'v1:a.b');
      assert.deepEqual(d, { ok: true, removed: 'v1:a.b' });
      assert.equal(calls[2].url, 'https://atlas.test/api/entries/tax/v1%3Aa.b');
      assert.equal(calls[2].method, 'DELETE');
      assert.equal((await publishToAtlas('https://atlas.test', '', 'tax', e)).ok, false, 'no key, no call');
      assert.equal((await removeFromAtlas('https://atlas.test', 'k', 'Tax!', 'x')).ok, false, 'a bad source is refused before any call');
      assert.equal(calls.length, 3);
      globalThis.fetch = (async () => {
        throw new Error('offline');
      }) as typeof fetch;
      assert.deepEqual(await publishToAtlas('https://atlas.test', 'k', 'tax', e), { ok: false, status: 0, error: 'Atlas could not be reached' });
      globalThis.fetch = (async () => new Response(JSON.stringify({ error: 'entry 1: url' }), { status: 400 })) as typeof fetch;
      assert.deepEqual(await removeFromAtlas('https://atlas.test', 'k', 'tax', 'x'), { ok: false, status: 400, error: 'entry 1: url' });
    } finally {
      globalThis.fetch = real;
    }
    assert.doesNotMatch(source('./atlas.ts'), /https?:\/\/|snowai\.app|getcovered\./, 'atlas.ts writes no address');
    assert.doesNotMatch(source('./atlas.ts'), /^import /m, 'atlas.ts imports nothing');
  });

  describe('the integrated workspace (T-2223)', () => {
    it('only the family may frame a page', () => {
      assert.equal(FRAME_ANCESTORS, "frame-ancestors 'self' https://snowai.app https://*.snowai.app");
      assert.deepEqual(familyFrameHeaders(), [{ key: 'Content-Security-Policy', value: FRAME_ANCESTORS }]);
      for (const o of ['https://snowai.app', 'https://tax.snowai.app', 'https://a.b.snowai.app']) assert.ok(isFamilyOrigin(o), o);
      for (const o of ['http://tax.snowai.app', 'https://snowai.app.evil.com', 'https://evilsnowai.app', 'https://getcovered.cloud', '', null]) assert.ok(!isFamilyOrigin(o), String(o));
    });

    it('embed and open are added and read without losing the rest of the address', () => {
      assert.equal(embedHref('https://tax.snowai.app'), 'https://tax.snowai.app?embed=1');
      assert.equal(embedHref('https://tax.snowai.app/dashboard?y=2026#w2'), 'https://tax.snowai.app/dashboard?y=2026&embed=1#w2');
      assert.equal(embedHref('/campaigns'), '/campaigns?embed=1');
      assert.equal(withOpen('/dashboard?x=1#a', 'tax'), '/dashboard?x=1&open=tax#a');
      assert.equal(withOpen('/dashboard?open=tax&x=1', null), '/dashboard?x=1');
      assert.equal(withOpen('/admin?open=tax', null), '/admin');
      assert.equal(openFromSearch('?open=transcribe'), 'transcribe');
      for (const q of ['', '?open=', '?open=<script>', '?x=1']) assert.equal(openFromSearch(q), null, q);
      assert.equal(frameName('https://sign.snowai.app'), `${EMBED_NAME}:https://sign.snowai.app`);
      assert.equal(frameName('https://evil.example'), EMBED_NAME);
    });

    it('a held product opens beneath the bar, anything else in a new tab, Get Covered always in a new tab', () => {
      const held = new Set(['tax', 'getcovered', 'portal']);
      const ctx = { current: 'sign', holding: held, tryBase: 'https://snowai.app/try/' };
      assert.deepEqual(workspaceTarget({ id: 'sign', href: '/dashboard/home' }, ctx), { kind: 'current' });
      assert.deepEqual(workspaceTarget({ id: 'tax', href: 'https://tax.snowai.app' }, ctx), { kind: 'frame', src: 'https://tax.snowai.app?embed=1' });
      assert.deepEqual(workspaceTarget({ id: 'invoice', href: 'https://invoice.snowai.app' }, ctx), { kind: 'tab', href: 'https://snowai.app/try/invoice' });
      assert.deepEqual(workspaceTarget({ id: 'getcovered', href: 'https://getcovered.cloud' }, ctx), { kind: 'tab', href: 'https://getcovered.cloud' });
      assert.deepEqual(workspaceTarget({ id: 'snowai', href: 'https://snowai.app' }, ctx), { kind: 'tab', href: 'https://snowai.app' });
      assert.deepEqual(workspaceTarget({ id: 'network', href: '' }, ctx), { kind: 'none' });
      /* The answer could not be read: the product itself, in a new tab. */
      assert.deepEqual(workspaceTarget({ id: 'tax', href: 'https://tax.snowai.app' }, { ...ctx, holding: 'unknown' }), { kind: 'tab', href: 'https://tax.snowai.app' });
      assert.ok(NEVER_FRAMED.includes('getcovered'));
      assert.ok(NEVER_FRAMED.includes('portal'), 'Portal keeps frame-ancestors none: its own login, GetCovered PHI');
    });

    it('a guest message is heard only when it is well formed and names a family address', () => {
      assert.deepEqual(readEmbedMessage({ source: 'snowai-embed', type: 'top', url: 'https://snowai.app/login?next=x' }), { source: 'snowai-embed', type: 'top', url: 'https://snowai.app/login?next=x' });
      for (const m of [null, 'x', { source: 'other', type: 'top', url: 'https://snowai.app' }, { source: 'snowai-embed', type: 'go', url: 'https://snowai.app' }, { source: 'snowai-embed', type: 'top', url: 'https://evil.example/login' }, { source: 'snowai-embed', type: 'top', url: 'javascript:alert(1)' }])
        assert.equal(readEmbedMessage(m), null, JSON.stringify(m));
    });

    it('sign-in pages are known', () => {
      for (const p of ['/login', '/login/code', '/sign-in', '/signin', '/sign-up', '/es/login', '/auth/login']) assert.ok(SIGN_IN_PATH.test(p), p);
      for (const p of ['/', '/dashboard', '/admin/logins', '/auth/callback', '/loginx']) assert.ok(!SIGN_IN_PATH.test(p), p);
    });

    /** Runs EMBED_SCRIPT in a pretend browser and says what it did. */
    function guest({ framed = true, search = '', path = '/dashboard', name = '', referrer = '' }: { framed?: boolean; search?: string; path?: string; name?: string; referrer?: string }) {
      const attrs: Record<string, string> = {};
      const posted: { msg: unknown; origin: string }[] = [];
      const listeners: string[] = [];
      const self = {} as Record<string, unknown>;
      const win: Record<string, unknown> = {
        name,
        parent: { postMessage: (msg: unknown, origin: string) => posted.push({ msg, origin }) },
        addEventListener: (t: string) => listeners.push(`window:${t}`),
      };
      win.self = win;
      win.top = framed ? self : win;
      const ctx = {
        window: win,
        document: {
          documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v), style: {} as Record<string, string> },
          referrer,
          addEventListener: (t: string) => listeners.push(`document:${t}`),
        },
        location: { search, pathname: path, href: `https://tax.snowai.app${path}${search}`, origin: 'https://tax.snowai.app' },
        history: { pushState() {}, replaceState() {} },
        URL,
        URLSearchParams,
        setTimeout: () => 0,
      };
      runInNewContext(EMBED_SCRIPT, ctx);
      return { attrs, posted: JSON.parse(JSON.stringify(posted)) as typeof posted, listeners, name: win.name as string, style: ctx.document.documentElement.style };
    }

    it('the guest script does nothing outside a frame, whatever the address says', () => {
      const r = guest({ framed: false, search: '?embed=1' });
      assert.deepEqual(r.attrs, {});
      assert.equal(r.name, '');
      assert.equal(r.posted.length, 0);
    });

    it('framed with embed=1 it marks the page, keeps the mode in the frame name and tells the host', () => {
      const r = guest({ search: '?embed=1', referrer: 'https://sign.snowai.app/dashboard' });
      assert.equal(r.attrs['data-embed'], '1');
      assert.equal(r.name, 'snowai-embed:https://sign.snowai.app');
      assert.deepEqual(r.posted, [{ msg: { source: 'snowai-embed', type: 'ready', url: 'https://tax.snowai.app/dashboard?embed=1' }, origin: 'https://sign.snowai.app' }]);
      assert.ok(r.listeners.includes('document:click'), 'links leaving the family open in a new tab');
      /* The next page in the same frame carries no query: the name keeps the mode. */
      const next = guest({ name: r.name, path: '/dashboard/returns' });
      assert.equal(next.attrs['data-embed'], '1');
      assert.equal(next.posted.length, 1);
    });

    it('a host that is not the family is never told anything, and a frame without the mode is left alone', () => {
      const r = guest({ search: '?embed=1', referrer: 'https://evil.example/' });
      assert.equal(r.attrs['data-embed'], '1');
      assert.equal(r.name, 'snowai-embed');
      assert.equal(r.posted.length, 0);
      assert.deepEqual(guest({ name: 'snowai-embed:https://evil.example' }).posted, []);
      assert.deepEqual(guest({}).attrs, {}, 'framed by HQ without embed: untouched');
      assert.equal(guest({ name: r.name, search: '?embed=0' }).name, '', 'embed=0 clears it');
    });

    it('a sign-in page in the workspace is hidden and asks the host for the whole window', () => {
      const r = guest({ name: 'snowai-embed:https://sign.snowai.app', path: '/login', search: '?next=%2Fdashboard' });
      assert.equal(r.style.visibility, 'hidden');
      assert.deepEqual(r.posted, [{ msg: { source: 'snowai-embed', type: 'top', url: 'https://tax.snowai.app/login?next=%2Fdashboard' }, origin: 'https://sign.snowai.app' }]);
    });

    it('the workspace components write no address and the launcher only turns it on with snowai', () => {
      for (const f of ['./components/FamilyWorkspace.tsx', './components/EmbedScript.tsx']) assert.doesNotMatch(source(f), /https?:\/\/|snowai\.app|getcovered\./, `${f} writes an address`);
      const launcher = source('./components/AppLauncher.tsx');
      assert.match(launcher, /useFamilyWorkspace\(\{ snowai,/);
      const css = source('./components.css');
      for (const sel of ['.fam-launcher', '.fam-ask', '.fam-cookiebar', '[data-fam-chrome]', 'header:has(.fam-launcher)']) assert.ok(css.includes(`:root[data-embed] ${sel}`), sel);
    });
  });
});
