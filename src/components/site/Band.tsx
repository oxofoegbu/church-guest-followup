// Run 30 — section scaffolding. <Wrap> is the 1120px centered container;
// <Band> is a padded <section> (cream by default) with the wrap inside.
import type { ReactNode } from 'react';

export function Wrap({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-[1120px] px-7 ${className}`}>{children}</div>;
}

type BandVariant = 'cream' | 'cream2' | 'paper' | 'umber' | 'transparent';

const BG: Record<BandVariant, string> = {
  cream: 'bg-site-cream',
  cream2: 'bg-site-cream2',
  paper: 'bg-site-paper',
  umber: 'bg-site-umber text-site-cream',
  transparent: '',
};

export default function Band({
  children,
  variant = 'cream',
  id,
  className = '',
  wrap = true,
}: {
  children: ReactNode;
  variant?: BandVariant;
  id?: string;
  className?: string;
  wrap?: boolean;
}) {
  return (
    <section id={id} className={`relative py-[60px] sm:py-[84px] ${BG[variant]} ${className}`}>
      {wrap ? <Wrap>{children}</Wrap> : children}
    </section>
  );
}
