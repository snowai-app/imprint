'use client';

// @ts-ignore -- not every app in the family carries react-dom's types; createPortal is all that is used here.
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { appById } from '../apps';
import { fetchEntitlements } from '../entitlements';
import { frameName, isFamilyOrigin, openFromSearch, readEmbedMessage, withOpen, workspaceTarget, type Holding } from '../embed';
import { STROKE } from '../glyphs';

/**
 * THE INTEGRATED WORKSPACE, THE HOST'S HALF (T-2223; embed.ts has the whole
 * design). One store per page, shared by every launcher and family bar on it:
 *
 *   - It asks the front door's /api/entitlements once (the family session
 *     goes with it) and keeps the ids the account may use.
 *   - A click on a held product keeps the bar and opens the product beneath
 *     it in a frame (`?embed=1`); the host page stays mounted underneath and
 *     is shown again, exactly as it was, by a click on the host's own
 *     product. The address bar carries `?open=<id>` (history.pushState, which
 *     Next's router follows), so a reload or a back press lands on the same
 *     view. Frames once opened stay mounted, the last four, so switching
 *     between products keeps each one's place too.
 *   - A product not held opens its try page on the front door in a new tab; when
 *     the answer cannot be read, its own address in a new tab. Get Covered
 *     and the front door always open in a new tab (embed.ts NEVER_FRAMED).
 *   - A framed sign-in page asks to be loaded in the whole window, and is.
 *     A frame that loads without saying it is ready (an address that refuses
 *     to be framed) shows a plain sentence and a link that opens it in a new
 *     tab, so nothing is ever a blank box.
 *
 * Mounted by AppLauncher when it is given `snowai` (the front door's address
 * from the app's lib/links.ts), and by `WorkspaceLink` in a product's own
 * family bar. The frame sits under the bar that holds them: the nearest
 * `[data-fam-bar]`, else `header`, `nav` or `aside` around the launcher; to
 * the right of a bar that is taller than it is wide (a rail).
 */

type Entry = { id: string; href: string; name: string };
type Frame = { id: string; src: string; title: string; failed: boolean };
type State = { holding: Holding; open: string | null; frames: Frame[]; owners: string[] };

const KEEP = 4;
const EMPTY: State = { holding: 'unknown', open: null, frames: [], owners: [] };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const apps = new Map<string, Entry>();
const anchors = new Set<HTMLElement>();
let snowaiBase = '';
let hostApp: string | undefined;
let asked = false;
let settled = false;

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const snapshot = () => state;
const serverSnapshot = () => EMPTY;

const tryBase = () => (snowaiBase ? `${snowaiBase.replace(/\/+$/, '')}/try` : undefined);
const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

function frameFor(id: string): Frame | null {
  const app = apps.get(id);
  if (!app) return null;
  const t = workspaceTarget(app, { current: hostApp, holding: state.holding, tryBase: tryBase() });
  return t.kind === 'frame' ? { id, src: t.src, title: app.name, failed: false } : null;
}

/** Show `id` beneath the bar (or the host page, for null), without touching history. */
function show(id: string | null) {
  if (!id || id === hostApp) {
    if (state.open !== null) update({ open: null });
    return true;
  }
  const kept = state.frames.find((f) => f.id === id);
  const frame = kept ?? frameFor(id);
  if (!frame) return false;
  const frames = [...state.frames.filter((f) => f.id !== id), kept ?? frame].slice(-KEEP);
  update({ open: id, frames });
  return true;
}

/** Open a held product, or go back to the host page (null), and say so in the address bar. */
export function openInWorkspace(id: string | null) {
  if (!show(id)) return;
  const target = withOpen(here(), id && id !== hostApp ? id : null);
  if (target !== here()) window.history.pushState(null, '', target);
}

/** The address bar says which product is open: follow it (a reload, a back press, a link). */
function followAddress() {
  const id = openFromSearch(window.location.search);
  if (id === state.open) return;
  if (!id) return void show(null);
  if (!settled) return; /* followed again once the answer is in */
  if (!show(id)) window.history.replaceState(null, '', withOpen(here(), null));
}

function ask() {
  if (asked || !snowaiBase) return;
  asked = true;
  void fetchEntitlements(`${snowaiBase.replace(/\/+$/, '')}/api/entitlements`).then((answer) => {
    let holding: Holding = 'unknown';
    if ('apps' in answer) holding = new Set(Object.entries(answer.apps).filter(([, e]) => e.usable).map(([id]) => id));
    else if ('signedIn' in answer && answer.signedIn === false) holding = new Set();
    settled = true;
    update({ holding });
    followAddress();
  });
}

const modified = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

export type WorkspaceLinkProps = Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'onClick' | 'aria-current'>;

/**
 * The workspace for one launcher or bar. `register` adds the apps it draws
 * (id, address, name); the first caller's `snowai` and `current` are the
 * page's. Returns what an app's link should carry, which product is open,
 * what the account holds, and, for the first caller only, the stage.
 */
export function useFamilyWorkspace({
  snowai,
  current,
  register,
  anchor,
}: {
  snowai?: string;
  current?: string;
  register: { id: string; href: string; name?: string }[];
  anchor: RefObject<HTMLElement | null>;
}) {
  const s = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const token = useId();
  const pathname = usePathname();
  const enabled = Boolean(snowai);

  useEffect(() => {
    if (!snowai) return;
    if (!snowaiBase) snowaiBase = snowai;
    if (hostApp === undefined) hostApp = current;
    for (const r of register) {
      if (!r.href || apps.has(r.id)) continue;
      apps.set(r.id, { id: r.id, href: r.href, name: r.name ?? appById(r.id)?.name ?? r.id });
    }
    ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snowai, current, register.map((r) => `${r.id}=${r.href}`).join(' ')]);

  useEffect(() => {
    if (!enabled) return;
    const el = anchor.current;
    if (el) anchors.add(el);
    update({ owners: [...state.owners, token] });
    return () => {
      if (el) anchors.delete(el);
      update({ owners: state.owners.filter((o) => o !== token) });
    };
  }, [enabled, token, anchor]);

  /* The host navigated (a link in its bar, back, forward): read the address again. */
  const owner = enabled && s.owners[0] === token;
  useEffect(() => {
    if (!owner) return;
    followAddress();
    const onPop = () => window.setTimeout(followAddress, 0);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [owner, pathname]);

  const holding = s.holding;
  const linkProps = (app: { id: string; href: string }, after?: () => void): WorkspaceLinkProps | null => {
    if (!enabled) return app.href ? { href: app.href } : null;
    const t = workspaceTarget(app, { current: current ?? hostApp, holding, tryBase: tryBase() });
    switch (t.kind) {
      case 'none':
        return null;
      case 'current':
        return {
          href: app.href || undefined,
          'aria-current': s.open === null ? 'page' : undefined,
          onClick: (e) => {
            if (modified(e)) return;
            if (state.open !== null) {
              e.preventDefault();
              openInWorkspace(null);
            }
            after?.();
          },
        };
      case 'frame':
        return {
          href: app.href,
          'aria-current': s.open === app.id ? 'page' : undefined,
          onClick: (e) => {
            if (modified(e)) return;
            e.preventDefault();
            openInWorkspace(app.id);
            after?.();
          },
        };
      case 'tab':
        return { href: t.href, target: '_blank', rel: 'noopener', onClick: () => after?.() };
    }
  };

  return { enabled, open: s.open, holding, linkProps, stage: owner ? <Stage state={s} /> : null };
}

/**
 * One link in a product's own family bar (Sign's, T-2223): the bar's
 * markup stays the app's, the click goes through the workspace. `onClassName`
 * is added while this app is the one on screen.
 */
export function WorkspaceLink({
  app,
  href,
  current,
  snowai,
  className,
  onClassName,
  children,
  ...rest
}: {
  app: string;
  href: string;
  current?: string;
  snowai?: string;
  className?: string;
  onClassName?: string;
  children: ReactNode;
  'aria-label'?: string;
  title?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const ws = useFamilyWorkspace({ snowai, current, register: [{ id: app, href }], anchor: ref });
  const props = ws.linkProps({ id: app, href }) ?? { href };
  const on = ws.enabled ? (ws.open ?? current) === app : app === current;
  const cls = [className, on && onClassName ? onClassName : ''].filter(Boolean).join(' ') || undefined;
  return (
    <>
      <a ref={ref} className={cls} {...rest} {...props} aria-current={on ? 'page' : undefined}>
        {children}
      </a>
      {ws.stage}
    </>
  );
}

/* ------------------------------------------------------------- the stage */

type Box = { top: number; left: number };

function barOf(el: HTMLElement): HTMLElement {
  return (el.closest('[data-fam-bar]') ?? el.closest('header') ?? el.closest('nav') ?? el.closest('aside') ?? el.parentElement ?? el) as HTMLElement;
}

function visibleBar(): HTMLElement | null {
  for (const a of anchors) {
    if (!a.isConnected) continue;
    const r = a.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return barOf(a);
  }
  return null;
}

function measure(bar: HTMLElement | null): Box {
  if (!bar) return { top: 0, left: 0 };
  const r = bar.getBoundingClientRect();
  if (r.height > r.width) return { top: 0, left: Math.max(0, Math.round(r.right)) };
  return { top: Math.max(0, Math.round(r.bottom)), left: 0 };
}

function Stage({ state: s }: { state: State }) {
  const [box, setBox] = useState<Box>({ top: 0, left: 0 });
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const readyAt = useRef(new Map<string, number>());
  const loadedAt = useRef(new Map<string, number>());

  /* Guests talk to the host: `top` loads a sign-in page in the whole window,
     `ready` says a page loaded in embed mode. Only the family, only from our
     own frames. */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isFamilyOrigin(e.origin) && e.origin !== window.location.origin) return;
      const m = readEmbedMessage(e.data);
      if (!m) return;
      const id = [...frames.current.entries()].find(([, f]) => f.contentWindow === e.source)?.[0];
      if (!id) return;
      if (m.type === 'top') {
        window.location.assign(m.url);
        return;
      }
      readyAt.current.set(id, Date.now());
      if (state.frames.find((f) => f.id === id)?.failed) update({ frames: state.frames.map((f) => (f.id === id ? { ...f, failed: false } : f)) });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /* While a product is open: the bar stays above it, the host page holds
     still underneath (its scroll is put back on return), and the frame sits
     exactly under the bar. */
  const open = s.open;
  useEffect(() => {
    if (!open) return;
    const bar = visibleBar();
    const html = document.documentElement;
    const y = window.scrollY;
    if (bar && bar.getBoundingClientRect().top < 0) window.scrollTo(0, 0);
    const prev = { overflow: html.style.overflow, z: bar?.style.zIndex ?? '', pos: bar?.style.position ?? '' };
    html.style.overflow = 'hidden';
    html.setAttribute('data-fam-open', open);
    if (bar) {
      if (getComputedStyle(bar).position === 'static') bar.style.position = 'relative';
      bar.style.zIndex = '760';
    }
    const place = () => setBox(measure(visibleBar()));
    place();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
    if (bar && ro) ro.observe(bar);
    window.addEventListener('resize', place);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', place);
      html.style.overflow = prev.overflow;
      html.removeAttribute('data-fam-open');
      if (bar) {
        bar.style.zIndex = prev.z;
        bar.style.position = prev.pos;
      }
      window.scrollTo(0, y);
    };
  }, [open]);

  const onLoad = (id: string) => {
    const before = loadedAt.current.get(id) ?? 0;
    loadedAt.current.set(id, Date.now());
    window.setTimeout(() => {
      const ready = readyAt.current.get(id) ?? 0;
      if (ready <= before) update({ frames: state.frames.map((f) => (f.id === id ? { ...f, failed: true } : f)) });
    }, 800);
  };

  if (!s.frames.length || typeof document === 'undefined') return null;
  const host = hostApp ? (appById(hostApp)?.short ?? hostApp) : '';
  return createPortal(
    <div className="fam-workspace" hidden={!open} style={{ top: box.top, left: box.left }} data-open={open ?? undefined}>
      {s.frames.map((f) => {
        const entry = apps.get(f.id);
        return (
          <div key={f.id} className="fam-workspace__pane" hidden={f.id !== open}>
            <iframe
              ref={(el) => {
                if (el) {
                  frames.current.set(f.id, el);
                  if (!loadedAt.current.has(f.id)) loadedAt.current.set(f.id, Date.now());
                } else frames.current.delete(f.id);
              }}
              className="fam-workspace__frame"
              name={frameName(window.location.origin)}
              src={f.src}
              title={f.title}
              allow="clipboard-read; clipboard-write; microphone; camera; display-capture; fullscreen; autoplay; payment"
              onLoad={() => onLoad(f.id)}
            />
            {f.failed ? (
              <div className="fam-workspace__notice" role="status">
                <p>{f.title} did not open here.</p>
                <div className="fam-workspace__actions">
                  {entry ? (
                    <a className="fam-btn fam-btn--primary" href={entry.href} target="_blank" rel="noopener">
                      Open {f.title} in a new tab <ExternalLink size={16} strokeWidth={STROKE} aria-hidden />
                    </a>
                  ) : null}
                  {host ? (
                    <button type="button" className="fam-btn fam-btn--ghost" onClick={() => openInWorkspace(null)}>
                      <ArrowLeft size={16} strokeWidth={STROKE} aria-hidden /> Back to {host}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
