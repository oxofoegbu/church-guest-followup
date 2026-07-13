// Run 30 — shared site footer (umber). Brand lockup + NAP block (byte-
// identical to the JSON-LD, both read from SITE) and the three link columns.
import Link from 'next/link';
import BrandLockup from './BrandLockup';
import { Wrap } from './Band';
import { SITE } from '@/lib/site';

const COLUMNS: { heading: string; links: { label: React.ReactNode; href: string }[] }[] = [
  {
    heading: 'The Journey',
    links: [
      { label: 'Welcome Track', href: '/begin' },
      { label: <>BECOME®</>, href: '/become' },
      { label: 'Disciplers', href: '/discipler' },
      { label: 'Leaders Track', href: '/leaders' },
    ],
  },
  {
    heading: 'Explore',
    links: [
      { label: "I'm New", href: '/im-new' },
      { label: 'Watch & Read', href: '/teaching' },
      { label: 'Gatherings', href: '/gatherings' },
      { label: 'About', href: '/about' },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { label: 'Plan a Visit', href: '/im-new' },
      { label: 'Prayer', href: '/prayer' },
      { label: 'Give', href: '/give' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-site-footer py-16 text-[14.5px] text-site-cream/70">
      <Wrap>
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <BrandLockup tone="dark" />
            <p className="mt-4 leading-[1.7] text-site-cream/65">
              A people learning to be with Jesus,
              <br />
              become like Jesus, and bring heaven.
            </p>
            <p className="mt-4 leading-[1.7] text-site-cream/65">
              {SITE.street}
              <br />
              {SITE.city}, {SITE.region} {SITE.postal}
              <br />
              {SITE.serviceDayPlural} at {SITE.serviceTime}
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-4 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-site-brass">
                {col.heading}
              </h2>
              <ul className="space-y-2.5">
                {col.links.map((l, i) => (
                  <li key={i}>
                    <Link href={l.href} className="text-site-cream/70 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-11 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-6 text-[13px] text-site-cream/50">
          <span>
            © 2026 {SITE.name} · {SITE.denom} · {SITE.regionName}
          </span>
          <span>Being with Jesus, before doing for Jesus.</span>
        </div>
      </Wrap>
    </footer>
  );
}
