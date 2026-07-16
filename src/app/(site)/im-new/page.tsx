// Run 31 — I'm New / Plan a Visit. Copy lifted from the mock-up. The visit
// form creates a Guest through the existing intake pipeline.
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band, { Wrap } from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import InfoList from '@/components/site/InfoList';
import VisitForm from '@/components/site/VisitForm';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Plan a Visit — What a Sunday at Grace Life Center is really like';
const OG_DESC =
  'Planning your first visit to Grace Life Center in Laurel, Maryland? Come exactly as you are — no dress code, no pressure. Here’s honestly what a Sunday is like: service time, parking, kids, and how to find us.';

export const metadata: Metadata = {
  title: 'Plan a Visit',
  description: OG_DESC,
  alternates: { canonical: '/im-new' },
  openGraph: { siteName: SITE.name,
    title: OG_TITLE,
    description: OG_DESC,
    url: `${SITE.url}/im-new`,
    type: 'website',
    images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const EXPECT = [
  { k: 'The feel', h: 'Warm, not slick', p: "Real people, honest worship, and a welcome that doesn’t corner you. Come late, come tired, come curious — you’ll fit right in." },
  { k: 'The shape', h: 'Worship & a message', p: 'About 90 minutes: sung worship, prayer, and a message from the Scriptures you can actually use this week.' },
  { k: 'The dress code', h: 'There isn’t one', p: 'Jeans or your Sunday best — both are right. Wear whatever lets you forget what you’re wearing.' },
];

const ClockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const PinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
const CarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" /><rect x="4" y="11" width="16" height="5" rx="1" /><circle cx="7.5" cy="16.5" r="1.2" /><circle cx="16.5" cy="16.5" r="1.2" /></svg>
);
const KidsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="7" r="3" /><path d="M6 21v-2a6 6 0 0112 0v2" /></svg>
);

export default function ImNewPage() {
  return (
    <>
      <InteriorHero
        image="/site/imnew-hero.webp"
        alt="A man warmly reaching out to greet a visitor at his front door, a mug of coffee in hand, in warm evening light."
        eyebrow="I’m New · Plan a Visit"
        title="Come exactly as you are."
        lede="No dress code, no pressure, no being singled out. Here’s honestly what a Sunday at Grace Life Center is like — and how to find us."
        current="I'm New"
        objectPosition="55% 42%"
      />

      {/* A Sunday, honestly */}
      <Band variant="cream">
        <div className="text-center">
          <Eyebrow className="mb-3.5">What to expect</Eyebrow>
          <h2 className={H2}>A Sunday, honestly.</h2>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3">
          {EXPECT.map((c) => (
            <div key={c.k}>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">{c.k}</p>
              <h3 className="mb-2 font-fraunces text-[23px] text-site-umber">{c.h}</h3>
              <p className="text-[15.5px] leading-[1.6] text-site-soft">{c.p}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* When & where */}
      <Band variant="cream2">
        <div className="grid items-center gap-11 lg:grid-cols-2">
          <div>
            <Eyebrow className="mb-3.5">The essentials</Eyebrow>
            <h2 className={`${H2} mb-7`}>When &amp; where.</h2>
            <InfoList
              items={[
                { icon: ClockIcon, title: 'Sundays at 10:00 AM', detail: 'One gathering each week. Doors open at 9:30 for coffee.' },
                { icon: PinIcon, title: '8730 Cherry Lane, Suite A5, Laurel, MD 20707', detail: 'Easy to reach from Laurel, Columbia, Bowie, and Beltsville.' },
                { icon: CarIcon, title: 'Free parking on-site', detail: 'Pull right in — no meters, no hunting for a spot.' },
                { icon: KidsIcon, title: 'Your kids are cared for', detail: 'Safe, warm, and fun kids’ ministry during the service.' },
              ]}
            />
          </div>
          <iframe
            title="Map to Grace Life Center, 8730 Cherry Lane, Laurel, MD"
            src="https://www.google.com/maps?q=8730+Cherry+Lane,+Laurel,+MD+20707&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="min-h-[340px] w-full rounded-2xl border border-site-claydk"
          />
        </div>
      </Band>

      {/* When you arrive */}
      <Band variant="cream">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-3.5">When you arrive</Eyebrow>
          <h2 className={H2}>You won’t have to figure it out alone.</h2>
          <p className="mt-3.5 text-[20px] leading-[1.6] text-site-ink">
            A greeter will meet you at the door and help you find your way — including where your kids
            go. Grab a coffee. Sit wherever you like. When the offering comes around, feel no pressure
            at all; you’re our guest. And if you’d rather just slip in, watch, and slip out, that’s
            completely okay too.
          </p>
        </div>
      </Band>

      {/* Tell us you're coming */}
      <Band variant="cream2">
        <div className="mx-auto max-w-[760px]">
          <div className="text-center">
            <Eyebrow className="mb-3.5">Tell us you’re coming</Eyebrow>
            <h2 className={`${H2} mb-2`}>We’ll be looking for you.</h2>
            <p className="mx-auto mb-8 max-w-[520px] text-[16.5px] text-site-soft">
              Let us know you’re planning to visit and we’ll have someone ready to welcome you by name.
            </p>
          </div>
          <VisitForm />
        </div>
      </Band>

      {/* Next step */}
      <section className="relative py-[60px] text-center sm:py-[84px]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #FFFBF2, #FBF7EF 60%)' }}>
        <Wrap>
          <Eyebrow className="mb-3.5">If you want to go deeper</Eyebrow>
          <h2 className={`${H2} mx-auto max-w-[720px]`}>There’s a next step waiting.</h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[19px] text-site-soft">
            Sunday is a great front door. The journey with Jesus starts with the Welcome Track — five
            unhurried conversations, at your pace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Button href="/begin" variant="primary">Begin the Welcome Track</Button>
            <Button href="/journey" variant="ghost">See the whole journey</Button>
          </div>
        </Wrap>
      </section>
    </>
  );
}
