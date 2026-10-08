'use client';

import { openCookieChoices } from '../consent';

/**
 * THE FOOTER'S "COOKIE CHOICES" BUTTON (T-2143): reopens the family cookie
 * bar (CookieBar.tsx) so the choice can be changed at any time. A small
 * outlined pill with a cookie, as at the foot of getcovered.cloud. Put it in
 * the footer beside the legal links; a translated app passes `label`.
 *
 * Beside it, the family's one compliance line (T-2535): "HIPAA compliant",
 * the standard wording across every app, so every footer carries it without
 * each app adding it. A translated app passes `hipaa` in its language;
 * `hipaa={false}` leaves it out where the page already says it.
 */
export default function CookieChoices({
  label = 'Cookie choices',
  className,
  hipaa = 'HIPAA compliant',
}: {
  label?: string;
  className?: string;
  hipaa?: string | false;
}) {
  return (
    <>
      {hipaa ? (
        <span className="fam-hipaa">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M8.5 12l2.5 2.5 4.5-5" />
          </svg>
          {hipaa}
        </span>
      ) : null}
      <button type="button" className={`fam-cookiebtn${className ? ` ${className}` : ''}`} onClick={openCookieChoices}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z" />
          <circle cx="8.5" cy="11" r=".6" />
          <circle cx="12" cy="15.5" r=".6" />
          <circle cx="15.5" cy="13" r=".6" />
        </svg>
        {label}
      </button>
    </>
  );
}
