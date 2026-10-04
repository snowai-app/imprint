/*
 * The family's not-found page (T-2126), from family/templates/not-found.tsx,
 * in place of Next's built-in 404.
 */
import type { Metadata } from 'next';
import NotFound from '@/family/components/NotFound';
import { familyTitle } from '@/family/apps';
import { SHELF } from '@/lib/links';

const APP = 'imprint';

export const metadata: Metadata = { title: familyTitle(APP, 'Page not found') };

export default function NotFoundPage() {
  return <NotFound app={APP} homeHref="/" shelfHref={SHELF} />;
}
