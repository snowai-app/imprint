import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { viewerOf } from './protected/viewer.ts';
import type { Viewer } from './protected/rights.ts';
import { loginUrl } from './links.ts';
import { VISITOR_HEADER } from './visitor.ts';

/** Who is looking at a page: the family's sa-id cookie, read the same way
 *  the API routes read it (lib/protected/viewer.ts), as snowai-app/byline's
 *  (pitch's, model's) lib/session.ts. A visitor is nobody: the proxy has
 *  already taken the cookies away, and this checks its mark again. Imprint has
 *  no suite owner: nothing here publishes, and a book is its author's alone. */
export async function pageViewer(): Promise<Viewer | null> {
  const h = await headers();
  if (h.get(VISITOR_HEADER) === '1') return null;
  return viewerOf(new Request('https://imprint.snowai.app/', { headers: { cookie: h.get('cookie') ?? '' } }));
}

/** The viewer, or off to the family's sign-in, coming back to `path`. */
export async function requireViewer(path: string): Promise<Viewer> {
  const viewer = await pageViewer();
  if (!viewer) redirect(loginUrl(path));
  return viewer;
}
