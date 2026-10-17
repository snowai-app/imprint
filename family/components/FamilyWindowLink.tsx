'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { openAddressInWorkspace } from './FamilyWorkspace';

/**
 * A link to a given page of another family app that opens it in the window on
 * this page (T-3249, the standing rule of T-3248: "I don't want them to go to a
 * second tab unless absolutely necessary"). The page needs the workspace
 * (AppLauncher with `snowai`, or a family bar); without it, or with a modifier
 * key, the link opens in its own tab as before. `app` is the app's id; left
 * out, it is read from the address's host (`voice.snowai.app` is voice).
 */
export default function FamilyWindowLink({
  href,
  app,
  name,
  children,
  onClick,
  ...rest
}: { href: string; app?: string; name?: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target'>) {
  let id = app;
  if (!id) {
    try {
      id = new URL(href).host.split('.')[0];
    } catch {
      id = undefined;
    }
  }
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener"
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !id) return;
        if (openAddressInWorkspace(id, href, name)) e.preventDefault();
      }}
    >
      {children}
    </a>
  );
}
