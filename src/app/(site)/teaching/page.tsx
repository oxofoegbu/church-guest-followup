// Run 35 — Watch & Read (the teaching hub / SEO engine). Server-rendered from
// the in-repo content model: a featured teaching, topic chips, a sermons grid
// (YouTube), a formation-articles grid, and a subscribe box. Copy from the
// mock (watchread.html). Publishing new teaching = adding an entry to
// src/content/teaching/{sermons,articles}.ts — this page needs no edits.
import type { Metadata } from 'next';
import Link from 'next/link';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import SubscribeForm from '@/components/site/SubscribeForm';
import { SITE } from '@/lib/site';
import {
  ALL_SERMONS,
  ALL_ARTICLES,
  activeTopics,
  featuredTeaching,
  topicLabel,
  youTubeThumb,
  type Teaching,
  type TopicSlug,
} from '@/content/teaching';

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

const OG_TITLE = 'Watch & Read — Sermons and honest writing · Grace Life Center';
const OG_DESC =
  'Sermons and honest writing on being with Jesus, becoming like Him, and carrying heaven — free, and for anyone who’s hungry. From Grace Life Center in Laurel, Maryland.';

export const metadata: Metadata = {
  title: 'Watch & Read',
  description: OG_DESC,
  alternates: { canonical: '/teaching' },
  openGraph: { title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/teaching`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const PlayIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

function metaLine(t: Teaching): string {
  const bits: string[] = [t.author];
  if (t.kind === 'sermon') {
    if (t.durationMin) bits.push(`${t.durationMin} min`);
    if (t.transcript && t.transcript.length > 0) bits.push('Includes transcript');
  } else if (t.readMin) {
    bits.push(`${t.readMin} min read`);
  }
  return bits.join(' · ');
}

function TeachingCard({ t }: { t: Teaching }) {
  const isSermon = t.kind === 'sermon';
  return (
    <Link
      href={`/teaching/${t.slug}`}
      className="group flex flex-col overflow-hidden rounded-[16px] border border-site-claydk bg-site-paper transition-shadow hover:shadow-[0_24px_50px_-34px_rgba(51,32,26,0.5)]"
    >
      {isSermon ? (
        <div className="relative aspect-video overflow-hidden bg-site-umber">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={youTubeThumb(t.youTubeId)} alt="" className="h-full w-full object-cover opacity-95" loading="lazy" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-site-ember/90 text-white shadow-lg transition-transform group-hover:scale-105">
              {PlayIcon}
            </span>
          </span>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-site-brassdk">
          {isSermon ? 'Sermon' : 'Article'}
          {t.series ? ` · ${t.series}` : ` · ${topicLabel(t.topic)}`}
        </p>
        <h3 className="mb-2 font-fraunces text-[20px] leading-[1.2] text-site-umber">{t.title}</h3>
        <p className="mb-4 flex-1 text-[14.5px] leading-[1.55] text-site-soft">{t.excerpt}</p>
        <span className="text-[13.5px] font-semibold text-site-ember">
          {isSermon ? 'Watch now →' : 'Read →'}
        </span>
      </div>
    </Link>
  );
}

export default function TeachingPage({ searchParams }: { searchParams?: { topic?: string } }) {
  const topics = activeTopics();
  const active = searchParams?.topic as TopicSlug | undefined;
  const activeValid = active && topics.some((x) => x.slug === active) ? active : undefined;

  const sermons = activeValid ? ALL_SERMONS.filter((s) => s.topic === activeValid) : ALL_SERMONS;
  const articles = activeValid ? ALL_ARTICLES.filter((a) => a.topic === activeValid) : ALL_ARTICLES;
  const featured = featuredTeaching();

  return (
    <>
      <InteriorHero
        image="/site/teaching-well.webp"
        alt="Cupped hands holding water lit gold by the sun — the water, given away."
        eyebrow="Watch & Read"
        title="The water, given away."
        lede="Sermons and honest writing on being with Jesus, becoming like Him, and carrying heaven — free, and for anyone who’s hungry."
        current="Watch & Read"
        objectPosition="50% 45%"
      />

      {/* Featured — this week */}
      {featured ? (
        <Band variant="cream">
          <Eyebrow className="mb-5">Featured</Eyebrow>
          <Link href={`/teaching/${featured.slug}`} className="group grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div className="relative aspect-video overflow-hidden rounded-[18px] bg-site-umber">
              {featured.kind === 'sermon' ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={youTubeThumb(featured.youTubeId)} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-site-ember/90 text-white shadow-lg transition-transform group-hover:scale-105">
                      {PlayIcon}
                    </span>
                  </span>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-site-well to-[#10262d] p-8 text-center">
                  <p className="font-fraunces text-[22px] italic text-site-cream/90">Formation, in plain words.</p>
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">
                {featured.kind === 'sermon' ? 'Featured Sermon' : 'Featured Article'}
                {featured.series ? ` · ${featured.series}` : ''}
              </p>
              <h2 className={`${H2} mb-3`}>{featured.title}</h2>
              <p className="mb-4 text-[17px] leading-[1.6] text-site-soft">{featured.excerpt}</p>
              <p className="mb-6 text-[14px] text-site-ink">{metaLine(featured)}</p>
              <span className="text-[15px] font-semibold text-site-ember">
                {featured.kind === 'sermon' ? 'Watch now →' : 'Read now →'}
              </span>
            </div>
          </Link>
        </Band>
      ) : null}

      {/* Topic chips */}
      {topics.length > 0 ? (
        <div className="bg-site-cream2">
          <div className="mx-auto flex max-w-[1120px] flex-wrap gap-2.5 px-7 py-7">
            <Link
              href="/teaching"
              className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                !activeValid ? 'border-site-umber bg-site-umber text-site-cream' : 'border-site-claydk text-site-ink hover:border-site-brass'
              }`}
            >
              All
            </Link>
            {topics.map((tp) => (
              <Link
                key={tp.slug}
                href={`/teaching?topic=${tp.slug}`}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                  activeValid === tp.slug ? 'border-site-umber bg-site-umber text-site-cream' : 'border-site-claydk text-site-ink hover:border-site-brass'
                }`}
              >
                {tp.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Sermons */}
      <Band variant="cream">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow className="mb-3">Recent teaching</Eyebrow>
            <h2 className={H2}>Sermons &amp; series.</h2>
          </div>
        </div>
        {sermons.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sermons.map((s) => (
              <TeachingCard key={s.slug} t={s} />
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-site-claydk bg-site-paper px-8 py-12 text-center">
            <p className="mx-auto max-w-[520px] text-[16.5px] leading-[1.6] text-site-soft">
              New sermon videos are on their way to our curated playlist. In the meantime, the
              writing below carries the same teaching — and you can{' '}
              <Link href="#subscribe" className="font-semibold text-site-ember underline-offset-2 hover:underline">
                get a note when the first videos land
              </Link>
              .
            </p>
          </div>
        )}
      </Band>

      {/* Articles */}
      {articles.length > 0 ? (
        <Band variant="cream2">
          <div className="mb-8">
            <Eyebrow className="mb-3">Read</Eyebrow>
            <h2 className={H2}>Formation, in plain words.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <TeachingCard key={a.slug} t={a} />
            ))}
          </div>
        </Band>
      ) : null}

      {/* Subscribe */}
      <Band variant="cream" id="subscribe">
        <div className="mx-auto max-w-[640px] text-center">
          <Eyebrow className="mb-3.5">Stay close</Eyebrow>
          <h2 className={`${H2} mb-3`}>New teaching, when it lands.</h2>
          <p className="mx-auto mb-7 max-w-[520px] text-[17px] text-site-soft">
            One honest email now and then — a new sermon, a short piece on following Jesus. No noise,
            unsubscribe anytime.
          </p>
          <SubscribeForm />
        </div>
      </Band>

      {ALL_ARTICLES.length + ALL_SERMONS.length > 0 ? (
        <div className="pb-4 text-center">
          <Button href="/journey" variant="ghost">See the whole journey →</Button>
        </div>
      ) : null}
    </>
  );
}
