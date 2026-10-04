/* The mock-up's own line drawings (Lucide-style paths on a 24-unit grid), as it drew
   them. Decorative: each sits beside words that say the same thing. */
export const P = {
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  chat: 'M4 5h16v11H8l-4 4z',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  render: 'M6 3h9l4 4v14H6zM9 13h6M9 17h4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  shieldTick: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  lockKey: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5zM12 15v2',
  form: 'M7 3h7l4 4v14H7zM14 3v4h4M10 13h5M10 17h3',
  people: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  penPlain: 'M4 20h4L19 9l-4-4L4 16z',
  folder: 'M3 7h6l2 2h10v10H3z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  tick: 'M5 12.5l4.5 4.5L19 7.5',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  play: 'M8 5l11 7-11 7z',
} as const;

export function Svg({ d, className, plain }: { d: string; className?: string; plain?: boolean }) {
  /* `plain` leaves aria-hidden off, as the mock-up's chips do: its reduced-motion rule
     hides the strip's second, aria-hidden copy, and must not hide the first's icons. */
  return (
    <svg viewBox="0 0 24 24" aria-hidden={plain ? undefined : true} className={className}>
      <path d={d} />
    </svg>
  );
}
