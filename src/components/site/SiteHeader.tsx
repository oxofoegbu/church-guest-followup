'use client';

// Run 30 — shared site header. Sticky cream/blur bar with the brand lockup,
// the four nav links, and the two door CTAs. Below lg it collapses to a real,
// working drawer (the mock-up's hamburger was decorative). Links live in the
// server-rendered DOM (CSS-hidden, not removed) so crawlers still read them.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandLockup from './BrandLockup';
import Button from './Button';
import { Wrap } from './Band';

const NAV = [
  { label: 'The Journey', href: '/journey' },
  { label: 'Watch & Read', href: '/teaching' },
  { label: 'About', href: '/about' },
  { label: "I'm New", href: '/im-new' },
];

const MORE = [
  { label: 'Prayer', href: '/prayer' },
  { label: 'Give', href: '/give' },
  { label: 'Contact', href: '/contact' },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
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

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-shadow ${
        scrolled
          ? 'border-site-claydk shadow-[0_6px_24px_-18px_rgba(51,32,26,0.5)]'
          : 'border-transparent'
      }`}
      style={{ backgroundColor: 'rgba(251,247,239,0.86)' }}
    >
      <Wrap className="flex h-[72px] items-center justify-between">
        <BrandLockup tone="light" />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[15px] font-medium text-site-ink/85 transition-colors hover:text-site-ember"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <Button href="/im-new" variant="ghost" className="!px-5 !py-2.5">
            Plan a Visit
          </Button>
          <Button href="/begin" variant="primary" className="!px-5 !py-2.5">
            Begin the Journey
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="text-[26px] leading-none text-site-umber lg:hidden"
        >
          ☰
        </button>
      </Wrap>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-site-umber/50 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-site-cream shadow-2xl transition-transform duration-200 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-7 py-5">
            <BrandLockup tone="light" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="text-[26px] leading-none text-site-umber"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col px-7 py-2" aria-label="Mobile">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="border-b border-site-claydk/60 py-3.5 font-fraunces text-[22px] text-site-umber"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 px-7 py-5">
            <Button href="/begin" variant="primary" className="justify-center">
              Begin the Journey
            </Button>
            <Button href="/im-new" variant="ghost" className="justify-center">
              Plan a Visit
            </Button>
          </div>

          <div className="mt-auto flex gap-5 px-7 py-6 text-[14px]">
            {MORE.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setOpen(false)}
                className="font-medium text-site-soft transition-colors hover:text-site-ember"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
