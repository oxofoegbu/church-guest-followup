// Run 49 — topic hub pages (/teaching/topic/[slug]). Real, indexable landing
// pages for each of the 8 teaching topics: a title, a topical intro, and every
// visible sermon + article on that theme. Turns the old ?topic= filter into
// crawlable URLs (in the sitemap) that can rank for theme queries, and gathers
// internal link equity. Hourly ISR so scheduled teachings appear on their day.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import SubscribeForm from '@/components/site/SubscribeForm';
import { SITE } from '@/lib/site';
import { TOPICS, topicLabel, teachingsByTopic, youTubeThumb, type Teaching, type TopicSlug } from '@/content/teaching';

export const revalidate = 3600;

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

// Short, topical intros — used for the page lede and the meta description so
// each hub reads distinctly to a person and to search.
const TOPIC_INTRO: Record<TopicSlug, string> = {
  'the-well': 'Why we’re a well, not a fence — gathering around Jesus rather than guarding a boundary.',
  'being-with-jesus': 'Being with Jesus before doing for Jesus — abiding, presence, and an unhurried life with God.',
  'sermon-on-the-mount': 'Living the Sermon on the Mount — Jesus’ vision for the heart, one honest practice at a time.',
  'following-jesus': 'What it actually means to follow Jesus — first steps, real questions, and the long obedience.',
  'prayer-and-spirit': 'Prayer, the Holy Spirit, and healing — learning to pray and to keep in step with the Spirit.',
  'church-without-fences': 'A church without fences — grace over performance, and belonging before believing.',
  'the-kingdom': 'The kingdom of God — how heaven comes near, and how we carry it into ordinary life.',
  'formation': 'Spiritual formation — being changed from the inside out into the likeness of Jesus.',
};

const PlayIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

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
        <span className="text-[13.5px] font-semibold text-site-ember">{isSermon ? 'Watch now →' : 'Read →'}</span>
      </div>
    </Link>
  );
}

function topicFromSlug(slug: string): TopicSlug | null {
  return TOPICS.some((t) => t.slug === slug) ? (slug as TopicSlug) : null;
}

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const topic = topicFromSlug(params.slug);
  if (!topic) return { title: 'Teaching' };
  const label = topicLabel(topic);
  const desc = TOPIC_INTRO[topic];
  const url = `${SITE.url}/teaching/topic/${topic}`;
  const ogTitle = `${label} — Watch & Read · Grace Life Center`;
  return {
    title: `${label} — Watch & Read`,
    description: desc,
    alternates: { canonical: `/teaching/topic/${topic}` },
    openGraph: { siteName: SITE.name, title: ogTitle, description: desc, url, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: ogTitle, description: desc, images: ['/site/social-og.jpg'] },
  };
}

export default function TopicHubPage({ params }: { params: { slug: string } }) {
  const topic = topicFromSlug(params.slug);
  if (!topic) notFound();
  const label = topicLabel(topic);
  const intro = TOPIC_INTRO[topic];
  const teachings = teachingsByTopic(topic); // visible only, newest first
  const url = `${SITE.url}/teaching/topic/${topic}`;
  const others = TOPICS.filter((t) => t.slug !== topic);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
      { '@type': 'ListItem', position: 2, name: 'Watch & Read', item: `${SITE.url}/teaching` },
      { '@type': 'ListItem', position: 3, name: label, item: url },
    ],
  };
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} — Watch & Read`,
    description: intro,
    url,
    isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
    ...(teachings.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: teachings.slice(0, 30).map((t, i) => ({
              '@type': 'ListItem', position: i + 1, url: `${SITE.url}/teaching/${t.slug}`, name: t.title,
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />

      <InteriorHero
        image="/site/teaching-well.webp"
        alt="Cupped hands holding water lit gold by the sun — the water, given away."
        eyebrow="Watch & Read"
        title={label}
        lede={intro}
        current={label}
        objectPosition="50% 45%"
      />

      <div className="bg-site-cream2">
        <div className="mx-auto max-w-[1120px] px-7 py-5 text-[13px] text-site-soft">
          <Link href="/teaching" className="hover:text-site-ember">Watch &amp; Read</Link>
          <span className="px-2">/</span>
          <span className="text-site-ink">{label}</span>
        </div>
      </div>

      <Band variant="cream">
        <div className="mb-8">
          <Eyebrow className="mb-3">Teaching on this theme</Eyebrow>
          <h2 className={H2}>{label}.</h2>
        </div>
        {teachings.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teachings.map((t) => <TeachingCard key={t.slug} t={t} />)}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-site-claydk bg-site-paper px-8 py-12 text-center">
            <p className="mx-auto max-w-[520px] text-[16.5px] leading-[1.6] text-site-soft">
              New teaching on {label.toLowerCase()} is on its way. In the meantime,{' '}
              <Link href="/teaching" className="font-semibold text-site-ember underline-offset-2 hover:underline">browse all Watch &amp; Read</Link>.
            </p>
          </div>
        )}
      </Band>

      <Band variant="cream2">
        <Eyebrow className="mb-5">Explore other topics</Eyebrow>
        <div className="flex flex-wrap gap-2.5">
          {others.map((t) => (
            <Link key={t.slug} href={`/teaching/topic/${t.slug}`}
              className="rounded-full border border-site-claydk px-4 py-2 text-[13.5px] font-medium text-site-ink transition-colors hover:border-site-brass">
              {t.label}
            </Link>
          ))}
        </div>
      </Band>

      <Band variant="cream" id="subscribe">
        <div className="mx-auto max-w-[640px] text-center">
          <Eyebrow className="mb-3.5">Stay close</Eyebrow>
          <h2 className={`${H2} mb-3`}>New teaching, when it lands.</h2>
          <p className="mx-auto mb-7 max-w-[520px] text-[17px] text-site-soft">
            One honest email now and then — a new sermon, a short piece on following Jesus. No noise, unsubscribe anytime.
          </p>
          <SubscribeForm />
        </div>
      </Band>

      <div className="pb-4 text-center">
        <Button href="/teaching" variant="ghost">← All Watch &amp; Read</Button>
      </div>
    </>
  );
}
