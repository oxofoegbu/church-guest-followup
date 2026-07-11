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
  },
};

export default function BeginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
