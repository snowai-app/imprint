'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * What the studio's pieces share, held by StudioShell (the pattern of byline's
 * studio-context.tsx): the toast, and a way to ask the server pages for their
 * counts and lists again after something changed. One shell above every studio
 * page, so all of it survives moving between the pages.
 */
export type Studio = {
  toast(message: string): void;
  /** Ask the server pages for their counts and lists again (after something changed). */
  refresh(): void;
};

export const StudioContext = createContext<Studio | null>(null);

export function useStudio(): Studio {
  const s = useContext(StudioContext);
  if (!s) throw new Error('useStudio is used inside StudioShell');
  return s;
}

/** A message that shows for a few seconds. */
export function useToast(): { message: string; on: boolean; toast(m: string): void } {
  const [message, setMessage] = useState('');
  const [on, setOn] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setMessage(m);
    setOn(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOn(false), 3400);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { message, on, toast };
}
