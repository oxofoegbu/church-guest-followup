// Run 31 — shorter dark hero for interior pages: full-bleed photo + an
// AA-verified umber scrim (white text ≥5.4:1), breadcrumb, gold eyebrow,
// Fraunces H1, optional lede. Text is live HTML over the scrim, never baked.
import Link from 'next/link';
import { Wrap } from './Band';
import type { ReactNode } from 'react';

const SCRIM =
  'linear-gradient(90deg, rgba(30,19,14,0.90) 0%, rgba(30,19,14,0.72) 46%, rgba(30,19,14,0.40) 74%, rgba(30,19,14,0.25) 100%)';

export default function InteriorHero({
  image,
  alt,
  eyebrow,
  title,
  lede,
  current,
  objectPosition = '60% 42%',
}: {
  image: string;
  alt: string;
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  current: string;
  objectPosition?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-site-umber">
      <img
        src={image}
        alt={alt}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition }}
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: SCRIM }} />
      <Wrap className="relative py-20 sm:py-24">
        <nav aria-label="Breadcrumb" className="text-[13px] text-site-cream/60">
          <Link href="/home" className="border-b border-white/25 text-site-cream/70 hover:text-white">
            Home
          </Link>
          <span className="px-2">/</span>
          <span>{current}</span>
        </nav>
        <p className="mt-4 text-[12.5px] font-semibold uppercase tracking-[0.32em] text-site-gold">
          {eyebrow}
        </p>
        <h1 className="mt-3.5 max-w-[820px] font-fraunces text-[34px] font-semibold leading-[1.06] tracking-[-0.01em] text-white sm:text-[44px] lg:text-[50px]">
          {title}
        </h1>
        {lede ? (
          <p className="mt-4 max-w-[620px] text-[18px] leading-[1.55] text-site-cream/90 sm:text-[20px]">
            {lede}
          </p>
        ) : null}
      </Wrap>
    </section>
  );
}
