/**
 * WHO MAY REVEAL (T-1688, T-1689). Pure, tested in rights.test.mts.
 *
 *  - The suite owner (the Snow AI family's operator, named in the AWS
 *    parameter /snowai/protected/owners): everything, every app.
 *  - An agency's owner or admins: that agency's records.
 *  - The main account holder: their own account's records.
 *  - Everyone else: masked only.
 */
export type Viewer = { email: string; userId: string | null; authTime: number | null };
export type Scope = { holders?: (string | null | undefined)[]; agencyId?: string | null };
export type Right = 'suite-owner' | 'agency-admin' | 'holder' | null;

export const REASONS = ['client-request', 'legal', 'audit', 'correction'] as const;
export type Reason = (typeof REASONS)[number];
export const isReason = (v: unknown): v is Reason => typeof v === 'string' && (REASONS as readonly string[]).includes(v);

export function rightOf(viewer: Viewer | null, scope: Scope, owners: Set<string>, agencyAdmin: boolean): Right {
  if (!viewer?.email) return null;
  const me = viewer.email.trim().toLowerCase();
  if (owners.has(me)) return 'suite-owner';
  if (scope.agencyId && agencyAdmin) return 'agency-admin';
  if ((scope.holders ?? []).some((h) => h && h.trim().toLowerCase() === me)) return 'holder';
  return null;
}

/** A full export or a secure send needs a sign-in in the last 15 minutes:
 *  the token's auth_time, which a silent refresh does not move. */
export const FRESH_MINUTES = 15;
export function isFresh(authTime: number | null, now = Date.now(), minutes = FRESH_MINUTES): boolean {
  return typeof authTime === 'number' && now / 1000 - authTime <= minutes * 60;
}
