// Run 30 — the decided two-line brand lockup (§1.4). Fraunces wordmark with
// "Center" in brass over the small-caps denomination line. `tone` flips it
// for light (header) vs dark (footer) backgrounds.
import Link from 'next/link';
import { SITE } from '@/lib/site';

export default function BrandLockup({
  tone = 'light',
  href = '/',
}: {
  tone?: 'light' | 'dark';
  href?: string;
}) {
  const wm = tone === 'light' ? 'text-site-umber' : 'text-site-cream';
  const accent = tone === 'light' ? 'text-site-brassdk' : 'text-site-brass';
  const denom = tone === 'light' ? 'text-site-brassdk' : 'text-site-brass';

  return (
    <Link href={href} className="inline-flex flex-col leading-[1.05]" aria-label={`${SITE.name}, ${SITE.denom}`}>
      <span className={`font-fraunces text-[22px] font-semibold ${wm}`}>
        {SITE.nameLead}
        <span className={accent}>{SITE.nameAccent}</span>
      </span>
      <span className={`mt-[5px] text-[9.5px] font-semibold uppercase tracking-[0.19em] ${denom}`}>
        {SITE.denom}
      </span>
    </Link>
  );
}
