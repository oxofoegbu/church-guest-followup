// Run 31 — Contact. InfoList + message form (→ /api/contact) + real map.
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import InfoList from '@/components/site/InfoList';
import ContactForm from '@/components/site/ContactForm';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Contact Grace Life Center — Laurel, Maryland';
const OG_DESC =
  'A question, a prayer, planning a visit, or just wanting to talk to a real person — reach Grace Life Center in Laurel, Maryland. We read every message and reply within a day or two.';

export const metadata: Metadata = {
  title: 'Contact',
  description: OG_DESC,
  alternates: { canonical: '/contact' },
  openGraph: { siteName: SITE.name, title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/contact`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const PinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
const ClockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const MailIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);

export default function ContactPage() {
  return (
    <>
      <InteriorHero
        image="/site/contact-hero.webp"
        alt="A woman with a warm smile welcoming a visitor at her front door, a cup of coffee in hand, in the golden evening light."
        eyebrow="Contact"
        title="We’d love to hear from you."
        lede="A question, a prayer, planning a visit, or just wanting to talk to a real person — reach out and we’ll get back to you."
        current="Contact"
        objectPosition="55% 40%"
      />

      <Band variant="cream">
        <div className="grid gap-11 lg:grid-cols-2">
          <div>
            <Eyebrow className="mb-3.5">Reach us</Eyebrow>
            <h2 className={`${H2} mb-7`}>The details.</h2>
            <InfoList
              items={[
                { icon: PinIcon, title: '8730 Cherry Lane, Suite A5', detail: 'Laurel, MD 20707' },
                { icon: ClockIcon, title: 'Sundays at 10:00 AM', detail: 'Doors open at 9:30 for coffee.' },
                { icon: MailIcon, title: 'hello@gracelifecenter.com', detail: 'We read every message and reply within a day or two.' },
              ]}
            />
            <div className="mt-7">
              <Button href="/im-new" variant="ghost">Plan a visit →</Button>
            </div>
          </div>
          <ContactForm />
        </div>
      </Band>

      <Band variant="cream2" className="!pt-0">
        <iframe
          title="Map to Grace Life Center, 8730 Cherry Lane, Laurel, MD"
          src="https://www.google.com/maps?q=8730+Cherry+Lane,+Laurel,+MD+20707&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="min-h-[380px] w-full rounded-2xl border border-site-claydk"
        />
      </Band>
    </>
  );
}
