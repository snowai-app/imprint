'use client';

/* Visitor mode in the page (lib/visitor.ts), copied from snowai-app/forms'
   components/VisitorMode.tsx, which is snowai-app/portal's
   VisitorMode without its translations. Mounted only when proxy.ts marked the
   request a visitor's. It changes nothing about how the page looks or moves:
   family links carry `?visitor=1`; framed by HQ it says where it is; not
   framed it shows one pill to leave. */

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HQ_ORIGIN, isFamilyHost } from '@/lib/visitor';

function carryVisitor(root: ParentNode) {
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    let url: URL;
    try {
      url = new URL(a.href, location.href);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || url.host === location.host || !isFamilyHost(url.hostname)) continue;
    if (url.searchParams.get('visitor') === '1') continue;
    url.searchParams.set('visitor', '1');
    a.href = url.href;
  }
}

export default function Visitor() {
  const path = usePathname();
  const [framed, setFramed] = useState<boolean | null>(null);

  useEffect(() => {
    setFramed(window.top !== window.self);
    carryVisitor(document);
    const links = new MutationObserver(() => carryVisitor(document));
    links.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
    return () => links.disconnect();
  }, []);

  useEffect(() => {
    if (window.top === window.self) return;
    const t = window.setTimeout(() => {
      try {
        window.parent.postMessage({ type: 'sa-visitor-location', href: location.href, title: document.title }, HQ_ORIGIN);
      } catch {
        /* not HQ's frame */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [path]);

  if (framed !== false) return null;
  return (
    <a className="visitor-pill" href="?visitor=0">
      Visitor view · Exit
    </a>
  );
}
