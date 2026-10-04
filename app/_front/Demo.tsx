'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { rich } from './rich';
import { P, Svg } from './svg';
import { CHAPTERS, W, fill } from './words';

/* TRY IT HERE (T-2131): a working model of the book steps being built, on the
   invented book. Outline: rename, move up and down, delete (never below 8, never the
   chapter open on the next tab) and add (never above 14). A chapter: draft it from the
   ticked sources (added after your words, counted), fill its gap. Files: the final
   export waits for every gap; a draft export carries a DRAFT line; the first pages
   turn. AI disclosure: the count per chapter and a statement to copy. Nothing leaves
   the page. */

type Ch = { t: string; id: number };
const GAP = /\[need a (figure|source)\]/i;
const TABS = [
  { id: 'tab-out', view: 'v-out', label: W['tab.out'], d: P.list, url: '/outline' },
  { id: 'tab-ch', view: 'v-ch', label: W['tab.ch'], d: P.penPlain, url: '/2' },
  { id: 'tab-ex', view: 'v-ex', label: W['tab.ex'], d: P.download, url: '/export' },
  { id: 'tab-ai', view: 'v-ai', label: W['tab.ai'], d: P.shield, url: '/disclosure' },
] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export default function Demo({ hosts }: { hosts: { imprint: string } }) {
  const [outline, setOutline] = useState<Ch[]>(() => CHAPTERS.map(([t], id) => ({ t, id })));
  const [fresh, setFresh] = useState('');
  const [body, setBody] = useState<string>(W['ch2.p1']);
  const [src, setSrc] = useState([true, true, false]);
  const [prov, setProv] = useState(0);
  const [drafted, setDrafted] = useState(0);
  const [page, setPage] = useState(0);
  const [made, setMade] = useState<null | 'final' | 'draft'>(null);
  const [madeGap, setMadeGap] = useState(false);
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const nextId = useRef(100);

  useEffect(() => {
    if (!focusNext.current) return;
    const [a, b] = focusNext.current.split('|');
    (list.current?.querySelector<HTMLButtonElement>(`[${a}]:not(:disabled)`) ?? list.current?.querySelector<HTMLButtonElement>(`[${b}]`))?.focus();
    focusNext.current = null;
  }, [outline]);

  function move(i: number, by: -1 | 1) {
    const o = [...outline];
    [o[i + by], o[i]] = [o[i], o[i + by]];
    const j = i + by;
    focusNext.current = by < 0 ? `data-up="${j}"|data-down="${j}"` : `data-down="${j}"|data-up="${j}"`;
    setOutline(o);
  }
  function add() {
    const v = fresh.trim();
    if (!v || outline.length >= 14) return;
    setOutline([...outline, { t: v, id: nextId.current++ }]);
    setFresh('');
  }
  function draft() {
    const ticked = src.filter(Boolean).length;
    const more: string[] = ticked === 0 ? [W['c.none']] : [W['c.para1'], W['c.para2']];
    if (src[2]) more.push(W['c.para3']);
    const text = more.join('\n\n');
    setBody(body.replace(/\s+$/, '') + '\n\n' + text);
    setProv(prov + words(text));
    setDrafted(words(text));
  }

  function select(i: number, focus = false) {
    setTab(i);
    if (focus) tabs.current[i]?.focus();
  }
  function onKey(e: KeyboardEvent, i: number) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    select((i + d + TABS.length) % TABS.length, true);
  }

  const gapM = body.match(GAP);
  const gap = Boolean(gapM);
  const idx = outline.findIndex((o) => o.id === 1);
  const name = (o: Ch) => o.t || W.untitledCh;
  const stmt = prov ? fill(W['a.stmtSome'], { w: prov }) : W['a.stmtNone'];
  const note = outline.length >= 14 ? W['o.note14'] : outline.length <= 8 ? W['o.note8'] : W['o.note'];
  const stat = prov ? (gap ? ['fp-cstat fp-dr', W['st.drafting']] : ['fp-cstat fp-ok', W['st.edited']]) : ['fp-cstat', W['st.outline']];
  const tocList = outline.map((o, i) => <li key={o.id}><span>{i + 1}</span><span>{name(o)}</span><em>{3 + i * 4}</em></li>);

  function copy() {
    const ok = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    const sel = () => {
      try {
        const el = document.getElementById('a-stmt');
        const r = document.createRange();
        if (el) r.selectNodeContents(el);
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      } catch {
        /* nothing to select */
      }
    };
    try {
      navigator.clipboard.writeText(stmt).then(ok, sel);
    } catch {
      sel();
    }
  }

  return (
    <>
      <div className="fp-dtabs" role="tablist" aria-label={W['demo.tabs']}>
        {TABS.map((t, i) => (
          <button key={t.id} ref={(el) => { tabs.current[i] = el; }} type="button" role="tab" id={t.id} aria-controls={t.view} aria-selected={tab === i} tabIndex={tab === i ? 0 : -1} onClick={() => select(i)} onKeyDown={(e) => onKey(e, i)}>
            <Svg d={t.d} />{t.label}
          </button>
        ))}
      </div>
      <div className="fp-browser fp-rise">
        <div className="fp-win-bar"><span className="fp-dots"><i></i><i></i><i></i></span><span className="fp-url">{fill(W['demo.url'], hosts) + TABS[tab].url}</span><span className="fp-sample">{W.ex}</span></div>

        <div className="fp-view" id="v-out" role="tabpanel" aria-labelledby="tab-out" hidden={tab !== 0}>
          <div className="fp-trybox">
            <div className="fp-tryhead"><div><h4>{W.book}</h4><p>{W['o.help']}</p></div><span className="fp-pill fp-p-draft">{fill(W['o.count'], { n: outline.length })}</span></div>
            <div className="fp-tlist" ref={list}>
              {outline.map((o, i) => {
                const n = i + 1;
                return (
                  <div key={o.id} className="fp-tchap">
                    <span className="fp-pn">{n}</span>
                    <label className="fp-sr" htmlFor={`oc-${i}`}>{fill(W['o.titleL'], { n })}</label>
                    <input id={`oc-${i}`} maxLength={80} value={o.t} onChange={(e) => setOutline(outline.map((x) => (x.id === o.id ? { ...x, t: e.target.value } : x)))} />
                    <span className="fp-acts">
                      <button type="button" className="fp-ib" data-up={i} aria-label={fill(W['o.up'], { n })} disabled={i === 0} onClick={() => move(i, -1)}><Svg d={P.up} /></button>
                      <button type="button" className="fp-ib" data-down={i} aria-label={fill(W['o.down'], { n })} disabled={i === outline.length - 1} onClick={() => move(i, 1)}><Svg d={P.down} /></button>
                      <button type="button" className="fp-ib" data-del={i} aria-label={fill(W['o.del'], { n })} disabled={outline.length <= 8 || o.id === 1} title={o.id === 1 ? W['o.open'] : undefined} onClick={() => setOutline(outline.filter((x) => x.id !== o.id))}>×</button>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="fp-addrow">
              <label className="fp-sr" htmlFor="o-new">{W['o.newL']}</label>
              <input className="fp-inp" id="o-new" maxLength={80} placeholder={W['o.newPh']} value={fresh} onChange={(e) => setFresh(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
              <button type="button" className="fp-tbtn fp-solid" disabled={outline.length >= 14} onClick={add}>{W['o.add']}</button>
            </div>
            <p className="fp-note">{note}</p>
          </div>
        </div>

        <div className="fp-view" id="v-ch" role="tabpanel" aria-labelledby="tab-ch" hidden={tab !== 1}>
          <div className="fp-trybox">
            <div className="fp-tryhead"><div><h4>{fill(W['c.title'], { n: idx + 1, t: name(outline[idx]) })}</h4><p>{W['c.help']}</p></div><span className={stat[0]}>{stat[1]}</span></div>
            <div className="fp-chg">
              <div style={{ display: 'grid', gap: 10 }}>
                <label className="fp-sr" htmlFor="c-body">{W['c.bodyL']}</label>
                <textarea className="fp-inp" id="c-body" value={body} onChange={(e) => setBody(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="fp-tbtn fp-solid" onClick={draft}>{drafted ? W['c.more'] : W['c.draft']}</button>
                  <button type="button" className="fp-tbtn" disabled={!gap} onClick={() => setBody(body.replace(/ ?\[need a (figure|source)\]/i, W['c.fillWith']))}>{W['c.fill']}</button>
                </div>
                <p className="fp-note">{drafted ? fill(W['c.added'], { w: drafted }) : W['c.note']}</p>
              </div>
              <aside className="fp-side">
                <h5>{W.brief}</h5>
                <p className="fp-note" style={{ color: 'var(--fp-ink-2)' }}>{W['c.brief']}</p>
                <h5>{W['c.sources']}</h5>
                {[W['src.1'], W['src.2'], W['src.3']].map((f, i) => (
                  <label key={f}><input type="checkbox" id={`c-s${i + 1}`} checked={src[i]} onChange={(e) => setSrc(src.map((v, j) => (j === i ? e.target.checked : v)))} />{f}</label>
                ))}
                <h5>{W['c.drafted']}</h5>
                <div className="fp-counter"><span>{prov}</span> <span style={{ fontSize: 15, color: 'var(--fp-ink-3)' }}>{W['c.words']}</span></div>
                <p className="fp-note">{W['c.kept']}</p>
              </aside>
            </div>
          </div>
        </div>

        <div className="fp-view" id="v-ex" role="tabpanel" aria-labelledby="tab-ex" hidden={tab !== 2}>
          <div className="fp-trybox">
            <div className="fp-expg">
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="fp-tryhead"><div><h4>{W['e.h']}</h4><p>{fill(W['e.p'], { n: outline.length })}</p></div></div>
                <div className="fp-gapline" hidden={!gap}>{gapM ? fill(W['e.gap'], { where: fill(W['e.where'], { n: idx + 1 }), gap: gapM[0] }) : ''}</div>
                <div className="fp-okline" hidden={gap}>{W['e.ok']}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="fp-tbtn fp-solid" disabled={gap} onClick={() => setMade('final')}>{W['e.final']}</button>
                  <button type="button" className="fp-tbtn" onClick={() => { setMade('draft'); setMadeGap(gap); }}>{W['e.draft']}</button>
                </div>
                <div className="fp-callout" hidden={!made}>{made === 'final' ? rich(fill(W['e.doneFinal'], { n: outline.length })) : made === 'draft' ? rich(madeGap ? W['e.doneDraftGap'] : W['e.doneDraft']) : null}</div>
                <p className="fp-note">{W['e.note']}</p>
              </div>
              <div className="fp-preview">
                <div className="fp-sheet" style={{ paddingTop: 30 }}>
                  <span className="fp-draftbar" hidden={made !== 'draft'}>{W.draftL}</span>
                  <div className="fp-tp" hidden={page !== 0}><b>{W.book}</b><span>{W['book.sub']}</span><small>{W['book.by']}</small></div>
                  <div hidden={page !== 1}><h6>{W.contents}</h6><ol className="fp-toc">{tocList}</ol></div>
                  <div className="fp-foot-n">{page === 0 ? '' : 'iii'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="fp-tbtn" aria-label={W['e.prev']} disabled={page === 0} onClick={() => setPage(0)}>‹</button>
                  <button type="button" className="fp-tbtn" aria-label={W['e.next']} disabled={page === 1} onClick={() => setPage(1)}>›</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fp-view" id="v-ai" role="tabpanel" aria-labelledby="tab-ai" hidden={tab !== 3}>
          <div className="fp-trybox">
            <div className="fp-tryhead"><div><h4>{W['tab.ai']}</h4><p>{W['a.help']}</p></div></div>
            <div className="fp-scroll-x">
              <table className="fp-dis">
                <thead><tr><th>{W['th.chapter']}</th><th className="fp-r">{W['th.words']}</th></tr></thead>
                <tbody>{outline.map((o, i) => <tr key={o.id}><td>{`${i + 1} · ${name(o)}`}</td><td className="fp-r">{o.id === 1 ? prov : 0}</td></tr>)}</tbody>
                <tfoot><tr><td>{W['a.total']}</td><td className="fp-r">{prov}</td></tr></tfoot>
              </table>
            </div>
            <div className="fp-stmtbox">
              <div className="fp-row"><b>{W['a.stmtH']}</b><button type="button" className="fp-tbtn" style={{ padding: '6px 10px', fontSize: 12.5 }} onClick={copy}>{copied ? W.copied : W.copy}</button></div>
              <p id="a-stmt">{stmt}</p>
            </div>
            <p className="fp-note">{W['a.note']}</p>
          </div>
        </div>
      </div>
    </>
  );
}
