'use client';
import { useEffect, useRef, useState } from 'react';
import AppTile from './AppTile';
import AskSnowButton from './AskSnowButton';
import { useFamilyWorkspace } from './FamilyWorkspace';
import { barApps, togglePin } from '../launcher';
import { DRAG_TYPE } from './AppLauncher';
import type { LauncherApp } from '../apps';

/**
 * THE FAMILY BAR (family standard, T-2858, T-2861, T-2862; in the kit from
 * T-3403, with the CRM's and Engage's copies retired). Never empty:
 *
 *   - the account's company on the left;
 *   - in the middle, the apps the account holds (the kit's workspace store,
 *     which asks snowai.app/api/entitlements once), the current app
 *     underlined; a held app opens beneath this bar, in this tab (T-2223).
 *     Which of them show is family/launcher.ts: the person's pins first
 *     (set in the nine dots), else the last five opened, else the first
 *     nine. Nothing on the row says how many more there are and nothing on
 *     it adds an app: adding is done in the nine dots alone (T-3417);
 *   - while there are fewer than four, up to two dashed "Try" suggestions,
 *     which "Hide suggestions" removes for this browser;
 *   - Ask, the language and the account on the right.
 *
 * DRAG AND DROP (T-3407): any app in the nine dots can be dragged onto the
 * bar. A held app lands as a pin where it was dropped (a tile already on the
 * bar is moved); an app the account does not hold opens a small prompt:
 * try it, or subscribe, on the front door. Pins drag along the bar to
 * reorder; dragging a tile off the bar unpins it, and so does a right-click
 * on the tile (Remove from the bar).
 *
 * The nine dots at the far left are the kit's launcher, drawn by the server
 * beside this. Styles: `.fb-*` in components.css; an app may colour them.
 */
export default function FamilyBar({
  apps,
  current,
  snowai,
  company,
  email,
  ask,
  suggest = [],
  languageNote = 'Spanish is being added',
}: {
  apps: LauncherApp[];
  current: string;
  snowai: string;
  company: string;
  email: string | null;
  ask: string;
  /** Ids to offer as "Try" while the account holds fewer than four apps. */
  suggest?: string[];
  languageNote?: string;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const ws = useFamilyWorkspace({ snowai, current, register: apps.filter((a) => a.href).map((a) => ({ id: a.id, href: a.href, name: a.short })), anchor });
  const [hide, setHide] = useState(false);
  const [menu, setMenu] = useState(false);
  const [over, setOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<LauncherApp | null>(null);
  /* A right-click on a tile (T-3412): remove it from the bar, or pin it. */
  const [menuFor, setMenuFor] = useState<{ app: LauncherApp; x: number } | null>(null);
  const HIDE_KEY = `${current}-hide-suggestions`;
  useEffect(() => {
    try { setHide(localStorage.getItem(HIDE_KEY) === '1'); } catch { /* storage refused: suggestions stay */ }
  }, [HIDE_KEY]);

  const holding = ws.holding;
  const held = apps.filter((a) => a.href && (a.id === current || (holding !== 'unknown' && holding.has(a.id))));
  const shownIds = barApps(held.map((a) => a.id), ws.prefs, current);
  const shown = shownIds.map((id) => held.find((a) => a.id === id)).filter((a): a is LauncherApp => !!a);
  const short = held.length < 4;
  const suggestions = short && !hide && holding !== 'unknown'
    ? suggest.map((id) => apps.find((a) => a.id === id)).filter((a): a is LauncherApp => !!a && !held.includes(a)).slice(0, 2)
    : [];
  const initials = company.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'S';
  const openLauncher = () => (document.querySelector('.fam-launcher__button') as HTMLButtonElement | null)?.click();
  const tryBase = `${snowai.replace(/\/+$/, '')}/try`;

  /* What lands on the bar: a pin for a held app, a prompt for one not held. */
  const dropAt = (id: string, index: number | null) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const heldIt = held.some((a) => a.id === id);
    if (!heldIt) { setPrompt(app); return; }
    const base = (ws.prefs.pins.length ? ws.prefs.pins : shownIds).filter((p) => p !== id);
    const at = index === null ? base.length : Math.min(index, base.length);
    ws.setPins([...base.slice(0, at), id, ...base.slice(at)]);
  };
  const dragId = (e: React.DragEvent) => e.dataTransfer.getData(DRAG_TYPE) || dragging;
  const accepts = (e: React.DragEvent) => e.dataTransfer.types.includes(DRAG_TYPE) || !!dragging;

  return (
    <div className="fb" ref={anchor} data-fam-bar>
      <span className="fb-org" title={company}><b aria-hidden>{initials}</b><span>{company}</span></span>
      <nav
        className={`fb-apps${over !== null ? ' is-over' : ''}`}
        aria-label="Your Snow AI apps"
        onDragOver={(e) => { if (!accepts(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (over === null) setOver(shown.length); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
        onDrop={(e) => { if (!accepts(e)) return; e.preventDefault(); const id = dragId(e); setOver(null); setDragging(null); if (id) dropAt(id, over); }}
      >
        {shown.map((a, i) => {
          const props = ws.linkProps({ id: a.id, href: a.href }, () => ws.noteOpen(a.id)) ?? { href: a.href };
          const on = (ws.open ?? current) === a.id;
          return (
            <a
              key={a.id}
              className={`fb-app${on ? ' is-on' : ''}${dragging === a.id ? ' is-dragging' : ''}${over === i ? ' is-before' : ''}`}
              {...props}
              aria-current={on ? 'page' : undefined}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, a.id); e.dataTransfer.effectAllowed = 'move'; setDragging(a.id); }}
              onDragEnd={(e) => { const off = e.dataTransfer.dropEffect === 'none'; setDragging(null); setOver(null); if (off && ws.prefs.pins.includes(a.id)) ws.setPins(togglePin(ws.prefs.pins, a.id)); }}
              onDragOver={(e) => { if (!accepts(e)) return; e.preventDefault(); e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setOver(e.clientX < r.left + r.width / 2 ? i : i + 1); }}
              onContextMenu={(e) => { e.preventDefault(); const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect(); setMenuFor({ app: a, x: e.clientX - r.left }); }}
            >
              <AppTile app={a.tile ?? a.id} size={24} />
              <span>{a.short}</span>
            </a>
          );
        })}
        {suggestions.length > 0 && (
          <>
            <span className="fb-sep" aria-hidden />
            {suggestions.map((a) => (
              /* Not held: its try page opens in the window on this page (T-3248), not a new tab. */
              <a key={a.id} className="fb-app fb-try" {...(ws.linkProps({ id: a.id, href: a.href }) ?? { href: `${snowai.replace(/\/+$/, '')}/try/${a.id}` })} title={`Try ${a.short}: ${a.line}`}>
                <span className="fb-try__tile"><AppTile app={a.tile ?? a.id} size={24} /></span>
                <span>{a.short}</span>
                <em>Try</em>
              </a>
            ))}
            <button type="button" className="fb-hide" onClick={() => { setHide(true); try { localStorage.setItem(HIDE_KEY, '1'); } catch { /* kept for this page only */ } }}>Hide suggestions</button>
          </>
        )}
      </nav>
      <div className="fb-right">
        <AskSnowButton site={current} endpoint={ask} top="109px" className="fb-ask" />
        <span className="fb-lang"><b>EN</b><span aria-hidden> | </span><span title={languageNote}>ES</span></span>
        <div className="fb-acct">
          <button type="button" className="fb-av" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} title={email ?? 'Account'}>
            {(email ?? '?').slice(0, 1).toUpperCase()}
          </button>
          {menu && (
            <>
              <div className="fb-scrim" onClick={() => setMenu(false)} aria-hidden />
              <div className="fb-menu" role="menu">
                <div className="fb-menu__who"><b>{company}</b><span>{email}</span></div>
                <a role="menuitem" href={`${snowai}/dashboard`}>Your Snow AI dashboard</a>
                <a role="menuitem" href={`${snowai}/account`}>Account and billing</a>
                <a role="menuitem" href={`${snowai}/auth/signout`}>Sign out</a>
              </div>
            </>
          )}
        </div>
      </div>
      {menuFor && (
        <>
          <div className="fb-scrim" onClick={() => setMenuFor(null)} onContextMenu={(e) => { e.preventDefault(); setMenuFor(null); }} aria-hidden />
          <div className="fb-tilemenu" role="menu" style={{ left: Math.max(8, menuFor.x - 80) }}>
            <div className="fb-menu__who"><b>{menuFor.app.short}</b></div>
            {ws.prefs.pins.includes(menuFor.app.id) || ws.prefs.pins.length === 0 ? (
              <button type="button" role="menuitem" onClick={() => { const base = ws.prefs.pins.length ? ws.prefs.pins : shownIds; ws.setPins(base.filter((p) => p !== menuFor.app.id)); setMenuFor(null); }}>Remove from the top row</button>
            ) : (
              <button type="button" role="menuitem" onClick={() => { ws.setPins([...ws.prefs.pins, menuFor.app.id]); setMenuFor(null); }}>Add to the top row</button>
            )}
            <button type="button" role="menuitem" onClick={() => { openLauncher(); setMenuFor(null); }}>Open the nine dots</button>
          </div>
        </>
      )}
      {prompt && (
        <>
          <div className="fb-scrim" onClick={() => setPrompt(null)} aria-hidden />
          <div className="fb-prompt" role="dialog" aria-label={`${prompt.short} is not in your plan`}>
            <span><b>{prompt.short}</b> is not in your plan yet. {prompt.line}</span>
            <span>Try it free, or subscribe, and it lands on your bar.</span>
            <div className="fb-prompt__row">
              <a className="fb-prompt__pri" href={`${tryBase}/${prompt.id}`}>Try {prompt.short}</a>
              <a className="fb-prompt__sec" href={`${snowai.replace(/\/+$/, '')}/account`}>Subscribe</a>
              <button type="button" className="fb-prompt__sec" onClick={() => setPrompt(null)}>Not now</button>
            </div>
          </div>
        </>
      )}
      {ws.stage}
    </div>
  );
}
