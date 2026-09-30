/**
 * A timestamp as the database prints it ("2026-09-29 18:00:00.123456+00") as a
 * day a person reads ("29 Sep 2026"), in UTC. '' for anything unreadable, so a
 * page never prints "Invalid Date". No imports, so the tests can load it.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function day(stamp: string | null | undefined): string {
  if (!stamp) return '';
  const iso = stamp.trim().replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
  const d = new Date(/(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** A database timestamp as an ISO 8601 instant ("2026-09-29T18:00:00.123Z"), or null for anything unreadable. */
export function iso(stamp: string | null | undefined): string | null {
  if (!stamp) return null;
  const t = stamp.trim().replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00');
  const d = new Date(/(Z|[+-]\d\d:\d\d)$/.test(t) ? t : `${t}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** What follows an article's section in a list: " · emailed", " · published 30 Sep 2026", each only when true. */
export function flagsOf(a: { emailedAt?: string | null; publishedAt?: string | null; status?: string }): string {
  const out: string[] = [];
  if (a.emailedAt) out.push('emailed');
  if (a.status === 'published') out.push(`published${a.publishedAt && day(a.publishedAt) ? ` ${day(a.publishedAt)}` : ''}`);
  return out.map((f) => ` · ${f}`).join('');
}
