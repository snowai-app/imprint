/**
 * ASK SNOW: THE PARTS WITH NO SCREEN (T-2168). Pure, no imports, so the
 * family test, the Ask service and the browser all read the same rules.
 *
 * Ask Snow is the family's one assistant (the operator's approved guide and
 * library mock-ups, 4 October 2026). On a public page it is the guide in the
 * corner (components/AskSnow.tsx); signed in, it is the Ask button in the
 * product's header with a side panel (components/AskSnowButton.tsx). Both
 * talk to the Ask service (the app named `ask`): the operator’s library word for
 * word first, then that site's own pages, then a person.
 *
 * What lives here:
 *  - the words, in English, as one object a translated app replaces;
 *  - protected mode: Social Security numbers, dates of birth and health
 *    words are masked BEFORE anything is sent, and the call is then made
 *    with `"protected": true` so Ask keeps no copy (Ask's protected lane);
 *  - the greeting rule: once per visit, after 10 seconds or half a scroll,
 *    remembered when closed, never on a phone until Ask is tapped;
 *  - the shapes the service answers in.
 */

/* ------------------------------------------------------------------ shapes */

/** Where an answer came from, in the order Ask Snow tries them. */
export type AskSource = 'library' | 'pages' | 'person' | 'refused';

export type AskButton = { label: string; href: string };

/** One answer from `POST /api/guide`. */
export type AskAnswer = {
  answer: string;
  /** A first line in the site's colour, when the answer is "X does that". */
  lead?: string;
  button: AskButton | null;
  source: AskSource;
  /** True when the question was sent in protected mode: nothing was kept. */
  protected: boolean;
  /** The pages an answer written from the site's pages rests on. */
  sources?: { name: string; url: string }[];
  /** The library entry, when the answer is one. */
  answerId?: string;
};

/** A quick choice under the greeting (the operator's presets by page). */
export type AskChoice = {
  label: string;
  /** answer: opens a library answer · followup: asks a follow-up question ·
   *  person: hands over to a person · ask: sends the label as a question */
  kind: 'answer' | 'followup' | 'person' | 'ask';
  answerId?: string;
  ask?: string;
  options?: AskChoice[];
};

/** `GET /api/guide/presets?url=` */
export type AskPreset = { site: string; greeting: string; choices: AskChoice[]; pattern?: string };

/* ------------------------------------------------------------------- words */

export type AskSnowLabels = typeof ASK_SNOW_EN;

/** Every word Ask Snow shows, in English. A translated app passes its own. */
export const ASK_SNOW_EN = {
  name: 'Ask Snow',
  ask: 'Ask',
  /** The line under the name in the greeting and the panel. */
  guideLine: 'AI guide · answers from our pages',
  accountLine: '{short} · Snow AI pages',
  greetingFallback: 'Hi, welcome to {brand}. What are you trying to get done?',
  somethingElse: 'Something else',
  somethingElseReply: 'Of course. Type your question below.',
  typeQuestion: 'Or type your question',
  placeholder: 'Ask about {short} or the family',
  accountPlaceholder: 'Ask about {short} or the family',
  send: 'Send',
  close: 'Close',
  closeGreeting: 'Close the greeting',
  open: 'Open Ask Snow',
  typing: 'Ask Snow is writing',
  conversation: 'Conversation',
  yourQuestion: 'Your question',
  honest: 'AI assistant · answers from Snow AI’s own pages · not tax, legal or insurance advice',
  accountWelcome: 'Ask about {short}, or anything on Snow AI’s pages. Answers come from {short} and the family’s pages.',
  pool: 'Questions this month: shared across your account',
  poolNote: 'Every app on your account draws on one allowance. The allowance is being set.',
  from: 'From: {source}',
  fromLibrary: 'From the Snow AI library',
  /* protected mode */
  protectedOn: 'Protected mode is on for this conversation · no copy kept',
  protectedChip: 'Protected mode · no copy kept',
  protectedTyping: 'Protected mode is on: {what} will be hidden before anything is sent, and no copy is kept.',
  protectedReply: 'I’ve hidden {what}. I never need one here, and in protected mode this conversation keeps no copy of it.',
  ssn: 'a Social Security number',
  dob: 'a date of birth',
  health: 'a health detail',
  and: 'and',
  /* a person */
  person: 'Talk to a person',
  personOffer: 'I couldn’t find that on our pages.',
  personOfferBody: 'I’d rather not guess. A person from our team can answer it.',
  askElse: 'Ask something else',
  personTitle: 'Talk to a person',
  personHere: 'A person from our team will reply here, in this box.',
  personLeave: 'If you might leave before they reply, we can write back instead.',
  personSignIn: 'A person from our team can answer this. Leave your email and they’ll write back, here while this page is open and by email.',
  yesContact: 'Yes, contact me',
  noWait: 'No, I’ll wait here',
  notNow: 'Not now',
  waitReply: 'Fine. Keep this page open and the reply will appear here.',
  notNowReply: 'No problem. Nothing about you is kept. Ask me anything else.',
  reach: 'How should we reach you?',
  nameLabel: 'Name',
  optional: '(optional)',
  emailLabel: 'Email',
  phoneLabel: 'Phone',
  callConsent: 'Snow AI may call or text me at this number.',
  contactFine: 'Used only to answer this question.',
  sendDetails: 'Send my details',
  emailWrong: 'Enter an email address so we can write back.',
  detailsTitle: 'Details received',
  detailsEmail: 'Thanks. We’ll write back by email.',
  detailsCall: 'Thanks. We’ll write by email, and may call or text the number you gave.',
  detailsNoCall: 'Thanks. We’ll write by email only, because calls and texts weren’t allowed.',
  waiting: 'Waiting for a person',
  someoneOn: 'Someone from our team is here.',
  nobodyOn: 'Nobody is on just now. The reply will come here and by email.',
  protectedNoPerson: 'A protected conversation isn’t handed to a person here, so nothing in it is kept. Write to support and leave out the protected details.',
  failed: 'That didn’t go through. Try again in a moment.',
  busy: 'Lots of questions just now. Try again in a minute.',
  sentAgain: 'Sent.',
};

export type AskSnowWords = Partial<AskSnowLabels>;

/** Fill `{name}` slots in a label. */
export function fill(label: string, vars: Record<string, string>): string {
  return label.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

/* ---------------------------------------------------------- protected mode */

export type Found = 'ssn' | 'dob' | 'health';

const SSN = /\b\d{3}[- ]\d{2}[- ]\d{4}\b|(?<![\d$.,])\b\d{9}\b(?![\d.,])/g;
const BIRTH = /\b(born|birth|birthday|birthdate|dob|d\.o\.b)\b/i;
const NUMDATE = /\b(0?[1-9]|1[0-2])[/.-](0?[1-9]|[12]\d|3[01])[/.-](\d{4}|\d{2})\b/g;
const ISODATE = /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;
const WORDDATE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+(\d{4})\b/gi;
const HEALTH =
  /\b(diabetes|diabetic|cancer|pregnan(t|cy)|diagnos(is|ed)|medications?|prescriptions?|hiv|asthma|surgery|chemo(therapy)?|depression|anxiety disorder|heart disease|insulin|dialysis|hepatitis|epilepsy|bipolar|schizophrenia|dementia)\b/gi;
/** A date is taken for a birth date when the text says "born" or similar, or
 *  when its year is before this one: a 2026 due date is not a birth date. */
const OLD_YEAR = 2015;

/**
 * Mask what Ask Snow never needs: Social Security numbers, dates of birth and
 * health words. `live` is for a box being typed in: a bare nine-digit number
 * or a short date is left until something is typed after it, so a number
 * still being written is not masked halfway.
 */
export function maskText(text: string, live = false): { text: string; found: Found[] } {
  const found = new Set<Found>();
  const input = String(text ?? '');
  const birth = BIRTH.test(input);
  const done = (m: string, off: number, str: string) => !live || off + m.length < str.length;
  const old = (y: string) => y.length === 2 || Number(y) < OLD_YEAR;
  let t = input.replace(SSN, (m: string, off: number, str: string) => {
    if (m.length === 9 && !done(m, off, str)) return m;
    found.add('ssn');
    return '•••-••-••••';
  });
  t = t.replace(NUMDATE, (m: string, _a: string, _b: string, y: string, off: number, str: string) => {
    if ((birth || old(y)) && (y.length === 4 || done(m, off, str))) {
      found.add('dob');
      return '••/••/••••';
    }
    return m;
  });
  t = t.replace(ISODATE, (m: string) => {
    if (birth || Number(m.slice(0, 4)) < OLD_YEAR) {
      found.add('dob');
      return '••••-••-••';
    }
    return m;
  });
  t = t.replace(WORDDATE, (m: string, _mo: string, _s: string, y: string) => {
    if (birth || Number(y) < OLD_YEAR) {
      found.add('dob');
      return '•••• ••, ••••';
    }
    return m;
  });
  t = t.replace(HEALTH, () => {
    found.add('health');
    return '••••';
  });
  return { text: t, found: [...found] };
}

/** "a Social Security number and a date of birth", in the labels' language. */
export function foundWords(found: Found[], labels: Pick<AskSnowLabels, 'ssn' | 'dob' | 'health' | 'and'> = ASK_SNOW_EN): string {
  return found.map((k) => labels[k]).join(` ${labels.and} `);
}

/* --------------------------------------------------------------- greeting */

/** The greeting waits this long, or for half a scroll, whichever is first. */
export const GREET_AFTER_MS = 10_000;
/** At or below this width the page is a phone: nothing appears until Ask is tapped. */
export const PHONE_MAX_WIDTH = 600;

/** none: not shown yet · shown: shown this visit · closed: closed this visit. */
export type GreetState = 'none' | 'shown' | 'closed';

/** The per-visit memory: sessionStorage, one key per site. */
export const visitKey = (site: string) => `ask-snow.visit.${site}`;

export function readGreetState(raw: string | null | undefined): GreetState {
  return raw === 'shown' || raw === 'closed' ? raw : 'none';
}

/**
 * Whether the greeting appears by itself now. Never on a phone, never while
 * the panel is open, never when greeting is switched off, never twice in a
 * visit and never again once closed. `shown` means it was shown earlier this
 * visit and is put back as it was (a page change within the visit).
 */
export function greetNow(o: { state: GreetState; phone: boolean; open: boolean; enabled: boolean; elapsedMs: number; scrolledHalf: boolean }): 'show' | 'restore' | 'wait' | 'never' {
  if (!o.enabled || o.phone || o.state === 'closed') return 'never';
  if (o.open) return 'wait';
  if (o.state === 'shown') return 'restore';
  return o.elapsedMs >= GREET_AFTER_MS || o.scrolledHalf ? 'show' : 'wait';
}

/** Half a scroll: the page has moved at least half of what it can. */
export function scrolledHalf(scrollTop: number, scrollHeight: number, clientHeight: number): boolean {
  const max = scrollHeight - clientHeight;
  return max > 0 && scrollTop >= max / 2;
}

/** The greeting and choices when the service cannot be reached. */
export function fallbackPreset(site: string, brand: string, labels: AskSnowLabels = ASK_SNOW_EN): AskPreset {
  return {
    site,
    greeting: fill(labels.greetingFallback, { brand }),
    choices: [{ label: labels.somethingElse, kind: 'followup', ask: labels.somethingElseReply }],
  };
}

/** The longest question the guide sends. The service refuses longer. */
export const MAX_QUESTION = 500;
