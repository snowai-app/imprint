import { keyReadable } from '@/lib/capability-key';
import { run } from '@/lib/db';

/** Open, no secret: can Imprint read the capability key (to reach Ask, Reader
 *  and Render), and is its table there. Never breaks: a database that cannot
 *  be reached is `table: false`. */
export const dynamic = 'force-dynamic';

export async function GET() {
  let table = false;
  try {
    const [r] = await run<{ n: number }>(`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name = 'imprint_books'`);
    table = (r?.n ?? 0) === 1;
  } catch {
    table = false;
  }
  let key = false;
  try {
    key = await keyReadable();
  } catch {
    key = false;
  }
  return Response.json({ ok: true, service: 'imprint', keyReadable: key, table }, { headers: { 'Cache-Control': 'no-store' } });
}
