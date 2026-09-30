/* ── Visitor mode: the operator sees Imprint as a signed-out visitor ──────────
   snowai docs/design/implement/visitor-view.md, "The contract every app
   implements" (T-1642–T-1644). HQ's Domains room frames every family app
   with `?visitor=1` so the operator sees what a stranger gets. Copied from
   snowai-app/forms (from snowai-app/portal); change one, change the others.
   One difference: the address a switch redirects to is built from the Host
   the person used, as Tax's proxy does, since behind Amplify
   request.nextUrl reads as localhost:3000.

   While the cookie is present, proxy.ts cuts every cookie out of the
   request, so no page can read a session, and refuses every /api route
   with 403. The studio then sends them to sign in, as a stranger is.

   The one cookie this adds is `sa_visitor`, host-only (no Domain, ever).
   It is a switch, not a credential: it can only take access away. It is not
   `__Host-` because the name is the family's, identical in every app. */

import type { NextRequest, NextResponse } from 'next/server';

export const VISITOR_COOKIE = 'sa_visitor';
export const VISITOR_MAX_AGE = 3600;
/** Set on the request by proxy.ts (and cut from any request that brings its
    own), so the layout knows to mount the visitor script. */
export const VISITOR_HEADER = 'x-imprint-visitor';

/** The one origin, besides Imprint itself, allowed to frame a page. */
export const HQ_ORIGIN = 'https://hq.snowai.app';
export const VISITOR_FRAME_ANCESTORS = `'self' ${HQ_ORIGIN}`;

export const isVisitor = (request: NextRequest) => request.cookies.get(VISITOR_COOKIE)?.value === '1';

/** `?visitor=1` / `?visitor=0` on a page load: the switch. Anything else is not. */
export function visitorSwitch(request: NextRequest): '1' | '0' | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const v = request.nextUrl.searchParams.get('visitor');
  return v === '1' || v === '0' ? v : null;
}

/** The same address without the switch, on the host the person used. */
export function withoutSwitch(request: NextRequest): URL {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || request.nextUrl.protocol.replace(':', '');
  const to = new URL(`${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`);
  to.searchParams.delete('visitor');
  return to;
}

/** Turn the cookie on or off. The options carry no domain, so it belongs to
    this host alone; SameSite=None and Partitioned let it live inside HQ's frame. */
export function setVisitorCookie(response: NextResponse, on: boolean): void {
  response.cookies.set(VISITOR_COOKIE, on ? '1' : '', {
    path: '/',
    maxAge: on ? VISITOR_MAX_AGE : 0,
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    partitioned: true,
  });
}

/** Routes a visitor may never reach: every API and every sign-in handshake. */
export const VISITOR_REFUSED = /^\/(api|auth)(\/|$)/;

/** The family's addresses: a link to one of these carries `?visitor=1`. */
export function isFamilyHost(host: string): boolean {
  return /(^|\.)snowai\.app$/i.test(host) || /(^|\.)getcovered\.cloud$/i.test(host);
}
