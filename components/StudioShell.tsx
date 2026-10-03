'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { StudioContext, useToast, type Studio } from './studio-context';
import { ThemeSwitch } from './ThemeSwitch';
import { ROOMS, bookPath, crumbFor, disclosurePath, filesPath, outlinePath, railCurrent, sourcesPath } from '@/lib/studio-paths';

/**
 * THE STUDIO'S FRAME (T-1751), in Byline's shape and look: a wheat band across
 * the top (the crumb and "+ New book"), a rail on the left (Books; inside a
 * book its rooms; the tools beside you) and the page in the middle. Every room
 * is a path (lib/studio-paths.ts) and a Link, so a saved address lands where
 * it says. The pages themselves are server components; this shell holds only
 * what they share (studio-context.tsx).
 */
export type Counts = { books?: number };

const TOOLS: [string, string][] = [
  ['Ask', 'ideas, drafts'],
  ['Reader', 'PDF text'],
  ['Render', 'Word, PDF'],
  ['Transcribe', 'dictation'],
];

export default function StudioShell({ email, counts, children }: { email: string; counts: Counts; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { message, on, toast } = useToast();
  const cur = railCurrent(path);
  const [word, room] = crumbFor(path);
  const studio = useMemo<Studio>(() => ({ toast, refresh: () => router.refresh() }), [toast, router]);

  const inBook = cur.book
    ? ([
        ['overview', 'Chapters', bookPath(cur.book)],
        ['outline', 'Outline', outlinePath(cur.book)],
        ['sources', 'Sources', sourcesPath(cur.book)],
        ['disclosure', 'AI disclosure', disclosurePath(cur.book)],
        ['files', 'Files', filesPath(cur.book)],
      ] as const)
    : null;

  return (
    <StudioContext.Provider value={studio}>
      <div className="band" role="region" aria-label="Studio bar">
        <a className="name" href="/"><i aria-hidden="true" />Imprint <small>Studio</small></a>
        <div className="crumb" aria-live="polite"><b>{word}</b>{room}</div>
        <div className="acts">
          {cur.tab === 'new' ? null : <Link className="bt go" href={ROOMS.new}>+ New book</Link>}
        </div>
        <ThemeSwitch />
      </div>
      <div className="shell">
        <nav className="rail" aria-label="Imprint">
          <Link className="brand" href={ROOMS.books}><i aria-hidden="true">I</i><span><b>Imprint</b><small>Write a book</small></span></Link>
          <ul className="nav">
            <li>
              <Link className="nv" href={ROOMS.books} aria-current={cur.tab === 'books' && !cur.book ? 'page' : undefined}>
                Books{typeof counts.books === 'number' ? <span className="n">{counts.books}</span> : null}
              </Link>
            </li>
            {cur.tab === 'new' ? (
              <li><Link className="nv" href={ROOMS.new} aria-current="page">New book</Link></li>
            ) : null}
          </ul>
          {inBook ? (
            <div className="spaces bookrooms">
              <h2>This book</h2>
              <ul className="nav">
                {inBook.map(([key, label, href]) => (
                  <li key={key}>
                    <Link className="nv" href={href} aria-current={cur.room === key || (key === 'overview' && cur.room === 'chapter') ? 'page' : undefined}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="spaces">
            <h2>Beside you</h2>
            <ul className="tools">
              {TOOLS.map(([name, what]) => <li key={name}>{name} <span>{what}</span></li>)}
            </ul>
            <p className="hint" style={{ margin: '14px 18px 0' }}>Signed in as {email}</p>
          </div>
        </nav>
        <main className="work" id="main" tabIndex={-1}>{children}</main>
      </div>
      <div className={`toast${on ? ' on' : ''}`} role="status">{message}</div>
    </StudioContext.Provider>
  );
}
