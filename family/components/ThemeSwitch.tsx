'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { STROKE } from '../glyphs';

/**
 * THE LIGHT/DARK SWITCH (T-2120), one for the whole family (T-2126).
 *
 * Every app opens light whatever the device is set to; dark is a choice. A
 * click flips `data-theme` on <html> at once, with no reload, and remembers
 * the choice in the app's own cookie for a year, which the root layout reads
 * on the server so the next page opens the same way without a flash. No
 * System option.
 *
 * Each app keeps its cookie as before: `cookie` is its name (`ask-theme`,
 * `memo-theme`, `snowai-theme`…). `shared` puts it on a registrable domain so
 * every app under it shares one choice (snowai.app does this); it is only
 * used when the page is actually on that domain, so a preview deploy keeps a
 * host-only cookie. The choice is also kept in this origin's storage under
 * the same name, for apps that fall back to it.
 *
 * Both icons are in the markup and the stylesheet shows the right one from
 * `data-theme`, so the server-rendered button is already correct.
 */
export default function ThemeSwitch({
  cookie,
  shared,
  className,
}: {
  cookie: string;
  /** A registrable domain, e.g. `snowai.app`, to share the choice across it. */
  shared?: string;
  /** Extra classes, for an app that styles the button in its own header. */
  className?: string;
}) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  function flip() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    const host = window.location.hostname;
    const domain = shared && (host === shared || host.endsWith(`.${shared}`)) ? `; Domain=.${shared}` : '';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
    try {
      window.localStorage.setItem(cookie, next);
    } catch {
      // Storage refused: the cookie still carries the choice.
    }
    setDark(next === 'dark');
  }

  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className={`fam-theme-switch${className ? ` ${className}` : ''}`} onClick={flip} aria-label={label} title={label}>
      <Moon className="fam-theme-switch__moon" size={18} strokeWidth={STROKE} aria-hidden />
      <Sun className="fam-theme-switch__sun" size={18} strokeWidth={STROKE} aria-hidden />
    </button>
  );
}
