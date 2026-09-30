-- IMPRINT (T-1751): the books a signed-in author writes and keeps, their
-- chapters, and the sources they write from. One statement per
-- blank-line-separated block, each safe to run twice, no trailing semicolons.
-- business_slug is 'imprint' on every row. 12 statements: for each of the three
-- tables, the table, one index, row level security, and the grant.
--
-- A book is its author's alone: owner_email is the family sign-in's email and
-- every query names it (lib/books-store.ts, lib/chapter-store.ts,
-- lib/source-store.ts); row level security is on with no policy, so only
-- service_role, through the compute role, reaches the tables. A chapter and a
-- source carry the owner too, and are only ever inserted from a book that
-- owner owns, so the owner on a chapter is always its book's.
--
-- public.imprint_books: title, subtitle, the idea in the author's own words,
-- who it is for, the tone, the one positioning sentence, and the author's name
-- and "About the author" text that the export uses. status draft | done.
-- Deleting a book deletes its chapters and its sources (on delete cascade).
--
-- public.imprint_chapters: position counts from 1 and is unique within a book;
-- the constraint is DEFERRABLE INITIALLY DEFERRED so a reorder is one update
-- that swaps places without tripping it. points is a list of text, body is the
-- chapter's words (a blank line starts a paragraph), provenance is
-- [{ "at": iso, "kind": "ai_draft" | "ai_assist", "words": int }]: what AI
-- inserted and when, written only by drafting (lib/chapter-store.ts
-- appendDraft), never erased by editing. source_ids is the book's sources
-- ticked for this chapter. status outline | drafting | edited | done.
--
-- public.imprint_sources holds what an author writes from: a PDF or text
-- file's NAME, kind, size and page count, and its words page by page in `text`
-- ([{ "page": int, "text": string }]). THE FILE ITSELF IS NOT STORED: it is sent
-- to Reader, which returns the words, and only the words are kept. book_id is
-- the book it was added to (nullable: a source added to no book yet).

create table if not exists public.imprint_books (
  id             uuid primary key default gen_random_uuid(),
  business_slug  text not null default 'imprint' check (business_slug = 'imprint'),
  owner_email    text not null check (owner_email = lower(owner_email)),
  title          text not null default '' check (length(title) <= 200),
  subtitle       text not null default '' check (length(subtitle) <= 300),
  idea           text not null default '' check (length(idea) <= 6000),
  audience       text not null default '' check (length(audience) <= 500),
  tone           text not null default '' check (length(tone) <= 200),
  positioning    text not null default '' check (length(positioning) <= 500),
  author_name    text not null default '' check (length(author_name) <= 120),
  about_author   text not null default '' check (length(about_author) <= 1500),
  status         text not null default 'draft' check (status in ('draft', 'done')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
)

create index if not exists imprint_books_owner_idx on public.imprint_books (owner_email, updated_at desc)

alter table public.imprint_books enable row level security

grant select, insert, update, delete on public.imprint_books to service_role

create table if not exists public.imprint_chapters (
  id             uuid primary key default gen_random_uuid(),
  business_slug  text not null default 'imprint' check (business_slug = 'imprint'),
  book_id        uuid not null references public.imprint_books (id) on delete cascade,
  owner_email    text not null check (owner_email = lower(owner_email)),
  position       integer not null check (position >= 1),
  title          text not null check (length(btrim(title)) between 1 and 200),
  summary        text not null default '' check (length(summary) <= 1200),
  points         jsonb not null default '[]'::jsonb check (jsonb_typeof(points) = 'array'),
  body           text not null default '' check (length(body) <= 40000),
  status         text not null default 'outline' check (status in ('outline', 'drafting', 'edited', 'done')),
  provenance     jsonb not null default '[]'::jsonb check (jsonb_typeof(provenance) = 'array'),
  target_words   integer not null default 1500 check (target_words between 100 and 20000),
  source_ids     jsonb not null default '[]'::jsonb check (jsonb_typeof(source_ids) = 'array'),
  updated_at     timestamptz not null default now(),
  unique (book_id, position) deferrable initially deferred
)

create index if not exists imprint_chapters_owner_idx on public.imprint_chapters (owner_email, book_id, position)

alter table public.imprint_chapters enable row level security

grant select, insert, update, delete on public.imprint_chapters to service_role

create table if not exists public.imprint_sources (
  id             uuid primary key default gen_random_uuid(),
  business_slug  text not null default 'imprint' check (business_slug = 'imprint'),
  owner_email    text not null check (owner_email = lower(owner_email)),
  book_id        uuid references public.imprint_books (id) on delete cascade,
  name           text not null check (length(btrim(name)) between 1 and 200),
  kind           text not null check (kind in ('pdf', 'txt', 'md')),
  size_bytes     integer not null default 0 check (size_bytes >= 0),
  pages          integer not null default 0 check (pages >= 0),
  text           jsonb not null default '[]'::jsonb check (jsonb_typeof(text) = 'array'),
  created_at     timestamptz not null default now()
)

create index if not exists imprint_sources_owner_idx on public.imprint_sources (owner_email, book_id, created_at desc)

alter table public.imprint_sources enable row level security

grant select, insert, update, delete on public.imprint_sources to service_role
