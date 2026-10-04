'use client';

import { openCookieChoices } from '../consent';

/**
 * THE FOOTER'S "COOKIE CHOICES" BUTTON (T-2143): reopens the family cookie
 * bar (CookieBar.tsx) so the choice can be changed at any time. A small
 * outlined pill with a cookie, as at the foot of getcovered.cloud. Put it in
 * the footer beside the legal links; a translated app passes `label`.
 */
export default function CookieChoices({ label = 'Cookie choices', className }: { label?: string; className?: string }) {
  return (
    <button type="button" className={`fam-cookiebtn${className ? ` ${className}` : ''}`} onClick={openCookieChoices}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z" />
        <circle cx="8.5" cy="11" r=".6" />
        <circle cx="12" cy="15.5" r=".6" />
        <circle cx="15.5" cy="13" r=".6" />
      </svg>
      {label}
    </button>
  );
}
