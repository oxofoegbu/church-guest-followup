// Run 32 — Give. Generosity as kingdom partnership, never manipulation. Ways
// to give, where it goes, a giving FAQ (FAQPage schema), and the BreezeCHMS
// hosted giving form (no card handling on-site). Copy lifted from the mock-up
// (give.html).
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import FAQ from '@/components/site/FAQ';
import BreezeGiving from '@/components/site/BreezeGiving';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Give — Generosity is partnership · Grace Life Center';
const OG_DESC =
  'Everything Grace Life Center does to help people find life in Jesus is carried by the generosity of ordinary people. Give online, in person, or by mail — freely, never under pressure.';

export const metadata: Metadata = {
  title: 'Give',
  description: OG_DESC,
  alternates: { canonical: '/give' },
  openGraph: { title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/give`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const WAYS = [
  { k: 'Online', h: 'Quick and secure', p: 'Give once, or set up a simple recurring gift in under two minutes. Secure and instant.', cta: { href: '#give-online', label: 'Give online →' } },
  { k: 'In person', h: 'On any Sunday', p: 'Drop a gift in the box at any Sunday gathering. No envelope or account needed.', cta: { href: '/im-new', label: 'Plan a visit →' } },
  { k: 'By mail', h: 'A check works too', p: 'Send a check to Grace Life Center, 8730 Cherry Lane, Suite A5, Laurel, MD 20707. Payable to “Grace Life Center.”', cta: null },
];

const WHERE = [
  { k: 'Teaching & formation', h: 'The pathway', p: 'The tracks, gatherings, and teaching that form ordinary people into apprentices of Jesus.' },
  { k: 'People & care', h: 'Real help', p: 'Walking with people in crisis, prayer, benevolence, and the quiet work of shepherding a family.' },
  { k: 'The mission beyond us', h: 'The Great Harvest', p: 'Supporting Charismatic Renewal Ministries and the wider work of preparing people for the harvest.' },
];

const FAQS = [
  { q: 'Is my gift tax-deductible?', a: 'Yes. Grace Life Center is a registered 501(c)(3); you’ll receive a year-end statement.' },
  { q: 'Can I set up recurring giving?', a: 'Absolutely — weekly, monthly, or on your own schedule, and you can change it anytime.' },
  { q: 'Is online giving secure?', a: 'Yes — gifts are processed through Breeze, an encrypted, trusted provider. We never see your card details.' },
  { q: 'Can I give to something specific?', a: 'You can designate a gift toward a particular need. Just note it, or ask us and we’ll help.' },
];

export default function GivePage() {
  return (
    <>
      <InteriorHero
        image="/site/give-hero.webp"
        alt="A joyful multi-generational family gathered together in warm golden-hour light, one woman reaching out a welcoming hand."
        eyebrow="Give"
        title="Generosity is partnership."
        lede="Everything we do to help people find life in Jesus is carried by the generosity of ordinary people. Give freely — never under pressure."
        current="Give"
        objectPosition="60% 42%"
      />

      {/* Why we give */}
      <Band variant="cream">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-3.5">Why we give</Eyebrow>
          <h2 className={`${H2} mb-5`}>Not a transaction. A shared mission.</h2>
          <p className="text-[20px] leading-[1.62] text-site-ink">
            We don’t give to keep the lights on so much as to push a light into the dark. Every gift
            helps another person be met by Jesus — through the Welcome Track, through care in hard
            seasons, through a community learning to carry heaven. We’ll never manipulate you, guilt
            you, or promise God’s blessing in exchange. Give as an act of worship, out of joy, or
            don’t give at all — you are welcome here either way.
          </p>
        </div>
      </Band>

      {/* Ways to give */}
      <Band variant="cream2">
        <div className="text-center">
          <Eyebrow className="mb-3.5">Ways to give</Eyebrow>
          <h2 className={H2}>However is easiest for you.</h2>
        </div>
        <div className="mt-9 grid gap-6 sm:grid-cols-3">
          {WAYS.map((w) => (
            <div key={w.k} className="flex flex-col rounded-[16px] border border-site-claydk bg-site-paper p-8">
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">{w.k}</p>
              <h3 className="mb-2 font-fraunces text-[23px] text-site-umber">{w.h}</h3>
              <p className="mb-6 flex-1 text-[15.5px] leading-[1.6] text-site-soft">{w.p}</p>
              {w.cta ? (
                <Button href={w.cta.href} variant="ghost" className="self-start !px-5 !py-2.5">{w.cta.label}</Button>
              ) : null}
            </div>
          ))}
        </div>
      </Band>

      {/* Give online — Breeze embed */}
      <Band variant="cream" id="give-online">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-8 text-center">
            <Eyebrow className="mb-3.5">Give online</Eyebrow>
            <h2 className={`${H2} mb-2`}>Give in a couple of minutes.</h2>
            <p className="mx-auto max-w-[520px] text-[16.5px] text-site-soft">
              A one-time gift or a simple recurring one — securely, through Breeze. Your card details
              never touch our site.
            </p>
          </div>
          <BreezeGiving />
        </div>
      </Band>

      {/* Where it goes */}
      <Band variant="cream2">
        <div className="text-center">
          <Eyebrow className="mb-3.5">Where it goes</Eyebrow>
          <h2 className={H2}>Honest about the mission your gift fuels.</h2>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3">
          {WHERE.map((w) => (
            <div key={w.k}>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">{w.k}</p>
              <h3 className="mb-2 font-fraunces text-[23px] text-site-umber">{w.h}</h3>
              <p className="text-[15.5px] leading-[1.6] text-site-soft">{w.p}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* Giving FAQ */}
      <Band variant="cream">
        <div className="mb-9 text-center">
          <Eyebrow className="mb-3.5">A few honest questions</Eyebrow>
          <h2 className={H2}>Giving, answered.</h2>
        </div>
        <FAQ items={FAQS} columns={2} emitSchema />
      </Band>

      {/* Thanks */}
      <section className="relative py-[60px] text-center sm:py-[84px]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #FFFBF2, #FBF7EF 60%)' }}>
        <div className="mx-auto max-w-[720px] px-7">
          <h2 className={`${H2} mx-auto`}>Thank you — really.</h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[19px] text-site-soft">
            Every gift, of any size, is an act of faith that God is still gathering a harvest. We
            don’t take it lightly.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="#give-online" variant="primary">Give online</Button>
          </div>
        </div>
      </section>
    </>
  );
}
