// Run 30 — layout for the public Grace Life Center website (the "(site)"
// route group). Loads the website faces (Fraunces + Inter) as CSS variables
// the Tailwind theme references, paints the cream canvas, and frames every
// marketing page with the shared header + footer. Server-rendered.
import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import Analytics from '@/components/site/Analytics';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE } from '@/lib/site';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-fraunces',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Grace Life Center — A well, not a fence · Laurel, Maryland',
    template: '%s · Grace Life Center',
  },
  applicationName: SITE.name,
  openGraph: {
    siteName: SITE.name,
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${inter.variable} flex min-h-screen flex-col bg-site-cream font-inter text-[17px] leading-[1.6] text-site-ink antialiased`}
    >
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
