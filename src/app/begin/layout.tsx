import type { Metadata } from 'next';

// Run 19 — metadata for the public Welcome Track landing page (/begin).
// The page itself is a client component; this server layout carries the
// route's own title/description so shares and search results read warmly.

export const metadata: Metadata = {
  title: 'Begin the Journey \u2014 Grace Life Center',
  description:
    'A place to begin \u2014 with Jesus, and with us. The Welcome Track is a short, unhurried journey into who Jesus is and who you\u2019re becoming. You\u2019re welcome here.',
  openGraph: {
    title: 'Begin the Journey \u2014 Grace Life Center',
    description:
      'A place to begin \u2014 with Jesus, and with us. The Welcome Track is a short, unhurried journey. You\u2019re welcome here.',
    type: 'website',
    url: 'https://harvest.gracelifecenter.com/begin',
    // Run 27 -- approved link-preview imagery (the well at dawn, wordmark
    // baked). Preview-only assets: they never appear on the page itself.
    images: [
      { url: 'https://harvest.gracelifecenter.com/begin/social-og.jpg', width: 1200, height: 630 },
      { url: 'https://harvest.gracelifecenter.com/begin/social-square.jpg', width: 1254, height: 1254 },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Begin the Journey \u2014 Grace Life Center',
    description:
      'A place to begin \u2014 with Jesus, and with us. The Welcome Track is a short, unhurried journey. You\u2019re welcome here.',
    images: ['https://harvest.gracelifecenter.com/begin/social-og.jpg'],
  },
};

export default function BeginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
