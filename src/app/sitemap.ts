// Run 30 — XML sitemap for the public site, rooted at the canonical apex.
// Only pages that actually exist are listed. Submitted to Search Console.
// Run 49 — the 8 topic hubs (/teaching/topic/<slug>) join for topics that have
// at least one visible teaching (activeTopics); empty ones are omitted.
import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { visibleTeachings, activeTopics } from '@/lib/teaching';

const LASTMOD = '2026-07-13';

// Run 42 — revalidate hourly so newly-published (scheduled) teachings enter the
// sitemap on their day; hidden ones are omitted until then.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const teaching: MetadataRoute.Sitemap = (await visibleTeachings()).map((t) => ({
    url: `${base}/teaching/${t.slug}`,
    lastModified: t.date,
    changeFrequency: 'yearly',
    priority: 0.6,
  }));
  const topicHubs: MetadataRoute.Sitemap = (await activeTopics()).map((t) => ({
    url: `${base}/teaching/topic/${t.slug}`,
    lastModified: LASTMOD,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
  return [
    { url: `${base}/`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/im-new`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/journey`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/teaching`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/gatherings`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/prayer`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/give`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/begin`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/become`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/discipler`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/leaders`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/thegathering`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    ...topicHubs,
    ...teaching,
  ];
}
