'use client';

import { useEffect } from 'react';

/* The gentle rise below the fold (T-2131), as the mock-up does it: anything marked
   fp-rise that starts below the first screen is lowered a little and rises into place
   when it scrolls in. The resting state is the visible one, so without script, and
   with reduced motion, everything is simply there. */
export default function Rise({ root }: { root: string }) {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const vh = window.innerHeight || 800;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.remove('fp-pre');
          io.unobserve(e.target);
        }
      }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll(`.${root} .fp-rise`).forEach((el) => {
      if (el.getBoundingClientRect().top > vh) {
        el.classList.add('fp-pre');
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, [root]);
  return null;
}
