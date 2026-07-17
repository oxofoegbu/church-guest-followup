import type { Metadata } from 'next';

// Run 27 — metadata for the public Disciplers Track landing page
// (/discipler). The page itself is a client component; this server layout
// carries the route's own title/description and the approved social preview
// imagery (the text-baked square + og crop derived from the
// hand-on-shoulder photograph — link previews only, never placed on-page).

const OG_TITLE = 'Disciplers Track \u2014 Walk With Someone \u00B7 Grace Life Center';
const OG_DESCRIPTION =
  'Someone walked with you. Now walk with someone. Ten weeks of preparation, one life entrusted, never alone \u2014 the Disciplers Track at Grace Life Center.';

export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    type: 'website',
    url: 'https://gracelifecenter.com/discipler',
    images: [
      { url: 'https://gracelifecenter.com/discipler/social-og.jpg', width: 1200, height: 630 },
      { url: 'https://gracelifecenter.com/discipler/social-square.jpg', width: 1254, height: 1254 },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ['https://gracelifecenter.com/discipler/social-og.jpg'],
  },
};

export default function DisciplerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
