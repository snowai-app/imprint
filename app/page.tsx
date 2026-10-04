import AppTile from '@/family/components/AppTile';
import ThemeSwitch from '@/family/components/ThemeSwitch';
import { THEME_COOKIE } from '@/lib/theme';
import './_front/front.css';
import CopyMail from './_front/CopyMail';
import Demo from './_front/Demo';
import HeroStage from './_front/HeroStage';
import { frontLinks } from './_front/links';
import { rich } from './_front/rich';
import Rise from './_front/Rise';
import { P, Svg } from './_front/svg';
import { CHAPTERS, W, type Key } from './_front/words';

/* IMPRINT, THE PUBLIC FRONT PAGE (T-2131). The mock-up the operator approved
   ("approve ... Imprint ..., build them", palette C, version 3), built page for page:
   nothing renamed, moved or added (snowai's AGENTS.md, rule 9). Its words are
   app/_front/words.ts; its stylesheet is app/_front/front.css, every rule under
   .imprintfront; its moving parts are HeroStage, Demo, CopyMail and Rise. The family
   kit gives it the tile, the theme switch (the imprint-theme cookie) and the colours.

   Imprint is being built: the notice says so, every book step carries its "In build"
   badge, the plans carry no figure, and the book, its author and its chapters are
   invented examples. Nothing here calls Ask or the database. A signed-in visitor's
   way in is "Open the studio", the same /studio link a stranger follows to the
   family sign-in. */

const STRIP: [string, Key, Key | null][] = [
  [P.mic, 'strip.dict', 'strip.dictE'],
  [P.chat, 'strip.ask', 'strip.askE'],
  [P.doc, 'strip.reader', 'strip.readerE'],
  [P.render, 'strip.render', 'strip.renderE'],
  [P.shield, 'strip.ai', 'strip.aiE'],
  [P.lock, 'strip.login', null],
];

export default function Home() {
  const L = frontLinks();
  const t = (k: Key) => rich(W[k]);
  const Arrow = () => <span className="fp-arrow" aria-hidden="true">→</span>;
  const ticks = (...keys: Key[]) => <ul className="fp-ticks">{keys.map((k) => <li key={k}>{t(k)}</li>)}</ul>;
  const SBand = ({ book, crumb }: { book: Key; crumb: Key }) => <div className="fp-sband"><span className="fp-nm"><i></i>{W.name}</span><span className="fp-cr"><b>{W[book]}</b>{W[crumb]}</span></div>;
  const Mic = () => <span className="fp-micb"><Svg d={P.mic} /></span>;
  const Yes = () => <span className="fp-yes"><Svg d={P.tick} />{W['it.yes']}</span>;
  const Oli = ({ n, st, cls }: { n: number; st: Key; cls?: string }) => (
    <div className="fp-oli"><span className="fp-pn">{n}</span><span><b>{CHAPTERS[n - 1][0]}</b><small>{CHAPTERS[n - 1][1]}</small></span><span className={'fp-cstat' + (cls ? ` ${cls}` : '')}>{W[st]}</span></div>
  );
  const chips = (hidden: boolean) => (
    <div style={{ display: 'flex', gap: 12 }} aria-hidden={hidden || undefined}>
      {STRIP.map(([d, k, e]) => <span key={k} className="fp-chip"><Svg d={d} plain />{W[k]}{e ? <em>{W[e]}</em> : null}</span>)}
    </div>
  );
  const Brand = () => (
    <>
      <AppTile app="imprint" size={32} />
      <span className="fp-brand-t"><b>{W.brand}</b></span>
    </>
  );

  return (
    <div className="imprintfront" id="top">
      <header className="fp-top">
        <div className="fp-wrap fp-nav">
          <a className="fp-brand" href="#top" aria-label={W['a.brand']}><Brand /></a>
          <nav className="fp-links" aria-label={W['a.main']}>
            <a href="#features">{W['nav.f']}</a>
            <a href="#demo">{W['nav.d']}</a>
            <a href="#included">{W['nav.i']}</a>
            <a href="#family">{W['nav.fam']}</a>
            <a href="#faq">{W['nav.q']}</a>
          </nav>
          <div className="fp-nav-r">
            <ThemeSwitch cookie={THEME_COOKIE} className="fp-theme" />
            <a className="fp-signin" href={L.studio}>{W['nav.in']}</a>
            <a className="fp-btn fp-btn-band" href={L.studio}>{W['nav.open']}</a>
          </div>
        </div>
      </header>
      <div className="fp-notice" role="note"><div className="fp-wrap"><i aria-hidden="true"></i><span>{t('notice')}</span></div></div>

      <main id="main" tabIndex={-1}>
        {/* HERO */}
        <section className="fp-hero" aria-labelledby="h1">
          <div className="fp-wrap">
            <div className="fp-hero-top">
              <div>
                <p className="fp-eyebrow">{W['hero.eb']}</p>
                <h1 className="fp-h1" id="h1">{t('hero.h')}</h1>
              </div>
              <div className="fp-hero-say">
                <p>{W['hero.p']}</p>
                <div className="fp-ctas">
                  <a className="fp-btn fp-btn-band" href={L.studio}><span>{W['hero.c1']}</span><Arrow /></a>
                  <a className="fp-btn fp-btn-ghost-band" href="#demo">{W['hero.c2']}</a>
                </div>
                <p className="fp-fine">{W['hero.fine']}</p>
              </div>
            </div>
            <HeroStage hosts={L.hosts} />
          </div>
        </section>

        {/* WORKS WITH */}
        <section className="fp-strip" aria-label={W['a.strip']}>
          <div className="fp-wrap fp-strip-in">
            <p className="fp-strip-l">{W['strip.l']}</p>
            <div className="fp-marq">
              <div className="fp-marq-track">
                {chips(false)}
                {chips(true)}
              </div>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="fp-sec" aria-labelledby="who-h">
          <div className="fp-wrap">
            <div className="fp-sec-head fp-rise">
              <p className="fp-eyebrow">{W['who.eb']}</p>
              <h2 className="fp-h2" id="who-h">{t('who.h')}</h2>
            </div>
            <div className="fp-cards3">
              {([[P.shield, 'who.1t', 'who.1h', 'who.1p'], [P.form, 'who.2t', 'who.2h', 'who.2p'], [P.people, 'who.3t', 'who.3h', 'who.3p']] as [string, Key, Key, Key][]).map(([d, tg, h, p]) => (
                <article key={h} className="fp-card fp-rise">
                  <span className="fp-ico"><Svg d={d} /></span>
                  <p className="fp-tagline">{W[tg]}</p>
                  <h3>{W[h]}</h3>
                  <p>{W[p]}</p>
                </article>
              ))}
            </div>
            <div className="fp-facts" role="list">
              {([['5', 'fact.1'], ['5', 'fact.2'], ['8–14', 'fact.3'], ['2', 'fact.4'], ['0', 'fact.5']] as [string, Key][]).map(([n, k]) => (
                <div key={k} className="fp-fact" role="listitem"><b>{n}</b><span>{W[k]}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE ROWS */}
        <section id="features" aria-label={W['a.features']}>
          <div className="fp-wrap">
            <div className="fp-sec-head fp-center fp-rise">
              <p className="fp-eyebrow">{W['feat.eb']}</p>
              <h2 className="fp-h2">{W['feat.h']}</h2>
              <p className="fp-lede">{W['feat.p']}</p>
            </div>

            {/* 1 idea + title */}
            <div className="fp-feat">
              <div className="fp-feat-say fp-rise">
                <span className="fp-inbuild">{W['f1.ib']}</span>
                <p className="fp-eyebrow">{W['f1.eb']}</p>
                <h3>{W['f1.h']}</h3>
                <p>{W['f1.p']}</p>
                {ticks('f1.t1', 'f1.t2', 'f1.t3')}
              </div>
              <div className="fp-desk fp-rise">
                <div className="fp-win" role="img" aria-label={W['f1.a']}>
                  <SBand book="f1.untitled" crumb="rail.title" />
                  <div className="fp-inner">
                    <div><div className="fp-row-h"><span>{W['f1.idea']}</span><span className="fp-tk">✓</span></div><div className="fp-box">{W['f1.ideaV']}<Mic /></div></div>
                    <div className="fp-optlist">
                      <div className="fp-opt fp-on"><i></i><span><b>{W.book}</b><small>{W['book.sub']}</small></span></div>
                      <div className="fp-opt"><i></i><span><b>{W['f1.o2']}</b><small>{W['f1.o2s']}</small></span></div>
                      <div className="fp-opt"><i></i><span><b>{W['f1.o3']}</b><small>{W['f1.o3s']}</small></span></div>
                    </div>
                    <p className="fp-note" style={{ fontSize: 12 }}>{W['f1.note']}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 outline */}
            <div className="fp-feat fp-flip">
              <div className="fp-feat-say fp-rise">
                <span className="fp-inbuild">{W['f2.ib']}</span>
                <p className="fp-eyebrow">{W['f2.eb']}</p>
                <h3>{W['f2.h']}</h3>
                <p>{W['f2.p']}</p>
                {ticks('f2.t1', 'f2.t2', 'f2.t3')}
              </div>
              <div className="fp-desk fp-rise">
                <div className="fp-win" role="img" aria-label={W['f2.a']}>
                  <SBand book="book" crumb="f2.crumb" />
                  <div className="fp-inner">
                    <div className="fp-olist">
                      <Oli n={1} st="st.done" cls="fp-ok" />
                      <Oli n={2} st="st.drafting" cls="fp-dr" />
                      <Oli n={3} st="st.outline" />
                      <Oli n={4} st="st.outline" />
                      <Oli n={5} st="st.outline" />
                    </div>
                    <p className="fp-note" style={{ fontSize: 12 }}>{W['f2.note']}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 chapters */}
            <div className="fp-feat">
              <div className="fp-feat-say fp-rise">
                <span className="fp-inbuild">{W['f3.ib']}</span>
                <p className="fp-eyebrow">{W['f3.eb']}</p>
                <h3>{W['f3.h']}</h3>
                <p>{W['f3.p']}</p>
                {ticks('f3.t1', 'f3.t2', 'f3.t3')}
                <p className="fp-note">{W['f3.note']}</p>
              </div>
              <div className="fp-desk fp-rise">
                <div className="fp-win" role="img" aria-label={W['f3.a']}>
                  <SBand book="book" crumb="f3.crumb" />
                  <div className="fp-inner">
                    <div className="fp-brief"><b>{W.brief}</b><ul><li>{W['brief.1']}</li><li>{W['brief.2']}</li><li>{W['brief.3']}</li></ul></div>
                    <div className="fp-srcs"><span><i className="fp-ck fp-on"></i>{W['src.1']}</span><span><i className="fp-ck fp-on"></i>{W['src.2']}</span><span><i className="fp-ck"></i>{W['src.3']}</span></div>
                    <div className="fp-box fp-big">
                      <p>{W['ch2.p1']}</p>
                      <div className="fp-added" style={{ marginTop: 8 }}><small><span className="fp-prov">{W['f3.prov']}</span></small>
                        <p>{t('f3.d1')}</p>
                        <p>{W['f3.d2']}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 AI disclosure */}
            <div className="fp-feat fp-flip">
              <div className="fp-feat-say fp-rise">
                <span className="fp-inbuild">{W['f4.ib']}</span>
                <p className="fp-eyebrow">{W['f4.eb']}</p>
                <h3>{W['f4.h']}</h3>
                <p>{W['f4.p']}</p>
                {ticks('f4.t1', 'f4.t2', 'f4.t3')}
              </div>
              <div className="fp-desk fp-rise">
                <div className="fp-win" role="img" aria-label={W['f4.a']}>
                  <SBand book="book" crumb="rail.ai" />
                  <div className="fp-inner">
                    <div className="fp-scroll-x">
                      <table className="fp-tbl fp-dtable">
                        <thead><tr><th>{W['th.chapter']}</th><th className="fp-r">{W['th.words']}</th></tr></thead>
                        <tbody>
                          <tr><td>{`1 · ${CHAPTERS[0][0]}`}</td><td className="fp-r fp-mono">0</td></tr>
                          <tr><td>{`2 · ${CHAPTERS[1][0]}`}</td><td className="fp-r fp-mono">212</td></tr>
                          <tr><td>{`3 · ${CHAPTERS[2][0]}`}</td><td className="fp-r fp-mono">0</td></tr>
                          <tr><td><b>{W['f4.total']}</b></td><td className="fp-r fp-mono"><b>212</b></td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="fp-stmt">{W['f4.stmt']}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5 files */}
            <div className="fp-feat">
              <div className="fp-feat-say fp-rise">
                <span className="fp-inbuild">{W['f5.ib']}</span>
                <p className="fp-eyebrow">{W['f5.eb']}</p>
                <h3>{W['f5.h']}</h3>
                <p>{W['f5.p']}</p>
                {ticks('f5.t1', 'f5.t2')}
                <p className="fp-note">{t('f5.note')}</p>
              </div>
              <div className="fp-desk fp-rise">
                <div className="fp-win" role="img" aria-label={W['f5.a']}>
                  <div className="fp-win-bar"><span className="fp-dots"><i></i><i></i><i></i></span><span className="fp-url">{W['file.pdf']}</span></div>
                  <div className="fp-pages">
                    <div className="fp-pg" style={{ justifyContent: 'center', textAlign: 'center' }}><b>{W.book}</b><span style={{ color: 'var(--fp-paper-ink-2)' }}>{W['f5.sub']}</span><small style={{ marginTop: 8 }}>{W['book.by']}</small></div>
                    <div className="fp-pg"><small>{W.contents}</small><span>{W['f5.c1']}</span><span>{W['f5.c2']}</span><span>{W['f5.c3']}</span><span>{W['f5.c4']}</span><span>{W['f5.c5']}</span></div>
                    <div className="fp-pg"><span className="fp-draftl">{W.draftL}</span><small>{W['sheet.ch']}</small><b>{W['sheet.t']}</b><span className="fp-ln"></span><span className="fp-ln"></span><span className="fp-ln" style={{ width: '80%' }}></span><span className="fp-ln"></span><span className="fp-ln" style={{ width: '60%' }}></span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DEMO */}
        <section className="fp-sec fp-demo" id="demo" aria-labelledby="demo-h">
          <div className="fp-wrap">
            <div className="fp-sec-head fp-center fp-rise">
              <p className="fp-eyebrow">{W['demo.eb']}</p>
              <h2 className="fp-h2" id="demo-h">{W['demo.h']}</h2>
              <p className="fp-lede">{W['demo.p']}</p>
            </div>
            <Demo hosts={L.hosts} />
            <div className="fp-demo-cta"><a className="fp-btn fp-btn-primary" href={L.studio}><span>{W['nav.open']}</span><Arrow /></a><a className="fp-btn fp-btn-quiet" href="#included">{W['demo.c2']}</a></div>
          </div>
        </section>

        {/* PLANS + WHAT'S INCLUDED */}
        <section className="fp-sec" id="included" aria-labelledby="inc-h">
          <div className="fp-wrap">
            <div className="fp-sec-head fp-rise">
              <p className="fp-eyebrow">{W['inc.eb']}</p>
              <h2 className="fp-h2" id="inc-h">{t('inc.h')}</h2>
              <p className="fp-lede">{W['inc.p']}</p>
            </div>
            <div className="fp-plans">
              <article className="fp-plan fp-rise">
                <h3>{W['plan1.h']}</h3>
                <p>{W['plan1.p']}</p>
                <div className="fp-price"><b>{W['price.b']}</b><span>{W['price.s']}</span></div>
                {ticks('plan1.t1', 'plan1.t2', 'plan1.t3')}
                <a className="fp-more" href={L.pricing}><span>{W['plan.more']}</span> <Arrow /></a>
              </article>
              <article className="fp-plan fp-feature fp-rise">
                <span className="fp-flag">{W['plan2.flag']}</span>
                <h3>{W['plan2.h']}</h3>
                <p>{W['plan2.p']}</p>
                <div className="fp-price"><b>{W['price.b']}</b><span>{W['price.s']}</span></div>
                {ticks('plan2.t1', 'plan2.t2', 'plan2.t3')}
                <a className="fp-more" href={L.pricing}><span>{W['plan.more']}</span> <Arrow /></a>
              </article>
            </div>
            <div className="fp-save fp-rise" style={{ marginTop: 20 }}><b>{W['save.b']}</b><span>{W['save.p']}</span></div>

            <div className="fp-incl fp-rise">
              <h3>{W['incl.h']}</h3>
              <div className="fp-tablebox">
                <table className="fp-itable">
                  <thead><tr><th scope="col">{W['it.cap']}</th><th scope="col">{W['it.alone']}</th><th scope="col">{W['it.inside']}</th></tr></thead>
                  <tbody>
                    <tr><th scope="row">{t('it.1')}</th><td><Yes /></td><td><Yes /></td></tr>
                    <tr><th scope="row">{t('it.2')}</th><td><Yes /></td><td><Yes /></td></tr>
                    <tr><th scope="row">{t('it.3')}</th><td><Yes /></td><td>{W['it.3b']}</td></tr>
                    <tr><th scope="row">{t('it.4')}</th><td><Yes /></td><td>{W['it.4b']}</td></tr>
                    <tr><th scope="row">{t('it.5')}</th><td><Yes /></td><td>{W['it.5b']}</td></tr>
                    <tr><th scope="row">{t('it.6')}</th><td><Yes /></td><td><Yes /></td></tr>
                    <tr><th scope="row">{t('it.7')}</th><td><Yes /></td><td><Yes /></td></tr>
                    <tr><th scope="row">{t('it.8')}</th><td>{W['it.8a']}</td><td>{W['it.8b']}</td></tr>
                    <tr className="fp-sep"><th scope="row">{W['it.soon']}</th><td colSpan={2}><div className="fp-soon-list">{(['soon.1', 'soon.2', 'soon.3', 'soon.4', 'soon.5', 'soon.6'] as Key[]).map((k) => <span key={k} className="fp-soon">{W[k]}</span>)}</div></td></tr>
                  </tbody>
                </table>
              </div>
              <p className="fp-never"><Svg d={P.shieldTick} /><span>{t('never')}</span></p>
            </div>
          </div>
        </section>

        {/* FAMILY */}
        <section className="fp-sec fp-family" id="family" aria-labelledby="fam-h">
          <div className="fp-wrap">
            <div className="fp-sec-head fp-rise">
              <p className="fp-eyebrow">{W['fam.eb']}</p>
              <h2 className="fp-h2" id="fam-h">{W['fam.h']}</h2>
              <p className="fp-lede">{W['fam.p']}</p>
            </div>
            <div className="fp-cards3">
              {([[P.pen, 'fam.1h', 'fam.1p', 'fam.1a', L.byline], [P.folder, 'fam.2h', 'fam.2p', 'fam.2a', L.documents], [P.lockKey, 'fam.3h', 'fam.3p', 'fam.3a', L.products]] as [string, Key, Key, Key, string][]).map(([d, h, p, a, href]) => (
                <article key={h} className="fp-card fp-fam-card fp-rise">
                  <span className="fp-ico"><Svg d={d} /></span>
                  <h3>{W[h]}</h3>
                  <p>{W[p]}</p>
                  <a href={href}><span>{W[a]}</span> <Arrow /></a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="fp-sec" id="faq" aria-labelledby="faq-h">
          <div className="fp-wrap fp-faq">
            <div className="fp-sec-head fp-rise">
              <p className="fp-eyebrow">{W['faq.eb']}</p>
              <h2 className="fp-h2" id="faq-h">{W['faq.h']}</h2>
              <p className="fp-lede">{W['faq.p']}</p>
            </div>
            <div className="fp-qa">
              {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => (
                <details key={n} open={n === 1}>
                  <summary><span>{W[`q${n}`]}</span><i aria-hidden="true"></i></summary>
                  <div className="fp-ans"><p>{W[`a${n}`]}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING */}
        <section className="fp-close" aria-labelledby="close-h">
          <div className="fp-wrap">
            <h2 className="fp-h2" id="close-h">{t('close.h')}</h2>
            <p className="fp-lede">{W['close.p']}</p>
            <div className="fp-ctas"><a className="fp-btn fp-btn-primary" href={L.studio}><span>{W['nav.open']}</span><Arrow /></a><a className="fp-btn fp-btn-quiet" href={L.byline}>{W['close.c2']}</a></div>
          </div>
        </section>
      </main>

      <footer className="fp-foot">
        <div className="fp-wrap">
          <div className="fp-foot-g">
            <div>
              <a className="fp-brand" href="#top"><Brand /></a>
              <p className="fp-about">{W['foot.about']}</p>
            </div>
            <div><h5>{W['foot.imprint']}</h5><ul>
              <li><a href="#features">{W['nav.f']}</a></li>
              <li><a href="#demo">{W['nav.d']}</a></li>
              <li><a href="#included">{W['nav.i']}</a></li>
              <li><a href="#faq">{W['nav.q']}</a></li>
              <li><a href={L.studio}>{W['nav.open']}</a></li>
            </ul></div>
            <div><h5>{W['foot.family']}</h5><ul>
              <li><a href={L.byline}>{W['foot.byline']}</a></li>
              <li><a href={L.playbook}>{W['foot.playbook']}</a></li>
              <li><a href={L.documents}>{W['foot.documents']}</a></li>
              <li><a href={L.pitch}>{W['foot.pitch']}</a></li>
              <li><a href={L.model}>{W['foot.model']}</a></li>
            </ul></div>
            <div><h5>{W['foot.snowai']}</h5><ul>
              <li><a href={L.home}>{W['foot.home']}</a></li>
              <li><a href={L.products}>{W['foot.products']}</a></li>
              <li><a href={L.pricing}>{W['foot.pricing']}</a></li>
              <li><a href={L.privacy}>{W['foot.privacy']}</a></li>
              <li><a href={L.terms}>{W['foot.terms']}</a></li>
            </ul></div>
            <div className="fp-help">
              <h5 style={{ margin: 0 }}>{W['foot.help']}</h5>
              <p>{W['foot.helpP']}</p>
              <CopyMail address={L.support} copy={W.copy} copied={W.copied} />
            </div>
          </div>
          <div className="fp-foot-b"><span>{W['foot.c']}</span><span>{W['foot.fine']}</span></div>
        </div>
      </footer>
      <Rise root="imprintfront" />
    </div>
  );
}
