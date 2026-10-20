'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Grip, Pin, PinOff, X } from 'lucide-react';
import { GROUPS, STATUS_LABEL, type LauncherApp } from '../apps';
import { STROKE } from '../glyphs';
import AppTile from './AppTile';
import { useFamilyWorkspace, type WorkspaceLinkProps } from './FamilyWorkspace';

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
 * operator surfaces never reach a customer's browser, not even hidden. An
 * app with an empty `href` (its address does not answer yet) is drawn with
 * its tile and status but as plain text, not a link, and the arrow keys
 * pass over it.
 *
 * THE INTEGRATED WORKSPACE (T-2223): given `snowai` (the front door's address
 * from the app's lib/links.ts), a click on a product the account holds keeps
 * this header and opens the product beneath it, in the same tab; a product
 * not held opens its try page in a new tab; Get Covered always opens in a new
 * tab; the app's own product goes back to its page as it was
 * (FamilyWorkspace.tsx, embed.ts). "Your apps" then lists what the account
 * holds as well as `owned`. Left out, every row is a plain link, as before.
 *
 * PINS (T-3395, T-3403): each app in "Your apps" takes a pin; the pinned
 * apps are what the family bar shows (family/launcher.ts). "Your apps"
 * reads by section (the kit's GROUPS) whenever it spans more than one, the
 * standard for every app (T-3408).
 */
export default function AppLauncher({
  apps,
  owned,
  current,
  shelfHref,
  moreTitle = 'More from Snow AI',
  label = 'Snow AI apps',
  snowai,
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
  /** The front door's address (`FAMILY_LINKS.snowai`): turns on the
   *  integrated workspace. */
  snowai?: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const ws = useFamilyWorkspace({ snowai, current, register: apps.map((a) => ({ id: a.id, href: a.href })), anchor: root });
  const ownedSet = new Set([...owned, ...(ws.holding === 'unknown' ? [] : [...ws.holding])]);
  const link = (a: LauncherApp) => ws.linkProps(a, () => close(false));
  const menu = (a: LauncherApp) => (e: React.MouseEvent) => { if (!ws.enabled) return; e.preventDefault(); const r = panel.current?.getBoundingClientRect(); setMenuFor({ app: a, x: e.clientX - (r?.left ?? 0) + (panel.current?.scrollLeft ?? 0), y: e.clientY - (r?.top ?? 0) + (panel.current?.scrollTop ?? 0) }); };
  const yours = apps.filter((a) => ownedSet.has(a.id));
  const more = apps.filter((a) => !ownedSet.has(a.id));
  /* "Your apps" reads by section whenever it spans more than one, so a person sees what area each app is for (T-3408); each app takes a pin (T-3403). */
  const sections = GROUPS.map((g) => ({ ...g, apps: yours.filter((a) => a.group === g.id) })).filter((g) => g.apps.length);
  const yoursGrouped = sections.length > 1 ? sections : null;
  const pins = ws.prefs.pins;
  /* A right-click on any app here (T-3413): add it to the top row, or take it off; an app not held offers its try page. */
  const [menuFor, setMenuFor] = useState<{ app: LauncherApp; x: number; y: number } | null>(null);
  const tryBase = snowai ? `${snowai.replace(/\/+$/, '')}/try` : null;
  const groups = GROUPS.map((g) => ({ ...g, apps: more.filter((a) => a.group === g.id) })).filter((g) => g.apps.length);

  const Yours = ({ a }: { a: LauncherApp }) => {
    const pinned = pins.includes(a.id);
    return (
      <li className={pinned ? 'is-pinned' : undefined}>
        <Entry app={a} current={current} link={link(a)} onMenu={menu(a)}>
          <AppTile app={a.tile ?? a.id} glyph={a.glyph} size={40} />
          <span>{a.short}</span>
        </Entry>
        {ws.enabled ? (
          <button type="button" className="fam-launcher__pin" aria-pressed={pinned} aria-label={pinned ? `Unpin ${a.short} from the bar` : `Pin ${a.short} to the bar`} title={pinned ? 'On the bar · unpin' : 'Pin to the bar'} onClick={(e) => { e.stopPropagation(); ws.pin(a.id); }}>
            {pinned ? <PinOff size={14} strokeWidth={STROKE} aria-hidden /> : <Pin size={14} strokeWidth={STROKE} aria-hidden />}
          </button>
        ) : null}
      </li>
    );
  };

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
          <div ref={panel} id={panelId} className="fam-launcher__panel" role="dialog" aria-label={label} onKeyDown={onPanelKey} style={{ position: 'absolute' }}>
            {yours.length ? (
              <>
                <div className="fam-launcher__head">
                  <p className="fam-launcher__title">Your apps</p>
                  <button type="button" className="fam-launcher__close" aria-label="Close" onClick={() => close(true)}>
                    <X size={20} strokeWidth={STROKE} aria-hidden />
                  </button>
                </div>
                {yoursGrouped ? (
                  <>
                    <p className="fam-launcher__pinhint">Pin the apps you use; the bar shows your pins, up to nine.</p>
                    {yoursGrouped.map((g) => (
                      <section key={g.id} aria-label={g.label}>
                        <p className="fam-launcher__group">{g.label}</p>
                        <ul className="fam-launcher__yours">{g.apps.map((a) => <Yours key={a.id} a={a} />)}</ul>
                      </section>
                    ))}
                  </>
                ) : (
                  <ul className="fam-launcher__yours">{yours.map((a) => <Yours key={a.id} a={a} />)}</ul>
                )}
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
                      <Entry app={a} current={current} link={link(a)} onMenu={menu(a)}>
                        <AppTile app={a.tile ?? a.id} glyph={a.glyph} size={32} />
                        <span style={{ minWidth: 0 }}>
                          <span className="fam-launcher__name">{a.short}</span>
                          <span className="fam-launcher__line">{a.line}</span>
                        </span>
                        <span className={`fam-status fam-status--${a.status}`}>{STATUS_LABEL[a.status]}</span>
                      </Entry>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {menuFor ? (
              <>
                <div className="fam-launcher__menuscrim" onClick={() => setMenuFor(null)} onContextMenu={(e) => { e.preventDefault(); setMenuFor(null); }} aria-hidden />
                <div className="fam-tilemenu" role="menu" style={{ left: Math.max(8, Math.min(menuFor.x - 90, 260)), top: menuFor.y + 6 }}>
                  <div className="fam-tilemenu__who"><b>{menuFor.app.short}</b></div>
                  {ownedSet.has(menuFor.app.id) ? (
                    pins.includes(menuFor.app.id) ? (
                      <button type="button" role="menuitem" onClick={() => { ws.pin(menuFor.app.id); setMenuFor(null); }}>Remove from the top row</button>
                    ) : (
                      <button type="button" role="menuitem" onClick={() => { ws.pin(menuFor.app.id); setMenuFor(null); }}>Add to the top row</button>
                    )
                  ) : (
                    <>
                      <span className="fam-tilemenu__line">Not in your plan yet.</span>
                      {tryBase ? <a role="menuitem" href={`${tryBase}/${menuFor.app.id}`}>Try {menuFor.app.short}</a> : null}
                      {snowai ? <a role="menuitem" href={`${snowai.replace(/\/+$/, '')}/account`}>Subscribe</a> : null}
                    </>
                  )}
                </div>
              </>
            ) : null}

            {shelfHref ? (
              <a className="fam-launcher__all" href={shelfHref}>
                All Snow AI apps <ArrowRight size={16} strokeWidth={STROKE} aria-hidden />
              </a>
            ) : null}
          </div>
        </>
      ) : null}
      {ws.stage}
    </div>
  );
}

/** One app in the panel: a link to its address (through the workspace when
 *  it is on), or, when it has none that answers yet, the same row as plain
 *  text. */
function Entry({ app, current, link, children, onMenu }: { app: LauncherApp; current?: string; link: WorkspaceLinkProps | null; children: React.ReactNode; onMenu?: (e: React.MouseEvent) => void }) {
  if (!app.href) {
    return <span className="fam-launcher__nolink" onContextMenu={onMenu}>{children}</span>;
  }
  return (
    <a
      href={app.href}
      aria-current={app.id === current ? 'page' : undefined}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, app.id); e.dataTransfer.effectAllowed = 'copy'; }}
      onContextMenu={onMenu}
      {...link}
    >
      {children}
    </a>
  );
}

/** The drag's own type (T-3407): the bar accepts only this, so a dragged file or text never lands as an app. */
export const DRAG_TYPE = 'application/x-snowai-app';
