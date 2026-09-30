// Teaches Node's own test runner three things Next's bundler already knows,
// and nothing else (the first from snowai-app/crm's copy):
//  - `next` ships no exports map, so `next/server` needs its `.js`;
//  - `server-only` is a guard for the bundler, and loads as nothing here;
//  - a `.json` import needs no `with { type: 'json' }`.
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
  import { readFileSync } from 'node:fs';
  export async function resolve(spec, ctx, next) {
    if (/^next\\/(server|headers|navigation)$/.test(spec)) return next(spec + '.js', ctx);
    if (spec === 'server-only') return { url: 'data:text/javascript,export%20%7B%7D', shortCircuit: true };
    return next(spec, ctx);
  }
  export async function load(url, ctx, next) {
    if (url.startsWith('file:') && url.endsWith('.json')) return { format: 'json', source: readFileSync(new URL(url), 'utf8'), shortCircuit: true };
    return next(url, ctx);
  }
`));
