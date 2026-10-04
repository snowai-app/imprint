'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, BookOpen, CircleUserRound, Headset, Info, Lock, Send, X } from 'lucide-react';
import AppTile from './AppTile';
import { STROKE } from '../glyphs';
import { MAX_QUESTION, fill, foundWords, maskText, type AskAnswer, type AskChoice, type AskSnowLabels, type Found } from '../ask-snow';

/**
 * ASK SNOW'S CONVERSATION (T-2168): the panel both faces share, the guide
 * on a public page (AskSnow.tsx) and the side panel signed in
 * (AskSnowButton.tsx). After the approved guide mock-up: the log, the box,
 * the honest line; answers stream in word by word (not under reduced
 * motion) and end with a button to the right place; "Talk to a person"
 * hands over through Live help.
 *
 * Protected mode: what is typed is masked as it is typed and again before
 * it is sent, and the call says `"protected": true`, so Ask keeps no copy.
 * A protected conversation is never handed to a person here.
 */

type Act =
  | { kind: 'link'; label: string; href: string; primary?: boolean }
  | { kind: 'person'; label: string; primary?: boolean }
  | { kind: 'focus'; label: string }
  | { kind: 'yes'; label: string; primary?: boolean }
  | { kind: 'no'; label: string; reply: string };

type Msg =
  | { id: number; kind: 'user'; text: string; prot: boolean }
  | { id: number; kind: 'bot'; who?: string; lead?: string; paras: string[]; acts?: Act[]; chips?: AskChoice[]; src?: ReactNode; stream: boolean; used?: boolean }
  | { id: number; kind: 'sys'; title: string; body: string }
  | { id: number; kind: 'contact' };

type NoId<T> = T extends unknown ? Omit<T, 'id'> : never;

export type Starter = { greeting: string; choices: AskChoice[] };

export type PanelProps = {
  mode: 'public' | 'account';
  panelId: string;
  site: string;
  brand: string;
  short: string;
  endpoint: string;
  labels: AskSnowLabels;
  open: boolean;
  onClose: () => void;
  starter: Starter | null;
  /** Something to do the moment the panel opens: a choice pressed in the greeting, or a question typed there. */
  queued: { choice?: AskChoice; question?: string; found?: Found[] } | null;
  onQueued: () => void;
  lang?: string;
};

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function AskSnowPanel(p: PanelProps) {
  const { labels: L } = p;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [typedFound, setTypedFound] = useState<Found[]>([]);
  const [prot, setProt] = useState(false);
  const [waiting, setWaiting] = useState<{ ticket?: string } | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const started = useRef(false);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLTextAreaElement>(null);
  const history = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const lastQuestion = useRef('');
  const anyProtected = useRef(false);
  const seen = useRef(new Set<string>());

  const add = useCallback((m: NoId<Msg>) => setMsgs((list) => [...list, { ...m, id: nextId.current++ } as Msg]), []);
  const scroll = () => {
    requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }));
  };
  useEffect(scroll, [msgs, busy]);

  const call = useCallback(
    async (path: string, body: unknown, method = 'POST') => {
      const res = await fetch(`${p.endpoint.replace(/\/+$/, '')}${path}`, {
        method,
        credentials: 'include',
        headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      });
      const out = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: res.status, ok: res.ok, out };
    },
    [p.endpoint],
  );

  /* The first message: the greeting (public) or the welcome (signed in), with the choices. */
  useEffect(() => {
    if (!p.open || started.current || !p.starter) return;
    started.current = true;
    add({ kind: 'bot', paras: [p.starter.greeting], chips: p.starter.choices, stream: false });
  }, [p.open, p.starter, add]);

  useEffect(() => {
    if (!p.open || !p.starter || !p.queued) return;
    const q = p.queued;
    p.onQueued();
    if (q.choice) void choose(q.choice);
    else if (q.question) void ask(q.question, q.found ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open, p.starter, p.queued]);

  useEffect(() => {
    if (p.open && !p.queued) setTimeout(() => inRef.current?.focus({ preventScroll: true }), 40);
  }, [p.open, p.queued]);

  /* Escape closes it wherever the focus is, unless a dialog of the page is open. */
  const onClose = p.onClose;
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [p.open, onClose]);

  /* ------------------------------------------------------------- asking */
  const answerMsg = (a: AskAnswer, foundBefore: Found[]): NoId<Msg> => {
    const paras: string[] = [];
    if (foundBefore.length) paras.push(fill(L.protectedReply, { what: foundWords(foundBefore, L) }));
    if (a.source === 'person') {
      return { kind: 'bot', lead: L.personOffer, paras: [...paras, L.personOfferBody], acts: [{ kind: 'person', label: L.person, primary: true }, { kind: 'focus', label: L.askElse }], stream: true };
    }
    if (a.source === 'refused') return { kind: 'bot', paras: [...paras, a.answer], acts: [{ kind: 'person', label: L.person }], stream: true };
    paras.push(...a.answer.split(/\n{2,}/));
    const acts: Act[] = a.button ? [{ kind: 'link', label: a.button.label, href: a.button.href, primary: true }] : [];
    const src = a.source === 'pages' && a.sources?.length ? (
      <>
        {fill(L.from, { source: '' })}
        {a.sources.map((s, i) => (
          <span key={s.url + i}>
            {i ? ' · ' : ''}
            <a href={s.url} target="_top">
              {s.name}
            </a>
          </span>
        ))}
      </>
    ) : null;
    return { kind: 'bot', lead: a.lead, paras, acts, src, stream: true };
  };

  async function send(body: Record<string, unknown>, foundBefore: Found[]) {
    setBusy(true);
    try {
      const { ok, status, out } = await call('/api/guide', { url: location.href, site: p.site, mode: p.mode === 'account' ? 'account' : undefined, history: history.current.slice(-6), lang: p.lang, ...body });
      if (!ok) {
        add({ kind: 'bot', paras: [status === 429 ? L.busy : status === 401 ? 'Sign in again to ask about your account.' : L.failed], stream: false });
        return;
      }
      const a = out as unknown as AskAnswer & { used?: number };
      if (typeof a.used === 'number') setUsed(a.used);
      history.current.push({ role: 'assistant', content: a.answer.slice(0, 600) });
      add(answerMsg(a, foundBefore));
    } catch {
      add({ kind: 'bot', paras: [L.failed], stream: false });
    } finally {
      setBusy(false);
    }
  }

  async function ask(raw: string, pre: Found[] = []) {
    if (busy) return;
    const m = maskText(raw.slice(0, MAX_QUESTION));
    const found = [...new Set([...pre, ...m.found])];
    const question = m.text.trim();
    if (!question) return;
    if (found.length) {
      setProt(true);
      anyProtected.current = true;
    }
    add({ kind: 'user', text: question, prot: found.length > 0 });
    history.current.push({ role: 'user', content: question });
    lastQuestion.current = question;
    await send({ question, protected: found.length > 0 || anyProtected.current ? true : undefined }, found);
  }

  async function choose(c: AskChoice) {
    if (busy) return;
    if (c.kind === 'person') {
      add({ kind: 'user', text: c.label, prot: false });
      return handoff();
    }
    if (c.kind === 'followup') {
      add({ kind: 'user', text: c.label, prot: false });
      add({ kind: 'bot', paras: [c.ask || L.somethingElseReply], chips: c.options && c.options.length ? c.options : undefined, stream: true });
      if (!c.options?.length) setTimeout(() => inRef.current?.focus(), 60);
      return;
    }
    if (c.kind === 'answer' && c.answerId) {
      add({ kind: 'user', text: c.label, prot: false });
      history.current.push({ role: 'user', content: c.label });
      return send({ answerId: c.answerId }, []);
    }
    return ask(c.label);
  }

  /* ----------------------------------------------------------- a person */
  async function handoff(contact?: { email: string; name: string; phone: string; callOk: boolean }) {
    if (anyProtected.current) {
      add({ kind: 'bot', paras: [L.protectedNoPerson], stream: false });
      return;
    }
    if (waiting?.ticket && !contact) return scroll();
    setBusy(true);
    try {
      const transcript = history.current.slice(-12);
      const { ok, status, out } = await call('/api/guide/help', { action: 'open', url: location.href, question: lastQuestion.current, transcript, lang: p.lang || navigator.language, ...(contact ? { contact } : {}) });
      if (!ok) {
        add({ kind: 'bot', paras: [status === 429 ? L.busy : out.error === 'email' ? L.emailWrong : out.error === 'protected' ? L.protectedNoPerson : L.failed], stream: false });
        return;
      }
      if (out.needContact) {
        add({ kind: 'sys', title: L.personTitle, body: L.personSignIn });
        add({ kind: 'bot', paras: [L.personLeave], acts: [{ kind: 'yes', label: L.yesContact, primary: true }, { kind: 'no', label: L.notNow, reply: L.notNowReply }], stream: true });
        return;
      }
      if (out.live === true && typeof out.ticket === 'string') {
        setWaiting({ ticket: out.ticket });
        add({ kind: 'sys', title: L.personTitle, body: `${L.personHere} ${out.on ? L.someoneOn : L.nobodyOn}` });
        return;
      }
      if (out.live === false) {
        const how = contact?.phone && contact.callOk ? L.detailsCall : contact?.phone ? L.detailsNoCall : L.detailsEmail;
        add({ kind: 'sys', title: L.detailsTitle, body: how });
      }
    } catch {
      add({ kind: 'bot', paras: [L.failed], stream: false });
    } finally {
      setBusy(false);
    }
  }

  /* A live thread: the replies, every three seconds while the panel is mounted. */
  useEffect(() => {
    const ticket = waiting?.ticket;
    if (!ticket) return;
    let stop = false;
    const poll = async () => {
      try {
        const { ok, out } = await call(`/api/guide/help?ticket=${encodeURIComponent(ticket)}&lang=${encodeURIComponent(p.lang || navigator.language)}`, null, 'GET');
        if (!ok || stop) return;
        const turns = (out.turns as { id: string; side: string; body: string; author?: string | null }[] | undefined) ?? [];
        for (const t of turns) {
          if (seen.current.has(t.id)) continue;
          seen.current.add(t.id);
          if (t.side === 'us') add({ kind: 'bot', who: t.author || 'Snow AI', paras: [t.body], stream: false });
        }
        if (out.state === 'resolved') setWaiting(null);
      } catch {
        /* the next poll tries again */
      }
    };
    void poll();
    const t = window.setInterval(poll, 3000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [waiting?.ticket, call, add, p.lang]);

  const onAct = (m: Extract<Msg, { kind: 'bot' }>, a: Act) => {
    if (a.kind === 'link') return;
    if (a.kind === 'focus') return inRef.current?.focus();
    if (a.kind === 'person') return void handoff();
    setMsgs((list) => list.map((x) => (x.id === m.id ? { ...x, used: true } : x)));
    if (a.kind === 'yes') add({ kind: 'contact' });
    if (a.kind === 'no') add({ kind: 'bot', paras: [a.reply], stream: true });
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || busy) return;
    const pre = typedFound;
    setText('');
    setTypedFound([]);
    if (inRef.current) inRef.current.style.height = 'auto';
    if (waiting?.ticket) {
      const m = maskText(v);
      if (m.found.length) {
        add({ kind: 'bot', paras: [L.protectedNoPerson], stream: false });
        return;
      }
      add({ kind: 'user', text: v, prot: false });
      void call('/api/guide/help', { action: 'add', ticket: waiting.ticket, body: v, lang: p.lang || navigator.language });
      return;
    }
    void ask(v, pre);
  };

  const onType = (v: string) => {
    const m = maskText(v, true);
    if (!v.trim()) setTypedFound([]);
    if (m.found.length) {
      setTypedFound((f) => [...new Set([...f, ...m.found])]);
      setText(m.text);
    } else setText(v);
    const el = inRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
    }
  };

  const account = p.mode === 'account';
  const sub = waiting?.ticket ? L.waiting : account ? fill(L.accountLine, { short: p.short }) : L.guideLine.split(' · ')[0];
  return (
    <section
      className={`fam-ask-panel${account ? ' fam-ask-side' : ''}${p.open ? ' fam-ask-in' : ''}`}
      id={p.panelId}
      role="dialog"
      aria-modal="false"
      aria-label={account ? `${L.name}, in ${p.short}` : `${L.name}, ${p.brand}`}
      hidden={!p.open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          p.onClose();
        }
      }}
    >
      <span className="fam-ask-grab" aria-hidden="true" />
      <header className="fam-ask-head">
        <AppTile app={account ? 'ask' : p.site} size={32} />
        <div className="fam-ask-ht">
          <b>{L.name}</b>
          <span className={`fam-ask-sub${waiting?.ticket ? ' fam-ask-wait' : ''}`}>
            <span className="fam-ask-live" />
            <span>{sub}</span>
          </span>
        </div>
        <button type="button" className="fam-ask-hb" onClick={() => void handoff()} disabled={busy}>
          <Headset className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
          <span className="fam-ask-wide">{L.person}</span>
          <span className="fam-ask-sr">{L.person}</span>
        </button>
        <button type="button" className="fam-ask-close" aria-label={L.close} onClick={p.onClose}>
          <X className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
        </button>
      </header>
      <div className="fam-ask-log" ref={logRef} role="log" aria-live="polite" aria-label={L.conversation}>
        {msgs.map((m) => {
          if (m.kind === 'user')
            return (
              <div key={m.id} className="fam-ask-m fam-ask-u fam-ask-new">
                <p>{m.text}</p>
                {m.prot ? (
                  <span className="fam-ask-mprot">
                    <Lock className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
                    {L.protectedChip}
                  </span>
                ) : null}
              </div>
            );
          if (m.kind === 'sys')
            return (
              <div key={m.id} className="fam-ask-m fam-ask-s fam-ask-new">
                <div className="fam-ask-sh">
                  <Headset className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
                  {m.title}
                </div>
                <p>{m.body}</p>
              </div>
            );
          if (m.kind === 'contact') return <Contact key={m.id} L={L} send={(c) => handoff(c)} />;
          return <Bot key={m.id} m={m} name={m.who ?? L.name} tile={account ? 'ask' : p.site} L={L} onAct={(a) => onAct(m, a)} onChip={(c) => void choose(c)} busy={busy} />;
        })}
        {busy ? (
          <div className="fam-ask-m fam-ask-b fam-ask-new">
            <span className="fam-ask-who">
              <AppTile app={account ? 'ask' : p.site} size={24} className="fam-ask-t18" />
              {L.name}
            </span>
            <span className="fam-ask-typing" aria-label={L.typing}>
              <i />
              <i />
              <i />
            </span>
          </div>
        ) : null}
      </div>
      <div className="fam-ask-foot">
        {prot ? (
          <div className="fam-ask-prot">
            <Lock className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
            <span>{L.protectedOn}</span>
          </div>
        ) : null}
        {typedFound.length ? (
          <div className="fam-ask-protnote">
            <Lock className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
            <span>{fill(L.protectedTyping, { what: foundWords(typedFound, L) })}</span>
          </div>
        ) : null}
        <form className="fam-ask-form" autoComplete="off" onSubmit={submit}>
          <label className="fam-ask-sr" htmlFor={`${p.panelId}-in`}>
            {L.yourQuestion}
          </label>
          <textarea
            ref={inRef}
            className="fam-ask-in-text"
            id={`${p.panelId}-in`}
            rows={1}
            maxLength={MAX_QUESTION}
            value={text}
            placeholder={fill(account ? L.accountPlaceholder : L.placeholder, { short: p.short })}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button className="fam-ask-send" type="submit" aria-label={L.send} disabled={busy || !text.trim()}>
            <Send className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
          </button>
        </form>
        <p className="fam-ask-honest">
          <Info className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
          <span>{L.honest}</span>
        </p>
        {account ? (
          <div className="fam-ask-pool">
            <CircleUserRound className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
            <span>
              <b>{L.pool}</b>
              {used !== null ? `${used} so far this month. ` : ''}
              {L.poolNote}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Bot({ m, name, tile, L, onAct, onChip, busy }: { m: Extract<Msg, { kind: 'bot' }>; name: string; tile: string; L: AskSnowLabels; onAct: (a: Act) => void; onChip: (c: AskChoice) => void; busy: boolean }) {
  const all = m.paras.join('\n\n');
  const words = all.split(/(\s+)/);
  const [n, setN] = useState(() => (m.stream && !reduced() ? 0 : words.length));
  useEffect(() => {
    if (n >= words.length) return;
    const t = window.setTimeout(() => setN((x) => Math.min(words.length, x + 2)), 22);
    return () => window.clearTimeout(t);
  }, [n, words.length]);
  const done = n >= words.length;
  const shown = done ? m.paras : words.slice(0, n).join('').split('\n\n');
  return (
    <div className={`fam-ask-m fam-ask-b${m.stream ? ' fam-ask-new' : ''}`}>
      <span className="fam-ask-who">
        <AppTile app={tile} size={24} className="fam-ask-t18" />
        {name}
      </span>
      <div className="fam-ask-body">
        {m.lead ? <p className="fam-ask-lead">{m.lead}</p> : null}
        {shown.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      {done && m.chips?.length ? (
        <div className="fam-ask-chips fam-ask-new">
          {m.chips.map((c, i) => (
            <button key={i} type="button" className="fam-ask-chip" onClick={() => onChip(c)} disabled={busy}>
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      {done && m.acts?.length ? (
        <div className="fam-ask-acts fam-ask-new">
          {m.acts.map((a, i) =>
            a.kind === 'link' ? (
              <a key={i} className={`fam-ask-act${a.primary ? ' fam-ask-pri' : ''}`} href={a.href} target="_top">
                <span>{a.label}</span>
                <ArrowRight className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
              </a>
            ) : (
              <button key={i} type="button" className={`fam-ask-act${'primary' in a && a.primary ? ' fam-ask-pri' : ''}`} aria-disabled={m.used && (a.kind === 'yes' || a.kind === 'no') ? true : undefined} onClick={() => !(m.used && (a.kind === 'yes' || a.kind === 'no')) && onAct(a)}>
                {a.kind === 'person' ? <Headset className="fam-ask-ic" strokeWidth={STROKE} aria-hidden /> : null}
                <span>{a.label}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
      {done && m.src ? (
        <div className="fam-ask-src">
          <BookOpen className="fam-ask-ic" strokeWidth={STROKE} aria-hidden />
          <span>{m.src}</span>
        </div>
      ) : null}
    </div>
  );
}

function Contact({ L, send }: { L: AskSnowLabels; send: (c: { email: string; name: string; phone: string; callOk: boolean }) => void }) {
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  if (done) return null;
  return (
    <form
      className="fam-ask-contact fam-ask-new"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const email = String(f.get('email') ?? '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setErr(L.emailWrong);
          ref.current?.focus();
          return;
        }
        setDone(true);
        send({ email, name: String(f.get('name') ?? '').trim(), phone: String(f.get('phone') ?? '').trim(), callOk: f.get('call') === 'on' });
      }}
    >
      <b>{L.reach}</b>
      <label>
        <span style={{ color: 'inherit', fontWeight: 500 }}>
          {L.nameLabel} <span>{L.optional}</span>
        </span>
        <input type="text" name="name" autoComplete="name" />
      </label>
      <label>
        {L.emailLabel}
        <input ref={ref} type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        <span style={{ color: 'inherit', fontWeight: 500 }}>
          {L.phoneLabel} <span>{L.optional}</span>
        </span>
        <input type="tel" name="phone" autoComplete="tel" />
      </label>
      <label className="fam-ask-ck">
        <input type="checkbox" name="call" />
        <span>{L.callConsent}</span>
      </label>
      {err ? (
        <p className="fam-ask-err" role="alert">
          {err}
        </p>
      ) : null}
      <button type="submit" className="fam-ask-act fam-ask-pri" style={{ justifySelf: 'start' }}>
        {L.sendDetails}
      </button>
      <p className="fam-ask-fine">{L.contactFine}</p>
    </form>
  );
}

