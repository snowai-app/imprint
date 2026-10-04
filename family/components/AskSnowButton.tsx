'use client';

import { useEffect, useRef, useState } from 'react';
// @ts-ignore -- not every app in the family carries react-dom's types; createPortal is all that is used here.
import { createPortal } from 'react-dom';
import { MessageCircleQuestionMark } from 'lucide-react';
import AskSnowPanel from './AskSnowPanel';
import { appById } from '../apps';
import { STROKE } from '../glyphs';
import { ASK_SNOW_EN, fill, type AskChoice, type AskSnowWords } from '../ask-snow';

/**
 * ASK SNOW, SIGNED IN (T-2168): the Ask button in a product's header and
 * the panel that opens down the right-hand side under it, after the
 * approved guide mock-up. It answers from the product the person is in and
 * the family's pages (phase 1), on the stronger model, and their questions
 * are counted once for the whole account, whatever app they ask from. No
 * greeting: it opens only when pressed.
 *
 *   <AskSnowButton site="invoice" endpoint={FAMILY_LINKS.ask} suggestions={['How do my clients pay?']} />
 *
 * An app whose work area should make room for the open panel on a wide
 * screen marks that area with `data-ask-dock`; the button sets
 * `data-ask-docked` on <html> while open. `top` is where the panel starts
 * (the app's header height; 56px by default). With no endpoint it draws
 * nothing: `askEndpointOf(launcher.apps)` gives it from the launcher list.
 */
export default function AskSnowButton({
  site,
  endpoint,
  suggestions = [],
  labels,
  lang,
  top,
  className,
}: {
  site: string;
  endpoint: string;
  suggestions?: string[];
  labels?: AskSnowWords;
  lang?: string;
  top?: string;
  className?: string;
}) {
  const L = { ...ASK_SNOW_EN, ...labels };
  const app = appById(site);
  const name = app?.name ?? 'Snow AI';
  const short = app?.short ?? name;
  const [open, setOpen] = useState(false);
  const [here, setHere] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panelId = `fam-ask-${site}-account`;

  /* The panel lives at the end of <body>, out of the header, so no rule of the
     app's header reaches it; it exists only once the page is in the browser. */
  useEffect(() => setHere(true), []);
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.askDocked = 'true';
    else delete root.dataset.askDocked;
    return () => {
      delete root.dataset.askDocked;
    };
  }, [open]);

  const choices: AskChoice[] = suggestions.map((s) => ({ label: s, kind: 'ask' }));
  if (!endpoint) return null;
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`fam-ask-btn${className ? ` ${className}` : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={L.name}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircleQuestionMark strokeWidth={STROKE} aria-hidden />
        <span className="fam-ask-lbl">{L.ask}</span>
      </button>
      {here ? createPortal(
      <div className="fam-ask" style={top ? ({ '--fam-ask-top': top } as React.CSSProperties) : undefined}>
        <AskSnowPanel
          mode="account"
          panelId={panelId}
          site={site}
          brand={name}
          short={short}
          endpoint={endpoint}
          labels={L}
          open={open}
          onClose={() => {
            setOpen(false);
            btn.current?.focus({ preventScroll: true });
          }}
          starter={{ greeting: fill(L.accountWelcome, { short }), choices }}
          queued={null}
          onQueued={() => undefined}
          lang={lang}
        />
      </div>,
      document.body,
      ) : null}
    </>
  );
}
