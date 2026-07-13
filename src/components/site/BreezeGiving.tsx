'use client';

// Run 32 — BreezeCHMS giving embed. Renders Breeze's hosted giving form inline
// via their official embed (a target div + give.js, subdomain "gracelifecenter")
// and always offers a direct link to the secure hosted page as a fallback, so
// giving works even if the embed is blocked. No card data ever touches this site.
import Script from 'next/script';

const GIVE_URL =
  process.env.NEXT_PUBLIC_GIVE_URL || 'https://gracelifecenter.breezechms.com/give/online';

export default function BreezeGiving() {
  return (
    <div className="rounded-[18px] border border-site-claydk bg-site-paper p-6 sm:p-9">
      {/* Breeze renders its secure giving form into this container. */}
      <div id="breeze_giving_embed" data-subdomain="gracelifecenter" />
      <Script src="https://app.breezechms.com/js/give.js" strategy="afterInteractive" />

      <div className="mt-6 border-t border-site-claydk pt-6 text-center">
        <p className="mb-3 text-[14.5px] text-site-soft">
          Prefer to give on Breeze’s secure page? It opens in a new tab.
        </p>
        <a
          href={GIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-[40px] border-[1.5px] border-site-brass px-6 py-[13px] text-[15px] font-semibold text-site-umber transition-colors hover:bg-site-brass hover:text-white"
        >
          Give on our secure giving page →
        </a>
      </div>
    </div>
  );
}
