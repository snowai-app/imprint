'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Lock, MessageCircleQuestionMark, Send, X } from 'lucide-react';
import AppTile from './AppTile';
import AskSnowPanel, { type Starter } from './AskSnowPanel';
import { appById } from '../apps';
import { STROKE } from '../glyphs';
import {
  ASK_SNOW_EN,
  GREET_AFTER_MS,
  MAX_QUESTION,
  PHONE_MAX_WIDTH,
  fallbackPreset,
  fill,
  foundWords,
  greetNow,
  maskText,
  readGreetState,
  scrolledHalf,
  visitKey,
  type AskChoice,
  type AskPreset,
  type AskSnowWords,
  type Found,
  type GreetState,
} from '../ask-snow';

/**
 * ASK SNOW ON A PUBLIC PAGE (T-2168), the approved guide mock-up.
 *
 * An "Ask Snow" button waits in the corner. Once per visit, after ten
 * seconds or half a scroll, a small greeting rises above it with the page's
 * quick choices (the operator's presets, from the most specific URL rule)
 * and a box. Closed, it stays closed for the visit. It never opens the full
 * conversation by itself, never covers the page, and on a phone nothing
 * appears until Ask Snow is tapped, when the conversation opens as a sheet.
 *
 *   <AskSnow site="invoice" endpoint={FAMILY_LINKS.ask} />
 *
 * `endpoint` is Ask's address from the app's lib/links.ts; no hostname is
 * written here. `greet={false}` keeps only the button (a signed-in shelf).
 * `labels` replaces any of the words (ask-snow.ts, ASK_SNOW_EN) for a
 * translated page.
 */
export default function AskSnow({
  site,
  endpoint,
  brand,
  greet = true,
  labels,
  lang,
}: {
  site: string;
  endpoint: string;
  brand?: string;
  greet?: boolean;
  labels?: AskSnowWords;
  lang?: string;
}) {
  const L = { ...ASK_SNOW_EN, ...labels };
  const app = appById(site);
  const name = brand ?? app?.name ?? 'Snow AI';
  const short = app?.short ?? name;
  const [phone, setPhone] = useState(false);
  const [state, setState] = useState<GreetState>('none');
  const [greeting, setGreeting] = useState<'hidden' | 'in' | 'still'>('hidden');
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<AskPreset | null>(null);
  const [queued, setQueued] = useState<{ choice?: AskChoice; question?: string; found?: Found[] } | null>(null);
  const [mini, setMini] = useState('');
  const [miniFound, setMiniFound] = useState<Found[]>([]);
  const fab = useRef<HTMLButtonElement>(null);
  const t0 = useRef(0);
  const panelId = `fam-ask-${site}-panel`;

  const remember = (s: GreetState) => {
    setState(s);
    try {
      window.sessionStorage.setItem(visitKey(site), s);
    } catch {
      /* storage refused: the greeting still keeps to this page view */
    }
  };

  const loadPreset = useCallback(async (): Promise<AskPreset> => {
    if (preset) return preset;
    let p: AskPreset;
    try {
      const res = await fetch(`${endpoint.replace(/\/+$/, '')}/api/guide/presets?url=${encodeURIComponent(location.href)}`, { credentials: 'omit' });
      p = res.ok ? ((await res.json()) as AskPreset) : fallbackPreset(site, name, L);
      if (!p.greeting || !Array.isArray(p.choices)) p = fallbackPreset(site, name, L);
    } catch {
      p = fallbackPreset(site, name, L);
    }
    setPreset(p);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, endpoint, site, name]);

  /* The phone rule, read from the window and kept up to date. */
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* The greeting: once per visit, after ten seconds or half a scroll. */
  useEffect(() => {
    if (!greet || phone || open) return;
    let s: GreetState = 'none';
    try {
      s = readGreetState(window.sessionStorage.getItem(visitKey(site)));
    } catch {
      s = state;
    }
    setState(s);
    const decide = (elapsedMs: number, half: boolean) => greetNow({ state: s, phone, open, enabled: greet, elapsedMs, scrolledHalf: half });
    const now = decide(0, false);
    if (now === 'never') return;
    if (now === 'restore') {
      void loadPreset().then(() => setGreeting('still'));
      return;
    }
    if (!t0.current) t0.current = Date.now();
    void loadPreset();
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      void loadPreset().then(() => {
        s = 'shown';
        remember('shown');
        setGreeting('in');
      });
    };
    const timer = window.setTimeout(fire, Math.max(0, GREET_AFTER_MS - (Date.now() - t0.current)));
    const onScroll = () => {
      const d = document.documentElement;
      if (scrolledHalf(window.scrollY || d.scrollTop, d.scrollHeight, window.innerHeight)) fire();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greet, phone, open, site]);

  const closeGreeting = (byUser: boolean) => {
    const was = greeting !== 'hidden';
    setGreeting('hidden');
    remember('closed');
    if (byUser && was) fab.current?.focus({ preventScroll: true });
  };
  const openPanel = async (q?: { choice?: AskChoice; question?: string; found?: Found[] }) => {
    if (greeting !== 'hidden' || state === 'none') closeGreeting(false);
    await loadPreset();
    if (q) setQueued(q);
    setOpen(true);
  };
  const closePanel = () => {
    setOpen(false);
    fab.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (greeting === 'hidden') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeGreeting(true);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting]);

  const starter: Starter | null = preset ? { greeting: preset.greeting, choices: preset.choices } : null;
  return (
    <div className="fam-ask" data-ask-site={site}>
      {greeting !== 'hidden' && !open && !phone && preset ? (
        <div className={`fam-ask-greet${greeting === 'in' ? ' fam-ask-in' : ''}`} role="dialog" aria-label={`${L.name} greeting`}>
          <button type="button" className="fam-ask-x" aria-label={L.closeGreeting} onClick={() => closeGreeting(true)}>
            <X className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
          </button>
          <div className="fam-ask-gh">
            <AppTile app={site} size={32} />
            <span>
              <b>{L.name}</b>
              <small>
                {name} · {L.guideLine.split(' · ')[0]}
              </small>
            </span>
          </div>
          <p className="fam-ask-gt">{preset.greeting}</p>
          <div className="fam-ask-chips">
            {preset.choices.map((c, i) => (
              <button key={i} type="button" className="fam-ask-chip" onClick={() => void openPanel({ choice: c })}>
                {c.label}
              </button>
            ))}
          </div>
          <form
            className="fam-ask-mini"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              const v = mini.trim();
              if (!v) return;
              const found = miniFound;
              setMini('');
              setMiniFound([]);
              void openPanel({ question: v, found });
            }}
          >
            <label className="fam-ask-sr" htmlFor={`fam-ask-${site}-mini`}>
              {L.yourQuestion}
            </label>
            <input
              id={`fam-ask-${site}-mini`}
              placeholder={L.typeQuestion}
              maxLength={MAX_QUESTION}
              value={mini}
              onChange={(e) => {
                const m = maskText(e.target.value, true);
                if (!e.target.value.trim()) setMiniFound([]);
                if (m.found.length) setMiniFound((f) => [...new Set([...f, ...m.found])]);
                setMini(m.found.length ? m.text : e.target.value);
              }}
            />
            <button className="fam-ask-send" type="submit" aria-label={L.send} disabled={!mini.trim()}>
              <Send className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
            </button>
          </form>
          {miniFound.length ? (
            <div className="fam-ask-mininote">
              <Lock className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
              <span>{fill(L.protectedTyping, { what: foundWords(miniFound, L) })}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <AskSnowPanel
        mode="public"
        panelId={panelId}
        site={site}
        brand={name}
        short={short}
        endpoint={endpoint}
        labels={L}
        open={open}
        onClose={closePanel}
        starter={starter}
        queued={queued}
        onQueued={() => setQueued(null)}
        lang={lang}
      />
      <button ref={fab} type="button" className="fam-ask-fab" aria-expanded={open} aria-controls={panelId} onClick={() => (open ? closePanel() : void openPanel())}>
        <MessageCircleQuestionMark className="fam-ask-ic fam-ask-q" strokeWidth={STROKE} aria-hidden />
        <ChevronDown className="fam-ask-ic fam-ask-down" strokeWidth={STROKE} aria-hidden />
        <span>{L.name}</span>
        <span className="fam-ask-sr"> · {name}</span>
      </button>
    </div>
  );
}
