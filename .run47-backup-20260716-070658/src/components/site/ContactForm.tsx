'use client';

// Run 31 — Contact message form. Posts to /api/contact, which emails the
// church inbox via the existing Resend sender (fire-safe). Honeypot guard.
import { useState } from 'react';

const INPUT =
  'w-full rounded-[10px] border border-site-claydk bg-white px-3.5 py-3 text-[15px] text-site-ink placeholder:text-site-soft/70 focus:border-site-brass focus:outline-none focus:ring-2 focus:ring-site-brass/30';
const LABEL = 'text-[13px] font-semibold text-site-umber';

export default function ContactForm() {
  const [f, setF] = useState({
    name: '',
    email: '',
    subject: 'I’m planning a visit',
    message: '',
    website: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const set = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setF({ ...f, [k]: e.target.value });

  const SUBJECTS = [
    'I’m planning a visit',
    'I have a question',
    'I’d like prayer',
    'Serving & getting involved',
    'Something else',
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.website) {
      setStatus('done');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, email: f.email, subject: f.subject, message: f.message, website: '' }),
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
      <div className="rounded-[18px] border border-site-claydk bg-site-paper p-9 text-center">
        <p className="font-fraunces text-[24px] text-site-umber">Thank you — we’ll be in touch.</p>
        <p className="mx-auto mt-3 max-w-[420px] text-[16px] text-site-soft">
          Your message is on its way to a real person. We read every note and will reply as soon as
          we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-site-claydk bg-site-paper p-9">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <label className={LABEL} htmlFor="c-name">Your name</label>
          <input id="c-name" className={INPUT} required value={f.name} onChange={set('name')} placeholder="What should we call you?" />
        </div>
        <div className="grid gap-1.5">
          <label className={LABEL} htmlFor="c-email">Email</label>
          <input id="c-email" type="email" className={INPUT} required value={f.email} onChange={set('email')} placeholder="you@email.com" />
        </div>
        <div className="grid gap-1.5">
          <label className={LABEL} htmlFor="c-subject">What’s this about?</label>
          <select id="c-subject" className={INPUT} value={f.subject} onChange={set('subject')}>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label className={LABEL} htmlFor="c-msg">Your message</label>
          <textarea id="c-msg" className={`${INPUT} min-h-[140px] resize-y`} required value={f.message} onChange={set('message')} placeholder="How can we help?" />
        </div>
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={set('website')} />
        {status === 'error' ? <p className="text-[14px] text-site-ember">{error}</p> : null}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex w-fit items-center gap-2 rounded-[40px] bg-site-ember px-6 py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-site-emberdk disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
