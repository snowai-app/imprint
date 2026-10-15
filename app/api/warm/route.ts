/**
 * KEEPING THIS APP AWAKE, SEVERAL COPIES AT ONCE (T-3168: "check on all apps
 * for cold starts and make sure they respond quick"). The server runs one copy
 * per request in flight, and a copy idle a few minutes is asleep: waking one
 * takes two to three seconds. Opening a page asks for several things at the
 * same moment, so one awake copy is not enough. The keep-warm timer (snowai
 * aws/keepwarm) calls this address a few times at once every five minutes;
 * each call holds its copy for a moment (?hold= milliseconds, at most two
 * seconds), so each lands on a copy of its own. Reads nothing; says only ok.
 * Copied from snowai-app/crm's app/api/warm/route.ts, less the CRM's own
 * loads: change one, change the others.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const hold = Math.min(2000, Math.max(0, Number(new URL(req.url).searchParams.get('hold')) || 0));
  if (hold > 0) await new Promise((r) => setTimeout(r, hold));
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
