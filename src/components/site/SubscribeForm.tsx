'use client';

// Run 35 / Run 47 — Watch & Read subscribe form. Posts to /api/subscribe, then
// confirms the email with a 6-digit code (OtpDialog) so only real people join
// the list (double opt-in). Honeypot guard. Inline, compact.
import { useState } from 'react';
import OtpDialog from '@/components/site/OtpDialog';

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [verify, setVerify] = useState<{ id: string; email: string } | null>(null);

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
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || 'Something went wrong. Please try again.');
      }
      if (d.requiresVerification && d.id) {
        setVerify({ id: d.id, email });
        setStatus('idle');
      } else {
        setStatus('done');
      }
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
    <>
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
      {verify ? (
        <OtpDialog
          id={verify.id}
          email={verify.email}
          onVerified={() => { setVerify(null); setStatus('done'); }}
          onClose={() => setVerify(null)}
        />
      ) : null}
    </>
  );
}
