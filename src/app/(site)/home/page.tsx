// Run 30 — Grace Life Center homepage. Server-rendered (the whole point:
// real, crawlable HTML). Copy is lifted verbatim from the approved mock-up.
// Served at the apex (gracelifecenter.com → /home host rewrite). The two
// doors: "Begin the Journey" → /begin, "Plan a Visit" → /im-new.
import type { Metadata } from 'next';
import Link from 'next/link';
import Hero from '@/components/site/Hero';
import Band, { Wrap } from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import Pathway from '@/components/site/Pathway';
import { SITE, churchJsonLd } from '@/lib/site';

const H2 =
  'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Grace Life Center — A Spirit-filled church in Laurel, Maryland';
const OG_DESC =
  'There is a different way to be human. His name is Jesus. Grace Life Center is a people in Laurel learning to be with Him, become like Him, and carry heaven wherever they go — a well, not a fence. Come and see on a Sunday, or begin the journey online, anywhere.';

export const metadata: Metadata = {
  title: { absolute: OG_TITLE },
  description: OG_DESC,
  alternates: { canonical: '/' },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    url: SITE.url,
    type: 'website',
    images: [{ url: '/site/social-og.jpg', width: 1200, height: 630, alt: 'Golden light on calm water' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESC,
    images: ['/site/social-og.jpg'],
  },
};

function Door({
  image,
  alt,
  tag,
  title,
  body,
  cta,
}: {
  image: string;
  alt: string;
  tag: string;
  title: string;
  body: string;
  cta: { label: string; href: string; variant: 'primary' | 'ghost' };
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-site-claydk bg-site-paper transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(51,32,26,0.45)]">
      <div className="relative h-[200px]">
        <img src={image} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-8">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-site-brassdk">{tag}</p>
        <h3 className="mb-1.5 font-fraunces text-[26px] text-site-umber">{title}</h3>
        <p className="mb-6 flex-1 text-[16.5px] text-site-soft">{body}</p>
        <Button href={cta.href} variant={cta.variant} className="self-start">
          {cta.label}
        </Button>
      </div>
    </div>
  );
}

function TeachingCard({
  kind,
  thumb,
  series,
  title,
  desc,
  featured = false,
}: {
  kind: string;
  thumb: { image?: string; gradient?: string; play?: boolean };
  series: string;
  title: React.ReactNode;
  desc: string;
  featured?: boolean;
}) {
  return (
    <Link
      href="/teaching"
      className="flex flex-col overflow-hidden rounded-2xl border border-site-claydk bg-site-paper transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_22px_44px_-30px_rgba(51,32,26,0.5)]"
    >
      <div className="relative grid h-[150px] place-items-center" style={thumb.gradient ? { backgroundImage: thumb.gradient } : undefined}>
        {thumb.image ? (
          <img src={thumb.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <span className="absolute left-3 top-3 z-10 rounded-full bg-black/30 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-white">
          {kind}
        </span>
        {thumb.play ? (
          <span className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-white/90">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="#17343D" aria-hidden="true">
              <path d="M4 2l10 6-10 6z" />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-site-brassdk">{series}</p>
        <h3 className={`mb-2 font-fraunces leading-[1.22] text-site-umber ${featured ? 'text-[24px]' : 'text-[19px]'}`}>
          {title}
        </h3>
        <p className="text-[14.5px] text-site-soft">{desc}</p>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(churchJsonLd()) }}
      />

      {/* HERO — the invitation and the two doors (the golden-hour well) */}
      <Hero
        variant="light"
        eyebrow={<>Grace Life Center · Laurel, Maryland</>}
        title={
          <>
            There is a different way
            <br />
            to be human.
            <br />
            His name is Jesus.
          </>
        }
        lede="We are a people learning to be with Him, become like Him, and carry heaven wherever we go. Wherever you’re standing — and whichever way you’re facing — there’s room for you here."
        primary={{ label: 'Begin the Journey', href: '/begin' }}
        ghost={{ label: 'Plan a Visit', href: '/im-new' }}
        meta={{
          lead: `Sundays at ${SITE.serviceTime}`,
          rest: [`${SITE.street}, ${SITE.city}, ${SITE.region}`, 'and online, anywhere'],
        }}
        imageWide="/site/hero-wide.webp"
        imageMobile="/site/hero-mobile.webp"
        alt="A stone well with a wooden bucket beside calm, still water at golden hour, the sun setting low over distant hills."
      />

      {/* THE WELL, NOT THE FENCE */}
      <Band variant="cream">
        <Eyebrow className="mb-3.5">Who we are</Eyebrow>
        <h2 className={H2}>A well, not a fence.</h2>
        <p className="mt-4 max-w-[680px] text-[20px] leading-[1.62] text-site-ink">
          Most churches, without meaning to, become fences — miles of boundary line, anxious about
          who’s in and who’s out. We’d rather be a well. In dry country you don’t fence cattle in;
          you dig a well, and every head turns toward the water on its own. Jesus is our well. We’re
          simply a people gathered around Him, drawing near — and drawing others near by the sheer
          attraction of His life in us.
        </p>
        <p className="mt-5 font-fraunces text-[23px] italic text-site-ember">
          God is not asking where you’re standing. He’s asking which way you’re facing.
        </p>
      </Band>

      {/* DARK HEART — being with Jesus */}
      <section className="relative overflow-hidden py-[60px] sm:py-[84px]">
        <img
          src="/site/heart.webp"
          alt="An open Bible, a worn leather journal, and a mug on a wooden table in a shaft of warm morning light."
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(24,17,13,0.92) 0%, rgba(24,17,13,0.80) 42%, rgba(24,17,13,0.40) 78%, rgba(24,17,13,0.22) 100%)',
          }}
        />
        <Wrap className="relative">
          <Eyebrow color="text-[#CBB68A]" className="mb-3.5">
            The heart of it
          </Eyebrow>
          <h2 className="font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-white sm:text-[38px]">
            Being with Jesus,
            <br />
            before doing for Jesus.
          </h2>
          <p className="mt-5 max-w-[660px] text-[20px] leading-[1.65] text-site-cream/90">
            We don’t become like Jesus by gritting our teeth and trying harder. We become like Him by
            learning to be with Him — the way fruit grows on a branch that stays joined to the vine.
            You don’t have to clean yourself up, or believe first, to come to the water. You only have
            to turn toward it. You practice; He transforms. Together, you become like Him.
          </p>
          <p className="mt-6 max-w-[600px] font-fraunces text-[22px] italic text-[#E7D9BE]">
            “Come to Me, all you who labor and are heavy laden, and I will give you rest.” — Matthew
            11:28
          </p>
        </Wrap>
      </section>

      {/* TWO DOORS */}
      <Band variant="cream" id="doors">
        <div className="text-center">
          <Eyebrow className="mb-3.5">Two ways in — equally yours</Eyebrow>
          <h2 className={H2}>Find your door.</h2>
        </div>
        <div className="mt-11 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Door
            image="/site/door-comesee.webp"
            alt="A woman with a warm smile welcoming a visitor at her front door, a cup of coffee in hand, in the golden evening light."
            tag="Come & See"
            title="Visit us on a Sunday"
            body="Come exactly as you are — no dress code, no pressure, no being singled out. We’ll tell you honestly what a gathering is like, where to park, and what’s there for your kids. Then we’ll be looking for you."
            cta={{ label: 'Plan your visit →', href: '/im-new', variant: 'ghost' }}
          />
          <Door
            image="/site/door-begin.webp"
            alt="Two people walking together up a winding path into golden-hour light."
            tag="Anywhere, today"
            title="Begin the Journey"
            body="You don’t have to believe first to belong. Start being with Jesus right now, wherever you are — five unhurried conversations that open onto the whole path, at your own pace, with real people walking beside you."
            cta={{ label: 'Start the Welcome Track →', href: '/begin', variant: 'primary' }}
          />
        </div>
      </Band>

      {/* PATHWAY */}
      <Band variant="cream2" id="pathway">
        <div className="max-w-[720px]">
          <Eyebrow className="mb-3.5">The Journey · BE → BECOME → BRING</Eyebrow>
          <h2 className={H2}>One road, taken one step at a time.</h2>
          <p className="mt-3 font-fraunces text-[19px] italic text-site-ember">
            You never take the whole staircase at once — only the next step. Guest → Follower →
            Disciple-Maker → Leader.
          </p>
        </div>
        <Pathway className="mt-11" />
      </Band>

      {/* TEACHING PREVIEW */}
      <Band variant="cream" id="teaching">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Eyebrow className="mb-3.5">Watch &amp; Read</Eyebrow>
            <h2 className={H2}>The water, given away.</h2>
          </div>
          <Button href="/teaching" variant="ghost">
            All teaching →
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr_1fr]">
          <TeachingCard
            kind="Latest Sermon"
            thumb={{ image: '/site/teaching-well.webp', play: true }}
            series="Series · The Well"
            title="Proximity Is Not the Same as Orientation"
            desc="On the outsiders who turned toward Jesus — and what it means that heaven reads direction, not distance."
            featured
          />
          <TeachingCard
            kind="Article"
            thumb={{ gradient: 'linear-gradient(150deg, #B0894F, #8a6a38)' }}
            series="Formation"
            title={<>What Does It Mean to “Be With Jesus”?</>}
            desc="A plain guide to the practice underneath everything."
          />
          <TeachingCard
            kind="Article"
            thumb={{ gradient: 'linear-gradient(150deg, #3E5A34, #1F2A1D)' }}
            series="Following Jesus"
            title="Grace Is Not Opposed to Effort"
            desc="Why apprenticeship isn’t earning — and how change actually happens."
          />
        </div>
      </Band>

      {/* STORY */}
      <section className="relative overflow-hidden py-[60px] sm:py-[84px]" id="story">
        <img
          src="/site/story.webp"
          alt="Several people’s hands clasped in prayer around an open Bible and a single candle in warm, low light."
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(36,22,17,0.95) 0%, rgba(36,22,17,0.82) 44%, rgba(36,22,17,0.50) 72%, rgba(36,22,17,0.28) 100%)',
          }}
        />
        <Wrap className="relative">
          <Eyebrow color="text-site-brass" className="mb-3.5">
            The story you’re joining
          </Eyebrow>
          <h2 className="font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-white sm:text-[38px]">
            A call that has been sounding for over forty years.
          </h2>
          <p className="mt-4 max-w-[720px] text-[18.5px] leading-[1.66] text-site-cream/85">
            In 1980, in a student prayer meeting in Ile-Ife, Nigeria, a word was spoken that birthed
            our movement:{' '}
            <em className="font-fraunces text-[#E7D9BE]">
              “Start preparing people for the Great Harvest.”
            </em>{' '}
            Today that preparation continues in Laurel, Maryland — an ordinary people learning to
            carry heaven into homes, workplaces, and neighborhoods, as part of the Charismatic Renewal
            Ministries. You’re not joining a program. You’re answering an invitation.{' '}
            <Link href="/about" className="border-b border-site-brass/50 font-semibold text-site-brass">
              Read our story →
            </Link>
          </p>
        </Wrap>
      </section>

      {/* FINAL INVITE */}
      <section
        className="relative py-[60px] text-center sm:py-[84px]"
        style={{ background: 'radial-gradient(120% 100% at 50% 0%, #FFFBF2, #FBF7EF 60%)' }}
      >
        <Wrap>
          <Eyebrow className="mb-3.5">Whatever brought you here</Eyebrow>
          <h2 className="mx-auto max-w-[720px] font-fraunces text-[30px] font-semibold leading-[1.1] tracking-[-0.01em] text-site-umber sm:text-[42px]">
            We’re glad you came. Take one step.
          </h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[19px] text-site-soft">
            You don’t have to figure out the whole road today. Come and see on a Sunday, or begin the
            journey right now — wherever you are.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Button href="/begin" variant="primary">
              Begin the Journey
            </Button>
            <Button href="/im-new" variant="ghost">
              Plan a Visit
            </Button>
          </div>
        </Wrap>
      </section>
    </>
  );
}
