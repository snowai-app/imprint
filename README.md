# Imprint

**Where a book is written, from Snow AI.** `imprint.snowai.app`. A signed-in
author goes from an idea, to a title, to an outline of chapters, to chapter drafts,
to a Word and a PDF file. Nonfiction, for professionals writing a client guide or
a lead-magnet book from their own expertise (insurance agents, tax preparers,
coaches, consultants). No fiction features. Nothing publishes or sends.

*A byline puts your name on an article, an imprint puts your name on a book.*
Imprint is Byline's sibling and is built from it: same skeleton, same sign-in,
same look, same machinery, renamed. Read `AGENTS.md` (identical to `CLAUDE.md`)
for the rules; this file is how to run it.

## Status

- **Stage 0 (on `main`)**: front page, `/api/health`, sign-in gate on `/studio`,
  the Books list, visitor mode, the schema and role, tests.
- Next, in order: the book (idea, title options, outline editor), the chapters
  (overview, workspace, "Draft this chapter"), the AI disclosure helper, sources
  and the Word and PDF export.
- **Not built**: EPUB, print-ready PDF (trim size, bleed), a cover, filing in
  Documents, Word import, the capability door other apps will call.

## Run it

    npm ci
    npm run dev        # http://localhost:3000
    npm test           # node's own test runner, with mocks for Ask, Reader, Render
    npx tsc --noEmit
    npm run build

Without AWS credentials the front page and `/api/health` work (health answers
`table: false`); the studio needs the family's sign-in cookie and the database.

## Routes

| Route | |
| --- | --- |
| `/` | public: what Imprint is, for whom, that it is not open yet. Never calls Ask or the database |
| `/studio` | the signed-in author's own books |
| `GET /api/health` | `{ ok, service: 'imprint', keyReadable, table }`, open, no secret; never fails |

## AWS (the operator's round)

1. Run `db/schema.sql`: **12 statements**, one per blank-line block, each safe to
   run twice (three tables: `imprint_books`, `imprint_chapters`,
   `imprint_sources`; an index, row level security and the grant for each).
2. Create the stack `snowai-imprint-compute` from `aws/compute-role.yaml`: the role
   `snowai-imprint-compute` with the database, its secret and the shared capability
   key. No SSM, no KMS key of its own.
3. Create the Amplify app `imprint` from `snowai-app/imprint`, with that role, **no
   environment variables**, and the subdomain `imprint` on snowai.app.

Until the tables exist the studio says its books could not be read, and the front
page and health never break.

## The capabilities it calls

Ask (ideas, outlines, drafts), Reader (the words of a PDF source) and Render (the
Word and PDF files), each with the shared capability key read from Secrets
Manager by the compute role. Their addresses are in `aws/outputs.json`.
