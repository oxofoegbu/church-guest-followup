import type { Metadata } from 'next';

// Run 33 — metadata for The Gathering holding page (/thegathering). The page
// itself is a client component; this server layout carries the route's own
// title/description and social preview. Canonical for now is
// harvest.gracelifecenter.com/thegathering (later thegathering.gracelifecenter.com).

const OG_TITLE = 'The Gathering — A safe place to meet Jesus';
const OG_DESCRIPTION =
  'The Gathering is a gentle, Scripture-centered online community for anyone longing for depth, healing, and an unhurried walk with Jesus — especially those far from, or worn out by, church. No pressure. No pretending. Just Jesus. Launching soon; join the launch team or ask to be told when we begin.';

export const metadata: Metadata = {
  title: 'The Gathering',
  description: OG_DESCRIPTION,
  alternates: { canonical: 'https://gracelifecenter.com/thegathering' },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: 'website',
    url: 'https://gracelifecenter.com/thegathering',
    images: [{ url: 'https://gracelifecenter.com/thegathering/hero.webp', width: 1600, height: 1066 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ['https://gracelifecenter.com/thegathering/hero.webp'],
  },
};

export default function TheGatheringLayout({ children }: { children: React.ReactNode }) {
  return children;
}
