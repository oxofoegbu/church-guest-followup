import type { Metadata } from 'next';

// Run 24 — metadata for the public BECOME® landing page (/become).
// The page itself is a client component; this server layout carries the
// route's own title/description and the approved social preview imagery
// (the one text-baked asset — link previews only, never placed on-page).

const OG_TITLE = 'BECOME\u00AE \u2014 Living Life the Jesus Way \u00B7 Grace Life Center';
const OG_DESCRIPTION =
  'A twelve-week journey through the Sermon on the Mount \u2014 His teachings, one honest practice at a time, until the change is on the inside. You practice; He transforms.';

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  alternates: { canonical: 'https://gracelifecenter.com/become' },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: 'website',
    url: 'https://gracelifecenter.com/become',
    images: [
      { url: 'https://gracelifecenter.com/become/social-og.jpg', width: 1200, height: 630 },
      { url: 'https://gracelifecenter.com/become/social-square.jpg', width: 1200, height: 1200 },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ['https://gracelifecenter.com/become/social-og.jpg'],
  },
};

export default function BecomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
