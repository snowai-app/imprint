/**
 * THE INTEGRATED WORKSPACE (T-2223): one product open beneath another's
 * family bar, in the same tab.
 *
 * Two halves, both in the kit:
 *
 *   The host   is the app whose bar is on screen. Clicking a product the
 *              account holds in its launcher (or in a product's own family
 *              bar, such as Sign's) keeps the bar and opens that product
 *              beneath it, in a frame of the product's address with
 *              `?embed=1` (components/FamilyWorkspace.tsx). The host page
 *              stays mounted underneath, so going back to it finds it as it
 *              was. The address bar says `?open=<id>`, so a reload or a back
 *              press lands on the same view.
 *
 *   The guest  is the product in the frame. `EMBED_SCRIPT`, inlined at the
 *              top of every app's root layout (components/EmbedScript.tsx),
 *              marks `<html data-embed>` before the first paint when the page
 *              is framed in embed mode, and components.css then hides the
 *              app's own top bar, launcher, cookie bar and Ask Snow: the host
 *              shows its own. The mode is carried by the frame's name, which
 *              a frame keeps across every page it loads, so internal links
 *              need nothing added. A sign-in page never shows framed: it asks
 *              the host to load it in the whole window.
 *
 * Held means `mayUse()` from snowai.app/api/entitlements, where the operator
 * holds everything (decided on snowai's server, never in the browser). A
 * product the account does not hold opens its snowai.app/try page in a new
 * tab; when the answer cannot be read, the product opens in a new tab. Get
 * Covered is a separate entity and HIPAA boundary: it is never framed inside a
 * Snow AI app and always opens in a new tab. So is Portal (NEVER_FRAMED).
 *
 * Every app sends `Content-Security-Policy: frame-ancestors` FRAME_ANCESTORS,
 * so only the family can frame it.
 *
 * No imports. The one name written here is the family's registrable domain:
 * a security boundary (who may frame, whose messages are heard), not an
 * address to link to. Addresses still come from each app's lib/links.ts.
 */

/** The query that asks a page for embed mode. */
export const EMBED_PARAM = 'embed';

/** The host's query naming the product open beneath its bar. */
export const OPEN_PARAM = 'open';

/** The frame's name, and the prefix of the host's origin carried in it:
 *  `snowai-embed:https://sign.snowai.app`. A frame keeps its name across
 *  every page it loads, so embed mode survives internal navigation. */
export const EMBED_NAME = 'snowai-embed';

/** What every message between guest and host carries as `source`. */
export const EMBED_MESSAGE = 'snowai-embed';

/** The family's registrable domain. snowai.app and its subdomains only. */
export const FAMILY_DOMAIN = 'snowai.app';

/** Who may frame a family page: the page's own origin, the front door and
 *  every app on a subdomain. Never anyone else. */
export const FRAME_ANCESTOR_SOURCES = `'self' https://${FAMILY_DOMAIN} https://*.${FAMILY_DOMAIN}`;

/** The whole directive, for a Content-Security-Policy header. */
export const FRAME_ANCESTORS = `frame-ancestors ${FRAME_ANCESTOR_SOURCES}`;

/** For next.config.ts `headers()`: the one header every page sends. */
export function familyFrameHeaders(): { key: string; value: string }[] {
  return [{ key: 'Content-Security-Policy', value: FRAME_ANCESTORS }];
}

/** Apps that are never framed by a Snow AI app, whoever holds them, and
 *  open in a new tab instead. Get Covered: a separate entity and HIPAA
 *  boundary. Portal: its own login (GetCovered's insured pool, never the
 *  family session) over GetCovered's PHI API, and `frame-ancestors 'none'`
 *  on every page that can read a session, by its own rule (portal AGENTS.md);
 *  framing it is the operator's decision to make, not this kit's. */
export const NEVER_FRAMED: readonly string[] = ['getcovered', 'portal'];

/** The front door itself opens in a new tab: it is not a product. */
export const HUB_ID = 'snowai';

const FAMILY_ORIGIN = /^https:\/\/(?:[a-z0-9-]+\.)*snowai\.app$/;

/** Whether an origin (`https://tax.snowai.app`) belongs to the family. */
export function isFamilyOrigin(origin: string | null | undefined): boolean {
  return typeof origin === 'string' && FAMILY_ORIGIN.test(origin);
}

/** An address with `embed=1` added, keeping its query and its hash. Relative
 *  addresses stay relative. */
export function embedHref(href: string): string {
  const [beforeHash, hash = ''] = href.split('#');
  const [path, qs = ''] = beforeHash.split('?');
  const q = new URLSearchParams(qs);
  q.set(EMBED_PARAM, '1');
  return `${path}?${q.toString()}${hash ? `#${hash}` : ''}`;
}

/** The product the host's address says is open, or null. */
export function openFromSearch(search: string): string | null {
  const v = new URLSearchParams(search).get(OPEN_PARAM);
  return v && /^[a-z0-9-]{1,40}$/.test(v) ? v : null;
}

/** The host's address with `open` set to `id`, or removed when id is null.
 *  Takes and returns a path with its query and hash (`/dashboard?x=1#a`). */
export function withOpen(pathAndQuery: string, id: string | null): string {
  const [beforeHash, hash = ''] = pathAndQuery.split('#');
  const [path, qs = ''] = beforeHash.split('?');
  const q = new URLSearchParams(qs);
  if (id) q.set(OPEN_PARAM, id);
  else q.delete(OPEN_PARAM);
  const s = q.toString();
  return `${path}${s ? `?${s}` : ''}${hash ? `#${hash}` : ''}`;
}

/** The frame's name for a host at `origin`. */
export function frameName(origin: string): string {
  return isFamilyOrigin(origin) ? `${EMBED_NAME}:${origin}` : EMBED_NAME;
}

/** What the account holds, as the workspace knows it: the ids `mayUse` says
 *  yes to, or 'unknown' while loading or when the answer cannot be read. */
export type Holding = ReadonlySet<string> | 'unknown';

/** What one click in the bar does. */
export type WorkspaceTarget =
  | { kind: 'current' } /* back to the host page, as it was */
  | { kind: 'frame'; src: string } /* beneath the bar, in this tab */
  | { kind: 'tab'; href: string } /* a new tab */
  | { kind: 'none' }; /* no address yet: drawn without a link */

/**
 * The one rule, pure so it is tested: where a click on `app` goes.
 *
 * - The host's own product: back to the host page.
 * - No address: nothing.
 * - Get Covered and the front door: their own address, in a new tab.
 * - Held: framed beneath the bar, with embed=1.
 * - Unknown (the answer could not be read): its own address in a new tab.
 * - Not held: its try page on snowai.app in a new tab (`tryBase` is
 *   `${FAMILY_LINKS.snowai}/try`), or its address when no try page is known.
 */
export function workspaceTarget(
  app: { id: string; href: string },
  ctx: { current?: string; holding: Holding; tryBase?: string },
): WorkspaceTarget {
  if (app.id === ctx.current) return { kind: 'current' };
  if (!app.href) return { kind: 'none' };
  if (NEVER_FRAMED.includes(app.id) || app.id === HUB_ID) return { kind: 'tab', href: app.href };
  if (ctx.holding === 'unknown') return { kind: 'tab', href: app.href };
  if (ctx.holding.has(app.id)) return { kind: 'frame', src: embedHref(app.href) };
  return { kind: 'tab', href: ctx.tryBase ? `${ctx.tryBase.replace(/\/+$/, '')}/${encodeURIComponent(app.id)}` : app.href };
}

/** A message from a guest to its host. `top`: load this address in the whole
 *  window (a sign-in page). `ready`: a page loaded in embed mode. */
export type EmbedMessage = { source: typeof EMBED_MESSAGE; type: 'ready' | 'top'; url: string };

/** Whether `data` is a well-formed guest message whose address is the
 *  family's. Anything else is ignored. */
export function readEmbedMessage(data: unknown): EmbedMessage | null {
  if (!data || typeof data !== 'object') return null;
  const m = data as Partial<EmbedMessage>;
  if (m.source !== EMBED_MESSAGE || (m.type !== 'ready' && m.type !== 'top') || typeof m.url !== 'string') return null;
  try {
    const u = new URL(m.url);
    if (!isFamilyOrigin(u.origin)) return null;
    return { source: EMBED_MESSAGE, type: m.type, url: u.toString() };
  } catch {
    return null;
  }
}

/** The sign-in pages, which must never show inside a frame: the shared
 *  login at snowai.app and each app's own. */
export const SIGN_IN_PATH = /^\/(?:[a-z]{2}\/)?(?:login|log-in|signin|sign-in|signup|sign-up|register|auth\/(?:login|signin|sign-in))(?:\/|$)/i;

/**
 * The guest's half, inlined at the top of the root layout so it runs before
 * the first paint (components/EmbedScript.tsx). In a frame only:
 *
 *   `?embed=1`  names the frame `snowai-embed:<host origin>` (the host's
 *               origin from the frame's name when the host set it, else from
 *               the browser's ancestor list or the referrer, kept only when
 *               it is the family's); `?embed=0` clears it.
 *   named so    marks `<html data-embed="1">`, tells the host the page is
 *               ready, and opens links that leave the family in a new tab.
 *   sign-in     hides the page and asks the host to load it in the whole
 *               window; with no host to ask, tries itself. Checked on load
 *               and on every in-app navigation (history is watched), since
 *               an app can send an expired session to its login without a
 *               page load.
 *
 * A page that is not framed is never touched, whatever its address says.
 */
export const EMBED_SCRIPT = `(function(){try{
var w=window,d=document,h=d.documentElement;if(w.top===w.self)return;
var F=/^https:\\/\\/(?:[a-z0-9-]+\\.)*snowai\\.app$/,N=${JSON.stringify(EMBED_NAME)};
var q=new URLSearchParams(location.search).get(${JSON.stringify(EMBED_PARAM)});
if(q==='0'){if(w.name.indexOf(N)===0)w.name='';return;}
var m=w.name===N||w.name.indexOf(N+':')===0;
if(q==='1'&&!m){var o='';try{o=(location.ancestorOrigins&&location.ancestorOrigins[0])||(d.referrer?new URL(d.referrer).origin:'');}catch(e){}w.name=F.test(o)?N+':'+o:N;m=true;}
if(!m)return;
var p=w.name.slice(N.length+1);if(!F.test(p))p='';
h.setAttribute('data-embed','1');
var post=function(t){if(p)try{w.parent.postMessage({source:${JSON.stringify(EMBED_MESSAGE)},type:t,url:location.href},p);}catch(e){}};
var S=${SIGN_IN_PATH.toString()};
var out=function(){if(!S.test(location.pathname))return false;h.style.visibility='hidden';setTimeout(function(){h.style.visibility='';},4000);if(p)post('top');else try{w.top.location.href=location.href;}catch(e){h.style.visibility='';}return true;};
['pushState','replaceState'].forEach(function(k){var f=history[k];history[k]=function(){var r=f.apply(this,arguments);out();return r;};});
w.addEventListener('popstate',out);
if(out())return;
post('ready');
d.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download'))return;var u;try{u=new URL(a.href,location.href);}catch(x){return;}if(u.protocol!=='https:'&&u.protocol!=='http:')return;if(u.origin===location.origin||F.test(u.origin))return;a.target='_blank';a.rel='noopener';},true);
}catch(e){}})();`;
