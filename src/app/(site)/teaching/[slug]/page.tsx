// Run 35 — teaching detail (/teaching/[slug]). Statically generated from the
// in-repo content model. Sermons embed the YouTube video (privacy-enhanced) and
// show an optional transcript; articles render their body. Emits VideoObject /
// Article + BreadcrumbList JSON-LD for search + AI answer engines.
// Run 50 — a "Keep reading" section (more in this topic + prev/next) links every
// teaching into the wider library — internal-linking, automatic, no re-authoring.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Band from '@/components/site/Band';
import Button from '@/components/site/Button';
import TeachingBody from '@/components/site/TeachingBody';
import { SITE } from '@/lib/site';
import { visibleTeachings, isVisible, getTeaching, topicLabel, youTubeThumb, relatedTeachings, adjacentTeachings } from '@/content/teaching';

// Run 42 — pre-build only the currently-visible detail pages; a scheduled
// article renders on-demand once its day arrives (dynamicParams default). ISR
// hourly so a not-yet-due slug (which 404s below) flips to live within the hour
// of its publishAt without a redeploy.
export const revalidate = 3600;

export function generateStaticParams() {
  return visibleTeachings().map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const t = getTeaching(params.slug);
  if (!t) return { title: 'Teaching' };
  const url = `${SITE.url}/teaching/${t.slug}`;
  const image = t.kind === 'sermon' ? youTubeThumb(t.youTubeId) : '/site/social-og.jpg';
  return {
    title: t.title,
    description: t.excerpt,
    alternates: { canonical: `/teaching/${t.slug}` },
    openGraph: {
      title: t.title,
      description: t.excerpt,
      url,
      type: t.kind === 'sermon' ? 'video.other' : 'article',
      images: [{ url: image }],
    },
    twitter: { card: 'summary_large_image', title: t.title, description: t.excerpt, images: [image] },
  };
}

const H2 = 'font-fraunces text-[30px] font-semibold leading-[1.12] tracking-[-0.01em] text-site-umber sm:text-[38px]';

export default function TeachingDetail({ params }: { params: { slug: string } }) {
  const t = getTeaching(params.slug);
  if (!t || !isVisible(t)) notFound(); // hidden until its scheduled publishAt

  const url = `${SITE.url}/teaching/${t.slug}`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
      { '@type': 'ListItem', position: 2, name: 'Watch & Read', item: `${SITE.url}/teaching` },
      { '@type': 'ListItem', position: 3, name: t.title, item: url },
    ],
  };

  const publisherOrg = {
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: { '@type': 'ImageObject', url: `${SITE.url}/logo-full.png` },
  };

  const primary =
    t.kind === 'sermon'
      ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: t.title,
          description: t.excerpt,
          thumbnailUrl: [youTubeThumb(t.youTubeId)],
          uploadDate: t.date,
          embedUrl: `https://www.youtube.com/embed/${t.youTubeId}`,
          ...(t.durationMin ? { duration: `PT${t.durationMin}M` } : {}),
          publisher: publisherOrg,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: t.title,
          description: t.excerpt,
          image: [`${SITE.url}/site/social-og.jpg`],
          datePublished: t.date,
          dateModified: t.date,
          author: { '@type': 'Person', name: t.author },
          publisher: publisherOrg,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          ...(t.series ? { articleSection: t.series } : {}),
        };

  const metaBits: string[] = [t.author];
  if (t.kind === 'sermon' && t.durationMin) metaBits.push(`${t.durationMin} min`);
  if (t.kind === 'article' && t.readMin) metaBits.push(`${t.readMin} min read`);

  // Run 50 — internal linking: same-topic siblings + chronological neighbours.
  const related = relatedTeachings(t.slug, t.topic, 3);
  const adj = adjacentTeachings(t.slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(primary) }} />

      {/* Header */}
      <Band variant="cream2">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-site-soft">
          <Link href="/home" className="hover:text-site-ember">Home</Link>
          <span className="px-2">/</span>
          <Link href="/teaching" className="hover:text-site-ember">Watch &amp; Read</Link>
          <span className="px-2">/</span>
          <span className="text-site-ink">{t.kind === 'sermon' ? 'Sermon' : 'Article'}</span>
        </nav>
        <div className="max-w-[760px]">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">
            {t.kind === 'sermon' ? 'Sermon' : 'Article'}
            {t.series ? ` · ${t.series}` : (
              <> · <Link href={`/teaching/topic/${t.topic}`} className="underline-offset-2 transition-colors hover:text-site-ember hover:underline">{topicLabel(t.topic)}</Link></>
            )}
          </p>
          <h1 className="font-fraunces text-[34px] font-semibold leading-[1.08] tracking-[-0.01em] text-site-umber sm:text-[46px]">
            {t.title}
          </h1>
          <p className="mt-4 text-[14px] text-site-soft">{metaBits.join(' · ')}</p>
        </div>
      </Band>

      {/* Body */}
      <Band variant="cream">
        <div className="mx-auto max-w-[760px]">
          {t.kind === 'sermon' ? (
            <>
              <div className="relative mb-8 aspect-video overflow-hidden rounded-[16px] bg-site-umber">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${t.youTubeId}`}
                  title={t.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              <p className="text-[18px] leading-[1.6] text-site-ink">{t.excerpt}</p>
              {t.transcript && t.transcript.length > 0 ? (
                <div className="mt-10 border-t border-site-claydk pt-9">
                  <h2 className={`${H2} mb-6`}>Transcript</h2>
                  <TeachingBody blocks={t.transcript} />
                </div>
              ) : null}
            </>
          ) : (
            <article>
              <p className="mb-2 font-fraunces text-[21px] italic leading-[1.5] text-site-soft">{t.excerpt}</p>
              <TeachingBody blocks={t.body} />
            </article>
          )}

          {/* Keep reading — Run 50 internal linking */}
          {related.length > 0 || adj.older || adj.newer ? (
            <div className="mt-12 border-t border-site-claydk pt-9">
              {related.length > 0 ? (
                <div className="mb-9">
                  <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-site-brassdk">More in {topicLabel(t.topic)}</p>
                  <ul className="grid gap-3">
                    {related.map((r) => (
                      <li key={r.slug}>
                        <Link href={`/teaching/${r.slug}`} className="flex items-baseline justify-between gap-4 rounded-[12px] border border-site-claydk bg-site-paper px-5 py-4 transition-colors hover:border-site-brass">
                          <span className="font-fraunces text-[18px] leading-[1.25] text-site-umber">{r.title}</span>
                          <span className="flex-none text-[13px] font-semibold text-site-ember">{r.kind === 'sermon' ? 'Watch →' : 'Read →'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[14px]">
                    <Link href={`/teaching/topic/${t.topic}`} className="font-semibold text-site-ember underline-offset-2 hover:underline">Browse all {topicLabel(t.topic)} →</Link>
                  </p>
                </div>
              ) : null}
              {adj.older || adj.newer ? (
                <div className="flex flex-wrap items-start justify-between gap-4 text-[14px] text-site-soft">
                  {adj.older ? (
                    <Link href={`/teaching/${adj.older.slug}`} className="max-w-[46%] hover:text-site-ember">← {adj.older.title}</Link>
                  ) : <span />}
                  {adj.newer ? (
                    <Link href={`/teaching/${adj.newer.slug}`} className="max-w-[46%] text-right hover:text-site-ember">{adj.newer.title} →</Link>
                  ) : <span />}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-12 flex flex-wrap gap-3.5 border-t border-site-claydk pt-8">
            <Button href="/teaching" variant="ghost">← All teaching</Button>
            <Button href="/begin" variant="primary">Begin the journey</Button>
          </div>
        </div>
      </Band>
    </>
  );
}
