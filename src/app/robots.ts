// Run 30 — robots.txt for the whole deployment. Allow the public marketing +
// track pages; keep private surfaces (admin dashboard, APIs, token portals,
// password flows) out of the index. Points crawlers at the sitemap.
import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/track/',
          '/change-password',
          '/reset-password',
          '/forgot-password',
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
