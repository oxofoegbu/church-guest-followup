import type { Metadata } from 'next';

// Run 29 — metadata for the public Leaders Track landing page (/leaders).
// The page itself is a client component; this server layout carries the
// route's own title/description and the interim social preview imagery.
// Until a text-baked Leaders social square exists, the approved portrait
// (plus a 1200x630 center-weighted crop) stands in for the link preview
// (§5.3.1) — neither is placed on-page.

const OG_TITLE = 'Leaders Track — Grace Life Center';
const OG_DESCRIPTION =
  'Leadership begins with a call, not a position. An eleven-week formation journey that ends on your knees, being commissioned and sent. It will cost you something. It was always meant to.';

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: 'website',
    url: 'https://gracelifecenter.com/leaders',
    images: [
      { url: 'https://gracelifecenter.com/leaders/social-og.jpg', width: 1200, height: 630 },
      { url: 'https://gracelifecenter.com/leaders/social-square.jpg', width: 1200, height: 1200 },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ['https://gracelifecenter.com/leaders/social-og.jpg'],
  },
};

export default function LeadersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
