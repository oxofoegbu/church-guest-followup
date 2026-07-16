// Run 31 — The Journey. The pathway page (BE → BECOME → BRING, the staircase,
// the four tracks) with FAQPage schema. Copy lifted from the mock-up.
import type { Metadata } from 'next';
import InteriorHero from '@/components/site/InteriorHero';
import Band, { Wrap } from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import Pathway, { type Room } from '@/components/site/Pathway';
import FAQ from '@/components/site/FAQ';
import { SITE } from '@/lib/site';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'The Journey — a discipleship pathway from guest to leader';
const OG_DESC =
  'Following Jesus is a direction, not a finish line. Grace Life Center’s pathway — BE → BECOME → BRING — walks you from guest to follower to disciple-maker to leader, one unhurried step at a time.';

export const metadata: Metadata = {
  title: 'The Journey',
  description: OG_DESC,
  alternates: { canonical: '/journey' },
  openGraph: { siteName: SITE.name, title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/journey`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const RHYTHM = [
  { k: 'Be — with Jesus', color: 'text-site-well', h: 'It starts with presence', p: 'Before we do anything for Jesus, we learn to be with Him — to abide, listen, and rest. Activity flows from intimacy, not the other way around.' },
  { k: 'Become — like Jesus', color: 'text-site-ember', h: 'He forms us from within', p: 'As we stay near Him, He forms His own character in us — patience, courage, love. You practice; He transforms. Behavior is the fruit; character is the tree.' },
  { k: 'Bring — heaven', color: 'text-site-evergreen', h: 'Then He sends us out', p: 'Formed people carry His presence into homes, work, and neighborhoods. Ordinary lives become the way heaven quietly arrives on earth.' },
];

const STAIRS = [
  { bar: '#17343D', lvl: 'Step one', h: 'Guest', p: 'You’ve just arrived — online or in person. You don’t have to believe first to belong.' },
  { bar: '#A63D1F', lvl: 'Step two', h: 'Follower', p: 'You turn toward Jesus and begin to be with Him, learning to live as His apprentice.' },
  { bar: '#3E5A34', lvl: 'Step three', h: 'Disciple-Maker', p: 'Formed and steadied, you begin to walk with someone else, as you were walked with.' },
  { bar: '#1F3A5F', lvl: 'Step four', h: 'Leader', p: 'Sensing a call to shepherd, you’re formed and sent to lead the way Jesus led.' },
];

const JOURNEY_ROOMS: Room[] = [
  { num: '01', rhythm: 'Be · with Jesus', name: 'Welcome Track', blurb: 'Five unhurried conversations: who we are, who Jesus is, what following Him looks like, and how to belong. Start here.', step: 'Guest → Follower · 5 weeks', href: '/begin', gradient: 'linear-gradient(165deg, #17343D, #10262d)' },
  { num: '02', rhythm: 'Become · like Jesus', name: <>BECOME®</>, blurb: 'Twelve weeks in the Sermon on the Mount — Jesus’ curriculum for the inner life. You practice; He transforms.', step: 'Follower → Disciple · 12 weeks', href: '/become', gradient: 'linear-gradient(165deg, #A63D1F, #33201A)' },
  { num: '03', rhythm: 'Bring · heaven', name: 'Disciplers', blurb: 'Learn to walk with one person — friendship with a vision. Ten weeks of training, then someone entrusted to you.', step: 'Disciple → Disciple-Maker · 10 weeks', href: '/discipler', gradient: 'linear-gradient(165deg, #3E5A34, #1F2A1D)' },
  { num: '04', rhythm: 'Formed · & sent', name: 'Leaders Track', blurb: 'Eleven weeks of formation ending in a commissioning. The towel, not the throne — authority that kneels.', step: 'Disciple-Maker → Leader · 11 weeks', href: '/leaders', gradient: 'linear-gradient(165deg, #1F3A5F, #16233B)' },
];

const FAQS = [
  { q: 'Where do I begin?', a: 'With the Welcome Track — always. It’s the front door, whether you’re brand-new to Jesus or returning after years away.' },
  { q: 'Do I have to do them in order?', a: 'Mostly, yes — each step builds on the last. But you’re never rushed. You take the next step when you’re ready, not before.' },
  { q: 'How much time does it take?', a: 'A short module at your own pace each week, plus one 90-minute gathering. Real, but doable in an ordinary life.' },
  { q: 'I’ve followed Jesus for years — is this too basic?', a: 'It isn’t about information. The oldest saints among us are still becoming. There’s depth here for everyone.' },
];

export default function JourneyPage() {
  return (
    <>
      <InteriorHero
        image="/site/journey-hero.webp"
        alt="Two people walking together up a winding path into golden-hour light."
        eyebrow="The Journey · BE → BECOME → BRING"
        title={<>One road,<br />taken one step at a time.</>}
        lede="Following Jesus isn’t a finish line you cross once — it’s a direction you keep walking for the rest of your life. Here is the whole path, and the unhurried next step in front of you."
        current="The Journey"
        objectPosition="50% 42%"
      />

      {/* Well, not a fence */}
      <Band variant="cream">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-3.5">A direction, not a finish line</Eyebrow>
          <h2 className={H2}>We’re a well, not a fence.</h2>
          <p className="mt-3.5 text-[20px] leading-[1.6] text-site-ink">
            Some churches spend their energy on the boundary line — who’s in, who’s out. We’d rather
            be a well: Jesus at the center, and a people drawing near to Him and drawing others near.
            So the question is never <em className="font-fraunces italic">where are you standing?</em>{' '}
            It’s <em className="font-fraunces italic">which way are you facing?</em> Wherever you are on
            this road, you’re welcome — and there’s a next step made just for you.
          </p>
        </div>
      </Band>

      {/* Be. Become. Bring. */}
      <Band variant="cream2">
        <div className="text-center">
          <Eyebrow className="mb-3.5">Our rhythm</Eyebrow>
          <h2 className={H2}>Be. Become. Bring.</h2>
        </div>
        <div className="mt-9 grid gap-7 sm:grid-cols-3">
          {RHYTHM.map((r) => (
            <div key={r.h}>
              <p className={`mb-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] ${r.color}`}>{r.k}</p>
              <h3 className="mb-2 font-fraunces text-[23px] text-site-umber">{r.h}</h3>
              <p className="text-[15.5px] leading-[1.6] text-site-soft">{r.p}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* The staircase */}
      <Band variant="cream">
        <Eyebrow className="mb-3.5">The path</Eyebrow>
        <h2 className={H2}>You never take the whole staircase at once.</h2>
        <p className="mt-3 max-w-[640px] text-[20px] leading-[1.6] text-site-ink">
          Only the next step. Here’s how the journey unfolds — guest to follower, follower to
          disciple-maker, disciple-maker to leader.
        </p>
        <div className="mt-9 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STAIRS.map((s) => (
            <div key={s.h} className="rounded-2xl border border-site-claydk bg-site-paper p-6">
              <div className="mb-4 h-1 w-full rounded" style={{ background: s.bar }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">{s.lvl}</p>
              <h3 className="mb-1.5 mt-1.5 font-fraunces text-[19px] text-site-umber">{s.h}</h3>
              <p className="text-[13.5px] leading-[1.5] text-site-soft">{s.p}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* The tracks */}
      <Band variant="cream2">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-3.5">Four rooms of one house</Eyebrow>
          <h2 className={H2}>The tracks that carry you.</h2>
          <p className="mt-3 font-fraunces text-[19px] italic text-site-ember">
            Each is a self-paced journey in our app, plus one honest weekly gathering and someone
            walking beside you.
          </p>
        </div>
        <Pathway className="mt-11" rooms={JOURNEY_ROOMS} />
      </Band>

      {/* FAQ */}
      <Band variant="cream">
        <div className="max-w-[760px]">
          <Eyebrow className="mb-3.5">A few honest questions</Eyebrow>
          <h2 className={`${H2} mb-7`}>Before you start.</h2>
        </div>
        <FAQ items={FAQS} columns={2} emitSchema />
      </Band>

      {/* Invite */}
      <section className="relative py-[60px] text-center sm:py-[84px]" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #FFFBF2, #FBF7EF 60%)' }}>
        <Wrap>
          <Eyebrow className="mb-3.5">Start where everyone starts</Eyebrow>
          <h2 className={`${H2} mx-auto max-w-[720px]`}>Take the first step.</h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[19px] text-site-soft">
            You don’t have to see the whole road today. Begin the journey online, or come and see on a
            Sunday.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Button href="/begin" variant="primary">Begin the Welcome Track</Button>
            <Button href="/im-new" variant="ghost">Plan a Visit</Button>
          </div>
        </Wrap>
      </section>
    </>
  );
}
