import { redirect } from 'next/navigation';
import StudioShell, { type Counts } from '@/components/StudioShell';
import { bookStore } from '@/lib/books-store';
import { loginUrl } from '@/lib/links';
import { pageViewer } from '@/lib/session';

/**
 * The studio's frame (components/StudioShell.tsx) around every page under
 * /studio. proxy.ts has already sent a signed-out visitor to the family's
 * sign-in; this checks again and reads the rail's count, which is the
 * signed-in person's own (lib/books-store.ts names the owner in every query).
 * A count that cannot be read is left out of the rail, never guessed.
 */
export const dynamic = 'force-dynamic';

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const viewer = await pageViewer();
  if (!viewer) redirect(loginUrl('/studio'));
  const counts: Counts = {};
  try {
    counts.books = (await bookStore.list(viewer.email)).length;
  } catch {
    /* the rail simply shows no number */
  }
  return <StudioShell email={viewer.email} counts={counts}>{children}</StudioShell>;
}
