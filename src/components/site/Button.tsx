// Run 30 — site Button. A pill link (radius 40px) in the four mock-up
// variants. Server component; renders a Next <Link> for internal routes.
import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'ghostLight' | 'cream';

const BASE =
  'inline-flex items-center gap-2 rounded-[40px] px-6 py-[13px] text-[15px] font-semibold ' +
  'border-[1.5px] border-transparent transition-all duration-200 will-change-transform';

const VARIANTS: Record<Variant, string> = {
  // ember primary — the site's one action color
  primary: 'bg-site-ember text-white hover:bg-site-emberdk hover:-translate-y-px',
  // brass-outlined ghost, on light backgrounds
  ghost: 'text-site-umber border-site-brass hover:bg-site-brass hover:text-white',
  // light-outlined ghost, on dark backgrounds (hero, dark bands)
  ghostLight: 'text-white border-white/55 hover:bg-white/15 hover:border-white',
  // cream, on dark backgrounds
  cream: 'bg-site-cream text-site-umber hover:bg-white hover:-translate-y-px',
};

export default function Button({
  href,
  variant = 'primary',
  children,
  className = '',
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
