import { EMBED_SCRIPT } from '../embed';

/**
 * EMBED MODE, THE GUEST'S HALF (T-2223): put this once at the top of the root
 * layout, inside <head> (or first inside <body> when the layout draws no
 * head), so it runs before anything paints. It does nothing at all unless
 * the page is in a frame and in embed mode; see EMBED_SCRIPT in embed.ts.
 *
 * Marks <html data-embed="1">, so give <html> `suppressHydrationWarning`. An
 * app whose Content-Security-Policy has a script-src passes the page's
 * `nonce`.
 */
export default function EmbedScript({ nonce }: { nonce?: string }) {
  return <script id="fam-embed" nonce={nonce} dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />;
}
