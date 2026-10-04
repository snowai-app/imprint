/**
 * THE FAMILY'S ONE COOKIE CHOICE (T-2143). One choice for every app, like
 * the one login: made once on any snowai.app address, it holds on all of
 * them. Read on the server by the root layout (so a visitor who has chosen
 * never sees the bar), and in the browser by anything non-essential before it
 * runs. Copied byte for byte with the rest of family/.
 *
 * WHAT IS ESSENTIAL. Sign-in and the session, security, the theme and
 * language cookies, display preferences the person set themselves (a layout,
 * a closed tip, a page size), and this cookie. None of that asks.
 *
 * WHAT IS NOT. Anything that counts or measures visits, any third-party
 * script, anything that is not one of the above. It asks `hasConsent()`
 * before it runs and listens with `onConsentChange` so a "Deny non-essential"
 * stops it at once. Optional storage is on until the visitor turns it off,
 * as on GetCovered (T-1549): "Deny non-essential" on the bar is that turning
 * off, all at once.
 *
 * Pure functions with no imports, so the server, the browser and a test can
 * all read it.
 */

/** The cookie's name, the same in every app. */
export const CONSENT_COOKIE = 'snowai-consent';
/** The registrable domain the choice is shared across, when the page is on it. */
export const CONSENT_DOMAIN = 'snowai.app';
/** Twelve months, in seconds. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;
/** The format of the value; a new version asks again. */
export const CONSENT_VERSION = 'v1';
/** Fired on window when the choice changes, with the choice as `detail`. */
export const CONSENT_EVENT = 'snowai-consent-change';
/** Fired on window by the footer's Cookie choices button to reopen the bar. */
export const COOKIE_CHOICES_EVENT = 'snowai-cookie-choices';
/** The family privacy page, the bar's link when the app passes none. An app
 *  with a `lib/links.ts` passes its own, read from the environment. */
export const FAMILY_PRIVACY_URL = 'https://snowai.app/privacy';

export type ConsentChoice = 'all' | 'essential';

/** `v1.all` -> 'all', `v1.essential` -> 'essential', anything else -> null
 *  (not chosen, or chosen under an older version: the bar asks again). */
export function parseConsent(value: string | null | undefined): ConsentChoice | null {
  if (!value) return null;
  let v = value;
  try {
    v = decodeURIComponent(value);
  } catch {
    /* not encoded */
  }
  if (v === `${CONSENT_VERSION}.all`) return 'all';
  if (v === `${CONSENT_VERSION}.essential`) return 'essential';
  return null;
}

/** Whether non-essential storage may run for this choice: on unless denied. */
export function allows(choice: ConsentChoice | null): boolean {
  return choice !== 'essential';
}

/** The Set-Cookie string for a choice. `Domain=.snowai.app` only when the
 *  page is on snowai.app or under it; host-only anywhere else (localhost, a
 *  branch URL), where a foreign Domain would be refused. */
export function consentCookie(choice: ConsentChoice, where: { hostname: string; https: boolean }): string {
  const host = where.hostname.toLowerCase();
  const shared = host === CONSENT_DOMAIN || host.endsWith(`.${CONSENT_DOMAIN}`);
  return [
    `${CONSENT_COOKIE}=${CONSENT_VERSION}.${choice}`,
    'Path=/',
    `Max-Age=${CONSENT_MAX_AGE}`,
    'SameSite=Lax',
    ...(shared ? [`Domain=.${CONSENT_DOMAIN}`] : []),
    ...(where.https ? ['Secure'] : []),
  ].join('; ');
}

/** The choice from a Cookie header or `document.cookie`. */
export function consentFromCookieString(cookies: string | null | undefined): ConsentChoice | null {
  if (!cookies) return null;
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  return m ? parseConsent(m[1]) : null;
}

/** Whether a request is for a page inside a frame (`Sec-Fetch-Dest`). A
 *  framed page never asks: inside the family its parent page has the bar,
 *  and on someone else's site (an embedded form) theirs governs. */
export function framedRequest(dest: string | null | undefined): boolean {
  return dest === 'iframe' || dest === 'frame';
}

/* ------------------------------------------------------- in the browser */

/** The visitor's choice, or null when they have not chosen. Browser only. */
export function readConsent(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  try {
    return consentFromCookieString(document.cookie);
  } catch {
    return null;
  }
}

/** Ask before anything non-essential runs. False on the server, where
 *  nothing non-essential runs anyway. */
export function hasConsent(): boolean {
  if (typeof document === 'undefined') return false;
  return allows(readConsent());
}

/** Record the choice for the whole family and tell the page. */
export function setConsent(choice: ConsentChoice): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = consentCookie(choice, { hostname: window.location.hostname, https: window.location.protocol === 'https:' });
  } catch {
    /* cookies refused: the bar simply asks again next visit */
  }
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }));
}

/** Call `listener` whenever the choice changes on this page. Returns the
 *  unsubscribe. */
export function onConsentChange(listener: (choice: ConsentChoice) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handle = (e: Event) => listener((e as CustomEvent<ConsentChoice>).detail);
  window.addEventListener(CONSENT_EVENT, handle);
  return () => window.removeEventListener(CONSENT_EVENT, handle);
}

/** Reopen the cookie bar (the footer's Cookie choices button does this). */
export function openCookieChoices(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COOKIE_CHOICES_EVENT));
}
