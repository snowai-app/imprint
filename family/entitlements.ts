/**
 * WHAT THE SIGNED-IN ACCOUNT MAY USE (T-2173): the family's one answer.
 *
 * snowai.app holds every account's products (trials and subscriptions, one
 * bill per account) and answers GET https://snowai.app/api/entitlements with
 * the session cookie on .snowai.app. An app asks here instead of keeping its
 * own idea of who has paid, so a capability the account already has through
 * another product is never sold twice.
 *
 * Phase 1: apps may read it and show it. Nothing enforces it yet; phase 2
 * makes each app check `mayUse` and apply its trial limits.
 *
 * No imports and no hostname: the endpoint comes from the app's own
 * lib/links.ts (`${FAMILY_LINKS.snowai}/api/entitlements`).
 */

/** A product the account holds, or a capability that comes inside one. */
export type EntitlementState = 'trial' | 'active' | 'ended' | 'cancelled' | 'included';

export type Entitlement = {
  state: EntitlementState;
  /** Whether the account may use it now: a running trial, a subscription, or included. */
  usable: boolean;
  /** When the trial ends (ISO), for a trial; null otherwise. */
  trialEndsAt: string | null;
  /** Whole days after today until the trial's last day (0 on the last day). */
  daysLeft: number | null;
  /** For `included`: the held product it comes with. */
  via?: string;
};

export type Entitlements = {
  signedIn: true;
  /** The account's id (the family login's user id). */
  account: string;
  /** Present for the operator (platform_role 'admin', decided on snowai's
   *  server), who holds every app in the family (T-2223). */
  operator?: true;
  asOf: string;
  /** By app id (family/apps.ts). An app not listed is not held. */
  apps: Record<string, Entitlement>;
  /** The multi-app discount now applying, as a percentage (0 or 15). */
  discountPercent: number;
  /** Prices are not set yet; nothing is charged. */
  pricing: 'being-set' | 'set';
};

export type EntitlementsAnswer = Entitlements | { signedIn: false } | { error: 'unavailable' };

/**
 * Ask snowai.app. In the browser the cookie goes by itself (`credentials:
 * 'include'`); on a server, pass the request's Cookie header as `cookie`.
 * Never throws: a network failure is `{ error: 'unavailable' }`, and an app
 * must then fail open in phase 1 (show nothing about the trial) rather than
 * lock anyone out.
 */
export async function fetchEntitlements(endpoint: string, opts: { cookie?: string; signal?: AbortSignal } = {}): Promise<EntitlementsAnswer> {
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: opts.cookie ? { cookie: opts.cookie, accept: 'application/json' } : { accept: 'application/json' },
      signal: opts.signal,
    });
    if (res.status === 401) return { signedIn: false };
    if (!res.ok) return { error: 'unavailable' };
    return (await res.json()) as EntitlementsAnswer;
  } catch {
    return { error: 'unavailable' };
  }
}

/** Whether the answer lets the account use `app` now. */
export function mayUse(answer: EntitlementsAnswer | null | undefined, app: string): boolean {
  return Boolean(answer && 'apps' in answer && answer.apps[app]?.usable);
}

/** "Trial · 2 days left", "Active", "Included with Invoice"… for a header chip; '' when not held. */
export function entitlementLabel(e: Entitlement | undefined, names: Record<string, string> = {}): string {
  if (!e) return '';
  if (e.state === 'trial') return `Trial · ${e.daysLeft === null || e.daysLeft <= 0 ? 'Last day' : e.daysLeft === 1 ? '1 day left' : `${e.daysLeft} days left`}`;
  if (e.state === 'active') return 'Active';
  if (e.state === 'included') return `Included with ${(e.via && names[e.via]) || e.via || 'your account'}`;
  return e.state === 'ended' ? 'Trial ended' : 'Cancelled';
}
