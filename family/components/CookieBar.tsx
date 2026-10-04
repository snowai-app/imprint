'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  CONSENT_EVENT,
  COOKIE_CHOICES_EVENT,
  FAMILY_PRIVACY_URL,
  readConsent,
  setConsent,
  type ConsentChoice,
} from '../consent';

/**
 * THE COOKIE BAR (T-2143): one design and one choice for the whole family,
 * after the bar on getcovered.cloud's approved front page (T-2133). Full
 * width along the bottom of the screen until the visitor chooses: the
 * sentence and the privacy link on the left, Accept and Deny non-essential as
 * two pills on the right, wrapping under the sentence on a phone. Only the
 * colours change from app to app: Accept is the app's strong shade.
 *
 * Mounted once by the root layout, which reads the consent cookie on the
 * server and passes it as `initial`, so a visitor who has chosen gets no bar
 * and no flash. The choice is the family's (family/consent.ts): made on any
 * snowai.app address, it holds on all of them.
 *
 * Never inside a frame: HQ's visitor view, Studio's app box and a form
 * embedded on someone else's site each sit under a page that has its own.
 * The layout passes `framed` from the request's Sec-Fetch-Dest so a framed
 * page does not draw it even for a frame; the browser checks again.
 *
 * The footer's Cookie choices button (CookieChoices.tsx) reopens it.
 *
 * Labels are props with the English defaults, so a translated app passes its
 * own; the link is the family privacy page unless the app passes its own.
 */

export type CookieBarLabels = {
  /** The bar's name for a screen reader. */
  region: string;
  text: string;
  link: string;
  accept: string;
  deny: string;
};

export const COOKIE_BAR_EN: CookieBarLabels = {
  region: 'Cookie choices',
  text:
    'This website uses cookies and similar storage to keep you signed in, remember your language and settings, and make the site work. We don’t use them for advertising today. You can turn off anything non-essential here, or at any time from the cookie button at the foot of the page.',
  link: 'Privacy and cookies',
  accept: 'Accept',
  deny: 'Deny non-essential',
};

const still = () => () => {};
function inFrame() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

export default function CookieBar({
  initial,
  framed = false,
  privacyHref = FAMILY_PRIVACY_URL,
  labels,
}: {
  /** The choice read from the cookie on the server; null when none. */
  initial: ConsentChoice | null;
  /** The request was for a frame (framedRequest(Sec-Fetch-Dest)). */
  framed?: boolean;
  /** The privacy page; the family's unless the app passes its own. */
  privacyHref?: string;
  labels?: Partial<CookieBarLabels>;
}) {
  const l = { ...COOKIE_BAR_EN, ...labels };
  /* The server's reading during hydration, the browser's own after it. */
  const choice = useSyncExternalStore(subscribe, readConsent, () => initial);
  const framedNow = useSyncExternalStore(still, inFrame, () => framed);
  /* Raised each time Cookie choices is pressed; 0 once a choice is made. */
  const [asked, setAsked] = useState(0);
  const returnTo = useRef<HTMLElement | null>(null);
  const accept = useRef<HTMLButtonElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const open = !framedNow && (asked > 0 || choice === null);

  useEffect(() => {
    const reopen = () => {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setAsked((n) => n + 1);
    };
    window.addEventListener(COOKIE_CHOICES_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_CHOICES_EVENT, reopen);
  }, []);

  /* Reopened from the footer: the keyboard lands on the choice. */
  useEffect(() => {
    if (asked > 0) accept.current?.focus();
  }, [asked]);

  /* While the bar is up it covers the foot of the page, the privacy links
     among it. A spacer of its own height at the end of the page lets
     everything scroll clear of it. */
  useEffect(() => {
    const el = bar.current;
    if (!open || !el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  if (!open) return null;

  const choose = (c: ConsentChoice) => {
    setConsent(c);
    setAsked(0);
    const back = returnTo.current;
    returnTo.current = null;
    if (back && back.isConnected) back.focus();
  };

  return (
    <>
      <div aria-hidden className="fam-cookiebar-spacer" style={{ height }} />
      <div ref={bar} className="fam-cookiebar" role="region" aria-label={l.region} data-fam-cookiebar="">
        <div className="fam-cookiebar__wrap">
          <p className="fam-cookiebar__text">
            {l.text} <a href={privacyHref}>{l.link}</a>
          </p>
          <div className="fam-cookiebar__actions">
            <button ref={accept} type="button" className="fam-cookiebar__accept" onClick={() => choose('all')}>
              {l.accept}
            </button>
            <button type="button" className="fam-cookiebar__deny" onClick={() => choose('essential')}>
              {l.deny}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
