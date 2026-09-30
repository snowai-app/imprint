import outputs from '../aws/outputs.json';
import { capabilityKey } from './capability-key.ts';
import { pagesFromReader, type SourcePage } from './sources.ts';

/**
 * READER, CALLED (T-1751, copied from byline's lib/reader.ts; change one, change the other). A PDF an author adds as a source is read by the
 * family's Reader capability (snowai-app/extract), never by Imprint: `POST
 * /api/text/paged` with the PDF as the raw body and the shared capability key
 * answers `{ pages: [{ pageNumber, text }] }`, blank pages kept so a page
 * number stays true. Imprint stores none of the file, only the words.
 *
 * The call is marked PROTECTED (`x-snowai-protected: 1`): an author's PDF may
 * hold a person's details, and Reader then works in memory and keeps nothing
 * (no copy, no words, no cache entry). Reader's own list of callers does not
 * know `imprint` yet, so it counts Imprint's calls as `other`; adding it there
 * is Reader's change.
 *
 * Reader down, or refusing, is said in words a person can act on, and nothing
 * is kept then (lib/sources-api.ts stores only what came back).
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
export class ReaderUnavailable extends Error {}

export type Reader = (pdf: Uint8Array) => Promise<SourcePage[]>;

const READER = () => (process.env.READER_URL?.trim() || (outputs.capabilities as { read?: string }).read || '').replace(/\/+$/, '');
const TIMEOUT_MS = 55_000;

export const callReader: Reader = async (pdf) => {
  const base = READER();
  const key = await capabilityKey();
  if (!base) throw new ReaderUnavailable('Reader is not set up for Imprint yet. Nothing was kept.');
  if (!key) throw new ReaderUnavailable("Imprint cannot reach Reader just now: its capability key could not be read. Nothing was kept.");
  let res: Response;
  try {
    res = await fetch(`${base}/api/text/paged`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/pdf', 'x-snowai-app': 'imprint', 'x-snowai-protected': '1' },
      body: pdf as BodyInit,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ReaderUnavailable('Reader could not be reached just now, so the PDF was not read and nothing was kept. Try again in a minute.');
  }
  if (res.status === 401) throw new ReaderUnavailable("Reader refused Imprint's key. Nothing was kept.");
  if (res.status === 413) throw new ReaderUnavailable('Reader says that PDF is too large. Nothing was kept.');
  if (res.status === 400 || res.status === 422) throw new ReaderUnavailable('Reader could not read that PDF: it may be damaged or protected. Nothing was kept.');
  if (!res.ok) throw new ReaderUnavailable(`Reader answered ${res.status}, so the PDF was not read and nothing was kept. Try again in a minute.`);
  const out = (await res.json().catch(() => null)) as { pages?: { pageNumber: number; text: string }[] } | null;
  if (!out || !Array.isArray(out.pages)) throw new ReaderUnavailable('Reader gave an answer Imprint does not recognise. Nothing was kept.');
  return pagesFromReader(out.pages);
};
