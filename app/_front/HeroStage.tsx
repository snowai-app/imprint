'use client';

import { useEffect, useState } from 'react';
import { rich } from './rich';
import { P, Svg } from './svg';
import { CHAPTERS, W, fill, type Key } from './words';

/* THE HERO'S STAGE (T-2131): the book studio and a page of the book beside it,
   playing the mock-up's loop: the outline grows chapter by chapter, chapter 2 is
   drafted from its brief, then the Word and PDF are made, and round again. Pause
   stops it where it is; a hidden tab stops it too. With reduced motion it rests on
   the whole outline, and the Pause button and the step bars are hidden by the
   stylesheet. */

const DW = W['h.draft'].split(' ');
const LABELS = [W['step.0'], W['step.1'], W['step.2']];
const CRUMB: Key[] = ['crumb.outline', 'crumb.ch2', 'crumb.export'];
const SUFFIX = ['/outline', '/2', '/export'];

type S = { step: number; n: number; anim: boolean; dw: number; done: boolean; fresh: boolean };
const START: S = { step: 0, n: 0, anim: false, dw: 0, done: false, fresh: true };

/** One beat of the loop, and how long to wait before it, as the mock-up times it. */
function beat(s: S): [number, S] {
  if (s.step === 0) {
    if (s.n < CHAPTERS.length) return [s.fresh ? 600 : s.n === 0 ? 500 : 520, { ...s, n: s.n + 1, anim: true, fresh: false }];
    return [520 + 1500, { ...s, step: 1, dw: 0 }];
  }
  if (s.step === 1) {
    if (s.dw < DW.length) return [s.dw === 0 ? 700 : 170, { ...s, dw: Math.min(s.dw + 2, DW.length) }];
    return [170 + 1500, { ...s, step: 2, done: false }];
  }
  if (!s.done) return [1800, { ...s, done: true }];
  return [3600, { ...s, step: 0, n: 0, done: false }];
}

export default function HeroStage({ hosts }: { hosts: { imprint: string } }) {
  const [s, setS] = useState<S>(START);
  const [playing, setPlaying] = useState(true);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setS({ step: 0, n: CHAPTERS.length, anim: false, dw: DW.length, done: false, fresh: false });
      setPlaying(false);
    }
    const vis = () => setShown(!document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  useEffect(() => {
    if (!playing || !shown) return;
    const [wait, next] = beat(s);
    const t = window.setTimeout(() => setS(next), wait);
    return () => window.clearTimeout(t);
  }, [playing, shown, s]);

  const { step, n, dw, done } = s;
  const toc = CHAPTERS.slice(0, n).map(([t], i) => <li key={i}><span>{i + 1}</span><span>{t}</span><em>{3 + i * 4}</em></li>);
  const nv = (i: number) => 'fp-nv' + (step === i ? ' fp-on' : '');

  return (
    <div className="fp-stage">
      <div className="fp-win-wrap">
        <div className="fp-win" role="img" aria-label={W['hero.a.win']}>
          <div className="fp-win-bar"><span className="fp-dots"><i></i><i></i><i></i></span><span className="fp-url">{fill(W['hero.url'], hosts) + SUFFIX[step]}</span><span className="fp-sample">{W.ex}</span></div>
          <div className="fp-sband">
            <span className="fp-nm"><i></i>{W.name}</span>
            <span className="fp-cr"><b>{W.book}</b><span>{W[CRUMB[step]]}</span></span>
            <span className="fp-st fp-hide-s">{W.saved}</span>
            <span className={'fp-go' + (step === 2 ? '' : ' fp-off')}>{W.export}</span>
          </div>
          <div className="fp-studio">
            <aside className="fp-srail">
              <div className="fp-sbrand"><i>I</i><span><b>{W.name}</b><small>{W['rail.studio']}</small></span></div>
              <h6>{W['rail.yours']}</h6>
              <span className="fp-nv">{W['rail.books']} <em>1</em></span>
              <h6>{W['rail.this']}</h6>
              <span className="fp-nv">{W['rail.idea']}</span>
              <span className="fp-nv">{W['rail.title']}</span>
              <span className={nv(0)}>{W['rail.outline']} <em>{n}</em></span>
              <span className={nv(1)}>{W['rail.chapters']}</span>
              <span className="fp-nv">{W['rail.sources']} <em>2</em></span>
              <span className="fp-nv">{W['rail.ai']}</span>
              <span className={nv(2)}>{W['rail.export']}</span>
            </aside>
            <div className="fp-scentre">
              {/* step 0: outline */}
              <div hidden={step !== 0}>
                <div className="fp-make"><b>{W['h.outline']}</b><span className="fp-mini">{W['h.add']}</span><span className="fp-mini fp-hide-s">{W['h.reorder']}</span><span className="fp-togo" style={{ marginLeft: 'auto' }}><span>{W['h.range']}</span></span></div>
                <div className="fp-olist" style={{ marginTop: 8 }}>
                  {CHAPTERS.slice(0, n).map(([t, sub], i) => (
                    <div key={i} className={'fp-oli' + (s.anim && i === n - 1 ? ' fp-new' : '')}><span className="fp-pn">{i + 1}</span><span><b>{t}</b><small>{sub}</small></span><span className="fp-cstat">{W['st.outline']}</span></div>
                  ))}
                </div>
              </div>
              {/* step 1: one chapter */}
              <div hidden={step !== 1}>
                <div className="fp-make"><b>{W['crumb.ch2']}</b><span className="fp-mini fp-dict fp-on">{W['h.draftBtn']}</span><span className="fp-cstat fp-dr" style={{ marginLeft: 'auto' }}>{W['st.drafting']}</span></div>
                <div className="fp-brief" style={{ marginTop: 8 }}><b>{W.brief}</b><span>{W['h.brief']}</span></div>
                <div className="fp-srcs" style={{ marginTop: 8 }}><span><i className="fp-ck fp-on"></i>{W['src.1']}</span><span><i className="fp-ck fp-on"></i>{W['src.2']}</span><span><i className="fp-ck"></i>{W['src.3']}</span></div>
                <div className="fp-box fp-big" style={{ marginTop: 8 }}>
                  <p>{W['ch2.p1']}</p>
                  <div className="fp-added" style={{ marginTop: 8 }} hidden={dw === 0}><small><span className="fp-prov">{fill(W['h.prov'], { w: dw })}</span></small><p>{DW.slice(0, dw).join(' ')}</p></div>
                </div>
              </div>
              {/* step 2: export */}
              <div hidden={step !== 2}>
                <div className="fp-make"><b>{W.export}</b><span className="fp-togo" style={{ marginLeft: 'auto' }}>{W['h.exportLine']}</span></div>
                <div className="fp-gapline" style={{ marginTop: 8 }} hidden={done}>{W['h.gap']}</div>
                <div className="fp-okline" style={{ marginTop: 8 }} hidden={!done}>{W['h.ok']}</div>
                <div className="fp-exp" style={{ marginTop: 8 }}>
                  <div className="fp-file"><div className="fp-ft"><i>{W.docx}</i><span><b>{W['file.docx']}</b><br /><small>{W['file.word8']}</small></span></div></div>
                  <div className="fp-file"><div className="fp-ft"><i className="fp-pdf">{W.pdf}</i><span><b>{W['file.pdf']}</b><br /><small>{W['file.pdf8']}</small></span></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={'fp-toast' + (step === 2 && done ? '' : ' fp-away')} aria-live="polite"><Svg d={P.tick} /><span>{W['h.toast']}</span></div>
      </div>

      <div className="fp-sheetw" role="img" aria-label={W['hero.a.sheet']}>
        <div className="fp-sheet">
          <div className="fp-tabs"><span className={step === 2 && done ? undefined : 'fp-on'}>{W.docx}</span><span className={step === 2 && done ? 'fp-on' : undefined}>{W.pdf}</span></div>
          <div hidden={step !== 0}><h6>{W.contents}</h6><ol className="fp-toc">{toc}</ol></div>
          <div hidden={step !== 1}><span className="fp-ch-n">{W['sheet.ch']}</span><p className="fp-ch-t">{W['sheet.t']}</p><p>{W['ch2.p1']}</p><p>{rich(W['sheet.p2'])}</p></div>
          <div className="fp-tp" hidden={step !== 2}><b>{W.book}</b><span>{W['book.sub']}</span><small>{W['book.by']}</small></div>
          <div className="fp-foot-n">{step === 0 ? 'iii' : step === 1 ? '7' : ''}</div>
        </div>
      </div>
      <button type="button" className="fp-replay" aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>
        <Svg d={playing ? P.pause : P.play} />
        <span>{playing ? W.pause : W.play}</span>
      </button>
      <div className="fp-steps-ind" aria-hidden="true">
        {[0, 1, 2].map((i) => <i key={i} className={i <= step ? 'fp-on' : undefined}></i>)}
        <span>{LABELS[step]}</span>
      </div>
    </div>
  );
}

