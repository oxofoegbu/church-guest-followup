// Run 31 — About: Story, Beliefs (FAQPage schema), Leadership. Copy lifted
// from the mock-up. Leadership uses honest placeholder tiles until real
// photos are provided.
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band, { Wrap } from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import FAQ from '@/components/site/FAQ';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'About Grace Life Center — a Spirit-filled church in Laurel, Maryland';
const OG_DESC =
  'Grace Life Center is a Spirit-filled church in Laurel, Maryland, part of Charismatic Renewal Ministries — a people gathered around Jesus, born of a 1980 call to prepare for a Great Harvest. Our story, what we believe, and who’ll walk with you.';

export const metadata: Metadata = {
  title: 'About',
  description: OG_DESC,
  alternates: { canonical: '/about' },
  openGraph: { title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/about`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const BELIEFS = [
  { q: 'The Scriptures', a: 'The Bible is the inspired, trustworthy Word of God — our final authority for faith and life.' },
  { q: 'One God, three Persons', a: 'Father, Son, and Holy Spirit — one God, eternally three, perfect in love.' },
  { q: 'Jesus Christ', a: 'Fully God and fully human; He lived, died for our sins, rose bodily, and will return.' },
  { q: 'Salvation by grace', a: 'We’re saved by grace through faith in Christ alone — never earned, always received.' },
  { q: 'The Holy Spirit', a: 'Every follower is invited to be filled with the Spirit and empowered with His gifts for life and witness.' },
  { q: 'Healing & the Kingdom', a: 'God still heals today, and His kingdom breaks in wherever His people carry His presence.' },
];

const TEAM = [
  { initial: 'O', gradient: 'linear-gradient(160deg,#17343D,#0f2429)', name: 'Pastor Okezie Ofoegbu', role: 'Senior Pastor', bio: 'Shepherds Grace Life Center with a passion for forming apprentices of Jesus — people who don’t just admire Him, but live His way.' },
  { initial: '+', gradient: 'linear-gradient(160deg,#A63D1F,#33201A)', name: 'Our Pastoral Team', role: 'Elders & Pastors', bio: 'A circle of Spirit-filled servants who together yield to the Lordship of Jesus and care for the family.' },
  { initial: '✦', gradient: 'linear-gradient(160deg,#3E5A34,#1F2A1D)', name: 'Disciplers & Leaders', role: 'The wider family', bio: 'Trained companions who walk one-on-one with people through every track, so no one journeys alone.' },
];

export default function AboutPage() {
  return (
    <>
      <InteriorHero
        image="/site/about-hero.webp"
        alt="A multi-generational Black family gathered together in warm golden-hour light, one woman reaching out a welcoming hand."
        eyebrow="About Grace Life Center"
        title={<>A people gathered<br />around the Well.</>}
        lede="A Spirit-filled church in Laurel, Maryland — part of Charismatic Renewal Ministries — learning to be with Jesus, become like Him, and carry heaven wherever we go."
        current="About"
        objectPosition="62% 40%"
      />

      {/* Who we are */}
      <Band variant="cream">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-3.5">Who we are</Eyebrow>
          <h2 className={H2}>Not a fence to get inside. A well to gather around.</h2>
          <p className="mt-3.5 text-[20px] leading-[1.6] text-site-ink">
            On the great cattle ranches of the outback, you don’t fence the herd in — you dig a well,
            and every head turns toward the water on its own. That’s the kind of church we want to be:
            not a boundary to police, but a people so near to Jesus that others are drawn to Him by the
            sheer attraction of His life in us. We measure success not in crowds, but in depth of
            transformation — one life at a time.
          </p>
        </div>
      </Band>

      {/* Heart */}
      <section className="relative overflow-hidden py-[60px] sm:py-[84px]">
        <img src="/site/heart.webp" alt="An open Bible, a worn leather journal, and a mug on a wooden table in a shaft of warm morning light." loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(24,17,13,0.92) 0%, rgba(24,17,13,0.80) 42%, rgba(24,17,13,0.40) 78%, rgba(24,17,13,0.22) 100%)' }} />
        <Wrap className="relative">
          <Eyebrow color="text-[#CBB68A]" className="mb-3.5">The heart of it</Eyebrow>
          <h2 className="font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-white sm:text-[38px]">
            Being with Jesus, before doing for Jesus.
          </h2>
          <p className="mt-5 max-w-[660px] text-[20px] leading-[1.65] text-site-cream/90">
            We don’t become like Jesus by trying harder. We become like Him by being with Him — the way
            fruit grows on a branch joined to the vine. You don’t have to clean yourself up, or believe
            first, to come to the water. You only have to turn toward it.
          </p>
          <p className="mt-6 max-w-[600px] font-fraunces text-[22px] italic text-[#E7D9BE]">
            “Come to Me, all you who labor and are heavy laden, and I will give you rest.” — Matthew 11:28
          </p>
        </Wrap>
      </section>

      {/* Story */}
      <Band variant="cream2">
        <div className="grid items-center gap-11 lg:grid-cols-2">
          <div>
            <Eyebrow className="mb-3.5">The story you’re joining</Eyebrow>
            <h2 className={H2}>A call sounding for over forty years.</h2>
            <p className="mt-3.5 text-[20px] leading-[1.6] text-site-ink">
              In 1980, in a student prayer meeting in Ile-Ife, Nigeria, a word was spoken that birthed
              our movement:{' '}
              <em className="font-fraunces italic text-site-umber">
                “Start preparing people for the Great Harvest — people of beaten gold and of quality;
                teach them what it means to love and to have authority.”
              </em>
            </p>
            <p className="mt-3 text-[16.5px] leading-[1.66] text-site-soft">
              From that prayer room grew Charismatic Renewal Ministries, a family of churches carrying
              that assignment around the world. Grace Life Center is where it continues today, in
              Laurel, Maryland — ordinary people being formed to carry heaven into an ordinary week.
              You’re not joining a program. You’re answering a call.
            </p>
          </div>
          <div className="relative h-[300px] overflow-hidden rounded-2xl border border-site-claydk lg:h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/site/story.webp"
              alt="Several people’s hands clasped in prayer around an open Bible and a single candle."
              loading="lazy"
              width={1200}
              height={840}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </Band>

      {/* Beliefs */}
      <Band variant="cream">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-3.5">What we believe</Eyebrow>
          <h2 className={H2}>If you want to know what God is like, look at Jesus.</h2>
          <p className="mt-3 text-[20px] leading-[1.6] text-site-ink">
            Jesus is God’s love made visible — the measure of what God is like and what a human being
            was meant to be. If it’s in Jesus, it’s in God. Everything we believe hangs on Him.
          </p>
        </div>
        <div className="mt-8">
          <FAQ items={BELIEFS} columns={2} emitSchema />
        </div>
      </Band>

      {/* Leadership */}
      <Band variant="cream2">
        <div className="text-center">
          <Eyebrow className="mb-3.5">Leadership</Eyebrow>
          <h2 className={H2}>The people who’ll walk with you.</h2>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3">
          {TEAM.map((p) => (
            <div key={p.name}>
              <div className="mb-4 grid h-[250px] place-items-center rounded-2xl" style={{ background: p.gradient }} aria-hidden="true">
                <span className="font-fraunces text-[52px] text-white/90">{p.initial}</span>
              </div>
              <h3 className="font-fraunces text-[20px] font-semibold text-site-umber">{p.name}</h3>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-site-brassdk">{p.role}</p>
              <p className="mt-2.5 text-[14px] leading-[1.55] text-site-soft">{p.bio}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* Invite */}
      <section className="relative py-[60px] text-center sm:py-[84px]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #FFFBF2, #FBF7EF 60%)' }}>
        <Wrap>
          <Eyebrow className="mb-3.5">Whatever brought you here</Eyebrow>
          <h2 className={`${H2} mx-auto max-w-[720px]`}>Come and see for yourself.</h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[19px] text-site-soft">
            Meet the family on a Sunday in Laurel, or begin the journey online today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Button href="/im-new" variant="primary">Plan a Visit</Button>
            <Button href="/journey" variant="ghost">Explore the Journey</Button>
          </div>
        </Wrap>
      </section>
    </>
  );
}
