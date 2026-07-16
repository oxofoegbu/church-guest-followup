// Run 32 — Prayer. A real door for the person in need: a request form
// (name/email optional, urgent + private checkboxes) → /api/prayer → the
// prayer team (prayforme@). "How we pray" + a Scripture band + an escalation
// to a real person. Copy lifted from the mock-up (prayer.html).
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import PrayerForm from '@/components/site/PrayerForm';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Prayer — Tell us, and we’ll actually pray · Grace Life Center';
const OG_DESC =
  'You don’t have to carry it alone. Share what’s on your heart and a real prayer team at Grace Life Center in Laurel, Maryland will lift it to God this week — quietly, confidentially, and for real.';

export const metadata: Metadata = {
  title: 'Prayer',
  description: OG_DESC,
  alternates: { canonical: '/prayer' },
  openGraph: { siteName: SITE.name, title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/prayer`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

// Prayer Hotline returns via OpenPhone — number TBD. Set NEXT_PUBLIC_PRAYER_HOTLINE
// (display string) to light up the tel: line; until then a gentle placeholder shows.
const HOTLINE = process.env.NEXT_PUBLIC_PRAYER_HOTLINE || '';
const HOTLINE_TEL = HOTLINE.replace(/[^0-9+]/g, '');

const CARE = [
  { k: 'A real team', h: 'Not a form into a void', p: 'A team of praying people reads every request and actually prays — through the week, not just once.' },
  { k: 'Held in confidence', h: 'Safe to be honest', p: 'What you share stays with the prayer team. Mark it private and it goes no further.' },
  { k: 'We’ll follow up', h: 'If you want us to', p: 'Leave your email and ask, and a pastor or team member will gently check in on you.' },
];

export default function PrayerPage() {
  return (
    <>
      <InteriorHero
        image="/site/prayer-hero.webp"
        alt="A man sitting quietly in prayer, head bowed against his hands, in warm low light against a deep evening background."
        eyebrow="Prayer"
        title="Tell us. We’ll actually pray."
        lede="You don’t have to carry it alone. Share what’s on your heart, and our prayer team will lift it to God this week — quietly, and for real."
        current="Prayer"
        objectPosition="70% 40%"
      />

      {/* However heavy, however small */}
      <Band variant="cream">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-3.5">However heavy, however small</Eyebrow>
          <h2 className={`${H2} mb-5`}>Nothing is too big for God, or too small to bring Him.</h2>
          <p className="text-[20px] leading-[1.62] text-site-ink">
            Whether it’s a diagnosis, a marriage, a wandering child, a decision, or a hope you’ve
            barely said out loud — bring it. A real person on our prayer team will pray for you by
            name. You can stay anonymous, or ask us to reach back out. It stays with the people who
            pray.
          </p>
        </div>
      </Band>

      {/* The request form */}
      <Band variant="cream2">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-8 text-center">
            <Eyebrow className="mb-3.5">Share your request</Eyebrow>
            <h2 className={H2}>We’ll carry it with you.</h2>
          </div>
          <PrayerForm />
        </div>
      </Band>

      {/* How we pray */}
      <Band variant="cream">
        <div className="text-center">
          <Eyebrow className="mb-3.5">How we pray</Eyebrow>
          <h2 className={H2}>You’ll be carried by real people.</h2>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3">
          {CARE.map((c) => (
            <div key={c.k}>
              <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">{c.k}</p>
              <h3 className="mb-2 font-fraunces text-[23px] text-site-umber">{c.h}</h3>
              <p className="text-[15.5px] leading-[1.6] text-site-soft">{c.p}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* Scripture band (well) */}
      <section
        className="relative overflow-hidden py-[76px] text-center sm:py-[92px]"
        style={{ background: 'linear-gradient(160deg, #17343D 0%, #10262d 100%)' }}
      >
        <div className="mx-auto max-w-[720px] px-7">
          <p className="font-fraunces text-[26px] italic leading-[1.5] text-[#E7D9BE] sm:text-[30px]">
            “Cast all your care upon Him, for He cares for you.”
          </p>
          <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.28em] text-[#CBB68A]">
            1 Peter 5:7
          </p>
        </div>
      </section>

      {/* Need to talk now */}
      <Band variant="cream2">
        <div className="mx-auto max-w-[720px] text-center">
          <Eyebrow className="mb-3.5">Need to talk to someone now?</Eyebrow>
          <h2 className={`${H2} mb-3.5`}>You can reach a real person.</h2>
          <p className="mx-auto mb-2 max-w-[560px] text-[18px] text-site-soft">
            If you’re in crisis or just need to hear a human voice, don’t wait on a form — reach out
            and we’ll respond as soon as we can.
          </p>
          {HOTLINE ? (
            <p className="mb-8 text-[17px] text-site-ink">
              Prayer Hotline:{' '}
              <a href={`tel:${HOTLINE_TEL}`} className="font-semibold text-site-ember underline-offset-2 hover:underline">
                {HOTLINE}
              </a>
            </p>
          ) : (
            <p className="mx-auto mb-8 max-w-[520px] text-[15px] text-site-soft">
              Our prayer line is being set up. For now, send your request above or reach us directly
              — a real person will respond.
            </p>
          )}
          <Button href="/contact" variant="ghost">Contact us</Button>
        </div>
      </Band>
    </>
  );
}
