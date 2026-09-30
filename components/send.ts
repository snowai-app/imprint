/** One call to Imprint's own API from a page: the JSON back, or its error in words. */
export async function send<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; problems?: string[] }> {
  try {
    const r = await fetch(url, { method, headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as T & { error?: string; login?: string; problems?: string[] };
    if (r.status === 401 && j.login) {
      location.href = j.login;
      return { ok: false, error: 'Sign in first.' };
    }
    return r.ok ? { ok: true, data: j } : { ok: false, error: j.error ?? `Not done (${r.status}).`, problems: j.problems };
  } catch {
    return { ok: false, error: 'Imprint could not be reached. Check the connection and try again.' };
  }
}

/** Add one file as a source: a form upload to Imprint's own /api/sources, the source back or the reason in words. */
export async function uploadSource<T = { source: unknown }>(file: File): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const form = new FormData();
    form.append('file', file);
    const r = await fetch('/api/sources', { method: 'POST', body: form });
    const j = (await r.json().catch(() => ({}))) as T & { error?: string; login?: string };
    if (r.status === 401 && j.login) {
      location.href = j.login;
      return { ok: false, error: 'Sign in first.' };
    }
    return r.ok ? { ok: true, data: j } : { ok: false, error: j.error ?? `Not added (${r.status}).` };
  } catch {
    return { ok: false, error: 'Imprint could not be reached. Check the connection and try again.' };
  }
}
