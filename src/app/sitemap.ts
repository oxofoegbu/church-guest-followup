// Run 30 — XML sitemap for the public site, rooted at the canonical apex.
// Only pages that actually exist are listed (the marketing interior pages
// arrive in Runs B/C and join this list then). Submitted to Search Console.
import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

const LASTMOD = '2026-07-13';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  return [
    { url: `${base}/`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/im-new`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/journey`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/gatherings`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/prayer`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/give`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/begin`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/become`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/discipler`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/leaders`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/thegathering`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
  ];
}
