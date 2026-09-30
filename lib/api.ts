import 'server-only';
import { NextResponse } from 'next/server';
import { viewerOf } from './protected/viewer.ts';
import type { Viewer } from './protected/rights.ts';
import { loginUrl } from './links.ts';

/** Every answer is private and never cached. */
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** A data-changing call from another site is refused: its Origin, when the
 *  browser sends one, must be this host. */
export function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type Who = (request: Request) => Promise<Viewer | null>;
/** The viewer of a call that may publish: the same, and whether they are the suite owner (lib/owner.ts). */
export type WhoIsOwner = (request: Request) => Promise<(Viewer & { isOwner: boolean }) | null>;

/** The viewer of a studio call, or the answer to send instead: 403 from
 *  another site, 401 signed out (a visitor is signed out). Copied in shape
 *  from snowai-app/pitch's lib/api.ts (snowai-app/model's). `who` is the
 *  family's sign-in check; the tests pass a stand-in. */
export async function caller<V extends Viewer = Viewer>(request: Request, page = '/studio', who: (request: Request) => Promise<V | null> = viewerOf as unknown as (request: Request) => Promise<V | null>): Promise<{ viewer: V } | { answer: NextResponse }> {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!sameOrigin(request.headers.get('origin'), host)) return { answer: json({ error: 'Not from this site.' }, 403) };
  const viewer = await who(request);
  if (!viewer) return { answer: json({ error: 'Sign in first.', login: loginUrl(page) }, 401) };
  return { viewer };
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  const b = await request.json().catch(() => null);
  return b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}
