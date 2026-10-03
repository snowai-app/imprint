# Imprint — where books are written, from Snow AI

Read `snowai-app/snowai`'s `AGENTS.md` first; the family's standing rules live
there, and are restated below as every repository states them. What is specific
here comes first.

## What Imprint is

Named and briefed under ledger T-1751, at `imprint.snowai.app`. **A book
creator**: a signed-in author goes from an idea, to a title, to an outline of
chapters, to chapter drafts, to a Word and a PDF file. It is **an end-user
product sold on its own AND, in time, a capability** other apps call, the same
shape as `snowai-app/byline`, its sibling: *a byline puts your name on an
article, an imprint puts your name on a book.* Imprint is built from Byline
(same skeleton, same look, same machinery, renamed), and what is copied is
listed at the end under "Copied, not shared".

**The audience comes first: NONFICTION by professionals** (insurance agents,
tax preparers, coaches, consultants) writing a client guide or a lead-magnet
book from their own expertise. **There are no fiction features**, and none are
to be added.

**Nothing publishes and nothing sends.** Imprint holds books and makes files
that the author downloads. It posts to no store, no publication and no list.
The family's publications are not involved.

## What is built (keep this current)

- **Stage 0 (`main`)**: the skeleton that builds. The public front page `/`,
  `/api/health`, the family sign-in gate on `/studio`, a Books list page, visitor
  mode, the three tables and their owner-scoped stores, the role template, tests.
  Nothing else: the rules below describe what the next stages build, and a rule
  about a file that does not exist yet says so under "Not built yet".

## The rules

- **A book is its author's alone.** Every read and write names the owner
  (`owner_email`, the family sign-in's email) in the query itself
  (`lib/books-store.ts`, `lib/chapter-store.ts`, `lib/source-store.ts`;
  `test/schema.test.ts` checks every query does, `test/owners.test.ts` and the
  API tests prove another person's book, chapter or source is never returned).
  Another person's id is 404, the same as one that is not there, **even for the
  suite owner**: there is no shared editing and no owner's view. A chapter is
  only ever inserted from a book the owner owns (`insert … select … from
  public.imprint_books b where b.owner_email = :owner`), and so is a source
  that names a book. **Imprint has no suite owner**: it publishes nowhere, so
  its role reads no SSM parameter.
- **Only the author's facts.** A chapter draft uses **only** the chapter's brief
  (summary and points) and the sources the author ticked for it. It never
  invents a fact, figure, name, quote or citation: a gap is written
  `[need a figure]` or `[need a source]`. It paraphrases sources rather than
  copying long passages. It is general education, not medical, tax or legal
  advice. The rules are in `lib/chapter-draft.ts`'s `instructions`, and
  `test/chapter-draft.test.ts` checks every guardrail is in them.
- **A draft is only ever appended.** "Draft this chapter" adds new paragraphs
  after the author's own text, never replaces any of it, and the server does the
  appending itself (`appendDraft`: one statement that adds the paragraphs and
  records the provenance) so the record cannot be forged or lost by a client.
- **Provenance is a record of what AI inserted, and editing never erases it.**
  Each chapter carries `[{ at, kind: 'ai_draft' | 'ai_assist', words }]`. Only
  drafting writes it; `PATCH` refuses a `provenance` field. Editing the text back
  into the author's own words leaves it alone. The AI disclosure helper
  (`lib/provenance.ts`) is honest about what that means: it counts the words AI
  inserted and **cannot see later rewriting**.
- **The AI disclosure helper is a helper, not legal advice.** Amazon KDP requires
  disclosure of AI-GENERATED text, images and translations (AI-assisted editing
  and brainstorming generally does not need it) and enforces it harder in 2026.
  The helper gives the words drafted by AI per chapter, a total and a statement
  to adapt for a store form, and says plainly that it is neither legal advice nor
  a guarantee of what a store will decide.
- **No real person's health details, ever.** Not in a book, a draft, a test, a
  sample or a screenshot. The draft's rules say so and the page says so. An
  example person is invented and labelled ("Example · invented"). Tests,
  samples and screenshots use invented data only.
- **A final export waits for every gap.** `POST /api/books/<id>/export` refuses
  a final file while any `[need …]` mark remains in a chapter, and names the
  chapters. `draft=1` is allowed and puts a visible DRAFT line at the head of
  every chapter.
- **Imprint is not in a customer's request path.** No product calls Imprint to
  serve a page, send an email or sign anybody in. (A capability door for other
  apps is not built yet.)
- **Everything goes through a capability, never a provider.** Ask for ideas,
  outlines and drafts (`lib/ask.ts`), Reader for the words of a PDF
  (`lib/reader.ts`), Render for the Word and PDF files (`lib/render.ts`), all
  with the shared capability key from Secrets Manager. Imprint calls no model
  provider, holds no other key and stores no file an author uploads.
- **Environment variables reach neither build nor runtime dependably.** Name
  anything needed at runtime in the `env` block of `next.config.ts`, and only a
  name that has a value: an empty one is a textual substitution that blinds every
  `process.env` read to a real value beside it. Imprint needs none:
  `aws/outputs.json` holds its identifiers and the capability key is read from
  Secrets Manager. **A trailing space in a variable NAME is invisible in the
  console**; check names through the API and print `repr()` of each key. The
  Amplify app is created with **no environment variables**.
- **Commit as** `Claude <noreply@anthropic.com>`:
  `git -c user.email=noreply@anthropic.com -c user.name=Claude commit …`
- **Private repository.** No secrets in code; `aws/outputs.json` is identifiers
  only.
- **Checks:** `npm test`, `npx tsc --noEmit` and `npm run build`
  (`.github/workflows/checks.yml` runs them).

## Not built yet

- Everything after the skeleton: the book (idea, title, outline), the chapters,
  the AI disclosure helper, sources and the export. Also, for a later round: EPUB,
  print-ready PDF (trim size and bleed), a cover, filing a book in Documents (comes
  with the Documents intake door), Word import, and the capability door that lets
  other apps call Imprint.

## Tables

`db/schema.sql`: **12 statements**, one per blank-line block, each safe to run
twice, no trailing semicolons: for each of `public.imprint_books`,
`public.imprint_chapters` and `public.imprint_sources` the table, one index, row
level security on (no policy) and the grant to `service_role`. `business_slug` is
`'imprint'` on every row; `owner_email` must be lower case. A chapter's
`(book_id, position)` is unique and **deferrable initially deferred**, so a
reorder is one statement that swaps places. Deleting a book deletes its chapters
and sources. `test/schema.test.ts` checks all of it.

**A CloudShell round is needed before the studio works**: the twelve statements,
and the `snowai-imprint-compute` stack from `aws/compute-role.yaml`, then the
Amplify app (`imprint`, subdomain `imprint` on snowai.app) with that role and **no
environment variables**. Merged before then, nothing breaks: the front page and
`/api/health` never touch the tables (`table: false` until they exist), and the
studio answers in words that the books could not be read.

**Files are not stored.** A source's PDF is sent to Reader and only the words
Reader returns are kept, page by page (at most 300,000 characters from one
source, 100 sources a person: a row this size is read back whole by the Data API,
which answers at most 1 MB). A list never carries the words; they are read one
source at a time. **A chapter holds at most 40,000 characters** and a list of
chapters carries only how many words each has, for the same reason.

## AWS

Stack `snowai-imprint-compute` from `aws/compute-role.yaml`: the role
`snowai-imprint-compute`, with the Data API and the database secret (the same
parameters and defaults as Byline's), the capability key, and the one `kms:Decrypt`
that reading the database's own secret needs (only through Secrets Manager).
**No SSM, no KMS key of its own, no S3, no Bedrock.** `aws/outputs.json` holds the
region, the database and the capabilities it calls (`keySecret`, `ask`, `read`:
Reader at `reader.snowai.app`, `render`: Render at `render.snowai.app`).

## Visitor mode

The family contract (`snowai/docs/design/implement/visitor-view.md`). While
`sa_visitor=1` is set the proxy strips every cookie, marks the request, and
refuses every `/api` call with 403; the studio sends a visitor to sign in as it
would a stranger. Every page may be framed by Imprint and `https://hq.snowai.app`
only. `test/visitor.test.ts` covers it.

## The look

**Byline's, which is Playbook's**: the Financial Times pink ground `#FFF1E5`, a
wheat band `#F2DFCE`, warm near-black ink `#33302E`, one accent, claret
`#990F3D`; Google Sans for headlines and the interface, Google Sans Code for
labels (the family typeface, T-2108). **One standard colour set, light only: no dark mode and no toggle.**
Imprint's own mark is an "I". `app/imprint.css` holds it all and works at phone
width (no sideways scroll at 390px). The skip link, focus rings and reduced
motion are kept. The fonts are self-hosted from `public/fonts/`
(`app/google-sans.css`); without them the pages fall back to system sans and mono.

## Copied, not shared

From `snowai-app/byline` (from `snowai-app/pitch`, from `snowai-app/model`):
`proxy.ts` (the gate is `/studio` only), `lib/visitor.ts`, `app/visitor.tsx`,
`lib/capability-key.ts`, `lib/db.ts`, `lib/api.ts`, `lib/links.ts`, `lib/ask.ts`,
`lib/reader.ts`, `lib/sources.ts`, `lib/source-store.ts` (with a `book_id`),
`lib/search.ts`, `lib/format.ts`, `lib/dictate.ts`, `components/Dictate.tsx`
(which Byline copied from `snowai-app/hq`'s `components/ui/Dictate.tsx`),
`next.config.ts`, `amplify.yml`, `.github/workflows/checks.yml`,
`test/next-resolve.mjs`, `aws/compute-role.yaml` (without its SSM statement),
`app/imprint.css` (Byline's look) and, verbatim from
`snowai/docs/design/implement/protected/`, `lib/protected/viewer.ts`,
`rights.ts` and `rights.test.mts` (the sign-in check). **Copied from byline/hq,
change one, change the others**, and say so in the commit. Imprint's own are
`lib/books*.ts`, `lib/chapter*.ts`, `lib/studio-paths.ts` and the pages.

## Standing instructions — read before anything else

Set by the operator, 16 September 2026. They apply in every repository.

**0. Every chat starts in Snow AI.** Ruled by the operator, 27 September 2026: "please do not use Get Covered or anything else as a repo for now. Always use Snow as a standard to start." A new chat, and every helper session a chat starts, opens in the **Snow AI** environment with **`snowai-app/snowai`** as its repository. Other repositories are added from there as the work needs them. It never starts in the Get Covered environment or from another repository: the handoff, the ledger script and these rules live in `snowai`, and the Snow AI environment is the one whose network allows the sites the work needs.

**1. Start by checking what is pending.** Before the first reply:
- `node scripts/ledger.mjs check`, then the queue — revisions first, then oldest pending.
- The newest file in `docs/handoffs/`.
- Other chats. `mcp__Claude_Code_Remote__list_sessions` with `mine: true`. A chat is OPEN if its
  `session_status` is `RUNNING` or its `connection_status` is `connected`; anything `IDLE` /
  `COMPLETED` is closed and is not to be touched. An open one carries
  `post_turn_summary.needs_action` — what it is waiting on. Report it in one line:
  *"An open chat from 15 Sept has two things pending — review them or close it?"*

**2. One command at a time.** A CloudShell instruction is ONE command, then stop. They reply with
a screenshot; the next command follows from what it says. Never a block of commands, never "then
run this, then that". Waiting for the screenshot is the point — it is what makes the next command
right instead of a guess.

*Amended 23 September 2026 (T-1517): "give me everything one time… with less Cloud Shell
typing."* A round of CloudShell work now arrives as ONE bundle: one file to upload (a single
script, or one zip that a single script unpacks) and ONE command to run it. The script does the
steps in order, prints one line per step, and stops at the first failure with what failed and
the command that resumes from there. The screenshot of that one run is what the next round
follows from. So "one command, then stop" still holds — the command is simply the whole round.
Each bundle carries a name never used before (`round13.py`, `round14.py`…), so an upload can
never collide and no clearing step is needed first; the script deletes its own file when it
finishes cleanly. A round is: upload one file, paste one line.

**2a. One CloudShell command, after everything is finished.** Ruled by the operator,
28 September 2026 (T-1677): "one command on CloudShell after you have finished everything." Work
that needs AWS is batched into a single script, built and attached once the code is on `main`;
the operator uploads it (after its one `rm -f` line) and runs its one command. The script is
idempotent and resumable, so the next command after it follows only from its screenshot.

**3. Say where it runs, in the same sentence as the command.** "In CloudShell." "In Chrome's
DevTools console, on healthsherpa.com." Three different things are called "the console" and
choosing wrong costs an hour.

**3a. Every command in its own code block, so it carries a copy button.** Ruled by the operator,
28 September 2026 (T-1664): "Any command has to have the copy icon." A command, a file name to
type, a URL to paste — each goes in a fenced block on its own lines, never inline in a sentence
and never inside a table, so the app shows the copy icon beside it.

**4. No placeholders inside a command.** Never `export X='<paste it here>'` — it gets pasted
verbatim, and it should. If a value must be substituted, the command stands alone and the script
receiving it rejects the placeholder by name.

**5. Attach every file. Source it, build it, finish it, attach it.** Never send them to GitHub, a
browser, or a repository path to fetch anything. Rename anything that would collide. The message
that asks for an upload carries the single `rm -f` line that clears it — CloudShell refuses to
overwrite and keeps the old file silently.

**6. Exhaust it before asking.** Every URL, every source, every command, every alternative — tried,
not considered. Come back only for what genuinely needs their hands: CloudShell, their credentials,
their logged-in session, or a decision about money, vendors or scope. "I could not" is only true
after trying.

**7. Get to the point.** One line for each finished thing, then the next step. No narration of what
was attempted, no explanation of what went wrong, no apologies, no "I should have", no whose fault
it was. They asked for the result and the next action. Nothing else is wanted.

**8. Every instruction gets a ledger row when it arrives** — not at the end — closed with the
post-merge SHA on `main` and the repository name (`getcovered <sha>`). A result that only says
"done" is a failed result.

### The three commands

The operator says one of three things. Everything any one of them implies is done
without being asked, and without anything being uploaded or downloaded — the
handoff lives in the repository.

**"Close the chat for the day."**
1. Commit, push, PR and merge everything outstanding, in every repository touched.
2. Close every ledger row opened today: result, and the post-merge SHA with its
   repository name. Anything unfinished is `block`ed with what it is waiting on.
3. Write `docs/handoffs/<YYYY-MM-DD>.md` in `snowai` — what shipped with SHAs, what
   is waiting and on whom, what is next, what is blocked and why. Merge it.
4. Reply in a few lines: what shipped, what is waiting. Nothing else.

**"Opening a new chat for the day."**
1. Read the newest file in `docs/handoffs/`.
2. `node scripts/ledger.mjs check`, then the queue — revisions first, then oldest
   pending.
3. List sessions; if any chat is still open, say so in one line.
4. Reply with where things stand, what is waiting on them, and what is being started
   first. Nothing else.

**"The window is filling."**

Said by either side, and it means exactly what "close the chat for the day" means:
run that routine, then say the new chat can be opened. The context window is a
fixed size and never grows. Compaction does not add room — it replaces the
conversation with a summary and starts filling again, and each one loses more
detail than the last. Nothing survives a window except what is written down: the
ledger rows, `docs/handoffs/`, `AGENTS.md`, the code.

So a window is not crossed with unwritten state. The operator sees the meter and
this session does not — no counter is visible from in here, and guessing at one is
worse than not trying. **The operator says when the chat closes. The session
never offers to.** Ruled 22 September 2026 — "I will tell you when to close the
chat. You don't tell me." — replacing the earlier rule that had the session
offer after each finished piece of work. What the session does instead is keep
nothing unwritten: every instruction on the ledger as it arrives, every result
merged and its SHA recorded, so a close at any moment costs nothing. "The window
is filling" said by the operator is still the close routine, as below.

**A handoff is a file in this repository, merged in the session that wrote it.**
`docs/handoffs/<YYYY-MM-DD>.md`, on `main`, before the chat ends — not at the
start of the next one, and not left in the chat. A copy typed into the
conversation is a convenience for reading; it is never the record. The container
is reclaimed with everything in it, and a summary is not a handoff, so an
uncommitted one is the exact loss a handoff exists to prevent. That is not
hypothetical: the morning handoff of 3 September 2026 was written into a chat and
never committed, and it is gone. Nothing known was lost only because the evening
file said it superseded the morning one and restated what was still open (T-491).

None of the three is a request for a plan or a question back. If something genuinely
cannot be finished at close, it is blocked on the ledger and named in the handoff —
not left for them to remember.

