import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { APPS, GROUPS, STATUS_LABEL, launcherApps } from './apps.ts';
import { OUTPUT, readPalette, render } from './generate-app-colours.mjs';

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
    for (const [id, c] of Object.entries(palette.apps) as [string, Record<string, any>][]) {
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
});
