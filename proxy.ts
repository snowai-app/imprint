import { NextResponse, type NextRequest } from 'next/server';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { VISITOR_HEADER, VISITOR_REFUSED, isVisitor, setVisitorCookie, visitorSwitch, withoutSwitch } from './lib/visitor.ts';

/**
 * TWO JOBS (T-1741; copied from snowai-app/pitch, from snowai-app/model, from
 * snowai-app/forms, which is snowai-app/memo's).
 *
 * 1. VISITOR MODE, the family's contract (lib/visitor.ts): `?visitor=1` sets
 *    the switch and comes back without it; while it is on, no cookie reaches
 *    the page and no API answers, so the studio sends them to sign in, as it
 *    does a stranger. The front page (/) is public.
 *
 * 2. THE GATE ON THE STUDIO (/studio): the `sa-id` cookie the front door writes on
 *    `.snowai.app`, verified against the pool's public keys, renewed from
 *    the refresh cookie when it has expired. Copied from snowai-app/ask's
 *    proxy.ts; change one, change the other. Anyone without one is sent to
 *    snowai.app/login and comes back.
 */
const COOKIE = 'sa-id';
const REFRESH = 'sa-refresh';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? 'us-east-1_mNON9orZt';
const APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID ?? '6chj54olpvk7rt755u9nebgif5';
const LOGIN = (process.env.NEXT_PUBLIC_FRONT_URL ?? 'https://snowai.app').replace(/\/+$/, '') + '/login';
const REGION = USER_POOL_ID.split('_')[0] || 'us-east-1';
const ID_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
const GATED = /^\/studio(\/|$)/;

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
const idVerifier = () => (verifier ??= CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: 'id', clientId: APP_CLIENT_ID }));

async function renew(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
      body: JSON.stringify({ AuthFlow: 'REFRESH_TOKEN_AUTH', ClientId: APP_CLIENT_ID, AuthParameters: { REFRESH_TOKEN: refreshToken } }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { AuthenticationResult?: { IdToken?: string } };
    const idToken = out.AuthenticationResult?.IdToken ?? null;
    if (!idToken) return null;
    await idVerifier().verify(idToken);
    return idToken;
  } catch {
    return null;
  }
}

/** The same request with every cookie removed and the visitor mark set. */
function asVisitor(request: NextRequest): NextResponse {
  const h = new Headers(request.headers);
  h.delete('cookie');
  h.set(VISITOR_HEADER, '1');
  return NextResponse.next({ request: { headers: h } });
}

export async function proxy(request: NextRequest) {
  const flip = visitorSwitch(request);
  if (flip) {
    const response = NextResponse.redirect(withoutSwitch(request));
    setVisitorCookie(response, flip === '1');
    return response;
  }
  const path = request.nextUrl.pathname;
  /* A browser may not bring its own visitor mark; only this file sets it. */
  const clean = new Headers(request.headers);
  clean.delete(VISITOR_HEADER);

  if (isVisitor(request)) {
    if (VISITOR_REFUSED.test(path)) return Response.json({ error: 'visitor view: nothing changes here' }, { status: 403 });
    if (GATED.test(path)) return toLogin(request, path, true);
    return asVisitor(request);
  }
  if (!GATED.test(path)) return NextResponse.next({ request: { headers: clean } });
  /* The API checks the session itself (lib/api.ts) and answers 401; only the
     studio's pages are sent to sign in. */

  const token = request.cookies.get(COOKIE)?.value;
  let expired = !token;
  if (token) {
    try {
      await idVerifier().verify(token);
      return NextResponse.next({ request: { headers: clean } });
    } catch (e) {
      expired = e instanceof Error && /expired/i.test(e.message);
    }
  }
  const refresh = request.cookies.get(REFRESH)?.value;
  if (expired && refresh) {
    const fresh = await renew(refresh);
    if (fresh) {
      request.cookies.set(COOKIE, fresh);
      const h = new Headers(request.headers);
      h.delete(VISITOR_HEADER);
      h.set('cookie', request.cookies.toString());
      const response = NextResponse.next({ request: { headers: h } });
      response.cookies.set(COOKIE, fresh, { domain: '.snowai.app', path: '/', sameSite: 'lax', httpOnly: true, secure: true, maxAge: ID_TOKEN_MAX_AGE });
      return response;
    }
  }
  return toLogin(request, path, false);
}

/* To the family's sign-in, coming back here. Built from the Host the person
   used: behind Amplify request.nextUrl reads as localhost:3000 (22 September
   2026). */
function toLogin(request: NextRequest, path: string, visitor: boolean): NextResponse {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'imprint.snowai.app';
  const login = new URL(LOGIN);
  login.searchParams.set('next', `https://${host}${path}${request.nextUrl.search}`);
  /* A visitor stays one at the front door too (as Tax's proxy does). */
  if (visitor) login.searchParams.set('visitor', '1');
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/|fonts/|favicon|icon|apple-touch-icon).*)'],
};
