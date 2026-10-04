import type { ReactNode } from 'react';

/* A value from words.ts as the page draws it. The words may carry <em>, <b>, <small>,
   <br>, <span class="soon"> and <span class="gap">, exactly as the mock-up wrote them;
   they become elements here, so nothing is set as raw HTML. Any other tag is not
   markup and is left as text. Shared by the server page and the client parts. */
const TAG = /<(\/?)(em|b|small|span|br)( class="(soon|gap)")?\s*\/?>/g;

type Frame = { tag: 'em' | 'b' | 'small' | 'span' | ''; cls?: string; kids: ReactNode[] };

export function rich(s: string): ReactNode {
  if (!s.includes('<')) return s;
  const root: Frame = { tag: '', kids: [] };
  const stack: Frame[] = [root];
  let at = 0;
  let n = 0;
  for (const m of s.matchAll(TAG)) {
    const top = stack[stack.length - 1];
    if (m.index > at) top.kids.push(s.slice(at, m.index));
    at = m.index + m[0].length;
    if (m[2] === 'br') {
      top.kids.push(<br key={n++} />);
    } else if (m[1]) {
      if (stack.length === 1) continue;
      const f = stack.pop()!;
      const El = f.tag as 'em';
      stack[stack.length - 1].kids.push(<El key={n++} className={f.cls ? `fp-${f.cls}` : undefined}>{f.kids}</El>);
    } else {
      stack.push({ tag: m[2] as Frame['tag'], cls: m[4], kids: [] });
    }
  }
  if (at < s.length) stack[stack.length - 1].kids.push(s.slice(at));
  while (stack.length > 1) {
    const f = stack.pop()!;
    stack[stack.length - 1].kids.push(...f.kids);
  }
  return root.kids;
}
