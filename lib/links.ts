/**
 * Where Imprint lives and where the family signs in. A blank variable counts
 * as absent, so an empty row in the console never hands '' to an <a href>.
 *
 * Imports carry their `.ts` extension so the tests can load this file with
 * Node's own type stripping, without a bundler.
 */
import { APPS } from '../family/apps.ts';

const env = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value && value.trim() ? value.trim().replace(/\/+$/, '') : fallback;
};

export const IMPRINT_URL = 'https://imprint.snowai.app';
export const LOGIN_URL = env('NEXT_PUBLIC_FRONT_URL', 'https://snowai.app') + '/login';

/** The family's sign-in, coming back to `path` on Imprint. */
export const loginUrl = (path: string) => `${LOGIN_URL}?next=${encodeURIComponent(new URL(path, IMPRINT_URL).toString())}`;

/**
 * Every app in the family kit (family/apps.ts), by its id, for the launcher
 * and the not-found page (T-2126). The kit names each app's variable and
 * never a hostname; this file reads the variable with the real address as
 * the default, so nothing in a component is a hostname.
 */
const FAMILY_DEFAULTS: Record<string, string> = {
  snowai: 'https://snowai.app',
  documents: 'https://documents.snowai.app',
  sign: 'https://sign.snowai.app',
  invoice: 'https://invoice.snowai.app',
  compliance: 'https://compliance.snowai.app',
  extract: 'https://reader.snowai.app',
  render: 'https://render.snowai.app',
  tax: 'https://tax.snowai.app',
  model: 'https://model.snowai.app',
  forms: 'https://forms.snowai.app',
  crm: 'https://crm.snowai.app',
  portal: 'https://portal.snowai.app',
  recovery: 'https://recovery.snowai.app',
  network: 'https://network.snowai.app',
  memo: 'https://memo.snowai.app',
  transcribe: 'https://transcribe.snowai.app',
  /* Nothing is served at campaigns.snowai.app yet: snowai.app's page for it. */
  campaigns: 'https://snowai.app/campaigns',
  webinar: 'https://webinar.snowai.app',
  video: 'https://video.snowai.app',
  pitch: 'https://pitch.snowai.app',
  ask: 'https://ask.snowai.app',
  atlas: 'https://atlas.snowai.app',
  story: 'https://story.snowai.app',
  rewards: 'https://rewards.snowai.app',
  playbook: 'https://playbook.snowai.app',
  byline: 'https://byline.snowai.app',
  imprint: 'https://imprint.snowai.app',
  foundry: 'https://foundry.snowai.app',
  metis: 'https://metis.snowai.app',
  getcovered: 'https://getcovered.cloud',
  hq: 'https://hq.snowai.app',
  studio: 'https://studio.snowai.app',
  workbench: 'https://workbench.snowai.app',
  data: 'https://data.snowai.app',
};

/** The family's addresses by app id, read through the environment. */
export const FAMILY_LINKS: Record<string, string> = Object.fromEntries(APPS.map((a) => [a.id, env(a.env, FAMILY_DEFAULTS[a.id] ?? '')]));

/** The full shelf at snowai.app: the launcher's last link and the 404's second. */
export const SHELF = `${FAMILY_LINKS.snowai}/apps`;
