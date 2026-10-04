'use client';

import { useRef, useState } from 'react';

/* The support address in the foot, with its Copy button (T-2131). Where the
   clipboard is refused, the address is selected instead. */
export default function CopyMail({ address, copy, copied }: { address: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  const span = useRef<HTMLSpanElement>(null);
  function select() {
    try {
      const r = document.createRange();
      if (span.current) r.selectNodeContents(span.current);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
    } catch {
      /* nothing to select */
    }
  }
  function onClick() {
    try {
      navigator.clipboard.writeText(address).then(() => {
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }, select);
    } catch {
      select();
    }
  }
  return (
    <div className="fp-mail">
      <span ref={span}>{address}</span>
      <button type="button" onClick={onClick}>{done ? copied : copy}</button>
    </div>
  );
}
