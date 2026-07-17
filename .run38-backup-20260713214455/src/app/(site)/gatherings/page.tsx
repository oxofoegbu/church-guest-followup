// Run 32 — Gatherings. The rhythms of the house: the Sunday gathering (in
// person, ~90 min), The Gathering (a new Saturday-evening online community,
// featured but not yet linked — its own page is coming), and the cohorts that
// walk the pathway together. Built in the shipped design family from the
// handoff §6.6 blueprint. Recurring-Event JSON-LD (schedule-based, never a
// stale date) for the two weekly gatherings.
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Gatherings — The rhythms of Grace Life Center · Laurel, Maryland';
const OG_DESC =
  'The ways we gather at Grace Life Center: a Sunday gathering in Laurel, Maryland (about 90 minutes), a new Saturday-evening online community called The Gathering, and cohorts walking the pathway together.';

export const metadata: Metadata = {
  title: 'Gatherings',
  description: OG_DESC,
  alternates: { canonical: '/gatherings' },
  openGraph: { title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/gatherings`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

// Schedule-based Event JSON-LD — describes the recurring rhythm without ever
// publishing a stale one-off date.
const eventsJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Event',
      name: 'Sunday Gathering',
      description: 'The weekly Sunday gathering of Grace Life Center — worship, prayer, and a message from the Scriptures. About 90 minutes.',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventSchedule: {
        '@type': 'Schedule',
        byDay: 'https://schema.org/Sunday',
        startTime: '10:00',
        repeatFrequency: 'P1W',
      },
      location: {
        '@type': 'Place',
        name: SITE.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: SITE.street,
          addressLocality: SITE.city,
          addressRegion: SITE.region,
          postalCode: SITE.postal,
          addressCountry: SITE.country,
        },
      },
      organizer: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    },
    {
      '@type': 'Event',
      name: 'The Gathering',
      description: 'A Saturday-evening online community — contemplative, Scripture-formed, and gentle — for anyone far from, or worn out by, church. Meets online via Zoom.',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventSchedule: {
        '@type': 'Schedule',
        byDay: 'https://schema.org/Saturday',
        startTime: '19:00',
        repeatFrequency: 'P1W',
      },
      location: { '@type': 'VirtualLocation', url: SITE.url },
      organizer: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    },
  ],
};

const ClockIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const PinIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
const ScreenIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
);

type Rhythm = {
  tag: string;
  name: string;
  blurb: string;
  meta: { icon: React.ReactNode; text: string }[];
  cta?: { href: string; label: string };
  badge?: string;
};

const RHYTHMS: Rhythm[] = [
  {
    tag: 'In person · every week',
    name: 'The Sunday Gathering',
    blurb:
      'One unhurried gathering each week in Laurel — sung worship, prayer, and a message from the Scriptures you can actually use. Come exactly as you are; your kids are cared for.',
    meta: [
      { icon: ClockIcon, text: 'Sundays at 10:00 AM · about 90 minutes' },
      { icon: PinIcon, text: '8730 Cherry Lane, Laurel, MD 20707' },
    ],
    cta: { href: '/im-new', label: 'Plan a visit →' },
  },
  {
    tag: 'Online · newly forming',
    name: 'The Gathering',
    blurb:
      'A gentle, Scripture-formed online community for anyone far from church, worn out by it, or quietly wondering about Jesus. No pressure, no pretending — a safe place to be with Him. You don’t have to believe first to belong.',
    meta: [
      { icon: ClockIcon, text: 'Saturdays at 7:00 PM · online via Zoom' },
      { icon: ScreenIcon, text: 'Contemplative, book-by-book, unhurried' },
    ],
    badge: 'Launching soon',
  },
  {
    tag: 'Together · the pathway',
    name: 'Cohorts & Tracks',
    blurb:
      'Small groups walking the journey together — the Welcome Track, BECOME®, Disciplers, and the Leaders Track. A handful of people, a real rhythm, and someone walking with you.',
    meta: [
      { icon: ClockIcon, text: 'Weekly cohorts, in seasons through the year' },
      { icon: ScreenIcon, text: 'Guest → Follower → Disciple-Maker → Leader' },
    ],
    cta: { href: '/journey', label: 'See the journey →' },
  },
];

export default function GatheringsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventsJsonLd) }} />

      <InteriorHero
        image="/site/gatherings-hero.webp"
        alt="Two men talking over an open Bible and mugs of coffee at a wooden table, warm light falling across the room."
        eyebrow="Gatherings"
        title="The rhythms of a people."
        lede="There’s more than one way to gather with us. Come in person on a Sunday, join a gentle online community, or walk the pathway with a few others — at the pace that fits your life."
        current="Gatherings"
        objectPosition="72% 42%"
      />

      {/* Weekly rhythms */}
      <Band variant="cream">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-3.5">How we gather</Eyebrow>
          <h2 className={`${H2} mb-4`}>A few honest rhythms — not a full calendar to keep up with.</h2>
          <p className="text-[18px] leading-[1.6] text-site-soft">
            We’d rather do a few things faithfully than fill a week with programs. Here’s where a
            people is actually learning to be with Jesus.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {RHYTHMS.map((r) => (
            <div key={r.name} className="flex flex-col rounded-[18px] border border-site-claydk bg-site-paper p-8">
              <div className="mb-3 flex items-center gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">{r.tag}</p>
                {r.badge ? (
                  <span className="rounded-full bg-site-well px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-site-cream">
                    {r.badge}
                  </span>
                ) : null}
              </div>
              <h3 className="mb-2.5 font-fraunces text-[25px] text-site-umber">{r.name}</h3>
              <p className="mb-5 flex-1 text-[15.5px] leading-[1.6] text-site-soft">{r.blurb}</p>
              <div className="mb-6 grid gap-2.5">
                {r.meta.map((m, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[14px] text-site-ink">
                    <span className="text-site-brassdk">{m.icon}</span>
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
              {r.cta ? (
                <Button href={r.cta.href} variant="ghost" className="self-start !px-5 !py-2.5">{r.cta.label}</Button>
              ) : (
                <Button href="/thegathering" variant="ghost" className="self-start !px-5 !py-2.5">Learn about The Gathering →</Button>
              )}
            </div>
          ))}
        </div>
      </Band>

      {/* Beyond the gatherings */}
      <Band variant="cream2">
        <div className="grid items-center gap-11 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Eyebrow className="mb-3.5">Between Sundays</Eyebrow>
            <h2 className={`${H2} mb-5`}>The life is carried in the small rooms.</h2>
            <p className="mb-4 text-[18px] leading-[1.6] text-site-ink">
              Most of what forms us doesn’t happen from a stage. It happens in a cohort of a few
              people, in a discipler’s steady attention, in prayer through the week, and in the
              quiet places where a person is actually met by Jesus.
            </p>
            <p className="text-[18px] leading-[1.6] text-site-ink">
              Wherever you’re starting, there’s a next step and a few people to take it with — not a
              crowd to get lost in.
            </p>
            <div className="mt-7 flex flex-wrap gap-3.5">
              <Button href="/journey" variant="primary">See the whole journey</Button>
              <Button href="/begin" variant="ghost">Begin the Welcome Track</Button>
            </div>
          </div>
          <div className="rounded-[18px] border border-site-claydk bg-site-paper p-8">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">The four rooms of the house</p>
            <ul className="grid gap-4">
              {[
                { n: 'Welcome Track', d: 'Be with Jesus — start here.', href: '/begin' },
                { n: 'BECOME®', d: 'Become like Him — the Sermon on the Mount.', href: '/become' },
                { n: 'Disciplers', d: 'Walk one-on-one with another.', href: '/discipler' },
                { n: 'Leaders Track', d: 'Be formed and sent.', href: '/leaders' },
              ].map((t) => (
                <li key={t.n}>
                  <a href={t.href} className="block rounded-[12px] border border-site-claydk/70 px-5 py-3.5 transition-colors hover:border-site-brass">
                    <span className="font-fraunces text-[18px] text-site-umber">{t.n}</span>
                    <span className="mt-0.5 block text-[14px] text-site-soft">{t.d}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Band>

      {/* Events note + CTA */}
      <Band variant="cream">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow className="mb-3.5">Coming up</Eyebrow>
          <h2 className={`${H2} mb-3.5`}>Special evenings and events.</h2>
          <p className="mx-auto mb-8 max-w-[560px] text-[18px] text-site-soft">
            Beyond the weekly rhythms, we gather now and then for worship nights, communion, and
            special seasons. Want to know when the next one is? Reach out and we’ll make sure you
            hear about it.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Button href="/im-new" variant="primary">Plan a visit</Button>
            <Button href="/contact" variant="ghost">Ask what’s coming up</Button>
          </div>
        </div>
      </Band>
    </>
  );
}
