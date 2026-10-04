'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Grip, X } from 'lucide-react';
import { GROUPS, STATUS_LABEL, type LauncherApp } from '../apps';
import { STROKE } from '../glyphs';
import AppTile from './AppTile';

/**
 * THE APP LAUNCHER (family standard 3.7): the nine-dot button at the far left
 * of every app's header, before the lockup. It opens a panel: "Your apps"
 * (what the signed-in account can open, three across), then "More from Snow
 * AI" grouped by job with each app's status, then a link to the full shelf
 * when the app passes one (`shelfHref`; left out, the link is not drawn).
 * On a phone the panel is a sheet from the bottom.
 *
 * Keyboard: Enter, Space or ArrowDown opens it and moves focus into it; the
 * arrow keys, Home and End move between apps; Escape closes it and returns
 * focus to the button; tabbing out or clicking outside closes it.
 *
 * `apps` arrives already filtered ON THE SERVER (launcherApps in apps.ts):
 * operator surfaces never reach a customer's browser, not even hidden.
 */
export default function AppLauncher({
  apps,
  owned,
  current,
  shelfHref,
  moreTitle = 'More from Snow AI',
  label = 'Snow AI apps',
}: {
  apps: LauncherApp[];
  /** Ids of the apps this account can open now. Empty when signed out. */
  owned: string[];
  /** The app this page belongs to. */
  current?: string;
  /** The full shelf, at snowai.app. Left out, there is no "All Snow AI
   *  apps" link at all (T-2132): not hidden, not in the page. */
  shelfHref?: string;
  moreTitle?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const ownedSet = new Set(owned);
  const yours = apps.filter((a) => ownedSet.has(a.id));
  const more = apps.filter((a) => !ownedSet.has(a.id));
  const groups = GROUPS.map((g) => ({ ...g, apps: more.filter((a) => a.group === g.id) })).filter((g) => g.apps.length);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  const links = () => Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []);

  /* Opening moves focus to the first app, so the arrow keys work at once. */
  useEffect(() => {
    if (!open) return;
    links()[0]?.focus();
    const outside = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
    };
  }, [open, close]);

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    const all = links();
    if (!all.length) return;
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = at < 0 ? 0 : (at + 1) % all.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = at <= 0 ? all.length - 1 : at - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = all.length - 1;
    if (next >= 0) {
      e.preventDefault();
      all[next].focus();
    }
  };

  return (
    <div
      className="fam-launcher"
      ref={root}
      onBlur={(e) => {
        if (open && root.current && e.relatedTarget && !root.current.contains(e.relatedTarget as Node)) close(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="fam-launcher__button"
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            close(true);
          }
        }}
      >
        <Grip size={20} strokeWidth={STROKE} aria-hidden />
      </button>

      {open ? (
        <>
          <div className="fam-launcher__scrim" aria-hidden onClick={() => close(true)} />
          <div ref={panel} id={panelId} className="fam-launcher__panel" role="dialog" aria-label={label} onKeyDown={onPanelKey}>
            {yours.length ? (
              <>
                <div className="fam-launcher__head">
                  <p className="fam-launcher__title">Your apps</p>
                  <button type="button" className="fam-launcher__close" aria-label="Close" onClick={() => close(true)}>
                    <X size={20} strokeWidth={STROKE} aria-hidden />
                  </button>
                </div>
                <ul className="fam-launcher__yours">
                  {yours.map((a) => (
                    <li key={a.id}>
                      <a href={a.href} aria-current={a.id === current ? 'page' : undefined}>
                        <AppTile app={a.tile ?? a.id} glyph={a.glyph} size={40} />
                        <span>{a.short}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <div className="fam-launcher__head">
              <p className="fam-launcher__title">{moreTitle}</p>
              {yours.length ? null : (
                <button type="button" className="fam-launcher__close" aria-label="Close" onClick={() => close(true)}>
                  <X size={20} strokeWidth={STROKE} aria-hidden />
                </button>
              )}
            </div>
            {groups.map((g) => (
              <section key={g.id} aria-label={g.label}>
                <p className="fam-launcher__group">{g.label}</p>
                <ul className="fam-launcher__list">
                  {g.apps.map((a) => (
                    <li key={a.id}>
                      <a href={a.href} aria-current={a.id === current ? 'page' : undefined}>
                        <AppTile app={a.tile ?? a.id} glyph={a.glyph} size={32} />
                        <span style={{ minWidth: 0 }}>
                          <span className="fam-launcher__name">{a.short}</span>
                          <span className="fam-launcher__line">{a.line}</span>
                        </span>
                        <span className={`fam-status fam-status--${a.status}`}>{STATUS_LABEL[a.status]}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {shelfHref ? (
              <a className="fam-launcher__all" href={shelfHref}>
                All Snow AI apps <ArrowRight size={16} strokeWidth={STROKE} aria-hidden />
              </a>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
