/**
 * THE FAMILY'S APPS: one list, copied byte for byte into every app (T-2126).
 *
 * Every app in both families, in the shape the family kit reads: its id (the
 * key in palette.json and the value of `data-app` on <html>), its full name
 * and the short one used inside the app, the job it is grouped under, the
 * Lucide glyph on its tile, the environment variable that holds its address,
 * how far along it is, and whether it is the operator's own.
 *
 * Pure data with no imports, so a test can read it with nothing else loaded.
 *
 * NO HOSTNAME IS WRITTEN HERE. Each app reads the addresses through its own
 * `lib/links.ts`, which reads `env` with the real address as the default; this
 * file only names the variable. Statuses are the catalogue's truth on
 * 4 October 2026: an app that exists but is not yet open to the public is
 * "In build", and nothing here states a price or any other figure.
 */

/** The jobs the shelf and the launcher group by, in the order they show.
 *  The ids are palette.json's `group` values. */
export const GROUPS = [
  { id: 'paper', label: 'Paperwork and billing' },
  { id: 'plan', label: 'Tax and planning' },
  { id: 'clients', label: 'Clients and conversation' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'answers', label: 'Answers and rewards' },
  { id: 'pubs', label: 'Publications' },
  /* GetCovered stands alone (operator, 4 October 2026): its own brand, colour
     and app list. On snowai.app's shelf it keeps its own group, as before. */
  { id: 'gc', label: 'Insurance' },
  { id: 'company', label: 'Company', operatorOnly: true },
] as const;

export type GroupId = (typeof GROUPS)[number]['id'] | 'hub';

/**
 * How far along an app is, and therefore what its tile may honestly say.
 *
 *   open      the account can open it now
 *   included  the account's plan has it; not set up yet
 *   try       it can be previewed before it is bought
 *   building  under construction: "In build", never a button that looks live
 *   planned   named and nothing more
 */
export type Status = 'open' | 'included' | 'try' | 'building' | 'planned';

export const STATUS_LABEL: Record<Status, string> = {
  open: 'Open',
  included: 'Included',
  try: 'Try',
  building: 'In build',
  planned: 'Planned',
};

/** Lucide glyph names (kebab case, as lucide.dev lists them). `glyphs.tsx`
 *  maps each one to its component. */
export type GlyphName =
  | 'snowflake'
  | 'files'
  | 'pen-line'
  | 'receipt'
  | 'shield-check'
  | 'scan-text'
  | 'file-output'
  | 'landmark'
  | 'sliders-horizontal'
  | 'clipboard-list'
  | 'contact'
  | 'door-open'
  | 'hand-coins'
  | 'users'
  | 'mic'
  | 'audio-lines'
  | 'send'
  | 'presentation'
  | 'clapperboard'
  | 'target'
  | 'message-circle-question-mark'
  | 'compass'
  | 'quote'
  | 'gift'
  | 'newspaper'
  | 'feather'
  | 'book-open'
  | 'graduation-cap'
  | 'sprout'
  | 'heart-pulse'
  | 'building-2'
  | 'layout-dashboard'
  | 'flask-conical'
  | 'database';

export type FamilyApp = {
  /** The key in palette.json and the value of `data-app` on <html>. */
  id: string;
  /** The full name: browser titles, the product page, emails, sign-in. */
  name: string;
  /** What the app calls itself inside, and what a tile is labelled. */
  short: string;
  /** One line, sentence case, no figures. */
  line: string;
  group: GroupId;
  glyph: GlyphName;
  /** The environment variable each app's lib/links.ts reads for the address. */
  env: string;
  /** Which master brand it carries. GetCovered stands alone. */
  brand: 'snowai' | 'getcovered';
  status: Status;
  /** The company's own surfaces: filtered out on the server for everyone else. */
  operatorOnly: boolean;
  /** Byline, Imprint and Playbook keep the paper ground as a publication look. */
  paper?: boolean;
  /** `false` while the app's address does not answer yet (no DNS record;
   *  family audit, T-2148). The launcher still shows the app with its status,
   *  but draws no link. Remove it the day the address is up. */
  live?: false;
  /** `false` for an app whose address only forwards elsewhere now (the
   *  Workbench, T-2174: to snowai.app/try and Studio). Its name and colours
   *  stay for the forwarder; no launcher and no shelf draws it. Remove the
   *  entry the day the app is retired. */
  listed?: false;
};

export const APPS: FamilyApp[] = [
  /* The front door itself: never on its own shelf, but it has a tile. */
  { id: 'snowai', name: 'Snow AI', short: 'Snow AI', line: 'Every app in the family, on one login.', group: 'hub', glyph: 'snowflake', env: 'NEXT_PUBLIC_SNOWAI_URL', brand: 'snowai', status: 'open', operatorOnly: false },

  /* Paperwork and billing */
  { id: 'documents', name: 'Snow AI Documents', short: 'Documents', line: 'Write, store and send every document a practice owes its clients.', group: 'paper', glyph: 'files', env: 'NEXT_PUBLIC_DOCUBASE_URL', brand: 'snowai', status: 'try', operatorOnly: false },
  { id: 'sign', name: 'Snow AI Sign', short: 'Sign', line: 'Send a document out to be signed, and keep what was said about it.', group: 'paper', glyph: 'pen-line', env: 'NEXT_PUBLIC_SIGN_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'invoice', name: 'Snow AI Invoice', short: 'Invoice', line: 'Create, send and keep invoices; clients pay by card or Zelle.', group: 'paper', glyph: 'receipt', env: 'NEXT_PUBLIC_INVOICE_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'compliance', name: 'Snow AI Compliance', short: 'Compliance', line: 'Readiness, evidence and an auditor view for SOC 2, HIPAA and the Safeguards Rule.', group: 'paper', glyph: 'shield-check', env: 'NEXT_PUBLIC_COMPLIANCE_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'extract', name: 'Snow AI Extract', short: 'Extract', line: 'The words in a PDF, where each one sits, and a picture of every page.', group: 'paper', glyph: 'scan-text', env: 'NEXT_PUBLIC_READER_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'render', name: 'Snow AI Render', short: 'Render', line: 'Documents in, PDF or Word out.', group: 'paper', glyph: 'file-output', env: 'NEXT_PUBLIC_RENDER_URL', brand: 'snowai', status: 'building', operatorOnly: false },

  /* Tax and planning */
  { id: 'tax', name: 'Snow AI Tax', short: 'Tax', line: 'Returns prepared by your tax firm or by you, federal and every state, with the reason for every number.', group: 'plan', glyph: 'landmark', env: 'NEXT_PUBLIC_TAX_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'model', name: 'Snow AI Model', short: 'Model', line: 'Income, expenses and filing, with the levers that change the outcome side by side.', group: 'plan', glyph: 'sliders-horizontal', env: 'NEXT_PUBLIC_MODEL_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'forms', name: 'Snow AI Forms', short: 'Forms', line: 'Forms and surveys, added to any Snow AI app.', group: 'plan', glyph: 'clipboard-list', env: 'NEXT_PUBLIC_FORMS_URL', brand: 'snowai', status: 'building', operatorOnly: false },

  /* Clients and conversation */
  { id: 'crm', name: 'Snow AI CRM', short: 'CRM', line: 'The client book: details, services, money, time, tasks and issues in one place.', group: 'clients', glyph: 'contact', env: 'NEXT_PUBLIC_CRM_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'portal', name: 'Snow AI Portal', short: 'Portal', line: 'One account for everything your agency does for you: health insurance, taxes and more.', group: 'clients', glyph: 'door-open', env: 'NEXT_PUBLIC_PORTAL_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'recovery', name: 'Snow AI Recovery', short: 'Recovery', line: 'The collections desk for agencies and the creditors they work for.', group: 'clients', glyph: 'hand-coins', env: 'NEXT_PUBLIC_RECOVERY_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'network', name: 'Snow AI Network', short: 'Network', line: 'One network: members ask and answer, and businesses offer what they do.', group: 'clients', glyph: 'users', env: 'NEXT_PUBLIC_NETWORK_URL', brand: 'snowai', status: 'building', operatorOnly: false, live: false },
  { id: 'memo', name: 'Snow AI Memo', short: 'Memo', line: 'Voice messages with their transcript.', group: 'clients', glyph: 'mic', env: 'NEXT_PUBLIC_MEMO_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'transcribe', name: 'Snow AI Transcribe', short: 'Transcribe', line: 'A recording in, its words and their timings out.', group: 'clients', glyph: 'audio-lines', env: 'NEXT_PUBLIC_TRANSCRIBE_URL', brand: 'snowai', status: 'building', operatorOnly: false },

  /* Outreach */
  { id: 'campaigns', name: 'Snow AI Campaigns', short: 'Campaigns', line: 'Lists, templates and campaigns: the engine every brand here sends through.', group: 'outreach', glyph: 'send', env: 'NEXT_PUBLIC_CAMPAIGNS_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'webinar', name: 'Snow AI Webinar', short: 'Webinar', line: 'Webinars and talks: the library, a page for each talk, and registration.', group: 'outreach', glyph: 'presentation', env: 'NEXT_PUBLIC_WEBINAR_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'video', name: 'Snow AI Video', short: 'Video', line: 'A video in; its poster, a playback copy and its captions out.', group: 'outreach', glyph: 'clapperboard', env: 'NEXT_PUBLIC_VIDEO_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'pitch', name: 'Snow AI Pitch', short: 'Pitch', line: 'Sales coaching: courses, practice and role-play.', group: 'outreach', glyph: 'target', env: 'NEXT_PUBLIC_PITCH_URL', brand: 'snowai', status: 'building', operatorOnly: false },

  /* Answers and rewards */
  { id: 'ask', name: 'Snow AI Ask', short: 'Ask', line: 'Answers from everything your account holds, in every app.', group: 'answers', glyph: 'message-circle-question-mark', env: 'NEXT_PUBLIC_ASK_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'atlas', name: 'Snow AI Atlas', short: 'Atlas', line: 'The Snow AI family in one search.', group: 'answers', glyph: 'compass', env: 'NEXT_PUBLIC_ATLAS_URL', brand: 'snowai', status: 'building', operatorOnly: false, live: false },
  { id: 'story', name: 'Snow AI Story', short: 'Story', line: 'A customer’s story, written as an email, a post, a video script or a page.', group: 'answers', glyph: 'quote', env: 'NEXT_PUBLIC_STORY_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'rewards', name: 'Snow AI Rewards', short: 'Rewards', line: 'Clients earn points for surveys and forms, and spend them on rewards.', group: 'answers', glyph: 'gift', env: 'NEXT_PUBLIC_REWARDS_URL', brand: 'snowai', status: 'building', operatorOnly: false },

  /* Publications */
  { id: 'playbook', name: 'Snow AI Playbook', short: 'Playbook', line: 'Business and health, explained for people who run their own.', group: 'pubs', glyph: 'newspaper', env: 'NEXT_PUBLIC_PLAYBOOK_URL', brand: 'snowai', status: 'building', operatorOnly: false, paper: true },
  { id: 'byline', name: 'Snow AI Byline', short: 'Byline', line: 'Where articles are written and published, under your own name.', group: 'pubs', glyph: 'feather', env: 'NEXT_PUBLIC_BYLINE_URL', brand: 'snowai', status: 'building', operatorOnly: false, paper: true },
  { id: 'imprint', name: 'Snow AI Imprint', short: 'Imprint', line: 'Where a book is written: idea, title, outline, chapters, then the file.', group: 'pubs', glyph: 'book-open', env: 'NEXT_PUBLIC_IMPRINT_URL', brand: 'snowai', status: 'building', operatorOnly: false, paper: true },
  { id: 'foundry', name: 'Snow AI Foundry', short: 'Foundry', line: 'The student publication, for high schoolers and the college-bound.', group: 'pubs', glyph: 'graduation-cap', env: 'NEXT_PUBLIC_FOUNDRY_URL', brand: 'snowai', status: 'building', operatorOnly: false },
  { id: 'metis', name: 'Snow AI Metis', short: 'Metis', line: 'Dedicated to women and open to everyone: career, academics and health.', group: 'pubs', glyph: 'sprout', env: 'NEXT_PUBLIC_METIS_URL', brand: 'snowai', status: 'building', operatorOnly: false },

  /* Insurance: GetCovered, its own master brand */
  { id: 'getcovered', name: 'Get Covered', short: 'Get Covered', line: 'Health coverage end to end, for the agents who place it.', group: 'gc', glyph: 'heart-pulse', env: 'NEXT_PUBLIC_GETCOVERED_URL', brand: 'getcovered', status: 'building', operatorOnly: false },

  /* Company: the operator's own */
  { id: 'hq', name: 'Snow AI HQ', short: 'HQ', line: 'The company, every business rolled up: revenue, activity and what was decided.', group: 'company', glyph: 'building-2', env: 'NEXT_PUBLIC_HQ_URL', brand: 'snowai', status: 'open', operatorOnly: true },
  { id: 'studio', name: 'Snow AI Studio', short: 'Studio', line: 'Every capability in one place, beside the file it works on.', group: 'company', glyph: 'layout-dashboard', env: 'NEXT_PUBLIC_STUDIO_URL', brand: 'snowai', status: 'open', operatorOnly: true },
  /* The Workbench forwards: its tools moved to Studio and its public bench to Try (T-2174). */
  { id: 'workbench', name: 'Snow AI Workbench', short: 'Workbench', line: 'Forwards to Try, on the front door, and to Studio.', group: 'company', glyph: 'flask-conical', env: 'NEXT_PUBLIC_WORKBENCH_URL', brand: 'snowai', status: 'open', operatorOnly: true, listed: false },
  { id: 'data', name: 'Snow AI Data', short: 'Data', line: 'Leads from every site in the family, and the buyers who take them.', group: 'company', glyph: 'database', env: 'NEXT_PUBLIC_DATA_URL', brand: 'snowai', status: 'open', operatorOnly: true },
];

/** One app by id. */
export function appById(id: string): FamilyApp | undefined {
  return APPS.find((a) => a.id === id);
}

/** What the launcher draws for one app: plain data, safe to hand from a
 *  server component to the client. */
export type LauncherApp = Pick<FamilyApp, 'id' | 'short' | 'line' | 'group' | 'glyph' | 'status'> & {
  /** Empty when the app has no working address yet (`live: false`): the
   *  launcher shows it, with its status, and draws no link. */
  href: string;
  /** The app whose tile colour it wears, when that is not its own id (a
   *  second door into the same product). */
  tile?: string;
};

/**
 * The launcher's list, made ON THE SERVER: the brand's apps with their
 * addresses, without the front door itself, and without the operator's own
 * surfaces unless the viewer is an operator, and without an app that only
 * forwards elsewhere now (`listed: false`). Filtering here rather than in
 * the browser keeps HQ, Studio and the rest out of a customer's page entirely.
 *
 * `hrefs` is the app's own address map (lib/links.ts), by app id; an app with
 * no address is left out rather than linked nowhere. An app whose address does
 * not answer yet (`live: false`) stays in the list, as the family shows what
 * exists, but with an empty `href`, so the launcher draws it without a link.
 * GetCovered stands alone:
 * its launcher lists only GetCovered; Snow AI's shelf keeps GetCovered in its
 * Insurance group, as it always has.
 */
export function launcherApps(
  hrefs: Partial<Record<string, string>>,
  { operator, brand = 'snowai' }: { operator: boolean; brand?: FamilyApp['brand'] },
): LauncherApp[] {
  return APPS.filter((a) => a.group !== 'hub')
    .filter((a) => brand === 'snowai' || a.brand === brand)
    .filter((a) => !a.operatorOnly || operator)
    .filter((a) => a.listed !== false)
    .filter((a) => Boolean(hrefs[a.id]))
    .map((a) => ({ id: a.id, short: a.short, line: a.line, group: a.group, glyph: a.glyph, status: a.status, href: a.live === false ? '' : (hrefs[a.id] as string) }));
}

/** `Page · Snow AI Invoice`, or the app's own name for its home. */
export function familyTitle(id: string, page?: string): string {
  const name = appById(id)?.name ?? 'Snow AI';
  return page ? `${page} · ${name}` : name;
}
