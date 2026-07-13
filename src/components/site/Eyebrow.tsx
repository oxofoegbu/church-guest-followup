// Run 30 — the small-caps eyebrow / kicker. 12.5px, wide tracking, uppercase.
// Default brass on light; pass a color class for dark sections (site-gold, etc).
import type { ReactNode } from 'react';

export default function Eyebrow({
  children,
  color = 'text-site-brassdk',
  className = '',
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <p
      className={`text-[12.5px] font-semibold uppercase tracking-[0.32em] ${color} ${className}`}
    >
      {children}
    </p>
  );
}
