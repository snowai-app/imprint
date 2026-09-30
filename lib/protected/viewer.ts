import 'server-only';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { Viewer } from './rights';

/**
 * Who is looking, for the protected lane: email, the application's user id
 * (custom:supabase_id or the Cognito sub, as snowai's lib/auth/session.ts
 * reads it) and auth_time, the moment they last actually signed in, which
 * a silent refresh does not move. Read from the family's sa-id cookie.
 * Returns nobody for a visitor (sa_visitor=1), as the visitor contract asks.
 */
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? 'us-east-1_mNON9orZt';
const APP_CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID ?? '6chj54olpvk7rt755u9nebgif5';
let verifier: { verify(token: string): Promise<unknown> } | null = null;
const idVerifier = () => (verifier ??= CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: 'id', clientId: APP_CLIENT_ID }) as unknown as { verify(token: string): Promise<unknown> });

function cookie(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function viewerOf(request: Request): Promise<Viewer | null> {
  const header = request.headers.get('cookie');
  if (cookie(header, 'sa_visitor') === '1') return null;
  const token = cookie(header, 'sa-id');
  if (!token) return null;
  try {
    const p = (await idVerifier().verify(token)) as Record<string, unknown>;
    const email = typeof p.email === 'string' ? p.email.toLowerCase() : null;
    if (!email) return null;
    const userId = (typeof p['custom:supabase_id'] === 'string' && p['custom:supabase_id']) || (typeof p.sub === 'string' ? p.sub : null);
    return { email, userId: userId || null, authTime: typeof p.auth_time === 'number' ? p.auth_time : null };
  } catch {
    return null;
  }
}
