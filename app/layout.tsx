import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { VISITOR_HEADER } from '@/lib/visitor';
import Visitor from './visitor';
import './imprint.css';

export const metadata: Metadata = {
  title: 'Imprint · Snow AI',
  description: 'Imprint is where a book is written from your own expertise: an idea, a title, an outline, chapter drafts and a Word and PDF file. Not open yet.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'light', themeColor: '#FFF1E5' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* Set only by proxy.ts, which cuts any copy a browser sends (lib/visitor.ts). */
  const visitor = (await headers()).get(VISITOR_HEADER) === '1';
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
      </head>
      <body>
        <a className="skip" href="#main">Skip to the content</a>
        {children}
        {visitor ? <Visitor /> : null}
      </body>
    </html>
  );
}
