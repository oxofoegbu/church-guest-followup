'use client';

// Run 32 / Run 47 — Prayer request form. Posts to /api/prayer, then confirms the
// sender's email with a 6-digit code (OtpDialog) before it reaches the prayer
// team. Name is optional; email is required so we can send the code. The urgent
// and private checkboxes are honored in the email. Honeypot guard.
import { useState } from 'react';
import OtpDialog from '@/components/site/OtpDialog';

const INPUT =
  'w-full rounded-[10px] border border-site-claydk bg-white px-3.5 py-3 text-[15px] text-site-ink placeholder:text-site-soft/70 focus:border-site-brass focus:outline-none focus:ring-2 focus:ring-site-brass/30';
const LABEL = 'text-[13px] font-semibold text-site-umber';

export default function PrayerForm() {
  const [f, setF] = useState({ name: '', email: '', request: '', website: '' });
  const [urgent, setUrgent] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [verify, setVerify] = useState<{ id: string; email: string } | null>(null);

  const set = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.website) {
      setStatus('done');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.name,
          email: f.email,
          request: f.request,
          urgent,
          private: isPrivate,
          website: '',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || 'Something went wrong. Please try again.');
      }
      if (d.requiresVerification && d.id) {
        setVerify({ id: d.id, email: f.email });
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
      <div className="rounded-[18px] border border-site-claydk bg-site-paper p-9 text-center">
        <p className="font-fraunces text-[24px] text-site-umber">We have it — and we’ll pray.</p>
        <p className="mx-auto mt-3 max-w-[440px] text-[16px] text-site-soft">
          Your request is with a real team of praying people. You’re not carrying it alone anymore.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="rounded-[18px] border border-site-claydk bg-site-paper p-9">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="p-name">Your name <span className="font-normal text-site-soft">(optional)</span></label>
              <input id="p-name" className={INPUT} value={f.name} onChange={set('name')} placeholder="However you’d like to be known" />
            </div>
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="p-email">Email</label>
              <input id="p-email" type="email" required className={INPUT} value={f.email} onChange={set('email')} placeholder="So we can send your confirmation code" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={LABEL} htmlFor="p-request">What can we pray for?</label>
            <textarea id="p-request" className={`${INPUT} min-h-[150px] resize-y`} required value={f.request} onChange={set('request')} placeholder="However heavy, however small — bring it." />
          </div>

          <label className="flex items-start gap-3 text-[14.5px] text-site-ink">
            <input type="checkbox" className="mt-1 h-[18px] w-[18px] flex-none accent-site-ember" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            <span>This feels urgent — please have someone reach out to me.</span>
          </label>
          <label className="flex items-start gap-3 text-[14.5px] text-site-ink">
            <input type="checkbox" className="mt-1 h-[18px] w-[18px] flex-none accent-site-ember" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            <span>Please keep this private to the prayer team only.</span>
          </label>

          {/* Honeypot */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={set('website')} />

          {status === 'error' ? <p className="text-[14px] text-site-ember">{error}</p> : null}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex w-fit items-center gap-2 rounded-[40px] bg-site-ember px-6 py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-site-emberdk disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Send my request'}
          </button>
        </div>
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
