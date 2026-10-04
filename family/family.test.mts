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
import { ASK_SNOW_EN, GREET_AFTER_MS, MAX_QUESTION, fallbackPreset, fill, foundWords, greetNow, maskText, readGreetState, scrolledHalf, visitKey } from './ask-snow.ts';

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
});
