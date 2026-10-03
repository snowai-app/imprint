import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { THEME_COOKIE, themeFrom } from '@/lib/theme';
import { VISITOR_HEADER } from '@/lib/visitor';
import Visitor from './visitor';
import './google-sans.css';
import './imprint.css';

export const metadata: Metadata = {
  title: 'Imprint · Snow AI',
  description: 'Imprint is where a book is written from your own expertise: an idea, a title, an outline, chapter drafts and a Word and PDF file. Not open yet.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'light', themeColor: '#FFF1E5' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* Set only by proxy.ts, which cuts any copy a browser sends (lib/visitor.ts). */
  const visitor = (await headers()).get(VISITOR_HEADER) === '1';
  /* Light unless the person chose dark (T-2120). */
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme}>
      <head>
        <link rel="preload" href="/fonts/google-sans-normal-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {/* ESCAPE CLOSES STUDIO'S BOX (operator, 2 October 2026, T-1945). Shown inside
            Studio's box, an Escape this page does not use itself is passed to Studio,
            and only to Studio, so it closes the box as it does everywhere else. */}
        <script dangerouslySetInnerHTML={{ __html: "if(window.parent!==window){addEventListener('keydown',function(e){if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('dialog[open]'))window.parent.postMessage({type:'studio:escape'},'https://studio.snowai.app')})}" }} />
        <a className="skip" href="#main">Skip to the content</a>
        {children}
        {visitor ? <Visitor /> : null}
      </body>
    </html>
  );
}
