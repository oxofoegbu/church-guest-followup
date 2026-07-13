// Run 30 — the homepage hero. Two treatments:
//   variant="light" (decided): the golden-hour well; DARK copy over a CREAM
//     scrim on the left (desktop) — AA-verified (eyebrow ≈5.6:1, lede ≈5.0:1,
//     H1 ≈11:1). Mobile stacks the image over a solid-cream text block, so the
//     dark well/stone can never sink the small labels.
//   variant="dark": the ember/portrait treatment; white copy over an ember
//     scrim (kept for reuse). Text is always live HTML over a scrim, never
//     baked into the image.
import Button from './Button';
import { Wrap } from './Band';
import type { ReactNode } from 'react';

type Variant = 'light' | 'dark';

const LIGHT_DESKTOP_SCRIM =
  'linear-gradient(90deg, rgba(251,247,239,0.985) 0%, rgba(251,247,239,0.965) 50%, rgba(251,247,239,0.86) 63%, rgba(251,247,239,0.42) 77%, rgba(251,247,239,0.06) 90%, rgba(251,247,239,0) 100%)';
const DARK_DESKTOP_SCRIM =
  'linear-gradient(90deg, rgba(52,16,11,0.94) 0%, rgba(52,16,11,0.85) 40%, rgba(52,16,11,0.46) 64%, rgba(52,16,11,0.10) 88%, rgba(52,16,11,0) 100%)';
const DARK_MOBILE_SCRIM =
  'linear-gradient(180deg, rgba(42,14,9,0.30) 0%, rgba(42,14,9,0.60) 45%, rgba(42,14,9,0.86) 72%, rgba(42,14,9,0.96) 100%)';

type Meta = { lead: string; rest: string[] };

export default function Hero({
  variant = 'light',
  eyebrow,
  title,
  lede,
  primary,
  ghost,
  meta,
  imageWide,
  imageMobile,
  alt,
  objectPosition = '50% 45%',
  objectPositionMobile = '55% 42%',
}: {
  variant?: Variant;
  eyebrow: ReactNode;
  title: ReactNode;
  lede: ReactNode;
  primary: { label: string; href: string };
  ghost: { label: string; href: string };
  meta: Meta;
  imageWide: string;
  imageMobile: string;
  alt: string;
  objectPosition?: string;
  objectPositionMobile?: string;
}) {
  const light = variant === 'light';
  const cEyebrow = light ? 'text-site-brassdk' : 'text-site-gold';
  const cH1 = light ? 'text-site-umber' : 'text-white';
  const cLede = light ? 'text-site-soft' : 'text-white/90';
  const cMeta = light ? 'text-site-soft' : 'text-white/85';
  const cMetaLead = light ? 'text-site-umber' : 'text-white';
  const ghostVariant = light ? 'ghost' : 'ghostLight';

  const eyebrowEl = (
    <p className={`text-[12.5px] font-semibold uppercase tracking-[0.32em] ${cEyebrow}`}>{eyebrow}</p>
  );
  const titleEl = (
    <h1
      className={`mb-5 mt-4 font-fraunces text-[38px] font-semibold leading-[1.05] tracking-[-0.01em] ${cH1} sm:text-[52px] lg:text-[60px] lg:leading-[1.04]`}
    >
      {title}
    </h1>
  );
  const ledeEl = (
    <p className={`mb-8 max-w-[600px] text-[18px] leading-[1.55] ${cLede} sm:text-[20px]`}>{lede}</p>
  );
  const ctaEl = (
    <div className="flex flex-wrap items-center gap-3.5">
      <Button href={primary.href} variant="primary">
        {primary.label}
      </Button>
      <Button href={ghost.href} variant={ghostVariant}>
        {ghost.label}
      </Button>
    </div>
  );
  const metaEl = (
    <div className={`mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14.5px] ${cMeta}`}>
      <span className={`font-semibold ${cMetaLead}`}>{meta.lead}</span>
      {meta.rest.map((r, i) => (
        <span key={i} className="flex items-center gap-x-2.5">
          <span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-site-brass" />
          <span>{r}</span>
        </span>
      ))}
    </div>
  );

  return (
    <section aria-label="Welcome to Grace Life Center">
      {/* Desktop — full-bleed image with a left scrim */}
      <div className="relative hidden overflow-hidden md:block" style={{ minHeight: 640 }}>
        <img
          src={imageWide}
          alt={alt}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: light ? LIGHT_DESKTOP_SCRIM : DARK_DESKTOP_SCRIM }}
        />
        <Wrap className="relative flex min-h-[640px] items-center py-24">
          <div className="max-w-[760px]">
            {eyebrowEl}
            {titleEl}
            {ledeEl}
            {ctaEl}
            {metaEl}
          </div>
        </Wrap>
      </div>

      {/* Mobile */}
      {light ? (
        // Light: image banner over a solid-cream text block (bulletproof AA)
        <div className="md:hidden">
          <div className="relative h-[44vh] min-h-[300px]">
            <img
              src={imageMobile}
              alt={alt}
              fetchPriority="high"
              className="h-full w-full object-cover"
              style={{ objectPosition: objectPositionMobile }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-24"
              style={{ background: 'linear-gradient(180deg, rgba(251,247,239,0) 0%, rgba(251,247,239,0.9) 100%)' }}
            />
          </div>
          <div className="bg-site-cream px-7 pb-12 pt-6">
            {eyebrowEl}
            {titleEl}
            {ledeEl}
            {ctaEl}
            {metaEl}
          </div>
        </div>
      ) : (
        // Dark: image with a bottom ember scrim, white text overlaid
        <div className="relative overflow-hidden md:hidden" style={{ minHeight: 560 }}>
          <img
            src={imageMobile}
            alt={alt}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: '62% 36%' }}
          />
          <div aria-hidden="true" className="absolute inset-0" style={{ background: DARK_MOBILE_SCRIM }} />
          <Wrap className="relative flex min-h-[560px] flex-col justify-end pb-14 pt-40">
            <div>
              {eyebrowEl}
              {titleEl}
              {ledeEl}
              {ctaEl}
              {metaEl}
            </div>
          </Wrap>
        </div>
      )}
    </section>
  );
}
