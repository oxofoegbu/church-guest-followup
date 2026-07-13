'use client';

// Run 33 — shared top nav for the standalone landing pages (The Gathering now;
// /begin /become /discipler /leaders in the retrofit run). It's a transparent
// overlay that sits over each page's own dark hero in light (cream) text, so
// every track keeps its unique branding while the menu stays identical
// everywhere. Gains a translucent dark backdrop once you scroll past the hero.
// Links are root-relative so they resolve on the apex, harvest., and each
// subdomain alike. Pass the page's loaded serif via `serifClass` for the
// wordmark (falls back to a serif stack).
import { useEffect, useState } from 'react';
import Link from 'next/link';

const NAV = [
  { label: 'The Journey', href: '/journey' },
  { label: 'Watch & Read', href: '/teaching' },
  { label: 'About', href: '/about' },
  { label: "I'm New", href: '/im-new' },
];

export default function StandaloneNav({ serifClass = '' }: { serifClass?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const wordmark = (
    <Link href="/home" aria-label="Grace Life Center — home" className="inline-flex flex-col leading-[1.05]">
      <span className={`text-[20px] font-semibold text-white ${serifClass}`} style={serifClass ? undefined : { fontFamily: 'Georgia, serif' }}>
        Grace Life <span className="text-[#E7CF9E]">Center</span>
      </span>
      <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.19em] text-white/70">
        Charismatic Renewal Ministries
      </span>
    </Link>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[rgba(26,17,12,0.82)] shadow-[0_6px_24px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[68px] w-full max-w-[1160px] items-center justify-between px-6">
        {wordmark}

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[14.5px] font-medium text-white/85 transition-colors hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href="/im-new"
            className="rounded-[40px] border-[1.5px] border-white/55 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
          >
            Plan a Visit
          </Link>
          <Link
            href="/begin"
            className="rounded-[40px] bg-site-ember px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-site-emberdk"
          >
            Begin the Journey
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="text-[24px] leading-none text-white lg:hidden"
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-[#1A110C] shadow-2xl transition-transform duration-200 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-5">
            {wordmark}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="text-[24px] leading-none text-white">
              ✕
            </button>
          </div>
          <nav className="flex flex-col px-6 py-2" aria-label="Mobile">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`border-b border-white/10 py-3.5 text-[20px] text-white ${serifClass}`}
                style={serifClass ? undefined : { fontFamily: 'Georgia, serif' }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 px-6 py-5">
            <Link href="/begin" onClick={() => setOpen(false)} className="rounded-[40px] bg-site-ember px-5 py-3 text-center text-[15px] font-semibold text-white hover:bg-site-emberdk">
              Begin the Journey
            </Link>
            <Link href="/im-new" onClick={() => setOpen(false)} className="rounded-[40px] border-[1.5px] border-white/55 px-5 py-3 text-center text-[15px] font-semibold text-white hover:bg-white/10">
              Plan a Visit
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
