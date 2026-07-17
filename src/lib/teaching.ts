// Run 56 — the live read path for teaching content. The 166 articles + 16
// sermons now live in Postgres (`Teaching`); this module loads them once per
// request/ISR pass and hands the array to the SAME pure helpers the in-repo
// registry used (`src/content/teaching/helpers.ts`). The algorithms did not
// change — only where their input comes from. Run 41's search tuning is intact.
//
// Precedent: `TrackModule.content Json` + `src/lib/workbook.ts` (Runs 12/15/17)
// — DB-stored blocks, code-defined schema, validated on read.
import * as React from 'react';
import { prisma } from '@/lib/db';
import * as H from '@/content/teaching/helpers';
import type { Teaching, Sermon, Article, TopicSlug, Block } from '@/content/teaching/types';
import { TOPICS } from '@/content/teaching/types';

export type { Teaching, Sermon, Article, TopicSlug, Block };
export { TOPICS };

// Pure, data-independent helpers — re-exported so a consumer needs ONE import.
export const topicLabel = H.topicLabel;
export const youTubeThumb = H.youTubeThumb;
export const isVisible = H.isVisible;
export const todayEastern = H.todayEastern;

// ---------------------------------------------------------------------------
// Dates. THE most consequential few lines in this run.
//
// `date` and `publishAt` are @db.Date — a CALENDAR DATE in America/New_York,
// never an instant. Prisma hands back a JS Date pinned to UTC midnight, so
// `toISOString().slice(0, 10)` returns that exact calendar date, always.
//
// Do NOT "improve" this with getFullYear()/getMonth()/getDate() or
// toLocaleDateString() — those read the SERVER's local zone and would shift the
// date by a day, publishing Pastor Okezie's writing early or late in public.
// The string produced here is compared against todayEastern() by isVisible(),
// exactly as the registry's ISO strings were.
// ---------------------------------------------------------------------------
function dateOnly(d: Date | string): string {
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Block[] validation. Once `body` is Json there is no compile-time guarantee,
// so a malformed block must DEGRADE, never 500 the page. Mirrors the shape of
// `isWorkbookContent` in src/lib/workbook.ts.
// ---------------------------------------------------------------------------
function isBlock(b: unknown): b is Block {
  if (!b || typeof b !== 'object') return false;
  const x = b as Record<string, unknown>;
  if (x.type === 'p' || x.type === 'h2') return typeof x.text === 'string';
  if (x.type === 'quote') {
    return typeof x.text === 'string' && (x.cite === undefined || typeof x.cite === 'string');
  }
  if (x.type === 'list') {
    return Array.isArray(x.items) && x.items.every((i: unknown) => typeof i === 'string');
  }
  return false;
}

export function toBlocks(v: unknown): Block[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isBlock);
}

// A row whose `topic` no longer matches a TopicSlug still renders — topicLabel()
// falls back to the raw slug, exactly as it always did for an unknown topic.
function rowToTeaching(r: Record<string, any>): Teaching | null {
  if (typeof r.slug !== 'string' || typeof r.title !== 'string') return null;

  const base = {
    slug: r.slug,
    title: r.title,
    excerpt: typeof r.excerpt === 'string' ? r.excerpt : '',
    date: dateOnly(r.date),
    topic: r.topic as TopicSlug,
    author: typeof r.author === 'string' ? r.author : '',
    ...(r.series ? { series: r.series as string } : {}),
    ...(r.featured === true ? { featured: true } : {}),
    ...(r.publishAt ? { publishAt: dateOnly(r.publishAt) } : {}),
  };

  if (r.kind === 'sermon') {
    const t: Sermon = {
      ...base,
      kind: 'sermon',
      youTubeId: typeof r.youTubeId === 'string' ? r.youTubeId : '',
      ...(typeof r.durationMin === 'number' ? { durationMin: r.durationMin } : {}),
      ...(r.transcript ? { transcript: toBlocks(r.transcript) } : {}),
    };
    return t;
  }

  if (r.kind === 'article') {
    const t: Article = {
      ...base,
      kind: 'article',
      body: toBlocks(r.body),
      ...(typeof r.readMin === 'number' ? { readMin: r.readMin } : {}),
    };
    return t;
  }

  return null; // unknown kind — skip rather than render garbage
}

// ---------------------------------------------------------------------------
// The one query.
//
// ORDER BY date DESC, seq ASC reproduces the registry's order EXACTLY. The
// registry built `[...SERMONS, ...ARTICLES].sort(byDateDesc)`, and Array.sort
// is stable, so teachings sharing a date kept their concatenation order. Three
// dates are shared by seven live teachings, so ordering by `date` alone would
// silently scramble them across the hub, prev/next, related, and the sitemap.
// `seq` is that concatenation index, seeded once. Verified identical for all
// 182 before this run shipped.
//
// `status` is filtered here so Run B's DRAFT/ARCHIVED work needs no read-path
// change. Every row seeded PUBLISHED, so today this filter is a no-op.
//
// Request-scoped memoization: one query per request / per ISR revalidation
// pass, no matter how many helpers the page calls.
//
// React's `cache` is NOT in the stable react@18.3.1 build — it exists only
// under the "react-server" export condition, which Next 14 supplies by aliasing
// `react` to its own vendored canary for app-directory server code. That means
// it is present in production but absent in a plain Node harness, so it cannot
// be verified outside Next. Rather than ship an import that is unverifiable on
// a run that touches a live publishing drip, we feature-detect it: when React
// provides cache() we dedupe; when it doesn't we simply query again.
//
// The important property: correctness does NOT depend on this. Both paths
// return the same rows in the same order — the only difference is how many
// times the query runs. A missing cache costs performance, never behaviour.
const memoize = <T>(fn: () => Promise<T>): (() => Promise<T>) => {
  const c = (React as unknown as { cache?: <F>(f: F) => F }).cache;
  return typeof c === 'function' ? c(fn) : fn;
};

// ---------------------------------------------------------------------------
export const getAllTeachings = memoize(async (): Promise<Teaching[]> => {
  const rows: Record<string, any>[] = await (prisma as any).teaching.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ date: 'desc' }, { seq: 'asc' }],
  });
  const out: Teaching[] = [];
  rows.forEach((r) => {
    const t = rowToTeaching(r);
    if (t) out.push(t);
  });
  return out;
});

// ---------------------------------------------------------------------------
// Async mirrors of the registry's API — same names, same return values, same
// order. A consumer changes its import path and adds `await`. That is the whole
// migration. (Unfiltered by design, exactly as before: getTeaching + the ALL_*
// lists do NOT gate on publishAt — the detail page and generateStaticParams
// gate explicitly, which is what keeps a scheduled article previewable by
// direct URL while staying off every index.)
// ---------------------------------------------------------------------------
export async function getTeaching(slug: string): Promise<Teaching | undefined> {
  return H.getTeaching(await getAllTeachings(), slug);
}

export async function allSermons(): Promise<Sermon[]> {
  return H.sermonsOf(await getAllTeachings());
}

export async function allArticles(): Promise<Article[]> {
  return H.articlesOf(await getAllTeachings());
}

export async function visibleTeachings(): Promise<Teaching[]> {
  return H.visibleTeachings(await getAllTeachings());
}

export async function visibleSermons(): Promise<Sermon[]> {
  return H.visibleSermons(await getAllTeachings());
}

export async function visibleArticles(): Promise<Article[]> {
  return H.visibleArticles(await getAllTeachings());
}

export async function activeTopics(): Promise<{ slug: TopicSlug; label: string }[]> {
  return H.activeTopics(await getAllTeachings());
}

export async function teachingsByTopic(slug: TopicSlug): Promise<Teaching[]> {
  return H.teachingsByTopic(await getAllTeachings(), slug);
}

export async function searchTeachings(query: string): Promise<Teaching[]> {
  return H.searchTeachings(await getAllTeachings(), query);
}

export async function featuredTeaching(): Promise<Teaching | undefined> {
  return H.featuredTeaching(await getAllTeachings());
}

export async function relatedTeachings(slug: string, topic: TopicSlug, limit = 3): Promise<Teaching[]> {
  return H.relatedTeachings(await getAllTeachings(), slug, topic, limit);
}

export async function adjacentTeachings(slug: string): Promise<{ newer?: Teaching; older?: Teaching }> {
  return H.adjacentTeachings(await getAllTeachings(), slug);
}
