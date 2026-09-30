import { Bar } from '@/components/Bar';

/**
 * Imprint's front page, public (T-1751): what it is, in plain words, for
 * professionals writing a book from their own expertise, and plainly that it
 * is not open yet. Nothing here calls Ask or the database. The book shown is
 * an example, invented, and says so.
 */
export default function Home() {
  return (
    <>
      <Bar right={<a className="bt go" href="/studio">Open the studio</a>} />
      <main id="main" tabIndex={-1}>
        <section className="wrap hero">
          <div>
            <p className="not-open"><span aria-hidden="true" /> Not open yet</p>
            <h1>Put your name on <em>a book.</em></h1>
            <p className="lede">
              Imprint is where a book is written from your own expertise: an idea, a title, an outline of chapters, drafts you
              edit, and a Word and PDF file at the end. It is made for professionals, such as insurance agents, tax preparers,
              coaches and consultants, who want a client guide or a lead-magnet book that is theirs.
            </p>
            <div className="ctas">
              <a className="btn solid" href="/studio">Open the studio</a>
              <a className="btn" href="#how">How it works</a>
            </div>
            <p className="fine">Imprint is not open to the public yet. The studio is for people with a Snow AI account, and every book in it is its author&rsquo;s alone. Nonfiction only.</p>
          </div>

          <article className="sample" aria-label="An example book outline">
            <span className="tag">Example · invented</span>
            <h3>The Renewal Checklist</h3>
            <p className="stand">A short client guide to reading your own policy before it renews.</p>
            <p className="byline">Ari Vance</p>
            <ol className="ol">
              <li><span className="pn">1</span><b>Why renewal is the moment to look</b><span className="chip ok">Done</span></li>
              <li><span className="pn">2</span><b>Reading the declarations page</b><span className="chip wait">Drafting</span></li>
              <li><span className="pn">3</span><b>The three questions to ask your agent</b><span className="chip draft">Outline</span></li>
              <li><span className="pn">4</span><b>Keeping your records in one place</b><span className="chip draft">Outline</span></li>
            </ol>
            <p className="meta">4 of 10 chapters shown · invented example, not a real book</p>
          </article>
        </section>

        <section className="wrap how" id="how">
          <h2>How it works</h2>
          <ol className="steps five">
            <li><b>The idea</b><span>Say it or type it: what the book is about and who it is for. The mic is on every box.</span></li>
            <li><b>The title</b><span>Five title and subtitle options and one positioning sentence. Pick one, or write your own.</span></li>
            <li><b>The outline</b><span>Eight to fourteen chapters, each with a summary and its points. Reorder, rename, add, delete.</span></li>
            <li><b>The chapters</b><span>Write each one, or draft it from its brief and the sources you tick. A draft is added after your words and never replaces them.</span></li>
            <li><b>The files</b><span>A Word file and a PDF, with a title page, a copyright page and contents. A finished export waits until every gap is filled.</span></li>
          </ol>
        </section>

        <section className="wrap rules">
          <h2>What Imprint holds to</h2>
          <div className="rgrid four">
            <div><b>Your expertise, your facts</b><span>A draft uses only the chapter&rsquo;s brief and the sources you tick. Where a fact is missing it says <code>[need a figure]</code> or <code>[need a source]</code> and waits for you.</span></div>
            <div><b>Education, not advice</b><span>A book explains how things work. It does not tell one reader what to do about their own situation.</span></div>
            <div><b>Honest about AI</b><span>Amazon KDP asks whether a book has AI-generated text and enforces it. Imprint keeps count of the words AI drafted, per chapter, and helps you fill in the form.</span></div>
            <div><b>No one&rsquo;s health details</b><span>Never a real person&rsquo;s. An example person is invented, and the book says so.</span></div>
          </div>
        </section>

        <section className="wrap notyet">
          <div className="panel">
            <h2>Not open yet</h2>
            <p>
              The studio is being built in steps. Nothing is published or sent from Imprint: a book stays in your studio until you
              download the file and do what you like with it.
            </p>
            <p className="row" style={{ marginBottom: 0 }}><a className="btn solid" href="/studio">Open the studio</a></p>
          </div>
        </section>
      </main>
      <footer className="wrap foot">Imprint is part of Snow AI. Sign in once at snowai.app and the studio is open. The book above is an invented example.</footer>
    </>
  );
}
