/* db/schema.sql and aws/compute-role.yaml, read as text: the rules every
   app's schema and role keep, and that every SQL query names the owner. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const blocks = () => read('db/schema.sql').split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim()).filter(Boolean);
const queries = (file: string) => [...read(file).matchAll(/`((?:select|insert|update|delete)[\s\S]*?)`/g)].map((m) => m[1]);

test('the schema: twelve idempotent statements, one per blank-line block, no semicolons, three tables with an index, RLS and the grant each', () => {
  const b = blocks();
  assert.equal(b.length, 12);
  for (const s of b) {
    assert.doesNotMatch(s, /;\s*$/);
    assert.match(s, /^(create table if not exists|create index if not exists|alter table \S+ enable row level security|grant )/);
  }
  for (const t of ['imprint_books', 'imprint_chapters', 'imprint_sources']) {
    assert.ok(b.some((s) => s.startsWith(`create table if not exists public.${t} `)), t);
    assert.ok(b.some((s) => s.startsWith('create index if not exists') && s.includes(`on public.${t} `)), `${t} index`);
    assert.ok(b.includes(`alter table public.${t} enable row level security`), `${t} rls`);
    assert.ok(b.includes(`grant select, insert, update, delete on public.${t} to service_role`), `${t} grant`);
  }
  assert.doesNotMatch(read('db/schema.sql'), /create policy/i, 'RLS with no policy: only service_role reaches the tables');
});

test('every table: business_slug imprint, the lower-case owner rule, and no file stored', () => {
  const b = blocks();
  for (const t of ['imprint_books', 'imprint_chapters', 'imprint_sources']) {
    const create = b.find((s) => s.startsWith(`create table if not exists public.${t} `))!;
    assert.match(create, /business_slug\s+text not null default 'imprint' check \(business_slug = 'imprint'\)/, t);
    assert.match(create, /owner_email\s+text not null check \(owner_email = lower\(owner_email\)\)/, t);
  }
  assert.doesNotMatch(b.find((s) => s.includes('imprint_sources '))!, /bytea|\bfile\b|\burl\b/i);
});

test('the books: the fields the brief names, draft | done, and what the export needs', () => {
  const create = blocks().find((s) => s.startsWith('create table if not exists public.imprint_books '))!;
  for (const col of ['id', 'title', 'subtitle', 'idea', 'audience', 'tone', 'positioning', 'author_name', 'about_author', 'status', 'created_at', 'updated_at']) assert.match(create, new RegExp(`\\n  ${col}\\s`), col);
  assert.match(create, /status\s+text not null default 'draft' check \(status in \('draft', 'done'\)\)/);
});

test('the chapters: a book that cascades, positions unique and DEFERRABLE, provenance and the four statuses', () => {
  const create = blocks().find((s) => s.startsWith('create table if not exists public.imprint_chapters '))!;
  for (const col of ['id', 'book_id', 'owner_email', 'position', 'title', 'summary', 'points', 'body', 'status', 'provenance', 'target_words', 'source_ids', 'updated_at']) assert.match(create, new RegExp(`\\n  ${col}\\s`), col);
  assert.match(create, /book_id\s+uuid not null references public\.imprint_books \(id\) on delete cascade/);
  assert.match(create, /unique \(book_id, position\) deferrable initially deferred/);
  assert.match(create, /status\s+text not null default 'outline' check \(status in \('outline', 'drafting', 'edited', 'done'\)\)/);
  assert.match(create, /provenance\s+jsonb not null default '\[\]'::jsonb check \(jsonb_typeof\(provenance\) = 'array'\)/);
  assert.match(create, /points\s+jsonb not null default '\[\]'::jsonb check \(jsonb_typeof\(points\) = 'array'\)/);
});

test('the sources: like Byline\'s, plus a book that may be none, the words as jsonb', () => {
  const create = blocks().find((s) => s.startsWith('create table if not exists public.imprint_sources '))!;
  for (const col of ['id', 'book_id', 'name', 'kind', 'size_bytes', 'pages', 'text', 'created_at']) assert.match(create, new RegExp(`\\n  ${col}\\s`), col);
  assert.match(create, /book_id\s+uuid references public\.imprint_books \(id\) on delete cascade/);
  assert.match(create, /text\s+jsonb not null default '\[\]'::jsonb check \(jsonb_typeof\(text\) = 'array'\)/);
});

test('every query in the books store names the owner', () => {
  const sql = queries('lib/books-store.ts');
  assert.equal(sql.length, 5, 'list, get, create, update, remove');
  for (const s of sql) assert.match(s, /owner_email\b/, s.slice(0, 50));
  for (const s of sql.filter((q) => /^(select|update|delete)/.test(q))) assert.match(s, /owner_email = :owner/, s.slice(0, 50));
});

test('every query in the chapters store names the owner and the book; a chapter is only inserted from a book the owner owns', () => {
  const sql = queries('lib/chapter-store.ts');
  assert.ok(sql.length >= 13, `found ${sql.length}`);
  for (const s of sql) assert.match(s, /owner_email\b/, s.slice(0, 60));
  for (const s of sql.filter((q) => /^(select|update|delete)/.test(q) && !/from public\.imprint_books/.test(q))) assert.match(s, /owner_email = :owner/, s.slice(0, 60));
  for (const s of sql.filter((q) => /^insert/.test(q))) {
    assert.match(s, /from public\.imprint_books b/, 'inserted from the book');
    assert.match(s, /b\.owner_email = :owner/, 'the owner\'s own book');
  }
  for (const s of sql.filter((q) => /^(update|delete)/.test(q))) assert.match(s, /book_id = cast\(:book as uuid\)/, s.slice(0, 60));
});

test('the chapters list carries no words, only how many; drafting appends and never replaces', () => {
  const file = read('lib/chapter-store.ts');
  const sql = queries('lib/chapter-store.ts');
  const lists = sql.filter((q) => q.startsWith('select ${META}, ${WORDS}'));
  assert.equal(lists.length, 2, 'the list, and the one the outline returns');
  for (const l of lists) assert.doesNotMatch(l, /FULL|c\.body/, 'the list never selects the body');
  assert.match(file, /const WORDS = `\(select count\(\*\) from regexp_matches\(c\.body, '\\\\S\+', 'g'\)\)::int as words`/);
  const append = sql.find((q) => q.includes('provenance = c.provenance ||'))!;
  assert.ok(append);
  assert.match(append, /regexp_replace\(c\.body, '\\\\s\+\$', ''\) \|\| chr\(10\) \|\| chr\(10\) \|\| :add/);
  assert.match(file, /DEFERRED|deferred/, 'the reorder says why it is one statement');
});

test('every query in the sources store names the owner; a source goes only into the owner\'s own book', () => {
  const sql = queries('lib/source-store.ts');
  assert.ok(sql.length >= 6);
  for (const s of sql) assert.match(s, /owner_email\b/, s.slice(0, 50));
  for (const s of sql.filter((q) => /^(select|delete)/.test(q) && !/count\(/.test(q))) assert.match(s, /owner_email = :owner/, s.slice(0, 50));
  const inBook = sql.find((q) => q.startsWith('insert') && q.includes('from public.imprint_books b'))!;
  assert.match(inBook, /b\.owner_email = :owner/);
  for (const s of sql.filter((q) => /order by created_at/.test(q))) assert.doesNotMatch(s, /as words/, 'a list carries no words');
});

test('the role: the database, its secret, the shared key and nothing else: no SSM, no KMS key of its own', () => {
  const t = read('aws/compute-role.yaml');
  assert.match(t, /RoleName: snowai-imprint-compute/);
  assert.match(t, /Stack snowai-imprint-compute/);
  assert.match(t, /secret:\$\{CapabilityKeySecretName\}-\*"/);
  assert.match(t, /Action: \[rds-data:ExecuteStatement, rds-data:BeginTransaction, rds-data:CommitTransaction, rds-data:RollbackTransaction\]/);
  assert.doesNotMatch(t, /AWS::KMS::Key|bedrock|s3:|ssm:/i);
  /* the one kms statement is reading the DATABASE's secret, through Secrets Manager only, as Byline's role has it */
  assert.deepEqual([...t.matchAll(/Action: \[(kms:[^\]]*)\]/g)].map((m) => m[1]), ['kms:Decrypt']);
  assert.match(t, /kms:ViaService: !Sub "secretsmanager\.\$\{AWS::Region\}\.amazonaws\.com"/);
  assert.match(t, /CapabilityKeySecretName:\n\s+Type: String\n\s+Default: snowai\/capability-key/);
  assert.match(t, /DatabaseClusterArn:\n\s+Type: String\n\s+Default: arn:aws:rds:us-east-1:294060270317:cluster:snowai-database-cluster-t7jpudariu6c/);
  assert.match(t, /DatabaseSecretArn:\n\s+Type: String\n\s+Default: arn:aws:secretsmanager:us-east-1:294060270317:secret:rds!cluster-4f948197-6cbd-4545-a6cb-a315f81e171a-Hyf0QZ/);
  assert.match(t, /DatabaseKeyArn:\n\s+Type: String\n\s+Default: arn:aws:kms:us-east-1:294060270317:key\/8146f6da-851c-40cf-8237-a3b17aec350b/);
});

test('outputs.json holds identifiers only: the database and the three capabilities Imprint calls', () => {
  const o = JSON.parse(read('aws/outputs.json'));
  assert.equal(o.region, 'us-east-1');
  assert.deepEqual(Object.keys(o.database), ['clusterArn', 'secretArn', 'name']);
  assert.deepEqual(o.capabilities, { keySecret: 'snowai/capability-key', ask: 'https://ask.snowai.app', read: 'https://reader.snowai.app', render: 'https://render.snowai.app' });
  assert.doesNotMatch(read('aws/outputs.json'), /AKIA|password|secretValue/i);
});

test('the compiled-in settings: only names that have a value', async () => {
  const src = read('next.config.ts');
  assert.match(src, /typeof value === 'string' && value\.trim\(\) !== ''/);
  for (const name of ['ASK_URL', 'READER_URL', 'RENDER_URL', 'CAPABILITY_KEY_SECRET']) assert.match(src, new RegExp(`'${name}'`));
});

test('AGENTS.md and CLAUDE.md are the same text, and both hold the rules that bound Imprint', () => {
  const a = read('AGENTS.md');
  assert.equal(a, read('CLAUDE.md'));
  for (const needle of ['Standing instructions', 'snowai-imprint-compute', 'imprint_books', 'AI disclosure', 'Copied from byline/hq']) assert.ok(a.includes(needle), needle);
});
