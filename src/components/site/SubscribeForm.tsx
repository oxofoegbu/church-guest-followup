'use client';

// Run 35 — Watch & Read subscribe form. Posts to /api/subscribe (email capture
// to a list-owner inbox, fire-safe). Honeypot guard. Inline, compact.
import { useState } from 'react';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (website) {
      setStatus('done');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: '' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Something went wrong. Please try again.');
      }
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <p className="text-[17px] text-site-ink">
        You’re on the list — we’ll send a note when new teaching lands. Thank you.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-[520px] flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Your email"
        className="flex-1 rounded-[40px] border border-site-claydk bg-white px-5 py-3 text-[15px] text-site-ink placeholder:text-site-soft/70 focus:border-site-brass focus:outline-none focus:ring-2 focus:ring-site-brass/30"
      />
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-[40px] bg-site-ember px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-site-emberdk disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Keep me posted'}
      </button>
      {status === 'error' ? <p className="text-[14px] text-site-ember sm:hidden">{error}</p> : null}
    </form>
  );
}
