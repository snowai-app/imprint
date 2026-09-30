import outputs from '../aws/outputs.json';
import { capabilityKey } from './capability-key.ts';

/**
 * ASK, CALLED (T-1751; copied from snowai-app/byline's lib/ask.ts, which is
 * pitch's: change one, change the others). Imprint never calls a model provider itself: every
 * generation goes to the family's Ask capability, `POST /api/ask`, in its
 * `messages` shape (snowai-app/ask's app/api/ask/route.ts), with the shared
 * capability key. Ask answers `{ data }`, the model's JSON already parsed.
 *
 * `from` says who is asking (`{ app: 'imprint', part: 'chapter' }`), so Ask's
 * count names the part. `protected: true` goes with anything that may hold a
 * person's details (an author's idea, notes and sources):
 * Ask then answers exactly as usual and keeps no copy of the words.
 *
 * Nothing sent or answered is logged here, and an error says only what went
 * wrong, in words a person can act on. `retryable` marks the failures worth
 * one more try (the model did not answer, or gave something unparseable).
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type AskOptions = { part: string; protected: boolean; maxTokens?: number };
export type Ask = (messages: ChatMessage[], options: AskOptions) => Promise<unknown>;

export class AskUnavailable extends Error {
  retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

const ASK = () => `${(process.env.ASK_URL?.trim() || outputs.capabilities.ask).replace(/\/+$/, '')}/api/ask`;
const TIMEOUT_MS = 55_000;

export const callAsk: Ask = async (messages, options) => {
  const key = await capabilityKey();
  if (!key) throw new AskUnavailable("Imprint cannot reach Ask just now: its capability key could not be read.");
  let res: Response;
  try {
    res = await fetch(ASK(), {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messages,
        maxTokens: options.maxTokens ?? 1200,
        from: { app: 'imprint', part: options.part },
        ...(options.protected ? { protected: true } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AskUnavailable('Ask could not be reached just now. Try again in a minute.', true);
  }
  if (res.status === 401) throw new AskUnavailable("Ask refused Imprint's key.");
  if (res.status === 502 || res.status === 503 || res.status === 504) throw new AskUnavailable(`Ask answered ${res.status}: the model did not answer.`, true);
  if (!res.ok) throw new AskUnavailable(`Ask answered ${res.status}.`);
  const out = (await res.json().catch(() => null)) as { data?: unknown } | null;
  if (!out || !('data' in out)) throw new AskUnavailable('Ask gave an answer Imprint does not recognise.', true);
  return out.data;
};
