import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { familyTitle } from '@/family/apps';
import { THEME_COOKIE, themeFrom } from '@/lib/theme';
import { VISITOR_HEADER } from '@/lib/visitor';
import Visitor from './visitor';
import './google-sans.css';
import '@/family/tokens.css';
import '@/family/app-colours.css';
import '@/family/components.css';
import './imprint.css';
import CookieBar from '@/family/components/CookieBar';
import { CONSENT_COOKIE, framedRequest, parseConsent } from '@/family/consent';
import { FAMILY_LINKS } from '@/lib/links';
import AskSnow from '@/family/components/AskSnow';
import EmbedScript from '@/family/components/EmbedScript';

export const metadata: Metadata = {
  title: familyTitle('imprint'),
  description: 'Imprint is where a book is written from your own expertise: an idea, a title, an outline, chapter drafts and a Word and PDF file. Not open yet.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'light', themeColor: '#fff1e5' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* Set only by proxy.ts, which cuts any copy a browser sends (lib/visitor.ts). */
  const visitor = (await headers()).get(VISITOR_HEADER) === '1';
  /* Light unless the person chose dark (T-2120). */
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  /* The family's one cookie choice (family/consent.ts, T-2143), read here so
     a visitor who has chosen never sees the bar, not even for a frame. */
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  const framed = framedRequest((await headers()).get('sec-fetch-dest'));
  return (
    <html suppressHydrationWarning lang="en" data-app="imprint" data-theme={theme}>
      <head>
        {/* Embed mode, before anything paints (family/embed.ts, T-2223). */}
        <EmbedScript />
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
        {/* Ask Snow, the family's guide (T-2168), on the public pages. */}
        {framed ? null : <AskSnow site="imprint" endpoint={FAMILY_LINKS.ask} hideOn={['/studio']} />}
        <CookieBar initial={consent} framed={framed} privacyHref={`${FAMILY_LINKS.snowai}/privacy`} />
      </body>
    </html>
  );
}
