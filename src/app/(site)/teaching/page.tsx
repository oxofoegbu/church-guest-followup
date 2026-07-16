// Run 35 — Watch & Read (the teaching hub / SEO engine). Server-rendered from
// the in-repo content model: a featured teaching, topic chips, a sermons grid
// (YouTube), a formation-articles grid, and a subscribe box. Copy from the
// mock (watchread.html). Publishing new teaching = adding an entry to
// src/content/teaching/{sermons,articles}.ts — this page needs no edits.
// Run 40 — full-text search: a `?q=` search box (works without JS) that spans
// every sermon + article and shows a single ranked result set.
import type { Metadata } from 'next';
import Link from 'next/link';
import InteriorHero from '@/components/site/InteriorHero';
import Band from '@/components/site/Band';
import Eyebrow from '@/components/site/Eyebrow';
import Button from '@/components/site/Button';
import SubscribeForm from '@/components/site/SubscribeForm';
import Pager from '@/components/site/Pager';
import { SITE } from '@/lib/site';
import {
  visibleSermons,
  visibleArticles,
  activeTopics,
  featuredTeaching,
  searchTeachings,
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
  openGraph: { siteName: SITE.name, title: OG_TITLE, description: OG_DESC, url: `${SITE.url}/teaching`, type: 'website', images: [{ url: '/site/social-og.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: OG_TITLE, description: OG_DESC, images: ['/site/social-og.jpg'] },
};

const PlayIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

const SearchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
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

// The search box — a plain GET form, so it works with or without JavaScript and
// every result set is a shareable URL. Rendered on both the browse and results
// views so a visitor can refine in place.
function SearchBox({ q }: { q: string }) {
  return (
    <div className="bg-site-cream2">
      <div className="mx-auto max-w-[1120px] px-7 pt-9 pb-1">
        <form method="get" action="/teaching" role="search" className="relative mx-auto max-w-[640px]">
          <label htmlFor="teaching-q" className="sr-only">Search sermons and articles</label>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-site-soft">{SearchIcon}</span>
          <input
            id="teaching-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search sermons and articles…"
            autoComplete="off"
            className="w-full rounded-full border border-site-claydk bg-site-paper py-3.5 pl-11 pr-[104px] text-[15.5px] text-site-ink shadow-sm placeholder:text-site-soft focus:border-site-brass focus:outline-none focus:ring-2 focus:ring-site-brass/25"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-site-ember px-5 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-site-ember/90"
          >
            Search
          </button>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 9; // sermons / articles / results shown per page

function toPage(v: string | undefined): number {
  const n = v ? parseInt(v, 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default function TeachingPage({
  searchParams,
}: {
  searchParams?: { topic?: string; sp?: string; ap?: string; q?: string; p?: string };
}) {
  const q = (searchParams?.q ?? '').trim();
  const isSearch = q.length > 0;
  const featured = featuredTeaching();

  // ---- Search view: one ranked result set across sermons + articles ----
  if (isSearch) {
    const results = searchTeachings(q);
    const resultPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const p = Math.min(toPage(searchParams?.p), resultPages);
    const pageResults = results.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
    const searchHref = (page: number): string =>
      `/teaching?q=${encodeURIComponent(q)}${page > 1 ? `&p=${page}` : ''}#results`;
    const topics = activeTopics();

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
        <SearchBox q={q} />

        <Band variant="cream2" id="results">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow className="mb-3">Search</Eyebrow>
              <h2 className={H2}>
                {results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”
              </h2>
            </div>
            <Link href="/teaching" className="text-[14px] font-semibold text-site-ember underline-offset-2 hover:underline">
              ← Clear search
            </Link>
          </div>

          {results.length > 0 ? (
            <>
              {results.length > PAGE_SIZE ? (
                <p className="mb-6 text-[13.5px] text-site-soft">
                  Showing {(p - 1) * PAGE_SIZE + 1}–{Math.min(p * PAGE_SIZE, results.length)} of {results.length}
                </p>
              ) : null}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pageResults.map((t) => (
                  <TeachingCard key={t.slug} t={t} />
                ))}
              </div>
              <Pager current={p} totalPages={resultPages} ariaLabel="Search result pages" hrefFor={searchHref} />
            </>
          ) : (
            <div className="rounded-[16px] border border-dashed border-site-claydk bg-site-paper px-8 py-12 text-center">
              <p className="mx-auto mb-6 max-w-[520px] text-[16.5px] leading-[1.6] text-site-soft">
                Nothing matched “{q}” yet. Try a broader word — a theme, a book of the Bible, or a
                feeling — or browse by topic below.
              </p>
              {topics.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2.5">
                  {topics.map((tp) => (
                    <Link
                      key={tp.slug}
                      href={`/teaching/topic/${tp.slug}`}
                      className="rounded-full border border-site-claydk px-4 py-2 text-[13.5px] font-medium text-site-ink transition-colors hover:border-site-brass"
                    >
                      {tp.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Band>

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
      </>
    );
  }

  // ---- Browse view (default) ----
  const topics = activeTopics();
  const active = searchParams?.topic as TopicSlug | undefined;
  const activeValid = active && topics.some((x) => x.slug === active) ? active : undefined;

  const pubSermons = visibleSermons();
  const pubArticles = visibleArticles();
  const allSermons = activeValid ? pubSermons.filter((s) => s.topic === activeValid) : pubSermons;
  const allArticles = activeValid ? pubArticles.filter((a) => a.topic === activeValid) : pubArticles;

  // Pagination — clamp each section's page to its range.
  const sermonPages = Math.max(1, Math.ceil(allSermons.length / PAGE_SIZE));
  const articlePages = Math.max(1, Math.ceil(allArticles.length / PAGE_SIZE));
  const sp = Math.min(toPage(searchParams?.sp), sermonPages);
  const ap = Math.min(toPage(searchParams?.ap), articlePages);
  const sermons = allSermons.slice((sp - 1) * PAGE_SIZE, sp * PAGE_SIZE);
  const articles = allArticles.slice((ap - 1) * PAGE_SIZE, ap * PAGE_SIZE);

  // Build a hub URL preserving topic + both section pages (omitting defaults).
  const hubHref = (over: { sp?: number; ap?: number }, hash: string): string => {
    const nextSp = over.sp ?? sp;
    const nextAp = over.ap ?? ap;
    const qs: string[] = [];
    if (activeValid) qs.push(`topic=${activeValid}`);
    if (nextSp > 1) qs.push(`sp=${nextSp}`);
    if (nextAp > 1) qs.push(`ap=${nextAp}`);
    return `/teaching${qs.length ? `?${qs.join('&')}` : ''}${hash}`;
  };
  const rangeLabel = (page: number, total: number): string => {
    const from = (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    return `${from}–${to} of ${total}`;
  };

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

      <SearchBox q={q} />

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
                href={`/teaching/topic/${tp.slug}`}
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
      <Band variant="cream" id="sermons">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow className="mb-3">Recent teaching</Eyebrow>
            <h2 className={H2}>Sermons &amp; series.</h2>
          </div>
          {allSermons.length > PAGE_SIZE ? (
            <p className="text-[13.5px] text-site-soft">Showing {rangeLabel(sp, allSermons.length)}</p>
          ) : null}
        </div>
        {sermons.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sermons.map((s) => (
                <TeachingCard key={s.slug} t={s} />
              ))}
            </div>
            <Pager current={sp} totalPages={sermonPages} ariaLabel="Sermons pages" hrefFor={(p) => hubHref({ sp: p }, '#sermons')} />
          </>
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
      {allArticles.length > 0 ? (
        <Band variant="cream2" id="articles">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow className="mb-3">Read</Eyebrow>
              <h2 className={H2}>Formation, in plain words.</h2>
            </div>
            {allArticles.length > PAGE_SIZE ? (
              <p className="text-[13.5px] text-site-soft">Showing {rangeLabel(ap, allArticles.length)}</p>
            ) : null}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <TeachingCard key={a.slug} t={a} />
            ))}
          </div>
          <Pager current={ap} totalPages={articlePages} ariaLabel="Articles pages" hrefFor={(p) => hubHref({ ap: p }, '#articles')} />
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

      {pubArticles.length + pubSermons.length > 0 ? (
        <div className="pb-4 text-center">
          <Button href="/journey" variant="ghost">See the whole journey →</Button>
        </div>
      ) : null}
    </>
  );
}
