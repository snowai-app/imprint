#!/usr/bin/env node
/**
 * Writes family/app-colours.css from family/palette.json (T-2126).
 *
 *   node family/generate-app-colours.mjs          write app-colours.css
 *   node family/generate-app-colours.mjs --check  exit 1 if it is out of date
 *
 * Never edit app-colours.css by hand: change palette.json and run this. The
 * family test fails when the two disagree.
 *
 * For every app, two blocks on <html>:
 *   :root[data-app="<id>"]                      light: accent, strong, soft, ground
 *   :root[data-app="<id>"][data-theme="dark"]   dark: the lifted accent, its ground and surface
 * and one tile rule, `[data-tile="<id>"]`, so any page can draw any app's
 * tile in that app's colour whatever app it is itself.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Mix two #rrggbb colours in sRGB: `t` of `a`, the rest `b`. */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}

/** The whole stylesheet, as a string, from the parsed palette. */
export function render(palette) {
  const out = [
    '/*',
    ' * GENERATED from palette.json by generate-app-colours.mjs. Do not edit.',
    ` * ${palette.name}; decided ${palette.decided}.`,
    ' *',
    ' * An app sets data-app="<id>" on <html> and takes its own colours; any',
    ' * element with data-tile="<id>" gets that app\'s tile colour as --tile.',
    ' */',
    '',
  ];
  for (const [id, c] of Object.entries(palette.apps)) {
    out.push(
      `:root[data-app="${id}"] {`,
      `  --accent: ${c.accent};`,
      `  --accent-strong: ${c.strong};`,
      `  --accent-soft: ${c.soft};`,
      '  --accent-ink: #ffffff;',
      `  --ground: ${c.ground};`,
      `  --tile: ${c.accent};`,
      '}',
      `:root[data-app="${id}"][data-theme="dark"] {`,
      `  --accent: ${c.dark};`,
      `  --accent-strong: ${c.dark};`,
      `  --accent-soft: ${mix(c.dark, c.darkSurface, 0.2)};`,
      `  --accent-ink: ${c.darkGround};`,
      `  --ground: ${c.darkGround};`,
      `  --surface: ${c.darkSurface};`,
      `  --surface-2: ${mix('#ffffff', c.darkSurface, 0.06)};`,
      '}',
    );
  }
  out.push('');
  for (const [id, c] of Object.entries(palette.apps)) {
    out.push(`[data-tile="${id}"] { --tile: ${c.accent}; }`);
  }
  out.push('');
  return out.join('\n');
}

export function readPalette() {
  return JSON.parse(readFileSync(join(here, 'palette.json'), 'utf8'));
}

export const OUTPUT = join(here, 'app-colours.css');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const css = render(readPalette());
  if (process.argv.includes('--check')) {
    const current = readFileSync(OUTPUT, 'utf8');
    if (current !== css) {
      console.error('family/app-colours.css is out of date: run node family/generate-app-colours.mjs');
      process.exit(1);
    }
    console.log('family/app-colours.css matches palette.json');
  } else {
    writeFileSync(OUTPUT, css);
    console.log(`wrote ${OUTPUT}`);
  }
}
