/*
 * TEMPLATE: copy to app/not-found.tsx and set APP to this app's id in
 * family/apps.ts (the same value as data-app on <html>). It renders inside the
 * root layout, so the layout's data-theme (light unless chosen) applies.
 * Everywhere but snowai.app, also pass shelfHref: the family's front door
 * from the app's lib/links.ts, never a hostname typed here.
 */
import type { Metadata } from 'next';
import NotFound from '@/family/components/NotFound';
import { familyTitle } from '@/family/apps';

const APP = 'snowai';

export const metadata: Metadata = { title: familyTitle(APP, 'Page not found') };

export default function NotFoundPage() {
  return <NotFound app={APP} homeHref="/" />;
}
