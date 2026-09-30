'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { insertAtSelection } from '@/lib/dictate';

/**
 * A microphone on any field, without replacing the field (T-1747).
 *
 * COPIED FROM snowai-app/hq's components/ui/Dictate.tsx, adapted to Imprint's (copied from byline and hq: change one, change the others)
 * look (app/imprint.css) and extended. CHANGE ONE, CHANGE THE OTHERS.
 *
 * What is the same as HQ's: it wraps a field that already exists, controlled
 * or not, input or textarea, and puts a mic in its corner; nothing about the
 * form changes. Words go in through the NATIVE value setter and a real
 * `input` event, the one route both a React-controlled field (so the article
 * autosaves) and a plain one hear; assigning `.value` on a controlled input
 * is silently discarded.
 *
 * What is new here:
 *  - Words go in at the CURSOR when the field has focus and a cursor (the
 *    mic button keeps the field's focus on a click), over a selection, and are
 *    appended otherwise (lib/dictate.ts: spacing, no punctuation of its own,
 *    and a box with a length limit takes only what fits).
 *  - A visible listening state (a claret dot and a claret box), aria-pressed,
 *    an accessible name "Dictate" / "Stop dictating", keyboard operation, and
 *    a status line for a blocked microphone, no microphone, or no network.
 *  - It stops on blur (leaving the box), on Escape, and on unmount, and it
 *    starts again by itself if the browser ends a long session while the
 *    person has not stopped it.
 *  - Where the browser has no speech recognition (Firefox) the mic is not
 *    drawn and the Dictate button is disabled with a clear title: never a
 *    crash.
 *  - `DictateButton` (the article toolbar's) and `dictateInto(fieldId)` start
 *    dictation into a field by its id, so one place can drive another.
 *  - `DictationNote`: the one-line privacy note. Imprint records nothing: the
 *    browser's own service hears the audio.
 */

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type Ctor = new () => SpeechRecognitionLike;

function engineCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const DICTATION_NOTE = "Uses your browser's speech recognition. Your browser's provider may process the audio; nothing is recorded by Imprint.";
export const NO_SPEECH = 'Dictation needs a browser with speech recognition, such as Chrome, Edge or Safari. This browser does not have it.';
const SEEN = 'imprint-dictation-note';

/* ── which field is listening, shared so a button elsewhere can show it ── */
type Entry = { toggle(): void };
const entries = new Map<string, Entry>();
let active: string | null = null;
const listeners = new Set<() => void>();
const setActive = (id: string | null) => {
  if (active === id) return;
  active = id;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
/** The id of the field being dictated into, or null. */
export const useDictating = (): string | null => useSyncExternalStore(subscribe, () => active, () => null);
/** Start (or stop) dictation into the field with this id. Does nothing where the field has no mic. */
export const dictateInto = (fieldId: string): void => entries.get(fieldId)?.toggle();

/** 'unknown' on the server and until the page has mounted, so a supported browser never flashes "not available". */
export function useSpeechSupport(): 'yes' | 'no' | 'unknown' {
  return useSyncExternalStore(() => () => {}, () => (engineCtor() ? 'yes' : 'no'), () => 'unknown');
}

/** Put text into a field in the one way both controlled and uncontrolled fields hear. */
function write(field: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, text);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

const MIC = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
);

const problem = (code: string | undefined): string | null => {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return "The microphone is blocked. Allow it in your browser's address bar, then try again.";
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return "Speech recognition needs a connection to your browser's service.";
    case 'no-speech':
    case 'aborted':
      return null;
    default:
      return 'Dictation stopped.';
  }
};

export default function Dictate({ children, label = 'this box', disabled = false }: { children: React.ReactNode; /** What the field is called, for the mic's hover text. */ label?: string; disabled?: boolean }) {
  const box = useRef<HTMLSpanElement | null>(null);
  const engine = useRef<SpeechRecognitionLike | null>(null);
  const wanted = useRef(false);
  const restarts = useRef(0);
  const startedAt = useRef(0);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [firstNote, setFirstNote] = useState(false);
  const support = useSpeechSupport();

  const field = (): HTMLInputElement | HTMLTextAreaElement | null => box.current?.querySelector('input, textarea') ?? null;

  function finish() {
    engine.current = null;
    wanted.current = false;
    setListening(false);
    setActive(null);
  }

  function stop() {
    wanted.current = false;
    const e = engine.current;
    if (!e) return;
    try {
      e.stop();
    } catch {
      /* already stopped */
    }
    /* The browser answers with its last words and an end; if it never does, do not stay "listening". */
    window.setTimeout(() => {
      if (engine.current === e) {
        e.onresult = e.onerror = e.onend = null;
        finish();
      }
    }, 1500);
  }

  function heard(target: HTMLInputElement | HTMLTextAreaElement, words: string) {
    const focused = document.activeElement === target;
    const len = target.value.length;
    const start = focused ? target.selectionStart ?? len : len;
    const end = focused ? target.selectionEnd ?? len : len;
    const r = insertAtSelection(target.value, start, end, words, target.maxLength > 0 ? target.maxLength : 0);
    if (r.added) {
      write(target, r.value);
      if (focused) target.setSelectionRange(r.caret, r.caret);
      if (target instanceof HTMLTextAreaElement && r.caret >= r.value.length - 1) target.scrollTop = target.scrollHeight;
    }
    if (r.full || r.cut) {
      setMessage({ text: r.full ? 'This box is full.' : 'This box is full, so the last words were cut.', bad: true });
      stop();
    }
  }

  function toggle() {
    if (listening) {
      stop();
      return;
    }
    const target = field();
    const Engine = engineCtor();
    if (!target || !Engine || disabled || target.disabled) return;
    /* One microphone at a time. */
    if (active && active !== target.id) entries.get(active)?.toggle();

    const speech = new Engine();
    speech.continuous = true;
    speech.interimResults = false;
    speech.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    speech.onresult = (event) => {
      let words = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) words += ` ${result[0].transcript}`;
      }
      if (words.trim()) heard(target, words);
    };
    speech.onerror = (event) => {
      const text = problem(event?.error);
      if (text === null) return;
      wanted.current = false;
      setMessage({ text, bad: true });
    };
    speech.onend = () => {
      /* Browsers end a long session on their own after a pause; carry on unless the person stopped it. */
      if (wanted.current && Date.now() - startedAt.current > 800 && restarts.current < 30) {
        restarts.current += 1;
        try {
          startedAt.current = Date.now();
          speech.start();
          return;
        } catch {
          /* fall through: it ended */
        }
      }
      finish();
    };

    engine.current = speech;
    wanted.current = true;
    restarts.current = 0;
    startedAt.current = Date.now();
    setMessage(null);
    try {
      speech.start();
    } catch {
      setMessage({ text: 'Dictation could not start. Try again.', bad: true });
      finish();
      return;
    }
    setListening(true);
    setActive(target.id || null);
    try {
      if (!window.localStorage.getItem(SEEN)) {
        window.localStorage.setItem(SEEN, '1');
        setFirstNote(true);
      }
    } catch {
      setFirstNote(true);
    }
    /* Keep the cursor where it is if the person was in the field; otherwise go to the end. */
    if (document.activeElement !== target) {
      target.focus();
      const n = target.value.length;
      target.setSelectionRange(n, n);
    }
  }

  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  /* A status line (a blocked microphone, a full box) goes after a few seconds, or when listening starts again. */
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 7000);
    return () => window.clearTimeout(t);
  }, [message]);

  /* Registered by the field's id so DictateButton and dictateInto can drive it. */
  useEffect(() => {
    const id = field()?.id;
    if (!id) return;
    entries.set(id, { toggle: () => toggleRef.current() });
    return () => {
      if (entries.get(id)?.toggle) entries.delete(id);
    };
  }, []);

  /* Gone from the page, or locked while listening: stop, and let go of the microphone. */
  useEffect(
    () => () => {
      wanted.current = false;
      const e = engine.current;
      if (e) {
        e.onresult = e.onerror = e.onend = null;
        try {
          e.abort();
        } catch {
          /* already stopped */
        }
        engine.current = null;
        setActive(null);
      }
    },
    [],
  );
  useEffect(() => {
    if (disabled && listening) stop();
  });

  /* Escape anywhere stops it. */
  useEffect(() => {
    if (!listening) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleRef.current();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [listening]);

  /* Leaving the box (not just moving between its field and its mic) stops it. */
  function onBlur(e: React.FocusEvent) {
    if (!listening) return;
    const next = e.relatedTarget as Node | null;
    if (next && box.current?.contains(next)) return;
    stop();
  }

  return (
    <span className={`dictate${listening ? ' is-live' : ''}`} ref={box} onBlur={onBlur}>
      {children}
      {support === 'yes' ? (
        <button
          type="button"
          className="dictate__mic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggle}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? 'Stop dictating' : 'Dictate'}
          title={listening ? 'Stop dictating' : `Dictate into ${label}`}
        >
          {MIC}
          {listening ? <i className="dictate__dot" aria-hidden="true" /> : null}
        </button>
      ) : null}
      {listening || message ? (
        <span className={`dictate__live${message?.bad && !listening ? ' bad' : ''}`} aria-hidden="true">
          {listening ? `Listening… Escape stops it.${firstNote ? ` ${DICTATION_NOTE}` : ''}` : message?.text}
        </span>
      ) : null}
      <span className="sr" role="status">{listening ? 'Listening' : message?.text ?? ''}</span>
    </span>
  );
}

/** The Dictate button in a toolbar: starts dictation into the field with the id `target`, opening the row that holds it. */
export function DictateButton({ target, disabled = false }: { target: string; disabled?: boolean }) {
  const support = useSpeechSupport();
  const on = useDictating() === target;
  if (support !== 'yes') {
    return (
      <button type="button" className="mini dictatebtn" disabled title={support === 'no' ? NO_SPEECH : 'Dictate'}>
        {MIC}Dictate
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`mini dictatebtn${on ? ' is-live' : ''}`}
      aria-pressed={on}
      disabled={disabled}
      title={on ? 'Stop dictating' : 'Dictate into the box'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        document.getElementById(target)?.closest('details')?.setAttribute('open', '');
        dictateInto(target);
      }}
    >
      {MIC}
      {on ? 'Stop dictating' : 'Dictate'}
      {on ? <i className="dictate__dot" aria-hidden="true" /> : null}
    </button>
  );
}

/** The one-line privacy note, or, where there is no speech recognition, why there is no mic. */
export function DictationNote() {
  const support = useSpeechSupport();
  if (support === 'unknown') return null;
  return <p className="hint dictnote" id="dictation-note">{support === 'yes' ? DICTATION_NOTE : NO_SPEECH}</p>;
}
